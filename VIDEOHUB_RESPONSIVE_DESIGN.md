# Video Hub Responsive Design & Mobile-First Specifications

## Overview

This document provides detailed responsive design specifications for the new minimalist Video Hub, ensuring optimal UX across all devices.

---

## Device Breakpoints

Following Tailwind CSS conventions:

| Device | Breakpoint | Width | Typical Usage |
|--------|-----------|-------|---------------|
| Mobile | `sm` | 640px | Phones |
| Tablet | `md` | 768px | iPad Mini |
| Laptop | `lg` | 1024px | MacBook Air |
| Desktop | `xl` | 1280px | Desktop Monitor |
| Large Desktop | `2xl` | 1536px | Large Monitor |

---

## Desktop Layout (xl and above)

### Four-Column Studio Editor Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🎬 Recipe Video Hub                    Select Recipe: Pasta Carbonara │
├──────────────────────────────────────────────────────────────────────┤
│ Step: 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ Studio 6️⃣ 7️⃣ 8️⃣                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────┬──────────────────────────┬──────────────────────┐  │
│  │   Scenes    │   Scene Preview & Edit   │  Controls & Assets   │  │
│  │  (Collapse) │                          │                      │  │
│  │             │  ┌────────────────────┐  │  Duration: 5s        │  │
│  │ Scene 1     │  │                    │  │  Animation: Pan L    │  │
│  │  "Boil..." │  │  [Video Preview]   │  │                      │  │
│  │             │  │   or Image         │  │  🎤 Voiceover:      │  │
│  │ Scene 2     │  └────────────────────┘  │  [Audio Player]     │  │
│  │  "Add..." ✓  │                          │                      │  │
│  │             │  Narration:              │  🎬 Gen Video →     │  │
│  │ Scene 3     │  ┌─────────────────────┐ │                      │  │
│  │  "Plate..." │  │ "Once the water...  │ │  Asset Library       │  │
│  │             │  │                     │ │  (Scrollable)        │  │
│  │ [+ Add]     │  └─────────────────────┘ │                      │  │
│  │             │                          │  📹 Videos (3)       │  │
│  │             │  Visual Description:     │  🎤 Audio (3)        │  │
│  │             │  ┌─────────────────────┐ │  🖼️ Images (5)      │  │
│  │             │  │ "Pasta in boiling   │ │                      │  │
│  │             │  │ water, close-up..."  │ │  [Refresh] [Import]  │  │
│  │             │  └─────────────────────┘ │                      │  │
│  │             │                          │                      │  │
│  └─────────────┴──────────────────────────┴──────────────────────┘  │
│                                                                        │
│  Timeline Scrubber:  |────■─────────| 0:45 / 5:00                  │
│                                                                        │
│  [← Back]                                    [Save Edits]  [Continue →]
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Specifications:

- **Scene List**: 200px wide, scrollable if >8 scenes
- **Preview & Editor**: 600px wide (50% of center area)
- **Controls Sidebar**: 300px wide, scrollable
- **Header**: Sticky, 64px height
- **Stepper**: Sticky below header, 56px height
- **Footer Actions**: Fixed bottom, 60px height

---

## Tablet Layout (md - lg)

### Two-Column Layout with Collapsible Panels

```
┌────────────────────────────────────────────┐
│ 🎬 Video Hub        Pasta Carbonara        │
├────────────────────────────────────────────┤
│ Step: 1️⃣ 2️⃣ 3️⃣ 4️⃣ Studio 5️⃣ 6️⃣ 7️⃣ 8️⃣  │
├────────────────────────────────────────────┤
│                                            │
│  [≡ Scenes] [≡ Assets]  Maximize Preview  │
│                                            │
│  ┌────────────────────────────────────────┐│
│  │                                        ││
│  │      [Video Preview]                   ││
│  │           (Full Width)                 ││
│  │                                        ││
│  └────────────────────────────────────────┘│
│                                            │
│  Scene 2: Add Pasta                       │
│  ┌────────────────────────────────────────┐│
│  │ Narration:                             ││
│  │ "Now add the fresh pasta to..."        ││
│  │                                        ││
│  │ [⏯️ Listen]  [✏️ Edit]  [🎤 Regen]    ││
│  └────────────────────────────────────────┘│
│                                            │
│  Duration: [5] s  Animation: [Pan Left]   │
│                                            │
│  ┌────────────────────────────────────────┐│
│  │ 🎤 Voiceover                           ││
│  │ [Audio player]                         ││
│  │ [🔄 Regenerate]                        ││
│  └────────────────────────────────────────┘│
│                                            │
│  [← Back]  [💾 Save] [Continue →]        │
│                                            │
└────────────────────────────────────────────┘
```

### Specifications:

- **Full width layout** with collapsible sidebars
- **Scene list**: Hamburger menu (hidden by default, opens drawer)
- **Asset library**: Hamburger menu (hidden by default, opens drawer)
- **Preview**: Full width, maximized
- **Stacked controls** below preview
- **Touch-friendly buttons**: 44px minimum height

---

## Mobile Layout (sm - md)

### Single-Column Stack with Tabs

```
┌────────────────────────┐
│ 🎬 Video Hub           │
│ Pasta Carbonara        │
├────────────────────────┤
│ 5/8: Studio Editor     │
├────────────────────────┤
│                        │
│ [Preview] [Info] [⚙️]  │
│                        │
│  ┌──────────────────┐  │
│  │                  │  │
│  │ [Video Preview]  │  │
│  │   (Full Width)   │  │
│  │                  │  │
│  └──────────────────┘  │
│                        │
│ Scene 2 of 3           │
│ "Add the pasta..."     │
│                        │
│ ◀ Scene        ▶       │
│                        │
│ ┌──────────────────┐   │
│ │ Narration:       │   │
│ │ Now add fresh    │   │
│ │ pasta to the     │   │
│ │ boiling water    │   │
│ └──────────────────┘   │
│                        │
│ [⏯️ Voiceover]         │
│                        │
│ Duration: [5]s         │
│ Animation:             │
│ [Pan Left ▼]           │
│                        │
│ [🎤 Gen Voice]         │
│ [🎥 Gen Video]         │
│                        │
│ ━━━━━━━━━━━━━━━━━━━━  │
│ [⬅ Back] [Save] [➡]   │
│                        │
└────────────────────────┘
```

### Specifications:

- **Full width stacked layout**
- **Video preview**: 100% width, 16:9 aspect ratio
- **Text areas**: Full width, font-size ≥ 16px (prevents auto-zoom)
- **Buttons**: Full width, 48px minimum height
- **Navigation**: Bottom-fixed buttons (sticky)
- **Modals**: Full-screen with dismiss option
- **Scrollable areas**: Body only (no nested scroll)

---

## Responsive Component Code Examples

### Responsive Grid for Step Display

```typescript
// Components automatically adapt based on screen size

// Desktop: 4 columns (scenes | preview | editor | assets)
// Tablet: 2 columns (preview | controls) + drawers
// Mobile: 1 column (stacked)

export function ResponsiveStudioEditor({ scenes, onChange }: Props) {
  return (
    <div className="grid gap-4
      grid-cols-1           // Mobile: 1 column
      md:grid-cols-2        // Tablet: 2 columns (preview + controls)
      lg:grid-cols-3        // Laptop: 3 columns
      xl:grid-cols-4        // Desktop: 4 columns (scenes | preview | script | controls)
    ">
      {/* Components adapt to column count */}
    </div>
  );
}
```

### Responsive Sidebar (Drawer on Mobile, Sidebar on Desktop)

```typescript
export function AssetLibrary() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile/Tablet: Hamburger toggle */}
      <button
        className="md:hidden fixed bottom-20 right-4 btn btn-circle btn-primary"
        onClick={() => setOpen(true)}
      >
        📦
      </button>

      {/* Drawer (Mobile) */}
      <div
        className={`fixed bottom-0 left-0 right-0 top-0 bg-black/50 transition-all md:hidden ${
          open ? 'block' : 'hidden'
        }`}
        onClick={() => setOpen(false)}
      >
        <div
          className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-white rounded-t-lg overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4">
            <h3 className="font-semibold mb-4">Asset Library</h3>
            {/* Library content */}
          </div>
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:block w-full md:w-72 lg:w-80 border-l bg-background p-4">
        <h3 className="font-semibold mb-4">Asset Library</h3>
        {/* Library content */}
      </aside>
    </>
  );
}
```

### Touch-Friendly Button Sizes

```typescript
// Mobile-first: Always 48px height minimum
// Desktop: Can be smaller (32px) or same (48px)

export function TouchFriendlyButton(props: ButtonProps) {
  return (
    <button
      className="
        h-12                    // Mobile: 48px (touch-friendly)
        md:h-10                 // Tablet+: 40px
        px-4 md:px-3            // Adjust padding for screen size
        text-base md:text-sm    // Text size adjusts
        rounded-lg              // Rounded corners for touch
        active:scale-95         // Visual feedback for touch
        transition-all
      "
      {...props}
    />
  );
}
```

---

## Responsive Stepper Navigation

### Desktop (All visible)

```
Step: 1️⃣ Recipe  2️⃣ Script  3️⃣ Scenes  4️⃣ Voice  5️⃣ Studio
      6️⃣ Generate  7️⃣ Combine  8️⃣ Share
```

### Tablet (Horizontal scroll)

```
Step: 5️⃣ Studio  6️⃣ Generate  7️⃣ Combine  ▶
```

### Mobile (Progress bar + current step)

```
Step 5 of 8: Studio Editor
████░░░░░░░░░░░░ 62.5%

[◀ Back]              [Next ▶]
```

---

## Typography Scaling

```css
/* Mobile-First Approach */

/* Mobile (default) */
.heading-1 { font-size: 24px; }      /* 1.5rem */
.heading-2 { font-size: 20px; }      /* 1.25rem */
.body-text { font-size: 16px; }      /* 1rem */
.small-text { font-size: 14px; }     /* 0.875rem */

/* Tablet and up */
@media (min-width: 768px) {
  .heading-1 { font-size: 28px; }    /* 1.75rem */
  .heading-2 { font-size: 22px; }    /* 1.375rem */
  .body-text { font-size: 16px; }    /* 1rem (same) */
  .small-text { font-size: 12px; }   /* 0.75rem */
}

/* Desktop and up */
@media (min-width: 1280px) {
  .heading-1 { font-size: 32px; }    /* 2rem */
  .heading-2 { font-size: 24px; }    /* 1.5rem */
  .body-text { font-size: 16px; }    /* 1rem (same) */
}
```

---

## Spacing Scales

```typescript
// Mobile-first spacing

const spacingScale = {
  xs: 4,      // 4px
  sm: 8,      // 8px
  md: 16,     // 16px
  lg: 24,     // 24px
  xl: 32,     // 32px
  '2xl': 48,  // 48px
};

// Example usage
<div className="
  p-4 md:p-6 lg:p-8      // Padding increases on larger screens
  gap-2 md:gap-3 lg:gap-4 // Gap between items increases
  my-4 md:my-6 lg:my-8   // Margin increases on larger screens
">
```

---

## Touch & Interaction Guidelines

### Minimum Touch Targets

- **Buttons**: 48px × 48px (mobile), 40px × 40px (desktop)
- **Input fields**: 44px height minimum
- **List items**: 48px height minimum
- **Spacing between**: 8px minimum

### Touch Feedback

```typescript
export function InteractiveButton(props: Props) {
  return (
    <button
      className="
        active:scale-95        // Mobile: Scale down on press
        active:bg-opacity-80   // Darken on press
        md:hover:bg-opacity-90 // Desktop: Hover effect
        transition-all duration-100
      "
      {...props}
    />
  );
}
```

### Prevent Mobile Zoom

```html
<!-- In next.config.ts or layout.tsx -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
```

### Font Size for Mobile

```css
/* Prevent auto-zoom on iOS when input is focused */
input {
  font-size: 16px; /* ≥ 16px prevents auto-zoom */
}
```

---

## Performance Optimizations

### Image Optimization

```typescript
export function ResponsiveImage() {
  return (
    <img
      src="/image-desktop.jpg"
      srcSet="
        /image-mobile.jpg 640w,
        /image-tablet.jpg 768w,
        /image-desktop.jpg 1280w
      "
      sizes="
        (max-width: 640px) 100vw,
        (max-width: 768px) 90vw,
        (max-width: 1280px) 80vw,
        1000px
      "
      alt="Scene preview"
      className="w-full object-cover"
    />
  );
}
```

### Lazy Loading

```typescript
// Load asset library drawer only when needed
const AssetLibrary = lazy(() => import('./AssetLibrary'));

export function StudioEditor() {
  return (
    <Suspense fallback={<div>Loading assets...</div>}>
      <AssetLibrary />
    </Suspense>
  );
}
```

---

## Accessibility (WCAG 2.1 AA)

### Color Contrast

```css
/* Minimum 4.5:1 for normal text, 3:1 for large text */
.button-text {
  color: #1a1a1a;          /* Text */
  background-color: #f5f5f5; /* Background */
  /* Contrast ratio: 9.5:1 ✓ */
}
```

### Focus Indicators

```css
button:focus {
  outline: 2px solid #0066ff;
  outline-offset: 2px;
}
```

### Keyboard Navigation

```typescript
export function SceneList({ scenes }: Props) {
  return (
    <div role="list">
      {scenes.map((scene, idx) => (
        <button
          key={scene.id}
          role="listitem"
          tabIndex={idx === 0 ? 0 : -1}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              // Navigate to next
            } else if (e.key === 'ArrowUp') {
              // Navigate to previous
            }
          }}
        >
          {scene.title}
        </button>
      ))}
    </div>
  );
}
```

---

## Testing Checklist

### Responsive Design Testing

- [ ] Test at all breakpoints (320px, 640px, 768px, 1024px, 1280px, 1536px)
- [ ] Test landscape and portrait orientations
- [ ] Test with browser DevTools device emulation
- [ ] Test on real devices (iPhone, iPad, Android, laptops)
- [ ] Test text scaling (100%, 150%, 200%)
- [ ] Test zoom levels (100%, 125%, 150%)

### Touch Testing

- [ ] Test all buttons are 48px minimum (mobile)
- [ ] Test spacing between touch targets (8px minimum)
- [ ] Test no accidental touches
- [ ] Test long-press gestures
- [ ] Test swipe gestures (if applicable)
- [ ] Test with assistive technologies (screen readers)

### Performance Testing

- [ ] Lighthouse score ≥ 90
- [ ] Core Web Vitals passing
- [ ] Images optimized and lazy-loaded
- [ ] Smooth scrolling (60fps)
- [ ] Load time < 3s on 4G

---

## Browser Support

- **Desktop**: Chrome, Firefox, Safari (latest 2 versions)
- **Mobile**: iOS 12+, Android 8+
- **Feature flags** for older browsers:
  - CSS Grid fallback to Flexbox
  - CSS Variables fallback to fixed values
  - No JavaScript for critical features

---

**Document Version**: 1.0
**Status**: Design Specifications Complete
**Next**: Implement components with these specs
