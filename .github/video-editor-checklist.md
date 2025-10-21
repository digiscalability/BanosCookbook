# Video Editor - Implementation Checklist

Quick reference for completing the video editor. Use this alongside the comprehensive prompt file.

---

## 🎯 **Quick Start**

1. Open `.github/copilot-video-editor-prompt.md`
2. Copy the relevant section for the component you're building
3. Use GitHub Copilot Edit Mode: Cmd/Ctrl + I
4. Paste the section as context
5. Let Copilot generate the component

---

## ✅ **Implementation Checklist**

### Phase 2: Upload & Asset Management
- [ ] **File 1**: `src/components/video-editor/upload/upload-manager.tsx`
  - [ ] Drag-and-drop zones (react-dropzone)
  - [ ] Firebase Storage upload with progress
  - [ ] Video thumbnail generation (canvas)
  - [ ] Audio waveform extraction (wavesurfer.js)
  - [ ] Save to Firestore asset_library collection
  - [ ] Error handling (file size, format, network)

- [ ] **File 2**: `src/components/video-editor/panels/asset-panel.tsx`
  - [ ] Display assets grouped by type
  - [ ] Search/filter functionality
  - [ ] Drag asset to timeline (HTML5 drag-and-drop)
  - [ ] Delete asset with confirmation
  - [ ] Grid view with thumbnails
  - [ ] Empty state

### Phase 3: Video Preview & Playback
- [ ] **File**: `src/components/video-editor/preview/video-preview.tsx`
  - [ ] React Player integration
  - [ ] Find active clip at currentTime
  - [ ] Playback controls (play/pause/skip)
  - [ ] Frame-by-frame navigation
  - [ ] Timecode display
  - [ ] Speed controls (0.25x to 2x)
  - [ ] Canvas overlay for text/images
  - [ ] Sync with timeline playhead
  - [ ] Handle multiple overlapping clips
  - [ ] Keyboard shortcuts (Space, Arrow keys)

### Phase 4: Editing Tools
- [ ] **File**: `src/components/video-editor/panels/editing-tools.tsx`
  - [ ] Split clip at playhead
  - [ ] Copy/paste clips (Cmd+C, Cmd+V)
  - [ ] Ripple delete (shift subsequent clips)
  - [ ] Add text overlay
  - [ ] Filter controls (brightness, contrast, saturation)
  - [ ] Effect duration controls (fade in/out)
  - [ ] Undo/redo system

### Phase 5: Effects & Transitions
- [ ] **File**: `src/components/video-editor/panels/effects-panel.tsx`
  - [ ] Effects library: Fade, Zoom, Pan, Blur
  - [ ] Transition library: Fade, Wipe, Slide, Zoom
  - [ ] Drag effect onto clip
  - [ ] Preview effect before applying
  - [ ] Remove effect button
  - [ ] Canvas rendering for effects

### Phase 6: Audio & Subtitles
- [ ] **File**: `src/components/video-editor/panels/audio-panel.tsx`
  - [ ] Waveform visualization (wavesurfer.js)
  - [ ] Volume slider per track
  - [ ] Volume keyframes (fade in/out)
  - [ ] Mute/solo buttons
  - [ ] Audio ducking

- [ ] **File**: `src/components/video-editor/panels/subtitle-editor.tsx`
  - [ ] Import SRT/VTT files
  - [ ] Display subtitles on preview
  - [ ] Edit subtitle text inline
  - [ ] Adjust timing (drag on timeline)
  - [ ] Export to SRT
  - [ ] Font/color customization
  - [ ] Position on canvas

### Phase 7: Export & Rendering
- [ ] **File**: `src/lib/video-renderer.ts`
  - [ ] Load FFmpeg.wasm in Web Worker
  - [ ] Download all asset files
  - [ ] Build FFmpeg filter complex
  - [ ] Apply effects and transitions
  - [ ] Merge video, audio, subtitles
  - [ ] Progress updates
  - [ ] Cancel rendering
  - [ ] Download or upload to Firebase
  - [ ] Export presets (Instagram, TikTok, YouTube)

### Phase 8: Main Workspace
- [ ] **File**: `src/components/video-editor/workspace.tsx`
  - [ ] Three-column layout (Assets | Preview | Timeline)
  - [ ] Global state management
  - [ ] Keyboard shortcuts globally
  - [ ] Auto-save to Firestore (debounced)
  - [ ] Load timeline on mount
  - [ ] Connect all sub-components
  - [ ] Top bar (back, recipe name, export)

### Phase 9: Integration
- [ ] **Modify**: `src/app/videohub/page.tsx`
  - [ ] Add "Editor" tab
  - [ ] Import VideoEditorWorkspace
  - [ ] Convert AI scenes to timeline clips
  - [ ] Save timeline to Firestore
  - [ ] Load timeline on page refresh
  - [ ] Connect export to Instagram posting

---

## 🚀 **Component Generation Order**

1. ✅ Timeline (DONE)
2. **Upload Manager** ← START HERE
3. **Asset Panel**
4. **Workspace** (connects everything)
5. **Video Preview**
6. **Integration** (make accessible in Video Hub)
7. **Editing Tools**
8. **Export/Rendering**
9. **Effects & Transitions**
10. **Audio & Subtitles**

---

## 📦 **Files to Create**

### Components
```
src/components/video-editor/
├── workspace.tsx                          # Main editor layout
├── upload/
│   ├── upload-manager.tsx                 # Multi-file uploader
│   └── upload-progress.tsx                # Progress indicators
├── preview/
│   ├── video-preview.tsx                  # Video player
│   ├── playback-controls.tsx              # Play/pause/skip
│   └── canvas-overlay.tsx                 # Text/effects overlay
├── panels/
│   ├── asset-panel.tsx                    # Asset library browser
│   ├── editing-tools.tsx                  # Split/copy/paste tools
│   ├── effects-panel.tsx                  # Effects library
│   ├── audio-panel.tsx                    # Audio waveforms
│   └── subtitle-editor.tsx                # Subtitle editor
└── export/
    ├── export-modal.tsx                   # Export settings
    └── render-progress.tsx                # Render progress
```

### Libraries
```
src/lib/
├── video-renderer.ts                      # FFmpeg.wasm wrapper
├── thumbnail-generator.ts                 # Video thumbnails
└── waveform-generator.ts                  # Audio waveforms
```

### Server Actions
```
src/app/actions.ts (add to existing)
- uploadAssetToFirebase()
- saveTimelineToFirestore()
- loadTimelineFromFirestore()
- deleteAssetFromStorage()
```

---

## 🎨 **Component Templates**

### Basic Component Structure
```typescript
'use client';

import { useState } from 'react';
import type { /* types */ } from '../types';
import { Button } from '@/components/ui/button';

interface ComponentNameProps {
  // Props
}

export function ComponentName({ /* props */ }: ComponentNameProps) {
  // State
  const [state, setState] = useState();

  // Handlers
  const handleAction = () => {
    // Logic
  };

  // Render
  return (
    <div className="component-container">
      {/* UI */}
    </div>
  );
}
```

### With Firebase Integration
```typescript
'use client';

import { useState, useEffect } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { getDb } from '@/config/firebase-admin';

export function ComponentWithFirebase() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File) => {
    setUploading(true);

    const storageRef = ref(storage, `assets/${recipeId}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        setUploading(false);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await saveToFirestore(url);
        setUploading(false);
      }
    );
  };

  return <div>{/* UI */}</div>;
}
```

---

## 🧪 **Testing Commands**

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Test timeline
# Visit: http://localhost:9002/test-timeline

# Test video hub with editor
# Visit: http://localhost:9002/videohub
```

---

## 📝 **Common Patterns**

### State Management
```typescript
// Timeline state
const [timeline, setTimeline] = useState<Timeline>(initialTimeline);

// Update clip in timeline
const updateClip = (clipId: string, updates: Partial<Clip>) => {
  setTimeline(prev => ({
    ...prev,
    tracks: prev.tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip =>
        clip.id === clipId ? { ...clip, ...updates } : clip
      ),
    })),
  }));
};
```

### Firestore Operations
```typescript
import { getDb } from '@/config/firebase-admin';

// Save timeline
async function saveTimeline(timeline: Timeline) {
  const db = getDb();
  await db.collection('timelines').doc(timeline.id).set({
    ...timeline,
    updatedAt: new Date(),
  });
}

// Load timeline
async function loadTimeline(recipeId: string): Promise<Timeline | null> {
  const db = getDb();
  const snapshot = await db.collection('timelines')
    .where('recipeId', '==', recipeId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Timeline;
}
```

### Keyboard Shortcuts
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepBackward();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepForward();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      undo();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## 🎯 **Success Verification**

After each component, verify:
- [ ] Component renders without errors
- [ ] TypeScript compiles (no type errors)
- [ ] Lint passes (no ESLint warnings)
- [ ] Functionality works as expected
- [ ] Keyboard shortcuts work (if applicable)
- [ ] Firebase operations succeed (if applicable)
- [ ] UI matches design guidelines (gray-900 bg, white text, etc.)

---

## 🚨 **Common Issues & Solutions**

### Issue: "Cannot find module '@/components/video-editor/types'"
**Solution**: Check import path, should be relative: `'../types'` or `'../../types'`

### Issue: "Type 'Timeline' is not assignable"
**Solution**: Import type: `import type { Timeline } from '../types';`

### Issue: "Firebase Storage upload fails"
**Solution**: Check Firebase Storage rules, ensure auth is configured

### Issue: "FFmpeg.wasm not loading"
**Solution**: Check if running in Web Worker, browser supports SharedArrayBuffer

### Issue: "Timeline clips not dragging"
**Solution**: Check if `onDragStart` handler is properly connected

---

## 📚 **Quick Links**

- [Full Prompt File](.github/copilot-video-editor-prompt.md)
- [Architecture Doc](../VIDEO_EDITOR_ARCHITECTURE.md)
- [Phase 1 Complete](../VIDEO_EDITOR_PHASE1_COMPLETE.md)
- [Types Reference](../src/components/video-editor/types.ts)
- [Timeline Example](../src/components/video-editor/timeline/timeline.tsx)

---

**Ready to build! Start with Upload Manager, then Asset Panel, then Workspace.** 🚀
