#!/bin/bash

# Firestore Setup Script for BanosCookbook
# This script sets up Firestore rules and indexes

echo "🔥 Setting up Firestore for BanosCookbook..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Login to Firebase (if not already logged in)
echo "🔐 Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Please login to Firebase:"
    firebase login
fi

# Set the project
echo "📁 Setting Firebase project to studio-4664575455-de3d2..."
firebase use studio-4664575455-de3d2

# Deploy Firestore rules
echo "📋 Deploying Firestore rules..."
firebase deploy --only firestore:rules

# Deploy Firestore indexes
echo "📊 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

echo "✅ Firestore setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Enable Firestore Database in Firebase Console if not already enabled"
echo "2. Test your application with the new rules"
echo "3. For production, use the production rules in firestore.rules"
echo "4. For development, you can use the permissive rules in firestore.rules.dev"
