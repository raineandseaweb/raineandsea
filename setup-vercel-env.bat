@echo off
echo ========================================
echo Adding Environment Variables to Vercel
echo ========================================
echo.

echo Adding DATABASE_URL...
vercel env add DATABASE_URL production
echo postgresql://neondb_owner:npg_IoaO3L9flzsQ@ep-young-morning-ahtcfu5y-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

echo.
echo Adding POSTGRES_URL...
vercel env add POSTGRES_URL production
echo postgresql://neondb_owner:npg_IoaO3L9flzsQ@ep-young-morning-ahtcfu5y-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

echo.
echo Adding JWT_SECRET...
vercel env add JWT_SECRET production
echo eFkLT+q+1Ew0iL0zn/BuFiNfpcgsk7j1Imbae59JrPY=

echo.
echo Adding CSRF_SECRET...
vercel env add CSRF_SECRET production
echo 6aeea8b37abc74477e31949548f4347cfdbd0ecdb0b05fdf0c9faba5c4171baf

echo.
echo Adding NEXTAUTH_SECRET...
vercel env add NEXTAUTH_SECRET production
echo f9WbPf8Eyx34VMx72T3t9pVbtgfCTNseOY5KhS+q67M=

echo.
echo Adding ROOT_SECRET...
vercel env add ROOT_SECRET production
echo pXLzzKmepeHtyjIIgJbp+c9lrZgKeh2m5aapYXINAiU=

echo.
echo ========================================
echo Essential variables added!
echo.
echo IMPORTANT: You still need to add:
echo 1. NEXT_PUBLIC_SITE_URL (your Vercel URL)
echo 2. SITE_URL (same as above)
echo 3. NEXTAUTH_URL (same as above)
echo.
echo After deploying once, you'll get a URL like:
echo https://your-project-name.vercel.app
echo.
echo Then add these manually or run:
echo vercel env add NEXT_PUBLIC_SITE_URL production
echo vercel env add SITE_URL production
echo vercel env add NEXTAUTH_URL production
echo.
echo Ready to deploy: vercel --prod
echo ========================================
pause

