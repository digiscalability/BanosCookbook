/**
 * Render every page of Ammi's scanned book to a JPEG, locally (no network).
 *
 *   npx tsx scripts/book/split-pdf.ts                         # "MonAsal (Bana).pdf" → book-pages/monasal-bana/
 *   npx tsx scripts/book/split-pdf.ts <file.pdf> --out <dir> --dpi 200 --quality 88
 *
 * Output: <out>/p001.jpg, p002.jpg, … plus manifest.json (page, file, width, height,
 * bytes). book-pages/ is gitignored: the scans are never committed.
 *
 * Needs Ghostscript (gswin64c / gs, or GS_BIN) or Poppler's pdftoppm on PATH.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import sharp from 'sharp';

import { parseArgs } from '../lib/admin-cli';

function which(bin: string): boolean {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', [bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function findGhostscript(): string | null {
  const candidates = [process.env.GS_BIN, 'gswin64c', 'gswin32c', 'gs'].filter(Boolean) as string[];
  return candidates.find(c => existsSync(c) || which(c)) ?? null;
}

function render(pdf: string, out: string, dpi: number, quality: number): string {
  const gs = findGhostscript();
  if (gs) {
    execFileSync(
      gs,
      [
        '-dSAFER',
        '-dBATCH',
        '-dNOPAUSE',
        '-dQUIET',
        '-sDEVICE=jpeg',
        `-r${dpi}`,
        `-dJPEGQ=${quality}`,
        '-dTextAlphaBits=4',
        '-dGraphicsAlphaBits=4',
        `-sOutputFile=${join(out, 'p%03d.jpg')}`,
        pdf,
      ],
      { stdio: 'inherit' }
    );
    return `ghostscript (${gs})`;
  }
  if (which('pdftoppm')) {
    execFileSync(
      'pdftoppm',
      ['-r', String(dpi), '-jpeg', '-jpegopt', `quality=${quality}`, pdf, join(out, 'p')],
      {
        stdio: 'inherit',
      }
    );
    // pdftoppm writes p-1.jpg / p-01.jpg …; normalise to p001.jpg.
    for (const f of readdirSync(out)) {
      const m = /^p-(\d+)\.jpg$/.exec(f);
      if (m) renameSync(join(out, f), join(out, `p${m[1].padStart(3, '0')}.jpg`));
    }
    return 'pdftoppm';
  }
  throw new Error('Install Ghostscript (gs / gswin64c) or Poppler (pdftoppm), or set GS_BIN.');
}

async function main() {
  const { flags, positional } = parseArgs();
  const pdf = resolve(positional[0] ?? 'MonAsal (Bana).pdf');
  const out = resolve(typeof flags.out === 'string' ? flags.out : 'book-pages/monasal-bana');
  const dpi = Number(flags.dpi ?? 200);
  const quality = Number(flags.quality ?? 88);
  if (!existsSync(pdf)) throw new Error(`PDF not found: ${pdf}`);
  mkdirSync(out, { recursive: true });

  console.log(`Rendering ${pdf} at ${dpi} dpi → ${out}`);
  const engine = render(pdf, out, dpi, quality);

  const files = readdirSync(out)
    .filter(f => /^p\d{3,}\.jpg$/.test(f))
    .sort();
  const pages = [];
  for (const file of files) {
    const meta = await sharp(join(out, file)).metadata();
    pages.push({
      page: Number(file.slice(1, -4)),
      file,
      width: meta.width,
      height: meta.height,
      bytes: statSync(join(out, file)).size,
    });
  }
  writeFileSync(
    join(out, 'manifest.json'),
    JSON.stringify(
      { source: pdf, dpi, quality, engine, renderedAt: new Date().toISOString(), pages },
      null,
      2
    )
  );
  const mb = pages.reduce((n, p) => n + p.bytes, 0) / 1024 / 1024;
  console.log(
    `Done: ${pages.length} pages, ${mb.toFixed(1)} MB, engine ${engine}. Next: scripts/book/upload-pages.ts`
  );
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
