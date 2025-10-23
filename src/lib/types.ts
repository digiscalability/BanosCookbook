export interface Recipe {
  id: string;
  title: string;
  description: string;
  author: string;
  authorEmail?: string; // Added for tracking who added the recipe
  imageId: string; // Placeholder image ID (1-10) for legacy recipes
  imageUrl?: string; // Actual generated/uploaded image URL (takes precedence over imageId)
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  cuisine: string;
  comments: Comment[];
  rating: number;
  ratingCount?: number;
  createdAt?: Date; // Added for Firestore timestamps
  updatedAt?: Date; // Added for Firestore timestamps
}

export interface Comment {
  id: string;
  author: string;
  authorEmail?: string; // For email notifications
  avatarUrl: string;
  text: string;
  timestamp: string;
  rating?: number;
  likes?: number; // Number of likes/upvotes
  likedBy?: string[]; // Array of user IDs who liked (or session IDs for guests)
  replies?: Comment[]; // Nested replies
  parentId?: string; // If this is a reply, reference to parent comment ID
  isFromInstagram?: boolean; // Flag for comments synced from Instagram
  instagramCommentId?: string; // Original Instagram comment ID
  instagramUsername?: string; // Instagram username of commenter
}

export interface InstagramPost {
  id: string; // Firestore document ID
  recipeId: string; // Reference to recipe
  instagramMediaId: string; // Instagram post ID
  instagramPermalink: string; // Instagram post URL
  postedAt: Date; // When posted to Instagram
  caption: string; // Post caption
  likeCount: number; // Current like count
  commentsCount: number; // Current comment count
  lastSyncedAt?: Date; // Last time we synced comments/likes
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  recipeIds: string[];
}
