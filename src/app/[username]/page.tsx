import { Instagram, Link2 } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import adminConfig from '../../../config/firebase-admin';
import type { Recipe, UserProfile } from '@/lib/types';

const { getDb } = adminConfig as unknown as {
  getDb: () => import('firebase-admin').firestore.Firestore;
};

export const revalidate = 60; // refresh profile every 60s

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} — Banos Cookbook`,
    description: `Recipes by @${username}`,
  };
}

async function getProfileAndRecipes(
  username: string
): Promise<{ profile: UserProfile; recipes: Recipe[] } | null> {
  const db = getDb();
  const snap = await db
    .collection('users')
    .where('username', '==', username)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const userDoc = snap.docs[0];
  const data = userDoc.data();

  const profile: UserProfile = {
    uid: userDoc.id,
    username: data.username,
    displayName: data.displayName ?? '',
    email: data.email ?? '',
    bio: data.bio ?? undefined,
    photoURL: data.photoURL ?? undefined,
    socialLinks: data.socialLinks ?? undefined,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };

  const recipesSnap = await db
    .collection('recipes')
    .where('userId', '==', userDoc.id)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const recipes: Recipe[] = recipesSnap.docs.map((doc) => {
    const r = doc.data();
    return {
      id: doc.id,
      userId: r.userId,
      username: r.username,
      title: r.title ?? '',
      description: r.description ?? '',
      author: r.author ?? profile.displayName,
      authorEmail: r.authorEmail,
      imageId: r.imageId ?? '',
      imageUrl: r.imageUrl,
      ingredients: r.ingredients ?? [],
      instructions: r.instructions ?? [],
      prepTime: r.prepTime ?? '',
      cookTime: r.cookTime ?? '',
      servings: Number(r.servings ?? 0),
      cuisine: r.cuisine ?? '',
      comments: r.comments ?? [],
      rating: Number(r.rating ?? 0),
      ratingCount: Number(r.ratingCount ?? 0),
    };
  });

  return { profile, recipes };
}

export default async function CreatorProfilePage({ params }: Props) {
  const { username } = await params;
  const data = await getProfileAndRecipes(username);

  if (!data) notFound();

  const { profile, recipes } = data;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      {/* Profile header */}
      <div className="mb-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left sm:gap-6">
        {profile.photoURL ? (
          <Image
            src={profile.photoURL}
            alt={profile.displayName}
            width={80}
            height={80}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {profile.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{profile.displayName}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-2 text-sm text-foreground/80 max-w-md">{profile.bio}</p>
          )}
          {/* Social links */}
          {profile.socialLinks && (
            <div className="mt-3 flex flex-wrap gap-3">
              {profile.socialLinks.instagram && (
                <a
                  href={`https://instagram.com/${profile.socialLinks.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Instagram className="h-3.5 w-3.5" />
                  {profile.socialLinks.instagram}
                </a>
              )}
              {profile.socialLinks.website && (
                <a
                  href={profile.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {profile.socialLinks.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 text-center">
          <span className="text-2xl font-bold text-foreground">{recipes.length}</span>
          <p className="text-xs text-muted-foreground">Recipes</p>
        </div>
      </div>

      {/* Recipes grid */}
      {recipes.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No recipes yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
            >
              {recipe.imageUrl ? (
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-[4/3] bg-muted flex items-center justify-center text-muted-foreground text-4xl">
                  🍳
                </div>
              )}
              <div className="p-4">
                <h2 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {recipe.title}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {recipe.description}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{recipe.cuisine}</span>
                  <span>·</span>
                  <span>{recipe.cookTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
