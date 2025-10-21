# 🔗 Video Editor Integration Guide

## How to Add Video Editor to Video Hub

### Step 1: Import Components

In `src/app/videohub/page.tsx`:

```typescript
'use client';

import { VideoEditorWorkspace } from '@/components/video-editor/workspace';
import { useState } from 'react';
import {
  fetchAssetsForRecipe,
  getOrCreateTimelineForRecipe,
  saveTimeline
} from '@/app/actions';

// ... existing imports
```

### Step 2: Add Editor Tab

Add "Editor" to the tabs array:

```typescript
const tabs = ['Scenes', 'Asset Library', 'Editor'] as const;
type TabType = typeof tabs[number];

const [activeTab, setActiveTab] = useState<TabType>('Scenes');
```

### Step 3: Add State for Editor

```typescript
const [editorAssets, setEditorAssets] = useState<any[]>([]);
const [timeline, setTimeline] = useState<any>(null);
const [isLoadingEditor, setIsLoadingEditor] = useState(false);
```

### Step 4: Load Editor Data When Tab Activated

```typescript
useEffect(() => {
  if (activeTab === 'Editor' && currentRecipeId) {
    loadEditorData();
  }
}, [activeTab, currentRecipeId]);

async function loadEditorData() {
  setIsLoadingEditor(true);
  try {
    // Fetch assets
    const assetsResult = await fetchAssetsForRecipe(currentRecipeId);
    if (assetsResult.success) {
      setEditorAssets(assetsResult.assets);
    }

    // Get or create timeline
    const timelineResult = await getOrCreateTimelineForRecipe(
      currentRecipeId,
      currentRecipeTitle || 'Untitled'
    );
    if (timelineResult.success) {
      setTimeline(timelineResult.timeline);
    }
  } catch (error) {
    console.error('Failed to load editor data:', error);
  } finally {
    setIsLoadingEditor(false);
  }
}
```

### Step 5: Render Editor Tab

```typescript
{activeTab === 'Editor' && (
  <div className="h-full">
    {isLoadingEditor ? (
      <div className="flex items-center justify-center h-64">
        <p>Loading editor...</p>
      </div>
    ) : (
      <VideoEditorWorkspace
        recipeId={currentRecipeId}
        recipeTitle={currentRecipeTitle || 'Untitled'}
        initialTimeline={timeline}
        initialAssets={editorAssets}
        onSave={async (updatedTimeline) => {
          await saveTimeline(updatedTimeline);
          setTimeline(updatedTimeline);
        }}
        onExport={async (videoUrl) => {
          // Post to Instagram or save
          console.log('Video exported:', videoUrl);
          // Optional: await shareRecipeToInstagram(currentRecipeId);
        }}
      />
    )}
  </div>
)}
```

### Step 6: Convert AI Scenes to Timeline (Optional)

If you want to import AI-generated scenes into the editor:

```typescript
function convertScenesToTimeline(scenes: SplitScene[]): Timeline {
  const videoTrack: Track = {
    id: 'track-video-1',
    type: 'video',
    name: 'Video Track 1',
    clips: scenes
      .filter(s => s.videoUrl)
      .map((scene, idx) => ({
        id: `clip-scene-${scene.sceneNumber}`,
        assetId: `scene-${scene.sceneNumber}`,
        assetUrl: scene.videoUrl!,
        assetType: 'video' as const,
        startTime: idx * 5, // 5 seconds each
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
        id: `audio-scene-${scene.sceneNumber}`,
        assetId: `voiceover-${scene.sceneNumber}`,
        assetUrl: scene.voiceOverUrl!,
        assetType: 'audio' as const,
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
    id: `timeline-${currentRecipeId}`,
    recipeId: currentRecipeId,
    name: `${currentRecipeTitle} Timeline`,
    duration: scenes.length * 5,
    fps: 30,
    resolution: { width: 1280, height: 720 },
    tracks: [videoTrack, audioTrack],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Button to import scenes
<Button onClick={() => {
  const newTimeline = convertScenesToTimeline(scenes);
  setTimeline(newTimeline);
  saveTimeline(newTimeline);
  setActiveTab('Editor');
}}>
  Open in Editor
</Button>
```

### Step 7: Update Tab UI

Make sure the tab buttons include the new Editor tab:

```tsx
<div className="flex gap-2 mb-4">
  {tabs.map((tab) => (
    <Button
      key={tab}
      variant={activeTab === tab ? 'default' : 'outline'}
      onClick={() => setActiveTab(tab)}
    >
      {tab}
    </Button>
  ))}
</div>
```

---

## Full Example Integration

```typescript
'use client';

import { VideoEditorWorkspace } from '@/components/video-editor/workspace';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import {
  fetchAssetsForRecipe,
  getOrCreateTimelineForRecipe,
  saveTimeline
} from '@/app/actions';

export default function VideoHubPage() {
  const tabs = ['Scenes', 'Asset Library', 'Editor'] as const;
  type TabType = typeof tabs[number];

  const [activeTab, setActiveTab] = useState<TabType>('Scenes');
  const [currentRecipeId, setCurrentRecipeId] = useState('recipe-123');
  const [currentRecipeTitle, setCurrentRecipeTitle] = useState('Peanut Pastries');

  // Editor state
  const [editorAssets, setEditorAssets] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any>(null);
  const [isLoadingEditor, setIsLoadingEditor] = useState(false);

  // Load editor data when tab activated
  useEffect(() => {
    if (activeTab === 'Editor' && currentRecipeId) {
      loadEditorData();
    }
  }, [activeTab, currentRecipeId]);

  async function loadEditorData() {
    setIsLoadingEditor(true);
    try {
      const [assetsResult, timelineResult] = await Promise.all([
        fetchAssetsForRecipe(currentRecipeId),
        getOrCreateTimelineForRecipe(currentRecipeId, currentRecipeTitle),
      ]);

      if (assetsResult.success) {
        setEditorAssets(assetsResult.assets);
      }

      if (timelineResult.success) {
        setTimeline(timelineResult.timeline);
      }
    } catch (error) {
      console.error('Failed to load editor data:', error);
    } finally {
      setIsLoadingEditor(false);
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Tabs */}
      <div className="flex gap-2 p-4 border-b">
        {tabs.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'Scenes' && (
          <div>
            {/* Existing scenes UI */}
          </div>
        )}

        {activeTab === 'Asset Library' && (
          <div>
            {/* Existing asset library UI */}
          </div>
        )}

        {activeTab === 'Editor' && (
          <div className="h-full">
            {isLoadingEditor ? (
              <div className="flex items-center justify-center h-64">
                <p>Loading editor...</p>
              </div>
            ) : (
              <VideoEditorWorkspace
                recipeId={currentRecipeId}
                recipeTitle={currentRecipeTitle}
                initialTimeline={timeline}
                initialAssets={editorAssets}
                onSave={async (updatedTimeline) => {
                  await saveTimeline(updatedTimeline);
                  setTimeline(updatedTimeline);
                }}
                onExport={async (videoUrl) => {
                  console.log('Video exported:', videoUrl);
                  // Optional: Share to Instagram
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Testing Checklist

After integration:

- [ ] Editor tab appears in Video Hub
- [ ] Clicking Editor tab loads the workspace
- [ ] Upload button works (opens upload manager)
- [ ] Drag & drop files uploads to Firebase Storage
- [ ] Assets appear in Asset Panel
- [ ] Dragging assets to timeline creates clips
- [ ] Play button plays video in preview
- [ ] Timeline auto-saves to Firestore
- [ ] Export button shows (even if not functional yet)

---

## Troubleshooting

### Editor doesn't load
- Check that `currentRecipeId` is set
- Check Firebase credentials are configured
- Check browser console for errors

### Assets don't upload
- Check Firebase Storage bucket is configured
- Check `/api/upload-asset` route is working
- Check file size limits

### Video doesn't play
- Check `react-player` supports the video format
- Check video URL is publicly accessible
- Check browser console for CORS errors

### Timeline doesn't save
- Check Firestore security rules allow writes
- Check Server Actions are properly configured
- Check Firebase Admin credentials

---

## Next Steps

1. ✅ Integrate editor into Video Hub
2. ⏳ Test file uploads and playback
3. ⏳ Implement FFmpeg.wasm export
4. ⏳ Add effects and transitions (Phase 5)
5. ⏳ Add audio waveforms (Phase 6)
6. ⏳ Add subtitle editor (Phase 6)

---

**Ready to integrate!** 🚀
