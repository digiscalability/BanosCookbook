# 🤖 How to Use GitHub Copilot to Complete the Video Editor

**Step-by-step guide for using the comprehensive prompt file to build the remaining components.**

---

## 📋 **Prerequisites**

✅ GitHub Copilot installed in VS Code
✅ Copilot Chat enabled
✅ Phase 1 complete (Timeline built)
✅ Dependencies installed

---

## 🚀 **Method 1: Using Copilot Edit Mode (RECOMMENDED)**

### Step 1: Open the Prompt File
```bash
code .github/copilot-video-editor-prompt.md
```

### Step 2: Create the Component File
For example, to build Upload Manager:
```bash
code src/components/video-editor/upload/upload-manager.tsx
```

### Step 3: Activate Copilot Edit Mode
- Press **Cmd/Ctrl + I** (or right-click → "Copilot" → "Edit")
- The inline chat will appear

### Step 4: Give Copilot the Context
Copy the relevant section from `copilot-video-editor-prompt.md` and paste into the chat:

```
Build the Upload Manager component with the following requirements:

[Paste the "Phase 2: Upload & Asset Management - File 1" section]

Key requirements:
- Use react-dropzone for drag-and-drop
- Upload to Firebase Storage at assets/{recipeId}/{type}/{filename}
- Generate video thumbnails
- Extract audio waveforms using wavesurfer.js
- Show upload progress
- Save to Firestore asset_library collection
- Handle errors gracefully

Follow the existing code style from timeline components.
Use TypeScript strictly, import types from ../types.ts.
Use shadcn/ui components (Button, Progress).
```

### Step 5: Let Copilot Generate
- Copilot will generate the full component
- Review the code
- Accept or modify as needed
- Press **Accept** or manually edit

### Step 6: Test the Component
```bash
npm run build
# Check for errors
# Test in browser
```

### Step 7: Repeat for Next Component
Move to the next file (Asset Panel) and repeat steps 2-6.

---

## 🎯 **Method 2: Using Copilot Chat Panel**

### Step 1: Open Copilot Chat
- Press **Cmd/Ctrl + Shift + I**
- Or click the Copilot icon in sidebar

### Step 2: Reference the Prompt File
Type in the chat:
```
@workspace Using the requirements in .github/copilot-video-editor-prompt.md,
create the Upload Manager component at src/components/video-editor/upload/upload-manager.tsx

Follow these specifics:
- Use react-dropzone for drag-and-drop zones
- Upload to Firebase Storage
- Generate video thumbnails using canvas
- Extract audio waveforms with wavesurfer.js
- Save metadata to Firestore asset_library collection
- Match the code style from timeline components in src/components/video-editor/timeline/
```

### Step 3: Review Generated Code
- Copilot will show the full component in chat
- Copy the code
- Paste into the file
- Review and adjust

### Step 4: Ask Follow-up Questions
If something is unclear:
```
How do I generate video thumbnails from a File object?
```

```
Show me the Firebase Storage upload with progress tracking
```

---

## 💡 **Method 3: Component-by-Component Prompts**

### For Upload Manager
```
Create a React component for uploading videos, images, audio, and subtitle files.

Requirements:
- Use react-dropzone with separate drop zones for each file type
- Upload to Firebase Storage at path: assets/{recipeId}/{type}/{filename}
- Show upload progress for each file (0-100%)
- Generate video thumbnails using HTML5 canvas
- Extract audio waveforms using wavesurfer.js
- Save asset metadata to Firestore collection 'asset_library'
- Handle errors: file too large (>500MB video, >50MB audio), unsupported format
- TypeScript strict mode, import types from ../types.ts
- Use shadcn/ui Button and Progress components
- Style with Tailwind: bg-gray-900, text-white, border-gray-700

File structure:
interface UploadManagerProps {
  recipeId: string;
  onUploadComplete: (assets: EditorAsset[]) => void;
}

Reference: src/components/video-editor/types.ts for EditorAsset and UploadTask types
Reference: src/lib/firebase.ts for Firebase client SDK
Reference: config/firebase-admin.js for Firestore operations
```

### For Asset Panel
```
Create a React component to display and manage uploaded assets.

Requirements:
- Display assets grouped by type: Videos, Images, Audio, Subtitles
- Show thumbnails for videos/images (from metadata.thumbnail)
- Show waveforms for audio (from metadata.waveform)
- Search/filter by filename
- Grid layout with hover effects
- Drag asset to timeline using HTML5 drag-and-drop API
- Delete asset with confirmation dialog (delete from Storage + Firestore)
- Empty state when no assets: "No assets yet. Click + Upload"
- TypeScript strict, import types from ../types.ts
- Use shadcn/ui Button, Input, Dialog components
- Tailwind styling: bg-gray-800, text-white

Component structure:
interface AssetPanelProps {
  recipeId: string;
  assets: EditorAsset[];
  onDragStart: (asset: EditorAsset) => void;
  onRefresh: () => void;
}

Tab navigation: All | Videos | Audio | Images | Subtitles
Grid item: Thumbnail, filename, duration/size
Drag behavior: Set dataTransfer with asset data JSON
```

### For Video Preview
```
Create a React video preview component synced with timeline.

Requirements:
- Use react-player for video playback
- Find and display the active clip at currentTime
- Playback controls: Play/Pause, Skip ±5s, Frame-by-frame (±1 frame)
- Timecode display: MM:SS.FFF / MM:SS.FFF
- Playback speed: 0.25x, 0.5x, 1x, 2x dropdown
- Canvas overlay for text/image clips (use fabric.js or native canvas)
- Sync playback position with timeline playhead
- Handle multiple overlapping clips (stack by track order)
- Respect track visibility (don't show hidden tracks)
- Keyboard shortcuts:
  - Space: Play/Pause
  - Arrow Left/Right: ±1 frame
  - Shift + Arrow: ±1 second
- TypeScript strict, import types from ../types.ts
- Use shadcn/ui Button, Slider components

Logic:
function getActiveClips(timeline: Timeline, currentTime: number): Clip[] {
  // Find clips where startTime <= currentTime < endTime
  // Filter by track.visible
  // Sort by track.order (lower = bottom layer)
}

Canvas rendering:
- Render video clips from react-player
- Overlay image clips at specified position/scale
- Overlay text clips with fabric.js or canvas text
- Apply filters (brightness, contrast) to canvas
```

### For Editing Tools
```
Create a React component with video editing tools.

Requirements:
- Split clip at playhead: Cut clip into two at current time
- Copy selected clips: Store in state/clipboard
- Paste clips: Insert at playhead position on selected track
- Add text overlay: Modal to input text, font, color, position
- Filter controls: Sliders for brightness (0-200), contrast, saturation
- Effect duration: Number input for fade in/out duration
- Ripple delete: Delete clip and shift subsequent clips left
- Undo/redo: Command history stack
- TypeScript strict, import types from ../types.ts
- Use shadcn/ui Button, Slider, Input, Dialog

Tools UI:
- Vertical toolbar with icon buttons
- Properties panel when clip selected
- Show clip name, duration, properties
- Tabs: Basic | Effects | Filters | Text

Split logic:
function splitClip(clip: Clip, splitTime: number): [Clip, Clip] {
  const relativeTime = splitTime - clip.startTime;
  return [
    { ...clip, id: newId(), endTime: splitTime, duration: relativeTime },
    { ...clip, id: newId(), startTime: splitTime, duration: clip.duration - relativeTime }
  ];
}
```

---

## 🎨 **Prompt Engineering Tips**

### ✅ DO:
- **Be specific**: Mention exact library names (react-dropzone, wavesurfer.js)
- **Reference existing code**: "Match the style in timeline/timeline.tsx"
- **Specify types**: "Import types from ../types.ts, use EditorAsset interface"
- **Include examples**: Show function signatures, data structures
- **Mention constraints**: "Max 500MB file size", "TypeScript strict mode"
- **List UI requirements**: "Tailwind bg-gray-900, text-white"
- **Request error handling**: "Show toast on upload fail, retry button"

### ❌ DON'T:
- Be vague: "Create an uploader" → Specify file types, storage, progress
- Forget types: Always mention TypeScript, import types
- Skip error handling: Always request error cases
- Ignore styling: Specify Tailwind classes, color scheme
- Mix concerns: One component at a time, don't combine Upload + Asset Panel

---

## 🔄 **Iterative Refinement**

### If Copilot generates incorrect code:

**Problem**: Wrong import paths
```
The import '../types' is wrong. Fix it to use relative path from upload/ folder.
```

**Problem**: Missing error handling
```
Add error handling for Firebase upload failures. Show error toast and retry button.
```

**Problem**: Wrong component structure
```
This should be a controlled component. Add props: value, onChange instead of internal state.
```

**Problem**: Missing TypeScript types
```
Add TypeScript types for all function parameters and return values. Import from ../types.ts.
```

---

## 🧪 **Testing Each Component**

After generating each component:

### 1. Check Compilation
```bash
npm run build
```
Fix any TypeScript errors

### 2. Check Lint
```bash
npm run lint
```
Fix ESLint warnings

### 3. Visual Test
```bash
npm run dev
```
Visit http://localhost:9002 and test the component

### 4. Functional Test
- Upload a file → Check Firebase Storage
- Drag asset → Check timeline updates
- Click button → Check expected behavior

---

## 📦 **Suggested Build Order**

### Week 1: Core Functionality
1. **Upload Manager** (Day 1-2)
   - Prompt from "Phase 2 - File 1"
   - Test: Upload video, see in Firebase Storage

2. **Asset Panel** (Day 2-3)
   - Prompt from "Phase 2 - File 2"
   - Test: Drag asset to timeline

3. **Workspace** (Day 3-4)
   - Prompt from "Phase 8"
   - Test: See all components connected

4. **Video Preview** (Day 4-5)
   - Prompt from "Phase 3"
   - Test: Click play, see video

5. **Integration** (Day 5)
   - Prompt from "Phase 9"
   - Test: Access from Video Hub

### Week 2: Advanced Features
6. **Editing Tools** (Day 6-7)
7. **Export/Rendering** (Day 8-10)
8. **Effects & Transitions** (Day 11-12)
9. **Audio Panel** (Day 13)
10. **Subtitle Editor** (Day 14)

---

## 🎯 **Example: Building Upload Manager**

### Full Copilot Prompt:

```
@workspace Create src/components/video-editor/upload/upload-manager.tsx

Requirements:
1. Multi-file uploader with react-dropzone
2. Separate drop zones for: Videos (.mp4, .webm, .mov), Images (.jpg, .png), Audio (.mp3, .wav), Subtitles (.srt)
3. Max file sizes: Video 500MB, Audio 50MB, Image 10MB, Subtitle 1MB
4. Upload to Firebase Storage: assets/{recipeId}/{type}/{filename}
5. Show upload progress (0-100%) for each file using Progress component
6. Generate video thumbnails: Use canvas.drawImage() at 0.5s mark
7. Extract audio waveforms: Use wavesurfer.js create() with peaks data
8. Save to Firestore collection 'asset_library' with type EditorAsset
9. Error handling:
   - File too large: Show error toast, don't upload
   - Unsupported format: Validate extension before upload
   - Network error: Show retry button
10. TypeScript strict mode
11. Import types: EditorAsset, AssetType, UploadTask from '../types'
12. Import Firebase: storage from '@/lib/firebase', getDb from '@/config/firebase-admin'
13. Use shadcn/ui: Button, Progress from '@/components/ui/'
14. Styling: Tailwind classes, bg-gray-900, text-white, border-gray-700
15. Layout: 4-column grid for drop zones, list of upload tasks below

Component signature:
interface UploadManagerProps {
  recipeId: string;
  onUploadComplete: (assets: EditorAsset[]) => void;
  maxFileSize?: number;
}

export function UploadManager({ recipeId, onUploadComplete, maxFileSize = 500 * 1024 * 1024 }: UploadManagerProps)

Reference existing code style from: src/components/video-editor/timeline/timeline.tsx
```

Copilot will generate a complete, working component!

---

## ✅ **Success Checklist**

After each component generation:
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings
- [ ] Component renders in browser
- [ ] Functionality works as expected
- [ ] Error cases handled gracefully
- [ ] Styling matches design system
- [ ] Firebase operations succeed
- [ ] Props/types match interface
- [ ] Keyboard shortcuts work (if applicable)
- [ ] Mobile responsive (if applicable)

---

## 🎉 **You're Ready!**

1. Open `.github/copilot-video-editor-prompt.md`
2. Start with **Phase 2: Upload Manager**
3. Use **Cmd/Ctrl + I** to open Copilot Edit Mode
4. Copy/paste the Upload Manager requirements
5. Let Copilot generate the component
6. Test and refine
7. Move to next component

**Estimated time**: 30-60 minutes per component with Copilot assistance

---

**Happy building! The video editor will be complete in no time.** 🚀
