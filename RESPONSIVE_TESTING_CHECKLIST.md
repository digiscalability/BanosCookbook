# BanosCookbook - Responsive Testing Checklist

**Date**: October 22, 2025
**Status**: Ready for Manual Testing in DevTools

---

## Quick Start: Mobile Responsive Testing

1. **Open DevTools**: Press `F12` or `Ctrl+Shift+I`
2. **Toggle Device Toolbar**: Press `Ctrl+Shift+M`
3. **Test Each Size**: See sections below

---

## Mobile Devices (375px - 480px)

### Device Test Cases
- **iPhone SE**: 375×667px (smallest)
- **iPhone 12/13**: 390×844px (standard)
- **Google Pixel 5**: 393×851px

### Home Page (`/`) - Mobile Layout

| Component | Expected | Check |
|-----------|----------|-------|
| **Header** | Single row, hamburger menu | [ ] |
| **Logo** | Shows "Banos" (text shortened) | [ ] |
| **Recipe Cards** | 1 column layout | [ ] |
| **Card Image** | Full width, proper aspect ratio | [ ] |
| **Card Text** | Readable, not truncated | [ ] |
| **Footer** | Single column links | [ ] |
| **No H-Scroll** | No horizontal scrolling | [ ] |

### Add Recipe Form (`/add-recipe`) - Mobile Layout

| Component | Expected | Check |
|-----------|----------|-------|
| **Title Input** | Full width, readable | [ ] |
| **Text Areas** | Full width with padding | [ ] |
| **Input Labels** | Above fields, clear | [ ] |
| **Buttons** | Full width or wrapped | [ ] |
| **Add/Remove** | Easy to tap (44×44px min) | [ ] |
| **Cuisine Dropdown** | Expands without overflow | [ ] |
| **Image Upload** | Large tap target | [ ] |

### Recipe Detail (`/recipes/[id]`) - Mobile Layout

| Component | Expected | Check |
|-----------|----------|-------|
| **Recipe Image** | Full width at top | [ ] |
| **Title** | Large, readable font | [ ] |
| **Ingredients** | Single column list | [ ] |
| **Instructions** | Numbered, easy to follow | [ ] |
| **Comments Section** | Stacked vertically | [ ] |

---

## Tablet Devices (768px - 1024px)

### Device Test Cases
- **iPad Mini**: 768×1024px
- **iPad Air**: 820×1180px
- **Tablet (generic)**: 800×1280px

### Home Page - Tablet Layout

| Component | Expected | Check |
|-----------|----------|-------|
| **Recipe Grid** | 2 columns | [ ] |
| **Cards** | Balanced sizing | [ ] |
| **Header** | Desktop nav or mobile | [ ] |
| **Spacing** | Adequate margins | [ ] |

### Add Recipe Form - Tablet Layout

| Component | Expected | Check |
|-----------|----------|-------|
| **Form Layout** | Single column or 2-col | [ ] |
| **Button Sizing** | Comfortable tap targets | [ ] |
| **Keyboard** | Doesn't hide inputs | [ ] |

---

## Desktop Devices (1920px+)

### Layout Test

| Component | Expected | Check |
|-----------|----------|-------|
| **Recipe Grid** | 3-4 columns | [ ] |
| **Cards** | Uniform sizing | [ ] |
| **Spacing** | Generous, not cramped | [ ] |
| **Header** | Full desktop nav | [ ] |
| **Footer** | 3-column layout | [ ] |

---

## Touch Interaction Testing (Mobile Only)

### Button Interaction
- [ ] Buttons respond to touch
- [ ] Visual feedback on touch (active state)
- [ ] No 300ms delay feels responsive

### Form Input
- [ ] Tap on input shows keyboard
- [ ] Keyboard doesn't hide form
- [ ] Can scroll form while keyboard open
- [ ] Input remains focused

### Navigation
- [ ] Link tap goes to page
- [ ] Back button works
- [ ] Menu buttons toggle properly

### Scroll Performance
- [ ] Smooth scrolling
- [ ] No jank or frame drops
- [ ] Recipe cards scroll smoothly

---

## Viewport Breakpoints to Test

Create a checklist with actual widths:

```
Mobile (375px)        → Home, Add Recipe, Detail, Admin
Mobile (480px)        → Home, Add Recipe, Detail, Admin
Tablet (768px)        → Home, Add Recipe, Detail, Admin
Tablet (1024px)       → Home, Add Recipe, Detail, Admin
Desktop (1440px)      → Home, Add Recipe, Detail, Admin
Desktop (1920px)      → Home, Add Recipe, Detail, Admin
Ultra-wide (2560px)   → Home, Add Recipe, Detail, Admin
```

---

## CSS Grid Responsiveness

### Verify Tailwind Breakpoints Used

| Breakpoint | Size | Classes |
|------------|------|---------|
| Default | <640px | (no prefix) |
| sm | ≥640px | sm: |
| md | ≥768px | md: |
| lg | ≥1024px | lg: |
| xl | ≥1280px | xl: |
| 2xl | ≥1536px | 2xl: |

**Check in HTML**: Search for `md:`, `lg:`, `sm:` classes in DevTools Inspector

---

## Image Scaling Test

### At Each Breakpoint
- [ ] Images don't stretch or squash
- [ ] Images load at correct resolution
- [ ] Aspect ratios are preserved
- [ ] No distortion on zoom

---

## Font Readability Test

### Typography Checks at Each Size

| Text | Mobile | Tablet | Desktop |
|------|--------|--------|---------|
| **H1 (Title)** | Readable | Readable | Readable |
| **Body Text** | 14px+ | 16px+ | 16px+ |
| **Small Text** | 12px+ | 12px+ | 12px+ |
| **Line Height** | ≥1.5 | ≥1.5 | ≥1.5 |

---

## Interaction Testing

### Hover States (Desktop Only)
- [ ] Hover over recipe cards shows effect
- [ ] Links show hover state
- [ ] Buttons show hover state

### Focus States (All Devices)
- [ ] Tab navigation works
- [ ] Focus ring visible
- [ ] Focus order is logical

### Active States (All Devices)
- [ ] Active nav item highlighted
- [ ] Button pressed state visible
- [ ] Active form input clear

---

## Keyboard Navigation (Desktop)

- [ ] Tab moves through form fields
- [ ] Shift+Tab moves backwards
- [ ] Enter submits forms
- [ ] Escape closes modals/dropdowns
- [ ] Arrow keys work in dropdowns

---

## Performance on Mobile

### Network Throttling (DevTools)
1. Open DevTools → Network tab
2. Set throttle to "4G" (slow mobile)
3. Test page load:
   - [ ] Home loads in <4s
   - [ ] Add Recipe loads in <5s
   - [ ] Detail page loads in <3s

### CPU Throttling (DevTools)
1. Open DevTools → Performance tab
2. Set CPU to "4x Throttle"
3. Interactions should still feel responsive

---

## Testing Tools Setup

### Using Chrome DevTools

**Toggle Device Toolbar**:
```
Windows/Linux: Ctrl+Shift+M
Mac: Cmd+Shift+M
```

**Common Devices**:
- iPhone 12
- iPhone SE
- iPad
- Pixel 4
- Galaxy S9+

### Custom Dimensions
1. Click "Edit" in device selector
2. Add custom size (e.g., 375×812)
3. Save as custom device

---

## Responsive Issues Found

| Issue | Device | URL | Status |
|-------|--------|-----|--------|
| (Example) Cards don't fit | Mobile 375px | `/` | 🔴 |
| (Example) Form overflow | Tablet 768px | `/add-recipe` | 🟡 |

---

## Accessibility on Mobile

- [ ] Touch targets ≥44×44px
- [ ] Color contrast ≥4.5:1
- [ ] Text alternatives for images
- [ ] Labels for form inputs
- [ ] Keyboard accessible

---

## Common Responsive Issues to Watch For

1. **Horizontal Scrolling**: Should never appear
2. **Text Truncation**: Should wrap, not cut off
3. **Button Overlap**: Should remain distinct
4. **Image Distortion**: Should maintain aspect ratio
5. **Form Input Focus**: Should not be hidden by keyboard
6. **Font Size**: Should be readable (14px+ body text)
7. **Spacing**: Should adapt with breakpoint
8. **Navigation**: Should be accessible on mobile

---

## Screenshots to Capture

For each major page, take screenshots at:
- 375px (Mobile)
- 768px (Tablet)
- 1920px (Desktop)

Save as: `./testing-screenshots/[page]-[size].png`

---

## Performance Checklist (Mobile)

- [ ] FPS stays >60 during scrolling
- [ ] No jank when navigating
- [ ] Touch feedback is instant
- [ ] Transitions are smooth
- [ ] No page jumps during load

---

## Final Sign-Off

After completing all tests:

| Area | Pass | Fail | Notes |
|------|------|------|-------|
| Mobile (375px) | [ ] | [ ] | |
| Tablet (768px) | [ ] | [ ] | |
| Desktop (1440px) | [ ] | [ ] | |
| Touch Interaction | [ ] | [ ] | |
| Performance | [ ] | [ ] | |
| Accessibility | [ ] | [ ] | |

---

## Quick Reference: Responsive Testing Commands

### Build & Test Production
```bash
npm run build
npm start  # Runs on port 9002
```

### Test with Different Viewports
```bash
# In Chrome DevTools:
# 1. Press F12
# 2. Press Ctrl+Shift+M
# 3. Select device or enter custom size
```

### Check Bundle Size
```bash
npm run build
# Check .next/static/chunks/ for file sizes
```

---

**Last Updated**: October 22, 2025
**Frameworks**: Next.js 15, Tailwind CSS, shadcn/ui
**Dev Server Port**: 9002
