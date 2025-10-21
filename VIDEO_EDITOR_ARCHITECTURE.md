# 🎬 Professional Video Editor - Architecture & Implementation Plan

**Date**: October 21, 2025
**Goal**: Transform Video Hub into a professional video editor (Veed.io / Final Cut style)
**Status**: 🚧 Phase 1 - Planning & Architecture

---

## 🎯 **Vision**

Create a browser-based professional video editor that allows users to:
- Upload videos, images, audio, and subtitle files
- Arrange assets on a multi-track timeline
- Edit with frame-by-frame precision
- Apply effects, transitions, and text overlays
- Export high-quality videos for Instagram/TikTok

**Why**: Runway ML's image-to-video limitation makes AI generation impractical. A manual editor gives users full control while we improve AI capabilities.

---

## 🏗️ **System Architecture**

### Component Hierarchy

```
src/components/video-editor/
├── video-editor-workspace.tsx    # Main container (full-screen editor)
├── timeline/
│   ├── timeline.tsx              # Multi-track timeline component
│   ├── timeline-track.tsx        # Single track (video/audio/text)
│   ├── timeline-clip.tsx         # Individual clip on track
│   ├── playhead.tsx              # Current time indicator
│   └── zoom-controls.tsx         # Timeline zoom/scroll
├── preview/
│   ├── video-preview.tsx         # Video canvas with playback
│   ├── playback-controls.tsx    # Play/pause/frame-step
│   ├── canvas-overlay.tsx       # For text/effects preview
│   └── timecode-display.tsx     # Current time display
├── panels/
│   ├── asset-panel.tsx          # Library of uploaded media
│   ├── tools-panel.tsx          # Editing tools (trim/split/etc)
│   ├── effects-panel.tsx        # Filters/transitions
│   ├── text-panel.tsx           # Text overlay editor
│   └── properties-panel.tsx     # Selected clip properties
├── upload/
│   ├── upload-manager.tsx       # Multi-file uploader
│   ├── upload-zone.tsx          # Drag-and-drop zone
│   └── upload-progress.tsx      # Upload status
└── export/
    ├── export-modal.tsx         # Export settings
    ├── render-preview.tsx       # Pre-render preview
    └── download-manager.tsx     # Download handling
```

### Data Models

```typescript
// Timeline Data Structure
interface Timeline {
  id: string;
  recipeId: string;
  duration: number; // Total timeline duration in seconds
  tracks: Track[];
  fps: number; // Frames per second (default: 30)
  resolution: { width: number; height: number }; // e.g., 1280x720
  createdAt: Date;
  updatedAt: Date;
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'subtitle';
  name: string;
  clips: Clip[];
  locked: boolean;
  visible: boolean;
  volume?: number; // For audio tracks (0-100)
  order: number; // Track stacking order
}

interface Clip {
  id: string;
  assetId: string; // Reference to Asset Library item
  assetUrl: string; // Direct URL for preview
  startTime: number; // Position on timeline (seconds)
  endTime: number; // End position on timeline (seconds)
  duration: number; // Clip length (seconds)
  trimStart?: number; // Trim from asset start (seconds)
  trimEnd?: number; // Trim from asset end (seconds)
  volume?: number; // Clip-specific volume override
  effects?: Effect[];
  transitions?: Transition[];
  properties?: ClipProperties;
}

interface ClipProperties {
  position?: { x: number; y: number }; // For images/text
  scale?: { x: number; y: number }; // Zoom level
  rotation?: number; // Degrees
  opacity?: number; // 0-100
  crop?: { top: number; bottom: number; left: number; right: number };
  filters?: {
    brightness?: number; // 0-200 (100 = normal)
    contrast?: number;
    saturation?: number;
    blur?: number;
  };
}

interface Effect {
  type: 'fade-in' | 'fade-out' | 'zoom' | 'pan' | 'blur' | 'color-grade';
  startTime: number; // Relative to clip start
  duration: number;
  parameters: Record<string, unknown>;
}

interface Transition {
  type: 'fade' | 'dissolve' | 'wipe' | 'slide';
  duration: number; // Transition length (seconds)
  position: 'start' | 'end';
}

// Asset Library (Enhanced)
interface EditorAsset {
  id: string;
  recipeId: string;
  type: 'video' | 'audio' | 'image' | 'subtitle';
  url: string;
  storagePath: string;
  filename: string;
  fileSize: number; // Bytes
  duration?: number; // For video/audio (seconds)
  dimensions?: { width: number; height: number }; // For video/image
  metadata: {
    format?: string; // mp4, jpg, mp3, srt
    codec?: string; // h264, aac, etc.
    fps?: number;
    bitrate?: number;
    waveform?: string; // Data URI for audio waveform visualization
    thumbnail?: string; // Data URI or URL for video thumbnail
  };
  createdAt: Date;
}

// Export Configuration
interface ExportConfig {
  format: 'mp4' | 'webm' | 'mov';
  resolution: '1920x1080' | '1280x720' | '1080x1920' | '720x1280'; // HD, SD, TikTok vertical
  quality: 'low' | 'medium' | 'high' | 'ultra';
  fps: 24 | 30 | 60;
  codec: 'h264' | 'vp9';
  audioCodec: 'aac' | 'opus';
  bitrate?: number; // kbps
}
```

---

## 🎨 **UI Layout**

### Full-Screen Editor (Veed.io Style)

```
┌─────────────────────────────────────────────────────────────┐
│ [<- Back] Recipe: Peanut Pastries     [Export Video ▼]     │
├──────────────────┬──────────────────────────────────────────┤
│                  │                                          │
│  Asset Library   │         Video Preview Canvas            │
│                  │                                          │
│  [+ Upload]      │  ┌────────────────────────────────┐     │
│                  │  │                                │     │
│  Videos (3)      │  │      [Video Preview]          │     │
│  ├─ scene1.mp4   │  │                                │     │
│  ├─ scene2.mp4   │  │     1280x720 @ 30fps          │     │
│  └─ scene3.mp4   │  │                                │     │
│                  │  └────────────────────────────────┘     │
│  Images (5)      │                                          │
│  ├─ pastry.jpg   │  [⏮][◀][▶][⏸][⏭]  00:00:05 / 00:00:30 │
│  └─ oven.jpg     │                                          │
│                  │  Tools: [Trim][Split][Text][Effects]    │
│  Audio (2)       │                                          │
│  └─ voiceover.mp3│                                          │
│                  │                                          │
│  Subtitles (1)   │                                          │
│  └─ captions.srt │                                          │
├──────────────────┴──────────────────────────────────────────┤
│                      Timeline                               │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Video 1 ┃━━━━━clip1━━━━┃━━━━━clip2━━━━┃              │ │
│ │ Audio 1 ┃━━━━━━━━voiceover━━━━━━━━━┃                 │ │
│ │ Text 1  ┃━title━┃          ┃━━outro━┃                 │ │
│ │ Subtitle┃━━━━━━━━━━━captions━━━━━━━━━┃               │ │
│ └────────────────────────────────────────────────────────┘ │
│          [🔍- 🔍+]  0s────5s────10s────15s────20s────25s   │
└─────────────────────────────────────────────────────────────┘
```

### Key UI Elements

1. **Top Bar**: Navigation, recipe name, export button
2. **Left Panel**: Asset Library with uploaded media
3. **Center**: Video preview canvas with playback controls
4. **Right Panel** (optional): Properties/effects for selected clip
5. **Bottom**: Multi-track timeline with zoom controls

---

## 🔧 **Technical Stack**

### Core Libraries

```json
{
  "dependencies": {
    "@xzdarcy/react-timeline-editor": "^0.1.9",
    "react-player": "^2.16.0",
    "fabric": "^6.0.0",
    "ffmpeg.wasm": "^0.12.10",
    "react-dropzone": "^14.2.3",
    "wavesurfer.js": "^7.8.0",
    "subtitle": "^5.0.0"
  }
}
```

### Library Purposes

- **@xzdarcy/react-timeline-editor**: Professional timeline component with tracks, clips, zoom
- **react-player**: Video playback with frame-by-frame control
- **fabric.js**: Canvas-based editing (text overlays, image manipulation)
- **ffmpeg.wasm**: Client-side video processing (trim, merge, export)
- **react-dropzone**: Drag-and-drop file uploads
- **wavesurfer.js**: Audio waveform visualization for precise audio editing
- **subtitle**: Parse/generate SRT subtitle files

---

## 🚀 **Implementation Phases**

### **Phase 1: Core Timeline (Week 1)** ✅ YOU ARE HERE

**Goal**: Basic timeline with drag-and-drop clips

**Tasks**:
1. ✅ Install dependencies
2. Create basic timeline component
3. Add playhead and time markers
4. Implement drag clips to timeline
5. Add zoom in/out controls

**Deliverable**: Users can drag assets to timeline and see them arranged

---

### **Phase 2: Upload & Asset Management (Week 1-2)**

**Goal**: Upload any media type

**Tasks**:
1. Create multi-file uploader with drag-and-drop
2. Integrate Firebase Storage for uploads
3. Generate thumbnails for videos
4. Extract audio waveforms
5. Build asset library panel UI

**Deliverable**: Users can upload videos, images, audio, subtitles and see them in Asset Library

---

### **Phase 3: Video Preview & Playback (Week 2)**

**Goal**: Preview timeline in real-time

**Tasks**:
1. Build video preview component
2. Implement playback controls (play/pause/seek)
3. Frame-by-frame navigation (arrow keys)
4. Sync timeline playhead with preview
5. Add timecode display

**Deliverable**: Users can play timeline and see clips render in order

---

### **Phase 4: Basic Editing Tools (Week 2-3)**

**Goal**: Trim, split, delete clips

**Tasks**:
1. Trim tool: Drag clip edges to adjust duration
2. Split tool: Cut clip at playhead position
3. Delete tool: Remove clip from timeline
4. Copy/paste clips
5. Undo/redo functionality

**Deliverable**: Users can edit clip timing and arrangement

---

### **Phase 5: Effects & Transitions (Week 3)**

**Goal**: Visual polish

**Tasks**:
1. Fade in/out effects
2. Cross-dissolve transitions between clips
3. Basic filters (brightness, contrast, saturation)
4. Text overlay editor
5. Effects preview in real-time

**Deliverable**: Users can add professional effects to clips

---

### **Phase 6: Audio & Subtitles (Week 4)**

**Goal**: Complete multimedia editing

**Tasks**:
1. Audio waveform visualization
2. Volume controls per clip
3. Audio fade in/out
4. Subtitle editor with timeline sync
5. SRT import/export

**Deliverable**: Users can edit audio and add captions

---

### **Phase 7: Export & Rendering (Week 4)**

**Goal**: Generate final video

**Tasks**:
1. Integrate FFmpeg.wasm for client-side rendering
2. Export settings modal (resolution, format, quality)
3. Rendering progress indicator
4. Download final video
5. Save to Firebase Storage

**Deliverable**: Users can export edited video to MP4/WebM

---

## 📊 **Data Flow**

### Upload Flow
```
User drops file → react-dropzone
  ↓
Upload to Firebase Storage → Get URL
  ↓
Save to Firestore (asset_library collection)
  ↓
Update Asset Library panel state
  ↓
Generate thumbnail/waveform (if video/audio)
```

### Editing Flow
```
User drags asset to timeline → Create Clip object
  ↓
Add to Timeline.tracks[].clips[]
  ↓
Save to Firestore (timeline collection)
  ↓
Update timeline component state
  ↓
Preview canvas re-renders
```

### Export Flow
```
User clicks Export → Open export modal
  ↓
User selects settings (resolution, quality)
  ↓
FFmpeg.wasm processes timeline:
  - Load all asset URLs
  - Apply effects/transitions
  - Merge clips in order
  - Render to single video
  ↓
Download to user's device
  ↓
(Optional) Upload to Firebase Storage
```

---

## 🎯 **Feature Priorities**

### Must-Have (MVP)
- ✅ Multi-track timeline
- ✅ Upload videos/images/audio
- ✅ Drag clips to timeline
- ✅ Trim clips (adjust duration)
- ✅ Video preview with playback
- ✅ Export to MP4

### Should-Have (V1.1)
- Split clips
- Fade in/out transitions
- Text overlays
- Volume controls
- Subtitle editor
- Undo/redo

### Nice-to-Have (V1.2+)
- Advanced effects (blur, color grade)
- Keyframe animations
- Audio ducking (auto-lower music when voice plays)
- Collaboration (multi-user editing)
- AI auto-edit suggestions
- Template library

---

## 🔐 **Security & Performance**

### Upload Limits
- Max file size: **500 MB** per file
- Supported formats:
  - Video: mp4, webm, mov, avi
  - Image: jpg, png, gif, webp
  - Audio: mp3, wav, aac, m4a
  - Subtitle: srt, vtt

### Storage Strategy
- Store assets in Firebase Storage: `assets/{recipeId}/{type}/{filename}`
- Timeline data in Firestore: `timelines/{recipeId}`
- Auto-delete unused assets after 30 days

### Performance
- Lazy load assets (don't load all videos simultaneously)
- Use video thumbnails in timeline (not full video)
- Render export in Web Worker to avoid blocking UI
- Cache rendered segments for faster re-exports

---

## 🎨 **UI/UX Guidelines**

### Design Principles
1. **Familiar**: Match Veed.io / Final Cut keyboard shortcuts
2. **Responsive**: Works on laptop screens (1280px minimum width)
3. **Fast**: Instant feedback for all actions
4. **Forgiving**: Undo/redo for everything, auto-save

### Keyboard Shortcuts
- **Space**: Play/Pause
- **Arrow Left/Right**: Frame-by-frame (1/30s)
- **Shift + Arrow**: Jump 1 second
- **Cmd/Ctrl + Z**: Undo
- **Cmd/Ctrl + Shift + Z**: Redo
- **Cmd/Ctrl + S**: Save timeline
- **Cmd/Ctrl + E**: Export video
- **Delete/Backspace**: Delete selected clip

### Color Coding
- **Video clips**: Blue (#4A90E2)
- **Audio clips**: Green (#7ED321)
- **Image clips**: Purple (#BD10E0)
- **Text clips**: Orange (#F5A623)
- **Subtitle clips**: Gray (#9B9B9B)

---

## 🔗 **Integration with Existing System**

### Connect with AI Generation
- Import AI-generated scenes directly to timeline
- Each scene becomes a clip on video track
- Voiceovers become clips on audio track
- AI prompts saved as clip metadata

### Asset Library Sync
- Existing Asset Library becomes source for timeline
- Timeline clips reference assets by ID
- Deleting asset warns if used in timeline

### Recipe Workflow
```
Recipe Page → Video Hub → [Generate AI Scenes] OR [Manual Editor]
                              ↓                          ↓
                        Auto-populate timeline    Empty timeline
                              ↓                          ↓
                         Edit/refine  ← ─ ─ ─ ─ ─  Add assets manually
                              ↓
                         Export video
                              ↓
                      Post to Instagram
```

---

## 📝 **Database Schema**

### Firestore Collections

```typescript
// Collection: timelines
{
  id: string;
  recipeId: string;
  name: string;
  duration: number;
  fps: 30;
  resolution: { width: 1280, height: 720 };
  tracks: [
    {
      id: 'track1',
      type: 'video',
      name: 'Video Track 1',
      clips: [
        {
          id: 'clip1',
          assetId: 'asset123',
          assetUrl: 'https://...',
          startTime: 0,
          endTime: 5,
          duration: 5,
          trimStart: 0,
          trimEnd: 0,
          effects: [],
          transitions: [{ type: 'fade', duration: 0.5, position: 'end' }]
        }
      ]
    }
  ];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  exportedVideoUrl?: string;
}

// Collection: asset_library (existing, enhanced)
{
  id: string;
  recipeId: string;
  type: 'video' | 'audio' | 'image' | 'subtitle';
  url: string;
  storagePath: string;
  filename: string;
  fileSize: number;
  duration?: number;
  dimensions?: { width: number, height: number };
  metadata: {
    format: string;
    thumbnail?: string;
    waveform?: string;
  };
  usedInTimelines: string[]; // Array of timeline IDs using this asset
  createdAt: Timestamp;
}
```

---

## ✅ **Success Metrics**

### MVP Success
- [ ] User can upload 3+ different media types
- [ ] User can drag clips to timeline
- [ ] User can trim clips to desired length
- [ ] User can preview edited video
- [ ] User can export to MP4 (under 2 minutes render time for 30s video)

### V1.1 Success
- [ ] 90% of users successfully export a video within 10 minutes
- [ ] Average video edit session: 5-15 minutes
- [ ] Export success rate: >95%
- [ ] User satisfaction: 4+ stars

---

## 🚨 **Known Challenges**

### Technical Challenges
1. **FFmpeg.wasm performance**: May be slow for long videos (>2 min)
   - **Solution**: Server-side rendering with progress updates

2. **Browser memory limits**: Loading many large videos can crash tab
   - **Solution**: Load thumbnails only, stream full videos on-demand

3. **Cross-browser compatibility**: Safari handles video differently
   - **Solution**: Test on Chrome, Firefox, Safari, Edge

4. **Mobile support**: Timeline difficult on small screens
   - **Solution**: Minimum 1024px width, warn mobile users

### UX Challenges
1. **Learning curve**: Professional editors are complex
   - **Solution**: Interactive tutorial on first use, tooltips

2. **Asset organization**: Users may upload many files
   - **Solution**: Search, filters, folders, tags

3. **Undo/redo complexity**: Track every timeline change
   - **Solution**: Use Immer.js for immutable state updates

---

## 📚 **Resources**

### Inspiration
- **Veed.io**: Clean UI, simple timeline
- **Descript**: AI-powered, script-based editing
- **Kapwing**: Browser-based, fast export
- **Final Cut Pro**: Professional features, magnetic timeline

### Documentation
- [React Timeline Editor](https://github.com/xzdarcy/react-timeline-editor)
- [FFmpeg.wasm Guide](https://ffmpegwasm.netlify.app/)
- [Fabric.js Docs](http://fabricjs.com/docs/)
- [Wavesurfer.js](https://wavesurfer.xyz/)

---

## 🎯 **Next Steps**

1. **Install dependencies** (5 min)
   ```bash
   npm install @xzdarcy/react-timeline-editor react-player fabric ffmpeg.wasm react-dropzone wavesurfer.js subtitle
   ```

2. **Create basic timeline component** (2 hours)
   - File: `src/components/video-editor/timeline/timeline.tsx`
   - Show tracks, clips, playhead

3. **Add to Video Hub** (30 min)
   - New tab: "Editor" alongside "Scenes", "Asset Library"
   - Toggle between AI generation and manual editing

4. **Test with sample video** (30 min)
   - Upload test.mp4
   - Drag to timeline
   - Preview playback

**Ready to start implementation!** 🚀

---

**Questions before starting?**
- Preferred video resolution (1280x720 or 1920x1080)?
- Target video length (Instagram 60s vs TikTok 3min)?
- Export to Firebase Storage or just download?
