@echo off
REM Production Setup Script for Windows
REM This script helps set up the production environment

echo 🚀 Starting production setup...

REM Check if required tools are installed
echo [INFO] Checking dependencies...

where gcloud >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] gcloud CLI not found. Please install Google Cloud SDK.
    pause
    exit /b 1
)

where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Vercel CLI not found. Please install: npm i -g vercel
    pause
    exit /b 1
)

echo [SUCCESS] All dependencies found

REM Setup GCP project
echo [INFO] Setting up Google Cloud Platform...

set /p GCP_PROJECT_ID="Enter your GCP project ID: "
set /p BILLING_ACCOUNT="Enter your billing account ID: "

REM Set project
gcloud config set project %GCP_PROJECT_ID%

REM Enable billing
gcloud billing projects link %GCP_PROJECT_ID% --billing-account=%BILLING_ACCOUNT%

REM Enable APIs
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudkms.googleapis.com

REM Create service account
gcloud iam service-accounts create ecom-secrets-service --display-name="E-commerce Secret Manager Service Account"

REM Grant permissions
gcloud projects add-iam-policy-binding %GCP_PROJECT_ID% --member="serviceAccount:ecom-secrets-service@%GCP_PROJECT_ID%.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"

REM Create secrets directory
if not exist secrets mkdir secrets

REM Create and download key
gcloud iam service-accounts keys create ./secrets/service-account.json --iam-account=ecom-secrets-service@%GCP_PROJECT_ID%.iam.gserviceaccount.com

echo [SUCCESS] GCP setup complete

REM Generate secure secrets
echo [INFO] Generating secure secrets...

REM Generate NextAuth secret
for /f %%i in ('openssl rand -base64 32') do set NEXTAUTH_SECRET=%%i

REM Generate JWT secret
for /f %%i in ('openssl rand -base64 32') do set JWT_SECRET=%%i

REM Generate CSRF secret
for /f %%i in ('openssl rand -hex 32') do set CSRF_SECRET=%%i

REM Generate root secret
for /f %%i in ('powershell -command "[System.Guid]::NewGuid().ToString()"') do set ROOT_SECRET=%%i

echo [SUCCESS] Secrets generated

REM Store secrets in GCP Secret Manager
echo [INFO] Storing secrets in GCP Secret Manager...

echo %NEXTAUTH_SECRET% | gcloud secrets create NEXTAUTH_SECRET --data-file=-
echo %JWT_SECRET% | gcloud secrets create JWT_SECRET --data-file=-
echo %CSRF_SECRET% | gcloud secrets create CSRF_SECRET --data-file=-
echo %ROOT_SECRET% | gcloud secrets create ROOT_SECRET --data-file=-

echo [SUCCESS] Secrets stored in GCP Secret Manager

REM Setup Vercel project
echo [INFO] Setting up Vercel project...

REM Login to Vercel
vercel login

REM Link project
vercel link

echo [SUCCESS] Vercel project linked

REM Setup database
echo [INFO] Setting up database...

set /p use_vercel_postgres="Do you want to use Vercel Postgres? (y/n): "

if /i "%use_vercel_postgres%"=="y" (
    REM Create Vercel Postgres database
    vercel postgres create ecom-prod-db
    echo [SUCCESS] Vercel Postgres database created
) else (
    echo [WARNING] Please set up your external PostgreSQL database
    set /p DATABASE_URL="Enter your DATABASE_URL: "
)

REM Setup domain
echo [INFO] Setting up domain...

set /p DOMAIN="Enter your domain (e.g., yourdomain.com): "

REM Add domain to Vercel
vercel domains add %DOMAIN%

echo [SUCCESS] Domain added to Vercel
echo [WARNING] Please update your DNS records:
echo   A record: @ -^> 76.76.19.61
echo   CNAME: www -^> cname.vercel-dns.com

REM Setup third-party services
echo [INFO] Setting up third-party services...

REM Stripe
set /p STRIPE_PUBLISHABLE_KEY="Enter your Stripe publishable key: "
set /p STRIPE_SECRET_KEY="Enter your Stripe secret key: "
set /p STRIPE_WEBHOOK_SECRET="Enter your Stripe webhook secret: "

echo %STRIPE_SECRET_KEY% | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
echo %STRIPE_WEBHOOK_SECRET% | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-

REM Algolia
set /p ALGOLIA_APP_ID="Enter your Algolia app ID: "
set /p ALGOLIA_SEARCH_KEY="Enter your Algolia search key: "
set /p ALGOLIA_ADMIN_KEY="Enter your Algolia admin key: "

echo %ALGOLIA_ADMIN_KEY% | gcloud secrets create ALGOLIA_ADMIN_API_KEY --data-file=-

REM Email
set /p SMTP_USER="Enter your SMTP user: "
set /p SMTP_PASS="Enter your SMTP password: "
set /p FROM_EMAIL="Enter your from email: "

echo %SMTP_USER% | gcloud secrets create SMTP_USER --data-file=-
echo %SMTP_PASS% | gcloud secrets create SMTP_PASS --data-file=-
echo %FROM_EMAIL% | gcloud secrets create FROM_EMAIL --data-file=-

REM Cloudflare R2
set /p CLOUDFLARE_ACCESS_KEY_ID="Enter your Cloudflare access key ID: "
set /p CLOUDFLARE_SECRET_ACCESS_KEY="Enter your Cloudflare secret access key: "
set /p CLOUDFLARE_R2_API_TOKEN="Enter your Cloudflare R2 API token: "
set /p R2_BUCKET="Enter your R2 bucket name: "
set /p R2_PUBLIC_URL="Enter your R2 public URL: "

echo %CLOUDFLARE_ACCESS_KEY_ID% | gcloud secrets create CLOUDFLARE_ACCESS_KEY_ID --data-file=-
echo %CLOUDFLARE_SECRET_ACCESS_KEY% | gcloud secrets create CLOUDFLARE_SECRET_ACCESS_KEY --data-file=-
echo %CLOUDFLARE_R2_API_TOKEN% | gcloud secrets create CLOUDFLARE_R2_API_TOKEN --data-file=-

echo [SUCCESS] Third-party services configured

REM Deploy to production
echo [INFO] Deploying to production...

REM Set environment variables in Vercel
vercel env add GCP_PROJECT_ID production
vercel env add GCP_SERVICE_ACCOUNT_KEY_PATH production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add ALGOLIA_APP_ID production
vercel env add NEXT_PUBLIC_ALGOLIA_SEARCH_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production
vercel env add SITE_URL production
vercel env add NEXTAUTH_URL production
vercel env add SMTP_HOST production
vercel env add SMTP_PORT production
vercel env add CLOUDFLARE_R2_PRODUCTS_BUCKET production
vercel env add PUBLIC_URL_BASE production

REM Deploy
vercel --prod

echo [SUCCESS] Deployed to production

echo.
echo [SUCCESS] 🎉 Production setup complete!
echo.
echo Next steps:
echo 1. Update DNS records for your domain
echo 2. Run database migrations: npm run db:migrate
echo 3. Seed production data: npm run seed:current
echo 4. Test your production site
echo 5. Set up monitoring and alerts
echo.
echo Your production environment is ready! 🚀

pause
