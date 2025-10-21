# Firebase Setup Guide

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: "banos-cookbook" (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to your users)
5. Click "Done"

## 3. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web app" icon (`</>`)
4. Enter app nickname: "banos-cookbook-web"
5. Click "Register app"
6. Copy the configuration object

## 4. Environment Variables

Create a `.env.local` file in your project root with:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI Configuration (existing)
GOOGLE_API_KEY=your_google_api_key
GOOGLE_GENAI_API_KEY=your_google_genai_api_key
GEMINI_API_KEY=your_gemini_api_key
```

## 5. Firestore Security Rules

In Firebase Console > Firestore Database > Rules, update the rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to recipes collection
    match /recipes/{document} {
      allow read, write: if true; // For development - restrict in production
    }
  }
}
```

## 6. Test the Setup

1. Start your development server: `npm run dev`
2. Go to http://localhost:9002/add-recipe
3. Fill out the form and submit a recipe
4. Check Firebase Console > Firestore Database to see your recipe

## 7. Production Security (Important!)

For production, update your Firestore rules to be more restrictive:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /recipes/{document} {
      // Allow read access to all users
      allow read: if true;
      
      // Allow write access only with validation
      allow create: if request.auth != null && 
                       request.resource.data.keys().hasAll(['title', 'author', 'authorEmail']) &&
                       request.resource.data.title is string &&
                       request.resource.data.author is string;
    }
  }
}
```

## 8. Data Structure

Your Firestore collection will have this structure:

```
recipes/
  └── {recipeId}/
      ├── title: string
      ├── description: string
      ├── author: string
      ├── authorEmail?: string
      ├── ingredients: string[]
      ├── instructions: string[]
      ├── prepTime: string
      ├── cookTime: string
      ├── servings: number
      ├── cuisine: string
      ├── imageId: string
      ├── rating: number
      ├── comments: array
      ├── createdAt: timestamp
      └── updatedAt: timestamp
```

## 9. Migration from localStorage

The app will automatically start using Firestore instead of localStorage. Existing localStorage data will remain as a backup, but new recipes will be saved to Firestore.

## 10. Benefits

- ✅ Cross-device sync
- ✅ Real-time updates
- ✅ Data backup and recovery
- ✅ Scalable storage
- ✅ Author tracking
- ✅ Recipe sharing capabilities
