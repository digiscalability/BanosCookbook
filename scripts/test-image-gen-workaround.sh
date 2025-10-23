#!/bin/bash

# Quick script to test image generation via the Next.js API
# Since we can't easily call Server Actions from Node scripts,
# we'll use the web UI approach but automated

echo "🎨 Testing AI Image Generation for Korean Bibimbap"
echo "================================================================="
echo ""
echo "Since there's no Edit button in the UI, we have two options:"
echo ""
echo "OPTION 1: Use the Add Recipe page with pre-filled data"
echo "  Navigate to: http://localhost:9002/add-recipe"
echo "  Fill in the Korean Bibimbap details"
echo "  Click 'Generate AI Images'"
echo "  Select the best image"
echo "  Save as new recipe or update existing"
echo ""
echo "OPTION 2: Direct Database Update (Recommended)"
echo "  We can generate the image and update Firestore directly"
echo "  This bypasses the need for an Edit UI"
echo ""
echo "Let's check if we can call the API endpoint directly..."
echo ""

# Test if there's an API endpoint
curl -s -X GET "http://localhost:9002/api/recipes" | jq -r '.recipes[0] | {id, title, cuisine}' 2>/dev/null

echo ""
echo "================================================================="
echo ""
echo "💡 RECOMMENDED APPROACH:"
echo "Run the bulk generation script which handles everything automatically:"
echo ""
echo "  # First, do a dry run to see what would happen"
echo "  node scripts/bulk-generate-recipe-images.js --dry-run --limit=1"
echo ""
echo "  # Then run for real on just one recipe"
echo "  node scripts/bulk-generate-recipe-images.js --limit=1"
echo ""
