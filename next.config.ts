import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  // NOTE: temporarily allow builds to proceed while lint issues are being addressed.
  // Remove or set to false after Phase 2 cleanup.
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    // Allow listed external hosts for next/image. Use both domains and remotePatterns
    domains: [
      'placehold.co',
      'images.unsplash.com',
      'source.unsplash.com',
      'picsum.photos',
      'storage.googleapis.com',
      'firebasestorage.googleapis.com',
      ...(process.env.FIREBASE_STORAGE_BUCKET
        ? [`${process.env.FIREBASE_STORAGE_BUCKET}.storage.googleapis.com`]
        : []),
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      ...(process.env.FIREBASE_STORAGE_BUCKET
        ? [
            {
              protocol: 'https' as const,
              hostname: `${process.env.FIREBASE_STORAGE_BUCKET}.storage.googleapis.com`,
              port: '',
              pathname: '/**',
            },
          ]
        : []),
    ],
  },
  // Server Actions configuration for handling large uploads (e.g., photos from phones)
  experimental: {
    // Empty for now - Server Actions body size configured via NEXTJS_BODY_SIZE_LIMIT env var
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  serverExternalPackages: ['pdf-parse', 'ffmpeg-static', 'fluent-ffmpeg'],
};

export default nextConfig;
