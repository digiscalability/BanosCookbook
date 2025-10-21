# GitHub Copilot Edit Mode - Video Editor Completion Prompt

**Project**: BanosCookbook Professional Video Editor
**Status**: Phase 1 Complete (Timeline Built) → Phase 2-7 Remaining
**Goal**: Complete a professional browser-based video editor similar to Veed.io and Final Cut Pro

---

## 🎯 **Context: What's Already Built**

### ✅ Phase 1 - Complete
- **Timeline component**: Multi-track editor with drag-and-drop clips (`src/components/video-editor/timeline/`)
- **Type system**: Complete TypeScript interfaces (`src/components/video-editor/types.ts`)
- **Architecture**: Full system design documented (`VIDEO_EDITOR_ARCHITECTURE.md`)
- **Working features**: Drag clips, trim, zoom, snap-to-grid, multi-select, color-coded tracks

### 📁 Existing Structure
```
src/components/video-editor/
├── types.ts                         # 337 lines - Complete type definitions
├── timeline/                        # Complete - 5 components
│   ├── timeline.tsx                 # Main timeline with zoom controls
│   ├── timeline-track.tsx           # Track rows
│   ├── timeline-clip.tsx            # Draggable clips with trim handles
│   ├── timeline-playhead.tsx        # Red playhead indicator
│   └── timeline-ruler.tsx           # Time markers
├── preview/                         # EMPTY - Need to build
├── panels/                          # EMPTY - Need to build
└── upload/                          # EMPTY - Need to build
```

### 🔧 Tech Stack
- **Next.js 15.5.4** with App Router
- **TypeScript** (strict mode)
- **Tailwind CSS** + shadcn/ui components
- **Firebase Storage** for file uploads
- **Firestore** for timeline/asset data
- **Libraries installed**:
  - `react-player` (video playback)
  - `fabric` (canvas manipulation)
  - `@ffmpeg/ffmpeg` (video rendering)
  - `react-dropzone` (file uploads)
  - `wavesurfer.js` (audio waveforms)
  - `subtitle` (SRT parsing)

---

## 🚀 **What Needs to Be Built (Phases 2-7)**

### **Phase 2: Upload & Asset Management** (HIGH PRIORITY)

#### File 1: `src/components/video-editor/upload/upload-manager.tsx`
**Purpose**: Multi-file uploader with drag-and-drop for videos, images, audio, subtitles

**Requirements**:
- Use `react-dropzone` for drag-and-drop zones
- Accept multiple file types:
  - Videos: `.mp4`, `.webm`, `.mov`, `.avi` (max 500MB)
  - Images: `.jpg`, `.png`, `.gif`, `.webp` (max 10MB)
  - Audio: `.mp3`, `.wav`, `.aac`, `.m4a` (max 50MB)
  - Subtitles: `.srt`, `.vtt` (max 1MB)
- Upload to Firebase Storage: `assets/{recipeId}/{type}/{filename}`
- Generate video thumbnails using canvas API
- Extract audio waveforms using `wavesurfer.js`
- Show upload progress (0-100%) for each file
- Store metadata in Firestore `asset_library` collection
- Handle errors gracefully (file too large, unsupported format, network errors)

**Component Structure**:
```typescript
interface UploadManagerProps {
  recipeId: string;
  onUploadComplete: (assets: EditorAsset[]) => void;
  maxFileSize?: number; // In bytes
}

export function UploadManager({ recipeId, onUploadComplete, maxFileSize }: UploadManagerProps) {
  // State: uploadTasks (array of UploadTask from types.ts)
  // Render: Drag-and-drop zones for each file type
  // Logic: Upload to Firebase, generate thumbnails, save to Firestore
}
```

**UI Layout**:
```
┌────────────────────────────────────────────┐
│ Upload Media Files                         │
├────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│ │  VIDEO  │ │  IMAGE  │ │  AUDIO  │      │
│ │ Drop or │ │ Drop or │ │ Drop or │      │
│ │  Click  │ │  Click  │ │  Click  │      │
│ └─────────┘ └─────────┘ └─────────┘      │
│                                            │
│ Uploading:                                 │
│ video.mp4 ████████████░░░░░░ 75%         │
│ audio.mp3 ██████████████████ 100% ✓      │
└────────────────────────────────────────────┘
```

**Firebase Integration**:
```typescript
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { getDb } from '@/config/firebase-admin';

async function uploadFile(file: File, recipeId: string): Promise<EditorAsset> {
  const storageRef = ref(storage, `assets/${recipeId}/${file.type}/${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  // Monitor progress
  uploadTask.on('state_changed', (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    updateProgress(progress);
  });

  // Get download URL
  const url = await getDownloadURL(uploadTask.snapshot.ref);

  // Generate thumbnail/waveform
  const metadata = await generateMetadata(file, url);

  // Save to Firestore
  const asset: EditorAsset = {
    id: generateId(),
    recipeId,
    type: detectFileType(file),
    url,
    storagePath: uploadTask.snapshot.ref.fullPath,
    filename: file.name,
    fileSize: file.size,
    metadata,
    createdAt: new Date(),
  };

  const db = getDb();
  await db.collection('asset_library').doc(asset.id).set(asset);

  return asset;
}
```

---

#### File 2: `src/components/video-editor/panels/asset-panel.tsx`
**Purpose**: Browse and manage uploaded assets, drag to timeline

**Requirements**:
- Display assets grouped by type (Videos, Images, Audio, Subtitles)
- Show thumbnails for videos/images
- Show waveforms for audio
- Search/filter by filename
- Drag asset to timeline to create clip (use HTML5 drag-and-drop API)
- Delete asset with confirmation (delete from Storage + Firestore)
- Grid view with hover effects
- Empty state when no assets

**Component Structure**:
```typescript
interface AssetPanelProps {
  recipeId: string;
  assets: EditorAsset[];
  onDragStart: (asset: EditorAsset) => void;
  onRefresh: () => void;
}

export function AssetPanel({ recipeId, assets, onDragStart, onRefresh }: AssetPanelProps) {
  // State: selectedTab ('all' | 'video' | 'audio' | 'image' | 'subtitle')
  // State: searchQuery
  // Render: Tabbed interface with asset grid
  // Logic: Filter assets, handle drag-and-drop
}
```

**UI Layout**:
```
┌────────────────────────────────┐
│ Asset Library      [+ Upload]  │
├────────────────────────────────┤
│ [All] [Videos] [Audio] [Images]│
│ ┌──────────────────────────┐   │
│ │ Search assets...         │   │
│ └──────────────────────────┘   │
│                                │
│ Videos (3)                     │
│ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │[img] │ │[img] │ │[img] │   │
│ │5.2s  │ │3.1s  │ │7.8s  │   │
│ └──────┘ └──────┘ └──────┘   │
│                                │
│ Audio (2)                      │
│ ┌──────────────────────┐       │
│ │[waveform]      3:24  │       │
│ └──────────────────────┘       │
└────────────────────────────────┘
```

**Drag-and-Drop Implementation**:
```typescript
function handleDragStart(asset: EditorAsset, e: React.DragEvent) {
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('application/json', JSON.stringify({
    assetId: asset.id,
    assetUrl: asset.url,
    assetType: asset.type,
    duration: asset.duration || 5,
  }));

  // Optional: Set custom drag image
  if (asset.metadata.thumbnail) {
    const img = new Image();
    img.src = asset.metadata.thumbnail;
    e.dataTransfer.setDragImage(img, 0, 0);
  }

  onDragStart(asset);
}
```

---

### **Phase 3: Video Preview & Playback**

#### File: `src/components/video-editor/preview/video-preview.tsx`
**Purpose**: Video player synced with timeline, frame-by-frame navigation

**Requirements**:
- Use `react-player` for video playback
- Display current clip at playhead position
- Playback controls: Play/Pause, Skip forward/back, Frame-by-frame (arrow keys)
- Timecode display: `00:00:05.300 / 00:00:30.000`
- Speed controls: 0.25x, 0.5x, 1x, 2x
- Canvas overlay for text/image clips
- Sync playback with timeline playhead
- Handle clip transitions (cross-fade)
- Respect track visibility (don't show hidden tracks)
- Handle multiple overlapping clips (layer stacking by track order)

**Component Structure**:
```typescript
interface VideoPreviewProps {
  timeline: Timeline;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayPause: () => void;
}

export function VideoPreview({
  timeline,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onPlayPause
}: VideoPreviewProps) {
  // Logic: Find active clip(s) at currentTime
  // Render: Video player + canvas for overlays
  // Handle: Keyboard shortcuts (Space, Arrow keys)
}
```

**Clip Resolution Logic**:
```typescript
function getActiveClips(timeline: Timeline, currentTime: number): Clip[] {
  const activeClips: Clip[] = [];

  for (const track of timeline.tracks) {
    if (!track.visible) continue;

    for (const clip of track.clips) {
      if (currentTime >= clip.startTime && currentTime < clip.endTime) {
        activeClips.push(clip);
      }
    }
  }

  // Sort by track order (lower order = bottom layer)
  return activeClips.sort((a, b) => {
    const trackA = timeline.tracks.find(t => t.clips.includes(a));
    const trackB = timeline.tracks.find(t => t.clips.includes(b));
    return (trackA?.order || 0) - (trackB?.order || 0);
  });
}
```

**UI Layout**:
```
┌──────────────────────────────────────┐
│                                      │
│          [Video Canvas]              │
│            1280x720                  │
│                                      │
├──────────────────────────────────────┤
│ [⏮] [◀] [▶⏸] [⏭]  00:00:05 / 00:30 │
│                    [1x▼] [🔊]        │
└──────────────────────────────────────┘
```

---

### **Phase 4: Editing Tools**

#### File: `src/components/video-editor/panels/editing-tools.tsx`
**Purpose**: Tools for split, copy/paste, effects, text overlays

**Requirements**:
- **Split Tool**: Cut clip at playhead position
- **Copy/Paste**: Clipboard for clips (Cmd/Ctrl+C, Cmd/Ctrl+V)
- **Ripple Delete**: Delete clip and shift subsequent clips left
- **Text Overlay**: Add text to canvas at specific time
- **Filters**: Brightness, Contrast, Saturation sliders
- **Effects**: Fade in/out duration controls
- **Transitions**: Cross-dissolve between clips
- **Undo/Redo**: Command history with Cmd/Ctrl+Z

**Component Structure**:
```typescript
interface EditingToolsProps {
  selectedClips: Clip[];
  currentTime: number;
  onSplitClip: (clipId: string, splitTime: number) => void;
  onCopyClips: (clipIds: string[]) => void;
  onPasteClips: (trackId: string, pasteTime: number) => void;
  onAddTextOverlay: (text: string, startTime: number, duration: number) => void;
  onApplyFilter: (clipId: string, filter: Partial<ClipProperties['filters']>) => void;
}
```

**Split Logic**:
```typescript
function splitClip(clip: Clip, splitTime: number): [Clip, Clip] {
  const relativeTime = splitTime - clip.startTime;

  const clip1: Clip = {
    ...clip,
    id: generateId(),
    endTime: splitTime,
    duration: relativeTime,
    trimEnd: (clip.trimEnd || 0) + (clip.duration - relativeTime),
  };

  const clip2: Clip = {
    ...clip,
    id: generateId(),
    startTime: splitTime,
    duration: clip.duration - relativeTime,
    trimStart: (clip.trimStart || 0) + relativeTime,
  };

  return [clip1, clip2];
}
```

---

### **Phase 5: Effects & Transitions**

#### File: `src/components/video-editor/panels/effects-panel.tsx`
**Purpose**: Visual effects library

**Requirements**:
- **Effects**:
  - Fade In/Out (duration control)
  - Zoom In/Out (scale, easing)
  - Pan (direction, speed)
  - Blur (radius)
  - Slow Motion / Speed Up (playback rate)
- **Transitions**:
  - Fade (cross-dissolve)
  - Wipe (left/right)
  - Slide (left/right/up/down)
  - Zoom (scale in/out)
- Drag effect onto clip
- Preview effect before applying
- Remove effect button

**Effect Preview**:
```typescript
function applyEffectToCanvas(
  ctx: CanvasRenderingContext2D,
  effect: Effect,
  currentTime: number
): void {
  const progress = (currentTime - effect.startTime) / effect.duration;

  switch (effect.type) {
    case 'fade-in':
      ctx.globalAlpha = progress;
      break;
    case 'fade-out':
      ctx.globalAlpha = 1 - progress;
      break;
    case 'zoom-in':
      const scale = 1 + progress * 0.5;
      ctx.scale(scale, scale);
      break;
    // ... more effects
  }
}
```

---

### **Phase 6: Audio & Subtitles**

#### File: `src/components/video-editor/panels/audio-panel.tsx`
**Purpose**: Audio waveform visualization and volume controls

**Requirements**:
- Display audio waveform using `wavesurfer.js`
- Volume slider per track (0-100%)
- Volume keyframes (fade in/out)
- Mute/solo buttons per track
- Audio ducking (auto-lower music when voiceover plays)
- Export audio separately

#### File: `src/components/video-editor/panels/subtitle-editor.tsx`
**Purpose**: SRT subtitle editor synced to timeline

**Requirements**:
- Import SRT/VTT files using `subtitle` library
- Display subtitles on video preview
- Edit subtitle text inline
- Adjust timing (drag subtitle clips on timeline)
- Export to SRT format
- Font, size, color customization
- Position on canvas (top, center, bottom)

**SRT Parsing**:
```typescript
import { parseSync, stringifySync } from 'subtitle';

function importSRT(file: File): Promise<SubtitleClip[]> {
  const text = await file.text();
  const parsed = parseSync(text);

  return parsed.map((entry, idx) => ({
    id: `subtitle-${idx}`,
    text: entry.data.text,
    startTime: entry.data.start / 1000, // Convert ms to seconds
    endTime: entry.data.end / 1000,
    duration: (entry.data.end - entry.data.start) / 1000,
  }));
}
```

---

### **Phase 7: Export & Rendering**

#### File: `src/lib/video-renderer.ts`
**Purpose**: Render timeline to final video using FFmpeg.wasm

**Requirements**:
- Load `@ffmpeg/ffmpeg` in Web Worker
- Process timeline clips in order
- Apply effects and transitions
- Merge video, audio, subtitles
- Progress updates (0-100%)
- Cancel rendering
- Download or upload to Firebase Storage
- Support export presets (Instagram, TikTok, YouTube)

**FFmpeg.wasm Implementation**:
```typescript
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export async function renderTimeline(
  timeline: Timeline,
  config: ExportConfig,
  onProgress: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = new FFmpeg();

  await ffmpeg.load();

  // Download all asset files
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      const fileName = `input_${clip.id}.mp4`;
      await ffmpeg.writeFile(fileName, await fetchFile(clip.assetUrl));
    }
  }

  // Build FFmpeg filter complex for timeline
  const filterComplex = buildFilterComplex(timeline);

  // Execute FFmpeg command
  await ffmpeg.exec([
    '-i', 'input_1.mp4',
    '-i', 'input_2.mp4',
    // ... more inputs
    '-filter_complex', filterComplex,
    '-c:v', config.codec,
    '-c:a', config.audioCodec,
    '-b:v', `${config.bitrate}k`,
    'output.mp4'
  ]);

  // Read output file
  const data = await ffmpeg.readFile('output.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

function buildFilterComplex(timeline: Timeline): string {
  // Build FFmpeg filter graph
  // Example: "[0:v][1:v]concat=n=2:v=1[outv]"
  let filters: string[] = [];

  timeline.tracks.forEach((track, trackIdx) => {
    track.clips.forEach((clip, clipIdx) => {
      // Trim clip
      filters.push(`[${trackIdx}:v]trim=${clip.trimStart}:${clip.trimEnd}[v${clipIdx}]`);

      // Apply effects
      clip.effects?.forEach(effect => {
        if (effect.type === 'fade-in') {
          filters.push(`[v${clipIdx}]fade=in:d=${effect.duration}[v${clipIdx}]`);
        }
      });
    });
  });

  // Concatenate all clips
  const videoInputs = timeline.tracks[0].clips.map((_, i) => `[v${i}]`).join('');
  filters.push(`${videoInputs}concat=n=${timeline.tracks[0].clips.length}[outv]`);

  return filters.join(';');
}
```

**Export Modal**:
```typescript
interface ExportModalProps {
  timeline: Timeline;
  onExport: (config: ExportConfig) => void;
}

export function ExportModal({ timeline, onExport }: ExportModalProps) {
  // Preset selection dropdown
  // Resolution picker
  // Quality slider
  // Start export button
  // Progress bar
}
```

---

### **Phase 9: Integration with Video Hub**

#### File: `src/app/videohub/page.tsx` (MODIFY EXISTING)
**Purpose**: Add "Editor" tab to Video Hub

**Changes Required**:
1. Add new tab: `const tabs = ['Scenes', 'Asset Library', 'Editor'];`
2. Import video editor workspace
3. Convert AI scenes to timeline clips
4. Save timeline to Firestore
5. Load timeline on page refresh

**Integration Code**:
```typescript
// In videohub/page.tsx
import { VideoEditorWorkspace } from '@/components/video-editor/workspace';

// Add state
const [activeTab, setActiveTab] = useState<'Scenes' | 'Asset Library' | 'Editor'>('Scenes');
const [currentTimeline, setCurrentTimeline] = useState<Timeline | null>(null);

// Convert scenes to timeline
function importScenesToTimeline(scenes: Scene[]): Timeline {
  const videoTrack: Track = {
    id: 'track-video-1',
    type: 'video',
    name: 'Video Track 1',
    clips: scenes.map((scene, idx) => ({
      id: `clip-${scene.sceneNumber}`,
      assetId: scene.videoUrl || '',
      assetUrl: scene.videoUrl || '',
      assetType: 'video',
      startTime: idx * 5, // Sequential, 5s each
      endTime: (idx + 1) * 5,
      duration: 5,
      label: `Scene ${scene.sceneNumber}`,
    })),
    locked: false,
    visible: true,
    order: 0,
  };

  const audioTrack: Track = {
    id: 'track-audio-1',
    type: 'audio',
    name: 'Voiceovers',
    clips: scenes
      .filter(s => s.voiceOverUrl)
      .map((scene, idx) => ({
        id: `audio-${scene.sceneNumber}`,
        assetId: scene.voiceOverUrl || '',
        assetUrl: scene.voiceOverUrl || '',
        assetType: 'audio',
        startTime: idx * 5,
        endTime: (idx + 1) * 5,
        duration: 5,
        label: `Voiceover ${scene.sceneNumber}`,
      })),
    locked: false,
    visible: true,
    order: 1,
  };

  return {
    id: generateId(),
    recipeId: currentRecipeId,
    name: `${recipeTitle} Timeline`,
    duration: scenes.length * 5,
    ...DEFAULT_TIMELINE_CONFIG,
    tracks: [videoTrack, audioTrack],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Render editor tab
{activeTab === 'Editor' && (
  <VideoEditorWorkspace
    recipeId={currentRecipeId}
    initialTimeline={currentTimeline}
    onSave={(timeline) => {
      saveTimelineToFirestore(timeline);
    }}
    onExport={(videoUrl) => {
      // Handle export - post to Instagram
      handleInstagramPost(videoUrl);
    }}
  />
)}
```

---

### **Main Workspace Component**

#### File: `src/components/video-editor/workspace.tsx`
**Purpose**: Full-screen editor layout combining all components

**Requirements**:
- Three-column layout: Asset Panel | Preview | Timeline
- Manage global state (timeline, currentTime, selectedClips)
- Handle keyboard shortcuts globally
- Save timeline to Firestore on changes (debounced)
- Load timeline on mount
- Connect all sub-components

**Component Structure**:
```typescript
interface VideoEditorWorkspaceProps {
  recipeId: string;
  initialTimeline?: Timeline;
  onSave?: (timeline: Timeline) => void;
  onExport?: (videoUrl: string) => void;
}

export function VideoEditorWorkspace({
  recipeId,
  initialTimeline,
  onSave,
  onExport
}: VideoEditorWorkspaceProps) {
  // State management for entire editor
  const [timeline, setTimeline] = useState<Timeline>(initialTimeline || createEmptyTimeline(recipeId));
  const [assets, setAssets] = useState<EditorAsset[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(50);

  // Auto-save timeline to Firestore
  useEffect(() => {
    const timer = setTimeout(() => {
      saveTimelineToFirestore(timeline);
      onSave?.(timeline);
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timer);
  }, [timeline]);

  // Layout
  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-16 border-b">
        {/* Back button, recipe name, export button */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left: Asset Panel */}
        <div className="w-64 border-r">
          <AssetPanel
            recipeId={recipeId}
            assets={assets}
            onDragStart={(asset) => {/* ... */}}
            onRefresh={loadAssets}
          />
        </div>

        {/* Center: Video Preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <VideoPreview
              timeline={timeline}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTimeUpdate={setCurrentTime}
              onPlayPause={() => setIsPlaying(!isPlaying)}
            />
          </div>

          {/* Bottom: Timeline */}
          <div className="h-64">
            <TimelineEditor
              timeline={timeline}
              currentTime={currentTime}
              selectedClipIds={selectedClipIds}
              zoom={zoom}
              onTimeChange={setCurrentTime}
              onClipUpdate={(clipId, updates) => {/* Update timeline */}}
              onClipRemove={(clipId) => {/* Remove from timeline */}}
              onClipSelect={setSelectedClipIds}
              onZoomChange={setZoom}
              // ... more handlers
            />
          </div>
        </div>

        {/* Right: Editing Tools (optional) */}
        <div className="w-64 border-l">
          <EditingTools
            selectedClips={getSelectedClips(timeline, selectedClipIds)}
            currentTime={currentTime}
            onSplitClip={handleSplitClip}
            // ... more handlers
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 🎨 **Design Guidelines**

### Colors (from Blueprint)
- Background: `bg-gray-900` (#111827)
- Panels: `bg-gray-800` (#1F2937)
- Borders: `border-gray-700` (#374151)
- Text: `text-white`
- Primary: `text-primary` (Green #A7D1AB)
- Track colors in `types.ts` (blue, green, purple, orange, gray)

### Typography
- Font: 'Literata' serif (body text)
- Timeline labels: `text-xs`
- Panel headers: `text-sm font-medium`
- Buttons: `text-sm`

### Spacing
- Panel padding: `p-4`
- Component gap: `gap-4`
- Timeline track height: `h-16`
- Clip padding: `px-2 py-1`

### Components
Use shadcn/ui components:
- `Button` from `@/components/ui/button`
- `Slider` from `@/components/ui/slider`
- `Input` from `@/components/ui/input`
- `Select` from `@/components/ui/select`
- `Dialog` from `@/components/ui/dialog`
- `Progress` from `@/components/ui/progress`

---

## 📋 **Firestore Schema**

### Collection: `timelines`
```typescript
{
  id: string;
  recipeId: string;
  name: string;
  duration: number;
  fps: 30;
  resolution: { width: 1280, height: 720 };
  tracks: Track[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  exportedVideoUrl?: string;
}
```

### Collection: `asset_library`
```typescript
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
  usedInTimelines: string[];
  createdAt: Timestamp;
}
```

---

## 🔐 **Firebase Storage Rules**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /assets/{recipeId}/{type}/{filename} {
      allow read: if true; // Public read
      allow write: if request.auth != null; // Auth required for upload
      allow delete: if request.auth != null;
    }
  }
}
```

---

## ⌨️ **Keyboard Shortcuts**

Implement these shortcuts globally in `workspace.tsx`:
- **Space**: Play/Pause
- **Arrow Left/Right**: Frame-by-frame (1/30s)
- **Shift + Arrow**: Jump 1 second
- **Cmd/Ctrl + Z**: Undo
- **Cmd/Ctrl + Shift + Z**: Redo
- **Cmd/Ctrl + C**: Copy selected clips
- **Cmd/Ctrl + V**: Paste clips
- **Cmd/Ctrl + S**: Save timeline
- **Cmd/Ctrl + E**: Export video
- **Delete/Backspace**: Delete selected clips
- **Cmd/Ctrl + A**: Select all clips
- **Escape**: Deselect all

---

## 🧪 **Testing Checklist**

After building each component, test:
- [ ] Upload files (video, image, audio, subtitle)
- [ ] Drag asset to timeline creates clip
- [ ] Play timeline shows correct video
- [ ] Trim clip adjusts duration
- [ ] Split clip at playhead
- [ ] Copy/paste clips works
- [ ] Undo/redo works
- [ ] Add text overlay shows on canvas
- [ ] Apply filter (brightness) visible in preview
- [ ] Add transition (fade) between clips
- [ ] Export video produces downloadable file
- [ ] Save timeline persists to Firestore
- [ ] Reload page restores timeline

---

## 🚨 **Error Handling**

Handle these error cases:
- **Upload fails**: Show error toast, retry option
- **File too large**: Show size limit error before upload
- **Unsupported format**: Validate file extension before upload
- **Firestore save fails**: Queue saves, retry on network restore
- **FFmpeg render fails**: Show detailed error, offer download logs
- **Asset not found**: Display placeholder, allow re-upload
- **Browser memory limit**: Warn user, suggest closing other tabs

---

## 🎯 **Performance Optimizations**

- **Lazy load assets**: Only load visible thumbnails
- **Debounce timeline saves**: Save to Firestore every 1 second max
- **Virtual scrolling**: For asset library with 100+ assets
- **Web Worker for FFmpeg**: Don't block main thread during render
- **Canvas pooling**: Reuse canvas elements for effects
- **Memoize clip calculations**: Use React.memo and useMemo
- **Thumbnail caching**: Store thumbnails in IndexedDB

---

## 📖 **Example Usage**

```typescript
// In videohub/page.tsx
import { VideoEditorWorkspace } from '@/components/video-editor/workspace';

function VideoHubPage() {
  return (
    <div>
      {activeTab === 'Editor' && (
        <VideoEditorWorkspace
          recipeId="peanut-pastries-123"
          onExport={async (videoUrl) => {
            await shareRecipeToInstagram(recipeId);
            showNotification('Posted to Instagram!', 'success');
          }}
        />
      )}
    </div>
  );
}
```

---

## 🎬 **Priority Order for Implementation**

1. **Upload Manager** (Most critical - can't use editor without assets)
2. **Asset Panel** (Browse/drag assets)
3. **Workspace** (Connect everything)
4. **Video Preview** (See results)
5. **Integration with Video Hub** (Make accessible)
6. **Editing Tools** (Split, copy/paste)
7. **Export/Rendering** (Final output)
8. **Effects & Transitions** (Polish)
9. **Audio Panel** (Advanced)
10. **Subtitle Editor** (Advanced)

---

## ✅ **Success Criteria**

Phase 2-7 is complete when:
- [ ] User can upload videos, images, audio files
- [ ] Assets appear in Asset Library panel
- [ ] Dragging asset to timeline creates clip at playhead
- [ ] Clicking Play button shows video in preview
- [ ] Timeline shows all clips in correct order
- [ ] Trimming clip updates preview
- [ ] Splitting clip creates two clips
- [ ] Applying filter (brightness) visible in preview
- [ ] Export produces downloadable MP4 video
- [ ] Saved timeline persists after page refresh

---

## 🔗 **Related Files**

Reference these existing files:
- `src/components/video-editor/types.ts` - All TypeScript types
- `src/components/video-editor/timeline/timeline.tsx` - Timeline logic
- `src/app/videohub/page.tsx` - Integration point
- `src/lib/firebase.ts` - Firebase client SDK
- `config/firebase-admin.js` - Firebase Admin SDK
- `VIDEO_EDITOR_ARCHITECTURE.md` - Full system design
- `VIDEO_EDITOR_PHASE1_COMPLETE.md` - What's already built

---

## 💬 **Notes for Copilot**

- **Follow existing patterns**: Match the code style in timeline components
- **Use TypeScript strictly**: Import types from `types.ts`, no `any`
- **Reuse UI components**: Use shadcn/ui Button, Input, etc.
- **Handle errors gracefully**: Always show user-friendly error messages
- **Log debugging info**: Use `console.log('🎬 Video Editor:', ...)` for debugging
- **Comment complex logic**: Especially FFmpeg commands, filter graphs
- **Mobile responsive**: Editor should work on 1280px+ screens
- **Accessibility**: Add ARIA labels, keyboard navigation
- **Build incrementally**: Test each component before moving to next
- **Ask for clarification**: If requirements are unclear, ask user

---

**Ready to implement! Start with Phase 2 (Upload Manager) → Phase 3 (Preview) → Phase 4 (Tools) → Phase 7 (Export) → Phase 9 (Integration)**
