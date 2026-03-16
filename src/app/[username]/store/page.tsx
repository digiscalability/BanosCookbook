import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';

import adminConfig from '../../../../config/firebase-admin';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UserProfile } from '@/lib/types';
import type { CreatorProduct } from '@/lib/firestore-products';

const { getDb } = adminConfig as unknown as {
  getDb: () => import('firebase-admin').firestore.Firestore;
};

export const revalidate = 60;

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}'s Store — BanosCookbook`,
    description: `Digital products by @${username}: meal plans, ebooks, and more.`,
  };
}

async function getProfileAndProducts(
  username: string
): Promise<{ profile: UserProfile; products: CreatorProduct[] } | null> {
  const db = getDb();
  const snap = await db.collection('users').where('username', '==', username).limit(1).get();
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

  const productsSnap = await db
    .collection('creator_products')
    .where('userId', '==', userDoc.id)
    .where('isPublished', '==', true)
    .get();

  const products: CreatorProduct[] = productsSnap.docs.map((d) => {
    const p = d.data();
    return {
      id: d.id,
      userId: p.userId as string,
      username: p.username as string,
      title: p.title as string,
      description: p.description as string,
      price: p.price as number,
      fileUrl: p.fileUrl as string | undefined,
      coverImageUrl: p.coverImageUrl as string | undefined,
      type: p.type as CreatorProduct['type'],
      isPublished: true,
      createdAt: p.createdAt?.toDate?.() ?? new Date(),
    };
  });

  return { profile, products };
}

export default async function UserStorePage({ params }: Props) {
  const { username } = await params;
  const data = await getProfileAndProducts(username);
  if (!data) notFound();

  const { profile, products } = data;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-8 pb-8 border-b">
        {profile.photoURL ? (
          <Image
            src={profile.photoURL}
            alt={profile.displayName}
            width={64}
            height={64}
            className="rounded-full"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-bold text-orange-600">
            {profile.displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="text-sm mt-1">{profile.bio}</p>}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${username}`}>View Recipes</Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <ShoppingBag className="h-5 w-5 text-orange-500" />
        <h2 className="text-xl font-semibold">Digital Products</h2>
        <Badge variant="secondary">{products.length}</Badge>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500">No products yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            @{username} hasn&apos;t published any digital products yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col overflow-hidden">
              {/* Cover image */}
              <div className="aspect-video bg-gray-100 relative">
                {product.coverImageUrl ? (
                  <Image
                    src={product.coverImageUrl}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-gray-300" />
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{product.title}</CardTitle>
                  <Badge variant="outline" className="shrink-0 text-xs capitalize">
                    {product.type.replace('-', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-3">
                <p className="text-sm text-muted-foreground line-clamp-3">{product.description}</p>
              </CardContent>
              <CardFooter className="flex items-center justify-between pt-0">
                <p className="text-xl font-bold">
                  ${(product.price / 100).toFixed(2)}
                </p>
                <Button size="sm" asChild>
                  <a href={`mailto:hello@banoscookbook.com?subject=Interested in "${product.title}" by @${username}`}>
                    Buy Now
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
