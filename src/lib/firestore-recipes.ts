import type { Comment, Recipe } from './types';

export interface CreateRecipeData {
  title: string;
  description: string;
  author: string;
  authorEmail?: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  cuisine: string;
  imageId: string; // Placeholder image ID (1-10) for legacy recipes
  imageUrl?: string; // Actual generated/uploaded image URL
  rating?: number;
  ratingCount?: number;
  comments?: Comment[];
  // If true, the server will attempt to publish this recipe to Instagram
  postToInstagram?: boolean;
}

export interface UpdateRecipeData extends Partial<CreateRecipeData> {
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NewCommentPayload {
  id: string;
  author: string;
  avatarUrl: string;
  text: string;
  timestamp: string;
  rating?: number;
}

type WritableComment = NewCommentPayload | Comment;

type ApiRecipeResponse = {
  recipe?: unknown;
  recipes?: unknown;
  count?: number;
} | unknown;

type RatingResponse = {
  rating: number;
  ratingCount: number;
};

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const resolveBaseUrl = () => {
  if (typeof window !== 'undefined') return '';

  const explicit = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (explicit && explicit.length > 0) {
    return explicit.startsWith('http') ? explicit : `https://${explicit}`;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.length > 0) {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
  }

  return 'http://localhost:3000';
};

const buildApiUrl = (path: string) => `${resolveBaseUrl()}${normalizePath(path)}`;

const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
};

const normalizeComment = (raw: unknown): Comment => {
  const comment = raw as Record<string, unknown> | undefined;
  return {
    id: typeof comment?.id === 'string' ? comment.id : '',
    author: typeof comment?.author === 'string' ? comment.author : 'Anonymous',
    avatarUrl: typeof comment?.avatarUrl === 'string' ? comment.avatarUrl : '',
    text: typeof comment?.text === 'string' ? comment.text : '',
    timestamp: typeof comment?.timestamp === 'string' ? comment.timestamp : new Date().toISOString(),
    rating:
      typeof comment?.rating === 'number' && Number.isFinite(comment.rating)
        ? comment.rating
        : undefined,
  } satisfies Comment;
};

const normalizeRecipe = (raw: unknown): Recipe => {
  const data = raw as Record<string, unknown> | undefined;
  return {
    id: typeof data?.id === 'string' ? data.id : '',
    title: typeof data?.title === 'string' ? data.title : '',
    description: typeof data?.description === 'string' ? data.description : '',
    author: typeof data?.author === 'string' ? data.author : 'Unknown',
    authorEmail: typeof data?.authorEmail === 'string' ? data.authorEmail : undefined,
    imageId: typeof data?.imageId === 'string' ? data.imageId : '',
  imageUrl: typeof data?.imageUrl === 'string' ? data.imageUrl : undefined,
    ingredients: Array.isArray(data?.ingredients)
      ? (data?.ingredients as unknown[]).filter((item): item is string => typeof item === 'string')
      : [],
    instructions: Array.isArray(data?.instructions)
      ? (data?.instructions as unknown[]).filter((item): item is string => typeof item === 'string')
      : [],
  prepTime: typeof data?.prepTime === 'string' ? (data?.prepTime as string) : '',
  cookTime: typeof data?.cookTime === 'string' ? (data?.cookTime as string) : '',
    servings:
      typeof data?.servings === 'number' && Number.isFinite(data.servings)
        ? data.servings
        : Number(data?.servings ?? 0) || 0,
    cuisine: typeof data?.cuisine === 'string' ? data.cuisine : '',
    comments: Array.isArray(data?.comments)
      ? (data?.comments as unknown[]).map((comment) => normalizeComment(comment))
      : [],
    rating:
      typeof data?.rating === 'number' && Number.isFinite(data.rating)
        ? data.rating
        : Number(data?.rating ?? 0) || 0,
    ratingCount:
      typeof data?.ratingCount === 'number' && Number.isFinite(data.ratingCount)
        ? data.ratingCount
        : Number(data?.ratingCount ?? 0) || 0,
    createdAt: toDate(data?.createdAt),
    updatedAt: toDate(data?.updatedAt),
  } satisfies Recipe;
};

const parseJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    console.warn('Failed to parse JSON response:', error);
    return null;
  }
};

const ensureSuccess = async (response: Response) => {
  if (response.ok) return;
  const parsed = await parseJson(response);
  if (parsed && typeof parsed === 'object' && 'error' in parsed) {
    const message = (parsed as { error?: unknown }).error;
    if (typeof message === 'string' && message.trim().length > 0) {
      throw new Error(message);
    }
  }
  throw new Error(`Request failed with status ${response.status}`);
};

const apiRequest = async <T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const url = typeof window === 'undefined' ? buildApiUrl(path) : normalizePath(path);
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
    ...init,
  });

  await ensureSuccess(response);
  const parsed = await parseJson(response);
  return parsed as T;
};

const extractRecipes = (payload: ApiRecipeResponse): Recipe[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeRecipe(item));
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray((payload as { recipes?: unknown }).recipes)) {
      return (payload as { recipes?: unknown[] }).recipes!.map((item) => normalizeRecipe(item));
    }
  }

  return [];
};

const extractRecipe = (payload: ApiRecipeResponse): Recipe | null => {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    return payload.length > 0 ? normalizeRecipe(payload[0]) : null;
  }

  if (typeof payload === 'object') {
    const data = payload as { recipe?: unknown };
    if (data.recipe) {
      return normalizeRecipe(data.recipe);
    }
  }

  return null;
};

export async function getAllRecipes(): Promise<Recipe[]> {
  const payload = await apiRequest<ApiRecipeResponse>('/api/recipes');
  return extractRecipes(payload);
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  if (!id) return null;
  const payload = await apiRequest<ApiRecipeResponse>(`/api/recipes/${encodeURIComponent(id)}`);
  const recipe = extractRecipe(payload) ?? (payload ? normalizeRecipe(payload) : null);
  return recipe;
}

export async function createRecipe(data: CreateRecipeData): Promise<Recipe> {
  const payload = await apiRequest<ApiRecipeResponse>('/api/recipes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const recipe = extractRecipe(payload);
  if (!recipe) {
    throw new Error('Failed to create recipe');
  }
  return recipe;
}

export async function updateRecipe(id: string, updates: UpdateRecipeData): Promise<Recipe | null> {
  if (!id) throw new Error('Recipe id is required');
  const payload = await apiRequest<ApiRecipeResponse>(`/api/recipes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  const recipe = extractRecipe(payload);
  if (recipe) return recipe;
  return getRecipeById(id);
}

export async function deleteRecipe(id: string): Promise<void> {
  if (!id) throw new Error('Recipe id is required');
  await apiRequest(`/api/recipes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function addRecipeComment(recipeId: string, comment: WritableComment): Promise<Comment> {
  if (!recipeId) throw new Error('Recipe id is required');
  const payload = await apiRequest<{ comment?: unknown }>(`/api/recipes/${encodeURIComponent(recipeId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
  const normalized = normalizeComment(payload?.comment ?? comment);
  return normalized;
}

export async function submitRecipeRating(
  recipeId: string,
  ratingValue: number,
): Promise<RatingResponse> {
  if (!recipeId) throw new Error('Recipe id is required');
  const payload = await apiRequest<RatingResponse>(`/api/recipes/${encodeURIComponent(recipeId)}/rating`, {
    method: 'POST',
    body: JSON.stringify({ rating: ratingValue }),
  });
  return payload;
}
