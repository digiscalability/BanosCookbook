# BanosCookbook - AI Agent Guidelines

## Project Overview
A Next.js 15 recipe cookbook with AI-powered features: recipe extraction from PDFs/images, AI image generation, and nutritional analysis. Uses Firebase/Firestore for data storage and Google Genkit for AI workflows.

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.4 with App Router, React Server Components, Server Actions
- **AI**: Google Genkit + Gemini 2.5 Flash (via `@genkit-ai/googleai`)
- **Database**: Firebase Firestore (client SDK) + Firebase Admin (server-side)
- **Styling**: Tailwind CSS + shadcn/ui components
- **PDF Processing**: pdf-parse + OCR (Tesseract.js, optional GraphicsMagick)

### Key Directory Structure
```
src/
  ai/
    genkit.ts              # Genkit initialization (use GOOGLE_API_KEY env)
    flows/                 # AI flows as Genkit workflows (server-side only)
      recipes-from-pdf*.ts # Multiple PDF processing strategies
      recipe-from-image.ts # Extract recipe from photo
      generate-recipe-images.ts # AI image generation
      nutritional-information-from-ingredients.ts
  app/
    actions.ts            # All Server Actions (AI calls, Firebase admin ops)
    page.tsx              # Home page with recipe grid
    add-recipe/           # Recipe form with AI features
    recipes/[id]/         # Dynamic recipe detail page
    test-*-pdf/           # PDF processing test pages
    api/                  # Route handlers
  components/
    recipe-form.tsx       # Main form with AI image generation
    pdf-processor.tsx     # PDF upload/processing UI
    comment-section.tsx   # Recipe comments
  lib/
    types.ts              # TypeScript interfaces (Recipe, Comment, Collection)
    firebase.ts           # Client-side Firebase SDK
    firestore-recipes.ts  # Client-side Firestore API wrapper
  config/
    firebase-admin.js     # Lazy Firebase Admin initialization (avoids crashes)
```

## Critical Development Patterns

### 1. AI Flow Development (Genkit)
All AI operations use **Genkit flows**, NOT direct API calls. Flows live in `src/ai/flows/`:
```typescript
// Define prompts with structured output
const prompt = ai.definePrompt({
  name: 'myPrompt',
  input: {schema: z.object({...})},
  output: {schema: z.object({...})},
  prompt: `System instructions...`
});

// Define flows with schema validation
const myFlow = ai.defineFlow({
  name: 'myFlow',
  inputSchema: MyInputSchema,
  outputSchema: MyOutputSchema,
}, async (input) => {
  // Implementation
});
```

**Run Genkit dev server**: `npm run genkit:dev` (port 4000, separate from Next.js)

### 2. Server Actions Pattern
File: `src/app/actions.ts` - ALL AI/admin operations must be Server Actions:
```typescript
'use server';
import { extractRecipesFromPdf } from '@/ai/flows/recipes-from-pdf';

export async function myAction(input: FormData) {
  // Validation, Firebase admin ops, AI flow calls
  const result = await extractRecipesFromPdf({...});
  return result;
}
```
**Never** call AI flows directly from client components. Always proxy through Server Actions.

### 3. Firebase Admin vs Client SDK
- **Client SDK** (`src/lib/firebase.ts`): For read operations in Client Components
- **Admin SDK** (`config/firebase-admin.js`): For write/auth operations in Server Actions

**Admin pattern**:
```typescript
import adminConfig from '../../config/firebase-admin';
const { getAdmin, getDb } = adminConfig;

export async function myServerAction() {
  const db = getDb(); // Throws clear error if credentials missing
  await db.collection('recipes').add({...});
}
```

**Credentials**: Set `FIREBASE_SERVICE_ACCOUNT_JSON` env var (stringified JSON), OR discrete env vars (`FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, etc.). See `config/firebase-admin.js` for details.

### 4. PDF Processing Strategy
Multiple fallback flows due to OCR dependency (GraphicsMagick):
- `recipes-from-pdf.ts` - Basic text extraction (text-based PDFs)
- `recipes-from-pdf-advanced.ts` - OCR processing (image-based PDFs, requires GraphicsMagick)
- `recipes-from-pdf-enhanced.ts` - Hybrid approach
- `recipes-from-pdf-fallback.ts` - Diagnostic/recommendation system

**Test pages**: `/test-pdf`, `/test-real-pdf`, `/test-fallback-pdf`, `/test-image-pdf`

### 5. Image Generation & Tracking
AI images are **automatically saved** to Firebase Storage + Firestore (`generated_images` collection) to avoid regeneration costs:
```typescript
// In actions.ts
const images = await generateRecipeImages({...});
await saveGeneratedImagesToFirestore(images, recipeData);
await markImageAsUsedAction(selectedImageUrl); // When user picks one
```

**Admin dashboard**: `/admin/generated-images` - View/cleanup unused images (30+ days)

## Development Workflows

### Local Development
```bash
npm run dev              # Next.js on port 9002 (uses --turbopack)
npm run genkit:dev       # Genkit dev UI on port 4000 (run separately)
npm run lint             # ESLint (no --fix in scripts, add manually)
npm run typecheck        # Standalone TypeScript check
npm run build            # Production build (TypeScript/ESLint errors block build)
```

**Ports**: Next.js uses `:9002` (not default 3000). Set in `package.json` scripts.

### Environment Variables
Required for development (`.env.local`):
```bash
# AI Services
GOOGLE_API_KEY=...               # Primary (used by Genkit)
GOOGLE_GENAI_API_KEY=...         # Fallback
GEMINI_API_KEY=...               # Fallback

# Firebase Client (NEXT_PUBLIC_* exposed to browser)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... (see src/lib/firebase.ts for full list)

# Firebase Admin (server-only, see config/firebase-admin.js)
FIREBASE_SERVICE_ACCOUNT_JSON='{...}'  # Recommended
# OR discrete vars:
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PROJECT_ID=...
```

### Deployment
Targets: Vercel (recommended) or Firebase App Hosting

**Vercel**:
```bash
vercel --prod            # CLI deploy
```
Config: `vercel.json` (build commands, security headers)

**Firebase**:
```bash
firebase deploy          # Uses apphosting.yaml (maxInstances: 1)
```

**Security**: NEVER commit service account files. Firebase Admin uses lazy initialization to avoid crashes when credentials missing. Rotate keys if `*-firebase-adminsdk-*.json` was committed.

## Project-Specific Conventions

### 1. Recipe Form Workflow
File: `src/components/recipe-form.tsx`
- User fills form → "Generate AI Images" button → Server Action calls `generateRecipeImages`
- Images displayed in preview → User selects one → Image URL stored in recipe
- All generated images saved to Firestore for reuse (see `IMAGE_TRACKING_SYSTEM.md`)

### 2. Firestore Data Structure
Collection: `recipes`
```typescript
{
  title: string;
  author: string;
  authorEmail?: string;
  imageUrl?: string;        // AI-generated or uploaded
  imageId: string;          // Fallback placeholder (1-10)
  ingredients: string[];
  instructions: string[];
  cuisine: string;
  createdAt: Timestamp;
  // ... (see src/lib/types.ts)
}
```

**Rules**: `firestore.rules` (prod) vs `firestore.rules.dev` (dev). Prod requires auth for writes.

### 3. Comment System
Nested structure with likes/replies:
```typescript
{
  author: string;
  text: string;
  rating?: number;
  likes?: number;
  likedBy?: string[];      // Session IDs for guests
  replies?: Comment[];
  parentId?: string;
}
```

### 4. Image Handling
- **External images**: Configured in `next.config.ts` `remotePatterns` (Unsplash, Firebase Storage, etc.)
- **Data URIs**: Supported for PDF/image uploads (converted server-side)
- **Placeholders**: `src/lib/placeholder-images.ts` (fallback images 1-10)

### 5. Error Handling Philosophy
- **Graceful degradation**: Multiple fallback strategies (especially PDF processing)
- **Clear user feedback**: Detailed error messages in UI
- **Non-blocking saves**: Image saves don't block user flow (see `actions.ts`)

## Common Gotchas

1. **Next.js 15 RSC**: Client Components need `'use client'` directive. Server Actions need `'use server'`
2. **Genkit flows are async**: Always `await` flow calls in Server Actions
3. **Firebase Admin lazy init**: Don't call `getDb()` at module scope, only in function bodies
4. **PDF processing**: Requires `serverExternalPackages: ['pdf-parse']` in `next.config.ts`
5. **Port 9002**: Dev server runs on custom port, not 3000
6. **Image gen costs**: Always check `generated_images` collection before regenerating similar images

## Testing & Debugging

### Test Pages
- `/test-pdf` - Basic PDF upload/test
- `/test-real-pdf` - Advanced PDF processing with all modes
- `/test-fallback-pdf` - PDF analysis/diagnostics
- `/test-image-pdf` - PDF structure analysis
- `/admin/generated-images` - Image tracking dashboard

### Debugging AI Flows
1. Run `npm run genkit:dev`
2. Open `http://localhost:4000`
3. Test flows with sample inputs in Genkit UI
4. Check flow traces for errors

### Firestore Debugging
Use Firebase Console or run queries in Server Actions:
```typescript
const db = getDb();
const snapshot = await db.collection('recipes').get();
console.log(snapshot.docs.map(d => d.data()));
```

## Key Documentation Files
- `DEPLOYMENT.md` - Deployment checklist, security, performance
- `PDF_PROCESSING_SOLUTION.md` - PDF strategy explanation
- `IMAGE_TRACKING_SYSTEM.md` - AI image reuse system
- `FIREBASE_SETUP.md` - Firebase configuration guide
- `docs/blueprint.md` - Design system (colors, fonts, UX guidelines)

## Style Guidelines (from blueprint.md)
- **Colors**: Soft green (A7D1AB), cream (F5F5DC), earthy brown (A0522D)
- **Font**: 'Literata' serif for body/headlines
- **Icons**: Line icons with rounded edges (kitchenware theme)
- **Transitions**: Gentle fade-ins, non-distracting

## Instagram Integration

### Setup & Configuration
- **Instagram API module**: `config/instagram-api.js` (lazy initialization pattern)
- **Environment variables required**: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `INSTAGRAM_APP_ID`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `INSTAGRAM_ACCESS_TOKEN`
- **Setup script**: `npm run instagram:setup` - Interactive setup helper
- **Test connection**: `npm run instagram:test` - Validates API configuration

### Core Features
1. **Auto-post recipes** - Recipes automatically posted to Instagram on creation
2. **Comment sync** - Instagram comments synced back with Instagram badge
3. **Like tracking** - Instagram engagement metrics displayed on recipes
4. **Real-time webhooks** - Instant notifications at `/api/webhooks/instagram`

### Server Actions (in `actions.ts`)
```typescript
shareRecipeToInstagram(recipeId) // Post recipe to Instagram
syncInstagramComments(recipeId)  // Fetch and sync comments
syncInstagramLikes(recipeId)     // Update like counts
getInstagramPostInfo(recipeId)   // Get Instagram post metadata
```

### Data Structure
- **Collection**: `instagram_posts` - Maps recipes to Instagram posts
- **Comment fields**: `isFromInstagram`, `instagramCommentId`, `instagramUsername`
- **UI**: `<InstagramBadge />` component shows Instagram icon on synced comments

### Webhooks
- **Endpoint**: `src/app/api/webhooks/instagram/route.ts`
- **Events**: Comments, mentions (real-time sync)
- **Verification**: Uses `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
- **Setup**: Configure in Facebook Developer Dashboard → Webhooks

### Important Constraints
- **Public images only**: Instagram requires publicly accessible URLs (not data URIs)
- **Rate limits**: 200 calls/hour per user, 4800/day per app
- **Business accounts**: Only works with Instagram Business/Creator accounts
- **Page connection**: Instagram account must be linked to Facebook Page

## When Making Changes
1. **Adding AI features**: Create new flow in `src/ai/flows/`, expose via Server Action in `actions.ts`
2. **Modifying Firestore**: Update `firestore.rules`, check indexes in `firestore.indexes.json`
3. **New dependencies**: Add to `package.json`, rebuild, verify in production build
4. **Image sources**: Add domains to `next.config.ts` `remotePatterns`
5. **Schema changes**: Update `src/lib/types.ts`, migrate existing Firestore data
6. **Instagram features**: Update `config/instagram-api.js`, add Server Actions, test with `npm run instagram:test`

---

*Last Updated: October 11, 2025 | Version: 1.1*
