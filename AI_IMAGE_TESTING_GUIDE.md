# 🎨 AI Image Generation Testing Guide

## Testing the Feature in the Browser

### Current Status
- **Recipe**: Korean Beef Bibimbap
- **Current Image**: Generic Placeholder #5 ❌
- **Expected**: Authentic Korean bibimbap in stone bowl (dolsot) ✅
- **Recipe URL**: http://localhost:9002/recipes/VxPN8LUc2EJLyyZ1NFsK

---

## Step-by-Step Testing Instructions

### 1. Open the Recipe Page
Navigate to: `http://localhost:9002/recipes/VxPN8LUc2EJLyyZ1NFsK`

**What you should see:**
- Korean Beef Bibimbap recipe title
- Generic placeholder image (NOT authentic Korean food)
- Recipe ingredients and instructions

### 2. Edit the Recipe
- Look for an "Edit" or "Edit Recipe" button
- Click it to enter edit mode

### 3. Generate AI Images
- Scroll to the image section
- Find the "Generate AI Images" button
- Click it to start AI generation

**What should happen:**
- Button shows loading state
- AI generates 3-4 image options
- Images appear as previews
- Each image should show authentic Korean bibimbap

### 4. Select the Best Image
Review the generated images and select one that shows:
- ✅ Traditional stone bowl (dolsot)
- ✅ Colorful arranged vegetables (carrots, spinach, bean sprouts)
- ✅ White rice base
- ✅ Fried egg on top
- ✅ Red gochujang sauce
- ✅ Sesame seeds garnish
- ✅ Korean presentation style

### 5. Save the Recipe
- Click "Save" or "Update Recipe"
- Wait for confirmation
- Return to homepage

### 6. Verify the Change
- Go to: `http://localhost:9002/`
- Find "Korean Beef Bibimbap" in the recipe grid
- Confirm the new image displays correctly
- Verify it looks like authentic Korean food

---

## Testing Other Mismatched Recipes

After confirming it works for Bibimbap, test these high-priority recipes:

### 1. Thai Green Curry (Thai Cuisine)
- Recipe ID: Find via `/api/recipes`
- Current: Placeholder #2
- Should show: Green curry with coconut milk, Thai basil, vegetables

### 2. Mediterranean Quinoa Salad (Mediterranean)
- Current: Placeholder #4
- Should show: Colorful quinoa with Mediterranean vegetables, olives, feta

### 3. Italian Spaghetti (Italian Cuisine)
- Current: Placeholder #1
- Should show: Traditional Italian pasta presentation

---

## Troubleshooting

### If "Generate AI Images" button doesn't appear:
1. Check if you're logged in (if auth is required)
2. Verify the recipe is in edit mode
3. Check browser console for errors (F12)

### If images don't generate:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages
4. Check Network tab for failed API calls

### If images are generic/wrong:
- The AI prompt might need adjustment
- Check `src/ai/flows/generate-recipe-images.ts`
- Verify the cuisine and ingredients are being passed correctly

---

## Browser DevTools Testing

### Console Commands to Test

Open browser console (F12) and try:

```javascript
// Check if recipe data is loaded
console.log('Current recipe data:', window.__RECIPE_DATA__);

// Test fetch to recipes API
fetch('/api/recipes')
  .then(r => r.json())
  .then(data => console.log('Recipes:', data));

// Monitor Server Action calls
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('action'))
  .forEach(r => console.log('Action call:', r.name));
```

### Network Tab Monitoring

1. Open DevTools → Network tab
2. Clear (trash icon)
3. Click "Generate AI Images"
4. Watch for:
   - POST request to server action
   - Response time (should be 5-15 seconds)
   - Status code (should be 200)
   - Response payload (should include image URLs)

---

## Expected AI Generation Quality

The generated images should:

### Visual Quality
- ✅ High resolution (1024x1024 or similar)
- ✅ Professional food photography style
- ✅ Good lighting and composition
- ✅ Appetizing presentation

### Cuisine Accuracy
- ✅ Matches the specific cuisine style
- ✅ Shows authentic ingredients
- ✅ Uses appropriate serving vessel/plate
- ✅ Correct garnishes and presentation

### Color Palette
- ✅ Warm, inviting tones
- ✅ Natural food colors
- ✅ Matches BanosCookbook aesthetic
- ✅ Not oversaturated or artificial

---

## Success Criteria

**Test is successful if:**

1. ✅ AI generates 3-4 image options
2. ✅ At least one image accurately represents the dish
3. ✅ Selected image displays on recipe page
4. ✅ Image appears on homepage recipe card
5. ✅ Image matches the cuisine and dish description
6. ✅ No console errors during generation
7. ✅ Generation completes in < 30 seconds

**Test fails if:**

- ❌ No images generated
- ❌ All images are generic/wrong cuisine
- ❌ Images don't save to recipe
- ❌ Console shows errors
- ❌ Images don't display on homepage

---

## After Testing

### If Successful:
1. Document which recipe IDs were tested
2. Note any images that needed regeneration
3. Plan bulk generation for remaining recipes
4. Consider running bulk script overnight

### If Failed:
1. Capture error messages from console
2. Check GOOGLE_API_KEY environment variable
3. Verify Genkit flow is working: `npm run genkit:dev`
4. Test flow in Genkit UI at `http://localhost:4000`

---

## Next Steps After Manual Testing

Once confirmed working manually:

1. **Run bulk generation for test recipes:**
   ```bash
   npm run bulk:generate-images:test
   # or
   node scripts/bulk-generate-recipe-images.js --dry-run --limit=5
   ```

2. **Review dry run results**
   - Check which recipes will be updated
   - Verify the logic is correct

3. **Run actual bulk generation:**
   ```bash
   npm run bulk:generate-images
   # or
   node scripts/bulk-generate-recipe-images.js
   ```

4. **Monitor progress**
   - Watch console output
   - Check generated_images collection in Firestore
   - Verify images appear on homepage

---

*Last Updated: October 22, 2025*
