# BanosCookbook Testing Guide

**Date**: October 22, 2025
**Dev Server**: http://localhost:9002
**Status**: ✅ Ready for Testing

## Overview

This guide provides comprehensive testing procedures for all aspects of the BanosCookbook application, including functional testing, performance auditing, and responsive design validation.

---

## 1. PAGE NAVIGATION & LAYOUT TEST

### 1.1 Home Page (`/`)
**Expected**: Recipe grid with all test recipes displayed

**Steps**:
1. Navigate to `http://localhost:9002/`
2. Verify page loads within 2-3 seconds
3. Check layout:
   - ✅ Header with logo and navigation
   - ✅ Hero section with "Banos Cookbook" title
   - ✅ Recipe cards grid (responsive: 1 col mobile, 2 cols tablet, 3+ cols desktop)
   - ✅ Footer with links and contact info
4. Click recipe cards to verify:
   - Card is clickable
   - Navigates to recipe detail page
   - Recipe data displays correctly

**Test Recipes Loaded**:
- Classic Spaghetti Carbonara (Italian)
- Thai Green Curry (Thai)
- Homemade Chocolate Chip Cookies (American)
- Mediterranean Quinoa Salad (Mediterranean)
- Korean Beef Bibimbap (Korean)

**Performance Check**:
- Open DevTools (F12) → Network tab
- Reload page and note:
  - Initial load time (target: <3s)
  - Total bundle size (target: <500KB)
  - Largest assets

---

### 1.2 Recipe Detail Page (`/recipes/[id]`)
**Expected**: Full recipe display with comments section

**Steps**:
1. Click any recipe card from home page
2. Verify recipe detail page displays:
   - Recipe title and description
   - Author name and email
   - Prep/cook time and servings
   - Ingredients list (formatted)
   - Instructions (numbered steps)
   - Cuisine type and rating
   - Comments section (empty for new recipes)
3. Check responsive layout on different screen sizes
4. Verify "Back" or home link works

**Console Check**:
- Open DevTools → Console tab
- Should show no red errors
- Expected: Clean console or only info messages

---

### 1.3 Add Recipe Page (`/add-recipe`)
**Expected**: Recipe form with validation

**Steps**:
1. Navigate to `/add-recipe`
2. Verify form loads with all fields:
   - Title input
   - Description textarea
   - Author name & email
   - Ingredients list (add/remove buttons)
   - Instructions list (add/remove buttons)
   - Prep time, cook time, servings
   - Cuisine dropdown
   - Image upload (or AI generation button)
3. Test form validation:
   - Try submitting empty form → Should show errors
   - Add a recipe title → Error should clear
   - Fill required fields → Enable submit button

**Form Fields to Populate** (for testing):
```
Title: Test Recipe from UI
Author: Test User
Cuisine: Italian
Prep Time: 10 minutes
Cook Time: 20 minutes
Servings: 2
Ingredients:
  - Ingredient 1
  - Ingredient 2
Instructions:
  - Step 1
  - Step 2
Image: Upload or generate
```

---

### 1.4 Admin Dashboard (`/admin/generated-images`)
**Expected**: Image management interface

**Steps**:
1. Navigate to `/admin/generated-images`
2. Verify dashboard displays:
   - List of generated AI images
   - Image metadata (date created, recipe associated)
   - Cleanup options (mark for deletion)
   - Filter/search functionality
3. Check page is restricted/public (depends on setup)

---

### 1.5 Legal Pages
**Expected**: Legal content properly formatted

**Steps**:
1. Navigate to `/legal/terms`
2. Verify:
   - Page title displays correctly
   - Content is readable and formatted
   - Links are functional
3. Repeat for:
   - `/legal/privacy`
   - `/legal/cookies`
   - `/legal/data-deletion`

**Quick Check**: Footer contains links to all legal pages

---

## 2. FORM TESTING

### 2.1 Add Recipe Form Submission
**Test**: Create and save a new recipe

**Steps**:
1. Go to `/add-recipe`
2. Fill form completely:
   - Title: "My Test Recipe"
   - Author: "Test Tester"
   - Cuisine: "Italian"
   - Ingredients: Add 3-4 items
   - Instructions: Add 3-4 steps
   - Prep/Cook times, servings
3. Upload an image (or skip for now)
4. Click "Save Recipe" button
5. Verify:
   - Loading spinner appears
   - Form submits successfully
   - Redirected to recipe detail page OR home page
   - New recipe appears in home page grid

**Firestore Check**:
- Open Firebase Console
- Check `recipes` collection → New recipe should appear
- Verify all fields saved correctly

---

### 2.2 Form Validation
**Test**: Error handling and validation

**Steps**:
1. Go to `/add-recipe`
2. Leave title blank, try to submit → Error message
3. Add title, clear ingredients, try submit → Error message
4. Fill form completely → Submit button enabled
5. Check DevTools console for any validation errors

---

### 2.3 Image Upload
**Test**: Image field functionality

**Steps**:
1. Go to `/add-recipe`
2. In image section, check for:
   - File upload input
   - Preview capability
   - Generate AI image button (if configured)
3. Try uploading a local image file
4. Verify:
   - Image preview displays
   - File size is reasonable
   - Format is supported (JPG, PNG, etc.)

---

## 3. PDF & IMAGE UPLOAD TESTING

### 3.1 PDF Recipe Extraction
**Test**: Extract recipe from PDF file

**Prerequisites**: Have a PDF with a recipe text

**Steps**:
1. Identify PDF test pages:
   - `/test-pdf` - Basic PDF upload
   - `/test-real-pdf` - Advanced PDF processing
   - `/test-fallback-pdf` - PDF diagnostics
2. Navigate to `/test-pdf`
3. Upload a PDF file
4. Verify:
   - PDF processes without errors
   - Extracted text appears
   - Recipe data parsed (if applicable)
5. Check console for any errors

---

### 3.2 Image Recipe Extraction
**Test**: Extract recipe from image/photo

**Steps**:
1. Navigate to `/test-image-pdf` (if available)
2. Upload a photo containing recipe instructions
3. Verify:
   - Image processes
   - OCR or AI correctly reads text
   - Data is parsed

---

## 4. PERFORMANCE AUDIT

### 4.1 Load Time Measurement
**Using DevTools**:

1. Open DevTools (F12)
2. Go to Network tab
3. Reload page (Ctrl+Shift+R for hard refresh)
4. Record:
   - **DOMContentLoaded** (target: <2s)
   - **Load** complete time (target: <4s)
   - **Largest Contentful Paint (LCP)** (target: <2.5s)
5. Check each page:
   - Home: `/`
   - Add Recipe: `/add-recipe`
   - Recipe Detail: Pick any recipe
   - Admin: `/admin/generated-images`

**Example Results**:
```
Page                  DomContent  Load     LCP
Home /                1.2s        2.8s     1.8s
Add Recipe            1.5s        3.1s     2.1s
Recipe Detail         0.8s        2.2s     1.5s
Admin Dashboard       1.3s        2.9s     2.0s
```

---

### 4.2 Bundle Size Analysis
**Using DevTools**:

1. Open DevTools → Sources tab
2. Look at Network tab for JavaScript files
3. Note:
   - Total JS size
   - Largest chunks
4. Open DevTools → Coverage tab
5. Reload and check:
   - Unused CSS
   - Unused JavaScript
   - Coverage percentage

**Expected**:
- Total JS: <500KB
- CSS: <100KB
- Unused code: <20%

---

### 4.3 Memory & CPU Performance
**Using DevTools**:

1. Open DevTools → Performance tab
2. Click record and interact with page:
   - Scroll through recipes
   - Click on recipe cards
   - Open/close dropdowns
3. Stop recording
4. Check:
   - CPU usage spikes
   - Memory heap growth
   - FPS (should stay >60)
5. Look for any jank or frame drops

---

## 5. MOBILE RESPONSIVE TESTING

### 5.1 Device Emulation
**Using DevTools**:

1. Open DevTools (F12)
2. Click device toolbar icon (or Ctrl+Shift+M)
3. Test viewport sizes:

| Device | Size | Test Points |
|--------|------|------------|
| iPhone SE | 375x667 | Single column, touch targets |
| iPhone 12 | 390x844 | 1-2 columns, font readability |
| iPad | 768x1024 | 2 columns, layout adaptation |
| Desktop | 1920x1080 | 3+ columns, full width |

### 5.2 Layout Checks
**For each device size**:

**Home Page**:
- ✅ Recipe cards stack properly
- ✅ Header navigation is accessible
- ✅ Images display at correct aspect ratio
- ✅ No horizontal scrolling
- ✅ Touch targets ≥44x44px

**Add Recipe Form**:
- ✅ Form inputs are readable
- ✅ Labels are visible
- ✅ Buttons are touchable
- ✅ No text overflow
- ✅ Keyboard doesn't hide fields

**Recipe Detail**:
- ✅ Content is readable
- ✅ Image scales properly
- ✅ Ingredients/instructions list properly
- ✅ Comments section is accessible

### 5.3 Touch Interaction
**Test on mobile viewport**:

1. Verify all buttons respond to touches
2. Check dropdown menus work
3. Test form input interaction
4. Verify scroll smoothness

---

## 6. CONSOLE & ERROR CHECKING

### 6.1 Browser Console Validation
**Steps**:

1. Open DevTools → Console tab
2. Reload page on each route:
   - `/` (home)
   - `/add-recipe`
   - `/recipes/{id}` (any recipe)
   - `/admin/generated-images`
3. Check for:
   - ❌ **Red errors** - Critical issues
   - ⚠️ **Yellow warnings** - Non-critical
   - ℹ️ **Blue info** - Expected logs

**Expected**: No red errors, only warnings/info

---

### 6.2 Firebase Connection Check
**Steps**:

1. Open Console
2. Look for messages like:
   - ✅ "Firebase initialized"
   - ✅ "Firestore connected"
3. Open Network tab
4. Look for Firebase requests:
   - `firestore.googleapis.com` calls
   - `firebasestorage.googleapis.com` (for images)
5. Verify responses are 200 OK

---

### 6.3 API Request Monitoring
**Steps**:

1. Open DevTools → Network tab
2. Perform actions:
   - Load home page → Watch for recipe fetch
   - Open recipe detail → Check single recipe fetch
   - Submit form → Watch POST request
3. Verify:
   - Requests complete successfully (status 200)
   - Response times are reasonable (<1s)
   - Payload sizes are expected

**Example Network Requests**:
```
GET /api/recipes           200 OK  250ms  125KB
GET /api/recipes/[id]      200 OK  180ms  45KB
POST /api/recipes          201 Created  320ms
GET /api/images            200 OK  200ms  85KB
```

---

## 7. TESTING CHECKLIST

### Functional Testing
- [ ] Home page loads and displays all recipes
- [ ] Recipe detail page displays complete information
- [ ] Add Recipe form validates inputs
- [ ] Form submission creates new recipe in Firestore
- [ ] Navigation between pages works
- [ ] Legal pages render correctly
- [ ] Admin dashboard displays images
- [ ] All links in footer work

### Performance Testing
- [ ] Home page loads in <3 seconds
- [ ] Add Recipe page loads in <3 seconds
- [ ] Recipe detail loads in <2 seconds
- [ ] Total JS bundle <500KB
- [ ] No unused CSS/JS >20%
- [ ] FPS stays >60 during interactions

### Mobile Testing
- [ ] Mobile layout (375px) renders correctly
- [ ] Tablet layout (768px) renders correctly
- [ ] Desktop layout (1920px) renders correctly
- [ ] Touch targets are ≥44x44px
- [ ] No horizontal scrolling
- [ ] Form inputs accessible on mobile

### Error Handling
- [ ] No red errors in console
- [ ] Firebase connection established
- [ ] API requests complete successfully
- [ ] Form validation shows helpful errors
- [ ] Network failures handled gracefully

### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)
- [ ] Mobile browsers (Chrome Mobile, Safari iOS)

---

## 8. QUICK TEST COMMANDS

### Generate Test Data
```bash
node scripts/seed-test-recipes.js
```

### Run Development Server
```bash
npm run dev
```

### Run Type Checking
```bash
npm run typecheck
```

### Run Linting
```bash
npm run lint
```

### Run Performance Audit
```bash
npm audit
```

---

## 9. KNOWN ISSUES & NOTES

- **Firebase Admin Credentials**: Required for test data seeding (configured in `.env.local`)
- **Port**: Dev server runs on `9002` (not default 3000)
- **Next.js Version**: 15.5.4 with Turbopack
- **Genkit Server**: Run separately with `npm run genkit:dev` for AI features

---

## 10. REPORTING ISSUES

When you find an issue, document:

1. **What**: Description of the problem
2. **Where**: Page/component/form field
3. **When**: Steps to reproduce
4. **Evidence**:
   - Console error message (copy exact text)
   - Network request that failed (URL, status)
   - Screenshot
5. **Environment**: Browser, OS, device type

**Example**:
```
Issue: Recipe cards not displaying on mobile
Where: Home page (/)
When: On iPhone SE (375px), recipe grid shows only 1/4 of card
Evidence: No console errors, CSS looks correct in DevTools
Environment: Chrome Mobile, iOS
```

---

## 11. PERFORMANCE TARGETS

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| First Contentful Paint | <2.5s | TBD | ⏳ |
| Largest Contentful Paint | <2.5s | TBD | ⏳ |
| Cumulative Layout Shift | <0.1 | TBD | ⏳ |
| Time to Interactive | <3.5s | TBD | ⏳ |
| Total JS Size | <500KB | TBD | ⏳ |
| Total CSS Size | <100KB | TBD | ⏳ |
| Lighthouse Score | >90 | TBD | ⏳ |

---

## 12. RESOURCES

- **Firebase Console**: https://console.firebase.google.com
- **Genkit UI**: http://localhost:4000 (when running `npm run genkit:dev`)
- **Next.js Docs**: https://nextjs.org/docs
- **DevTools Docs**: https://developer.chrome.com/docs/devtools/

---

**Last Updated**: October 22, 2025
**Tester**: AI Agent
**Status**: Ready for Manual Testing
