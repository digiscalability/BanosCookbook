/**
 * 1200×630 link-preview card for a recipe (Open Graph + Twitter).
 * Images are fetched server-side through the SSRF guard and inlined as small JPEG
 * data URIs, so one slow or unsupported image never breaks the card.
 */
import { ImageResponse } from 'next/og';
import sharp from 'sharp';

import { SITE_NAME } from '@/lib/site';
import type { Recipe } from '@/lib/types';
import { safeFetch } from '@/server/net/ssrf-guard';

export const OG_SIZE = { width: 1200, height: 630 };

const CREAM = '#FBF5EC';
const INK = '#3B2A1E';
const SPICE = '#A4442A';
const MUTED = '#7A6656';

async function inlineImage(url: string | undefined, width: number): Promise<string | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const res = await safeFetch(url, {}, { timeoutMs: 8000, maxRedirects: 2 });
    if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return null;
    const input = Buffer.from(await res.arrayBuffer());
    if (input.length > 12 * 1024 * 1024) return null;
    const jpeg = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: false })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function renderRecipeCard(recipe: Recipe | null): Promise<ImageResponse> {
  const isAmmi = recipe?.source === 'ammi_book';
  const [photo, scan] = await Promise.all([
    inlineImage(
      recipe?.dishPhoto?.url ??
        recipe?.imageUrl ??
        (recipe?.imageId?.startsWith('https://') ? recipe.imageId : undefined),
      620
    ),
    inlineImage(recipe?.scanUrl, 300),
  ]);
  const hero = photo ?? scan;
  const title = recipe?.title ?? SITE_NAME;
  const titleSize = title.length > 40 ? 52 : title.length > 24 ? 62 : 72;
  const kicker = recipe ? (isAmmi ? "AMMI'S RECIPE" : 'RECIPE') : "AMMI'S RECIPES";
  const byline = recipe
    ? isAmmi
      ? `From Shahar Bano's handwritten notebook${recipe.sourcePage ? `, page ${recipe.sourcePage}` : ''}`
      : `By ${recipe.author}`
    : "Recipes from Shahar Bano's handwritten notebooks, 1981";
  const facts = recipe
    ? [recipe.cuisine, recipe.servings ? `Serves ${recipe.servings}` : '', recipe.cookTime]
        .filter(Boolean)
        .join('  ·  ')
    : '';

  return new ImageResponse(
    (
      <div
        style={{ display: 'flex', width: '100%', height: '100%', background: CREAM, color: INK }}
      >
        <div
          style={{
            display: 'flex',
            width: 560,
            height: '100%',
            position: 'relative',
            background: hero ? '#2b2018' : SPICE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero}
              alt=""
              width={560}
              height={630}
              style={{ objectFit: 'cover', width: 560, height: 630 }}
            />
          ) : (
            <div style={{ display: 'flex', fontSize: 220, color: CREAM, fontWeight: 700 }}>
              {title.slice(0, 1)}
            </div>
          )}
          {photo && scan && (
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                right: -70,
                bottom: 40,
                padding: 10,
                background: '#FFFFFF',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                transform: 'rotate(-4deg)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scan}
                alt=""
                width={190}
                height={250}
                style={{ objectFit: 'cover', width: 190, height: 250 }}
              />
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: 640,
            padding: '56px 56px 48px 96px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                letterSpacing: 4,
                color: SPICE,
                fontWeight: 700,
              }}
            >
              {kicker}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: titleSize,
                lineHeight: 1.08,
                fontWeight: 700,
                marginTop: 18,
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                color: MUTED,
                marginTop: 24,
                lineHeight: 1.3,
              }}
            >
              {byline}
            </div>
            {facts && (
              <div style={{ display: 'flex', fontSize: 24, color: MUTED, marginTop: 16 }}>
                {facts}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 26, fontWeight: 700 }}>
            <div
              style={{
                display: 'flex',
                width: 14,
                height: 14,
                borderRadius: 7,
                background: SPICE,
                marginRight: 14,
              }}
            />
            {SITE_NAME} · banoscookbook.com
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
