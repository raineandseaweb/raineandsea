#!/bin/bash

# Production Setup Script
# This script helps set up the production environment

set -e

echo "🚀 Starting production setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI not found. Please install Google Cloud SDK."
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI not found. Please install: npm i -g vercel"
        exit 1
    fi
    
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL not found. Please install OpenSSL."
        exit 1
    fi
    
    print_success "All dependencies found"
}

# Setup GCP project
setup_gcp() {
    print_status "Setting up Google Cloud Platform..."
    
    read -p "Enter your GCP project ID: " GCP_PROJECT_ID
    read -p "Enter your billing account ID: " BILLING_ACCOUNT
    
    # Set project
    gcloud config set project $GCP_PROJECT_ID
    
    # Enable billing
    gcloud billing projects link $GCP_PROJECT_ID --billing-account=$BILLING_ACCOUNT
    
    # Enable APIs
    gcloud services enable secretmanager.googleapis.com
    gcloud services enable cloudkms.googleapis.com
    
    # Create service account
    gcloud iam service-accounts create ecom-secrets-service \
        --display-name="E-commerce Secret Manager Service Account"
    
    # Grant permissions
    gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
        --member="serviceAccount:ecom-secrets-service@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor"
    
    # Create secrets directory
    mkdir -p secrets
    chmod 700 secrets
    
    # Create and download key
    gcloud iam service-accounts keys create ./secrets/service-account.json \
        --iam-account=ecom-secrets-service@$GCP_PROJECT_ID.iam.gserviceaccount.com
    
    print_success "GCP setup complete"
    echo "GCP_PROJECT_ID=$GCP_PROJECT_ID" >> .env.production
    echo "GCP_SERVICE_ACCOUNT_KEY_PATH=./secrets/service-account.json" >> .env.production
}

# Generate secure secrets
generate_secrets() {
    print_status "Generating secure secrets..."
    
    # Generate NextAuth secret
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" >> .env.production
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    echo "JWT_SECRET=$JWT_SECRET" >> .env.production
    
    # Generate CSRF secret
    CSRF_SECRET=$(openssl rand -hex 32)
    echo "CSRF_SECRET=$CSRF_SECRET" >> .env.production
    
    # Generate root secret
    ROOT_SECRET=$(uuidgen)
    echo "ROOT_SECRET=$ROOT_SECRET" >> .env.production
    
    print_success "Secrets generated"
}

# Store secrets in GCP Secret Manager
store_secrets() {
    print_status "Storing secrets in GCP Secret Manager..."
    
    # Load project ID
    source .env.production
    
    # Store generated secrets
    echo "$NEXTAUTH_SECRET" | gcloud secrets create NEXTAUTH_SECRET --data-file=-
    echo "$JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=-
    echo "$CSRF_SECRET" | gcloud secrets create CSRF_SECRET --data-file=-
    echo "$ROOT_SECRET" | gcloud secrets create ROOT_SECRET --data-file=-
    
    print_success "Secrets stored in GCP Secret Manager"
}

# Setup Vercel project
setup_vercel() {
    print_status "Setting up Vercel project..."
    
    # Login to Vercel
    vercel login
    
    # Link project
    vercel link
    
    print_success "Vercel project linked"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    read -p "Do you want to use Vercel Postgres? (y/n): " use_vercel_postgres
    
    if [ "$use_vercel_postgres" = "y" ]; then
        # Create Vercel Postgres database
        vercel postgres create ecom-prod-db
        
        print_success "Vercel Postgres database created"
    else
        print_warning "Please set up your external PostgreSQL database"
        read -p "Enter your DATABASE_URL: " DATABASE_URL
        echo "DATABASE_URL=$DATABASE_URL" >> .env.production
    fi
}

# Setup domain
setup_domain() {
    print_status "Setting up domain..."
    
    read -p "Enter your domain (e.g., yourdomain.com): " DOMAIN
    
    # Add domain to Vercel
    vercel domains add $DOMAIN
    
    echo "NEXT_PUBLIC_SITE_URL=https://$DOMAIN" >> .env.production
    echo "SITE_URL=https://$DOMAIN" >> .env.production
    echo "NEXTAUTH_URL=https://$DOMAIN" >> .env.production
    
    print_success "Domain added to Vercel"
    print_warning "Please update your DNS records:"
    echo "  A record: @ -> 76.76.19.61"
    echo "  CNAME: www -> cname.vercel-dns.com"
}

# Setup third-party services
setup_services() {
    print_status "Setting up third-party services..."
    
    # Stripe
    read -p "Enter your Stripe publishable key: " STRIPE_PUBLISHABLE_KEY
    read -p "Enter your Stripe secret key: " STRIPE_SECRET_KEY
    read -p "Enter your Stripe webhook secret: " STRIPE_WEBHOOK_SECRET
    
    echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY" >> .env.production
    echo "$STRIPE_SECRET_KEY" | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
    echo "$STRIPE_WEBHOOK_SECRET" | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-
    
    # Algolia
    read -p "Enter your Algolia app ID: " ALGOLIA_APP_ID
    read -p "Enter your Algolia search key: " ALGOLIA_SEARCH_KEY
    read -p "Enter your Algolia admin key: " ALGOLIA_ADMIN_KEY
    
    echo "ALGOLIA_APP_ID=$ALGOLIA_APP_ID" >> .env.production
    echo "NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=$ALGOLIA_SEARCH_KEY" >> .env.production
    echo "$ALGOLIA_ADMIN_KEY" | gcloud secrets create ALGOLIA_ADMIN_API_KEY --data-file=-
    
    # Email
    read -p "Enter your SMTP user: " SMTP_USER
    read -p "Enter your SMTP password: " SMTP_PASS
    read -p "Enter your from email: " FROM_EMAIL
    
    echo "$SMTP_USER" | gcloud secrets create SMTP_USER --data-file=-
    echo "$SMTP_PASS" | gcloud secrets create SMTP_PASS --data-file=-
    echo "$FROM_EMAIL" | gcloud secrets create FROM_EMAIL --data-file=-
    
    # Cloudflare R2
    read -p "Enter your Cloudflare access key ID: " CLOUDFLARE_ACCESS_KEY_ID
    read -p "Enter your Cloudflare secret access key: " CLOUDFLARE_SECRET_ACCESS_KEY
    read -p "Enter your Cloudflare R2 API token: " CLOUDFLARE_R2_API_TOKEN
    read -p "Enter your R2 bucket name: " R2_BUCKET
    read -p "Enter your R2 public URL: " R2_PUBLIC_URL
    
    echo "$CLOUDFLARE_ACCESS_KEY_ID" | gcloud secrets create CLOUDFLARE_ACCESS_KEY_ID --data-file=-
    echo "$CLOUDFLARE_SECRET_ACCESS_KEY" | gcloud secrets create CLOUDFLARE_SECRET_ACCESS_KEY --data-file=-
    echo "$CLOUDFLARE_R2_API_TOKEN" | gcloud secrets create CLOUDFLARE_R2_API_TOKEN --data-file=-
    echo "CLOUDFLARE_R2_PRODUCTS_BUCKET=$R2_BUCKET" >> .env.production
    echo "PUBLIC_URL_BASE=$R2_PUBLIC_URL" >> .env.production
    
    print_success "Third-party services configured"
}

# Deploy to production
deploy_production() {
    print_status "Deploying to production..."
    
    # Set environment variables in Vercel
    source .env.production
    
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
    
    # Deploy
    vercel --prod
    
    print_success "Deployed to production"
}

# Main execution
main() {
    echo "🎯 Production Setup Wizard"
    echo "=========================="
    
    # Check dependencies
    check_dependencies
    
    # Setup steps
    setup_gcp
    generate_secrets
    store_secrets
    setup_vercel
    setup_database
    setup_domain
    setup_services
    deploy_production
    
    echo ""
    print_success "🎉 Production setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Update DNS records for your domain"
    echo "2. Run database migrations: npm run db:migrate"
    echo "3. Seed production data: npm run seed:current"
    echo "4. Test your production site"
    echo "5. Set up monitoring and alerts"
    echo ""
    echo "Your production environment is ready! 🚀"
}

# Run main function
main "$@"
