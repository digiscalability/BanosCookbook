#!/bin/bash

# BanosCookbook Deployment Script
# This script helps deploy the application to production

echo "🚀 BanosCookbook Deployment Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run type check
echo "🔍 Running type check..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ Type check failed. Please fix TypeScript errors before deploying."
    exit 1
fi

# Run lint check
echo "🔍 Running lint check..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Lint check failed. Please fix ESLint errors before deploying."
    exit 1
fi

# Build the application
echo "🏗️  Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Check for environment variables
echo "🔧 Checking environment variables..."
if [ -z "$GOOGLE_API_KEY" ]; then
    echo "⚠️  Warning: GOOGLE_API_KEY not set. AI features may not work."
fi

if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_APP_URL not set. Using default."
fi

echo ""
echo "🎉 Ready for deployment!"
echo ""
echo "Deployment options:"
echo "1. Vercel: vercel --prod"
echo "2. Firebase: firebase deploy"
echo "3. Manual: Upload .next folder to your hosting provider"
echo ""
echo "Don't forget to set environment variables in your deployment platform!"
