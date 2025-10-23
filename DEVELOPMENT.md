# 🚀 BanosCookbook - VM Development Setup Guide

**Last Updated**: October 21, 2025
**For**: Development on VM/Cloud environments
**Project Status**: Video Editor 71% Complete (5/7 phases)

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [VSCode Configuration](#vscode-configuration)
3. [Environment Setup](#environment-setup)
4. [Development Workflow](#development-workflow)
5. [Debugging](#debugging)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)
8. [Performance Optimization](#performance-optimization)
9. [Video Editor Development](#video-editor-development)

---

## 🏃 Quick Start

### Prerequisites
```bash
# Check Node.js version (requires 18+)
node --version

# Check npm version
npm --version

# Verify Git
git --version
```

### Initial Setup
```bash
# 1. Clone the repository (if not already cloned)
git clone <repository-url>
cd BanosCookbook

# 2. Install dependencies
npm install

# 3. Create environment file from template
cp env-template.txt .env.local

# 4. Edit .env.local with your API keys
nano .env.local  # or use VSCode

# 5. Start development servers
npm run dev
# In another terminal:
npm run genkit:dev
```

### Access Points
- **Next.js App**: http://localhost:9002
- **Genkit Dev UI**: http://localhost:4000

---

## ⚙️ VSCode Configuration

### Installed Automatically

The `.vscode/` directory is now configured with:

1. **`settings.json`** - Workspace settings optimized for this stack
2. **`extensions.json`** - Recommended extensions (auto-prompt on open)
3. **`tasks.json`** - Pre-configured tasks for common operations
4. **`launch.json`** - Debugging configurations
5. **`snippets/`** - Custom code snippets

### Recommended Extensions

VSCode will prompt you to install these on first open:

**Core Development**:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Auto Rename Tag
- Path Intellisense
- Error Lens

**TypeScript & React**:
- ES7+ React/Redux/React-Native snippets
- Next.js snippets
- Import Cost

**Firebase & Git**:
- Firebase Explorer
- GitLens
- Git History

**AI Tools**:
- GitHub Copilot
- GitHub Copilot Chat

### Keyboard Shortcuts (Configured)

| Action | Shortcut |
|--------|----------|
| Format Document | `Shift + Alt + F` |
| Organize Imports | `Shift + Alt + O` |
| Fix ESLint Issues | `Ctrl + .` |
| Run Task | `Ctrl + Shift + B` |
| Debug | `F5` |
| Toggle Terminal | `` Ctrl + ` `` |

---

## 🔐 Environment Setup

### Required Environment Variables

Edit `.env.local` with these credentials:

#### Firebase Client (Public - OK to expose)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

#### Firebase Admin (Server-side - KEEP SECRET)
```bash
# Option 1: Stringified JSON (recommended)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Option 2: Discrete environment variables
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PROJECT_ID="..."
```

#### Google AI / Genkit
```bash
GOOGLE_API_KEY=your_api_key_here
GOOGLE_GENAI_API_KEY=your_api_key_here  # Fallback
GEMINI_API_KEY=your_api_key_here  # Fallback
```

#### Instagram Integration (Optional)
```bash
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
INSTAGRAM_APP_ID=...
INSTAGRAM_BUSINESS_ACCOUNT_ID=...
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=...
```

#### Runway ML (Optional - for AI video generation)
```bash
RUNWAY_API_KEY=your_runway_api_key_here
```

### Get API Keys

1. **Google AI**: https://aistudio.google.com/app/apikey
2. **Firebase**: https://console.firebase.google.com/
3. **Instagram**: https://developers.facebook.com/apps
4. **Runway ML**: https://dev.runwayml.com

---

## 💻 Development Workflow

### Starting Development

#### Option 1: VSCode Tasks (Recommended)
```
Ctrl + Shift + P → Tasks: Run Task → ▶️ Dev: Start All Servers
```

This starts both Next.js (port 9002) and Genkit (port 4000) in parallel.

#### Option 2: Manual Terminal Commands
```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Genkit dev server
npm run genkit:dev
```

### File Structure

```
BanosCookbook/
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── page.tsx        # Home page (recipe grid)
│   │   ├── add-recipe/     # Recipe form with AI features
│   │   ├── recipes/[id]/   # Dynamic recipe detail page
│   │   ├── videohub/       # Video editor & generation hub
│   │   ├── actions.ts      # Server Actions (AI calls, Firebase admin)
│   │   └── api/            # API routes
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── video-editor/   # Video editor components (71% complete)
│   │   │   ├── timeline/   # Timeline editor (Phase 1 ✅)
│   │   │   ├── upload/     # Upload manager (Phase 2 ✅)
│   │   │   ├── preview/    # Video preview (Phase 3 ✅)
│   │   │   ├── panels/     # Effects, text, properties (Phase 5 ✅)
│   │   │   └── workspace.tsx  # Main editor container
│   │   ├── recipe-form.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── firebase.ts     # Client-side Firebase SDK
│   │   ├── types.ts        # TypeScript interfaces
│   │   └── utils.ts        # Utility functions
│   ├── ai/
│   │   ├── genkit.ts       # Genkit initialization
│   │   └── flows/          # AI flows (Gemini 2.5 Flash)
│   │       ├── recipes-from-pdf*.ts
│   │       ├── recipe-from-image.ts
│   │       ├── generate-recipe-images.ts
│   │       └── nutritional-information-from-ingredients.ts
├── config/
│   ├── firebase-admin.js   # Firebase Admin SDK (lazy init)
│   └── instagram-api.js    # Instagram API wrapper
├── scripts/                # Maintenance scripts
├── public/                 # Static assets
└── .vscode/                # VSCode configuration (NEW!)
```

### Creating New Features

#### 1. Video Editor Component
```typescript
// Use snippet: ved-component
// Creates template with TypeScript, props, and structure
```

#### 2. Server Action
```typescript
// Use snippet: server-action
// Creates Server Action with Firebase Admin & error handling
```

#### 3. Genkit AI Flow
```typescript
// Use snippet: genkit-flow
// Creates flow with input/output schemas and prompt
```

### Code Style & Linting

**Auto-formatting is enabled on save:**
- Prettier formats code
- ESLint auto-fixes issues
- Imports auto-organized

**Manual Commands:**
```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint -- --fix

# Type check
npm run typecheck

# Full quality check
# VSCode Task: ✅ Quality: Full Check
```

---

## 🐛 Debugging

### Next.js Debugging

#### Full Stack (Client + Server)
```
F5 → Select: "🚀 Debug: Full Application"
```
Attaches to both Next.js server (port 9229) and opens Chrome debugger.

#### Server-Side Only
```
F5 → Select: "🖥️ Next.js: Server Side"
```
Debug Server Actions, API routes, and server components.

#### Client-Side Only
```
F5 → Select: "🌍 Next.js: Client Side"
```
Debug React components in Chrome DevTools.

### Genkit Flow Debugging

#### Run Genkit Dev Server with Debugger
```
F5 → Select: "⚡ Genkit: Dev Server"
```
Starts Genkit on port 4000 with Node debugger attached.

#### Debug Single Flow
```
F5 → Select: "⚡ Genkit: Single Flow"
# Enter flow name when prompted (e.g., "recipes-from-pdf")
```

### TypeScript Debugging

#### Debug Current File
```
F5 → Select: "🔷 TypeScript: Current File"
```
Runs the currently open .ts file with ts-node and debugger.

#### Debug Script
```
F5 → Select: "🔷 TypeScript: Run Script"
# Enter script name when prompted (e.g., "test-instagram")
```

### Debugging Tips

1. **Set Breakpoints**: Click gutter next to line numbers (red dot)
2. **Inspect Variables**: Hover over variables when paused
3. **Watch Expressions**: Add to Watch panel (right sidebar)
4. **Call Stack**: See function call history
5. **Console**: Available in Debug Console panel

---

## 📝 Common Tasks

### Using VSCode Tasks

Press `Ctrl + Shift + P` → `Tasks: Run Task` → Select task:

#### Development
- **▶️ Dev: Next.js Server** - Start dev server on port 9002
- **▶️ Dev: Genkit Server** - Start Genkit UI on port 4000
- **▶️ Dev: Start All Servers** - Start both in parallel

#### Build & Quality
- **🔨 Build: Production** - Production build
- **🔨 Build: Clean & Build** - Remove .next and rebuild
- **🔍 Type Check** - Run TypeScript compiler check
- **✨ Lint: Check** - Check for lint errors
- **✨ Lint: Fix All** - Auto-fix all lint issues
- **✅ Quality: Full Check** - Run both type check and lint

#### Firebase
- **🔥 Firebase: Deploy** - Deploy everything
- **🔥 Firebase: Deploy Hosting** - Deploy hosting only
- **🔥 Firebase: Deploy Firestore Rules** - Deploy rules only

#### Instagram
- **📸 Instagram: Setup** - Interactive setup helper
- **📸 Instagram: Test Connection** - Validate API config

#### Maintenance
- **🧹 Cleanup: Generated Images (Dry Run)** - Preview cleanup
- **🧹 Cleanup: Generated Images (Execute)** - Execute cleanup
- **🔍 Check: Recipe Images** - Check all recipe images

#### Utility
- **📦 Install: Dependencies** - npm install
- **🗑️ Clean: All Build Artifacts** - Remove build files
- **🔄 Restart: Full Reset** - Clean + reinstall

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Next.js port 9002 is in use
lsof -ti:9002 | xargs kill -9

# Genkit port 4000 is in use
lsof -ti:4000 | xargs kill -9
```

#### 2. Firebase Admin Error: "Admin SDK not initialized"
**Cause**: Missing `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env.local`

**Solution**:
```bash
# Option 1: Set full JSON (recommended)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Option 2: Set discrete variables
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL="..."
```

#### 3. Genkit Error: "GOOGLE_API_KEY not found"
**Cause**: Missing Google AI API key

**Solution**:
```bash
# Add to .env.local
GOOGLE_API_KEY=your_key_here
```

#### 4. Build Fails with Type Errors
```bash
# Check TypeScript errors
npm run typecheck

# Fix type issues, then rebuild
npm run build
```

#### 5. ESLint Errors Block Build
```bash
# Auto-fix most issues
npm run lint -- --fix

# Temporarily ignore (NOT recommended)
# Edit next.config.ts:
# eslint: { ignoreDuringBuilds: true }
```

#### 6. Module Not Found Errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 7. PDF Processing Fails
**Cause**: Missing GraphicsMagick for OCR

**Install GraphicsMagick**:
```bash
# Ubuntu/Debian
sudo apt-get install graphicsmagick

# macOS
brew install graphicsmagick
```

#### 8. Video Editor Upload Fails
**Check**:
1. Firebase Storage rules allow writes
2. File size under 500MB
3. Storage bucket configured in `.env.local`

---

## ⚡ Performance Optimization

### VM Resource Allocation

#### Recommended Specs
- **CPU**: 4+ cores
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 50GB+ SSD
- **Network**: Stable connection for Firebase/API calls

#### Node.js Memory Limit
Already configured in `.vscode/settings.json`:
```json
"terminal.integrated.env.linux": {
  "NODE_OPTIONS": "--max-old-space-size=8192"
}
```

### Build Performance

#### Use Turbopack (Default)
```bash
# Already set in package.json:
npm run dev  # Uses --turbopack flag
```

#### Clear Cache if Slow
```bash
# Run VSCode task: 🗑️ Clean: All Build Artifacts
rm -rf .next node_modules/.cache tsconfig.tsbuildinfo
```

### Development Performance

#### Exclude from File Watcher
Already configured in `.vscode/settings.json`:
- `node_modules/`
- `.next/`
- `.firebase/`

#### Disable Source Maps in Production
Already configured in `next.config.ts`:
```typescript
productionBrowserSourceMaps: false
```

### Firebase Performance

#### Use Pagination
```typescript
// Good: Paginated query
const snapshot = await db.collection('recipes')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get();

// Bad: Load everything
const snapshot = await db.collection('recipes').get();
```

#### Cache Firestore Reads
Use client-side caching for frequently accessed data.

---

## 🎬 Video Editor Development

### Current Status (71% Complete)

| Phase | Feature | Status | Files |
|-------|---------|--------|-------|
| 1 | Timeline Editor | ✅ Complete | `timeline/*.tsx` |
| 2 | Upload & Asset Management | ✅ Complete | `upload/*.tsx`, `panels/asset-panel.tsx` |
| 3 | Video Preview & Playback | ✅ Complete | `preview/video-preview.tsx` |
| 4 | Workspace Integration | ✅ Complete | `workspace.tsx` |
| 5 | Effects & Transitions | ✅ Complete | `panels/effects-panel.tsx`, `panels/text-panel.tsx`, `panels/properties-panel.tsx` |
| 6 | Audio & Subtitles | ⏳ Pending | `panels/audio-panel.tsx` (stub), `panels/subtitle-editor.tsx` (stub) |
| 7 | Export & Rendering | ⏳ Pending | Need FFmpeg.wasm integration |

### Working on Video Editor

#### Access Video Editor
```
http://localhost:9002/videohub
→ Click on a recipe
→ Navigate to "Editor" tab
```

#### Key Components

**Timeline** (`timeline/timeline.tsx`):
- Multi-track editor
- Drag clips, trim, zoom
- Keyboard shortcuts (Delete, Space)

**Upload Manager** (`upload/upload-manager.tsx`):
- Drag-and-drop file upload
- Firebase Storage integration
- Progress tracking

**Video Preview** (`preview/video-preview.tsx`):
- ReactPlayer integration
- Play/pause controls
- Frame-by-frame navigation

**Effects Panel** (`panels/effects-panel.tsx`):
- Fade in/out effects
- Brightness, contrast, saturation filters
- Blur, zoom effects

**Text Panel** (`panels/text-panel.tsx`):
- Multi-layer text overlays
- Font, size, color controls
- Text shadows

**Properties Panel** (`panels/properties-panel.tsx`):
- Position, scale, rotation
- Opacity controls
- Reset functions

#### Testing Video Editor

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to video hub
# http://localhost:9002/videohub

# 3. Test upload
# - Drag video file to upload zone
# - Check Firebase Storage console

# 4. Test timeline
# - Drag asset to timeline
# - Trim clip edges
# - Add effects

# 5. Test preview
# - Click play button
# - Verify clip playback
```

#### Next Tasks (Phases 6-7)

**Phase 6: Audio & Subtitles**
1. Implement `panels/audio-panel.tsx`:
   - Integrate wavesurfer.js
   - Volume controls
   - Audio waveform visualization

2. Implement `panels/subtitle-editor.tsx`:
   - SRT file import/export
   - Subtitle timeline sync
   - Text editing UI

**Phase 7: Export & Rendering**
1. Integrate FFmpeg.wasm:
   - Client-side video rendering
   - Export quality settings
   - Progress tracking

2. Create export modal:
   - Resolution selector (1080p, 720p, vertical)
   - Format selector (MP4, WebM)
   - Download or upload to Firebase

### Video Editor Snippets

Use these snippets for faster development:

- `ved-component` - Video editor component template
- `ved-clip-handler` - Timeline clip update handler
- `firebase-query` - Firestore query with filtering

---

## 📚 Additional Resources

### Documentation Files
- `VIDEO_EDITOR_ARCHITECTURE.md` - Full system design
- `VIDEO_EDITOR_PHASE1_COMPLETE.md` - Phase 1 details
- `VIDEO_EDITOR_PHASE2-4_COMPLETE.md` - Phases 2-4 details
- `VIDEO_EDITOR_PHASE5_COMPLETE.md` - Phase 5 details
- `DEPLOYMENT.md` - Deployment guide
- `FIREBASE_SETUP.md` - Firebase configuration
- `INSTAGRAM_INTEGRATION.md` - Instagram setup
- `docs/blueprint.md` - Design system

### External Links
- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Genkit Docs](https://firebase.google.com/docs/genkit)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

## 🎯 Development Checklist

### Daily Development
- [ ] Pull latest changes from Git
- [ ] Start dev servers (VSCode task)
- [ ] Check console for errors
- [ ] Run type check before committing
- [ ] Run lint check before committing
- [ ] Test changes locally
- [ ] Commit with descriptive message

### Before Push
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Test changes in production build
- [ ] Update documentation if needed
- [ ] Write clear commit message

### Weekly Maintenance
- [ ] Update dependencies: `npm update`
- [ ] Clean generated images: `npm run cleanup:generated`
- [ ] Check Firebase quotas
- [ ] Review performance metrics
- [ ] Update project documentation

---

## 💡 Productivity Tips

1. **Use VSCode Tasks**: Access all common operations via `Ctrl + Shift + B`
2. **Learn Snippets**: Type `ved-`, `server-`, `genkit-` for quick templates
3. **Multi-Cursor Editing**: `Alt + Click` to add cursors
4. **Quick Open File**: `Ctrl + P` then type filename
5. **Go to Symbol**: `Ctrl + Shift + O` to jump to functions/classes
6. **Search in Files**: `Ctrl + Shift + F` for workspace-wide search
7. **Command Palette**: `Ctrl + Shift + P` for all commands
8. **Integrated Terminal**: `` Ctrl + ` `` to toggle terminal
9. **GitLens**: Hover over code to see git blame info
10. **Error Lens**: Inline error messages in editor

---

**Happy Coding! 🚀**

For questions or issues, check the troubleshooting section or review the documentation files in the root directory.
