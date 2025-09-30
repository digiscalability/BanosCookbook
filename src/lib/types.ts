export interface Recipe {
  id: string;
  title: string;
  description: string;
  author: string;
  imageId: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  cuisine: string;
  comments: Comment[];
  rating: number;
}

export interface Comment {
  id: string;
  author: string;
  avatarUrl: string;
  text: string;
  timestamp: string;
}

export interface Collection {
  id:string;
  name: string;
  description: string;
  recipeIds: string[];
}
