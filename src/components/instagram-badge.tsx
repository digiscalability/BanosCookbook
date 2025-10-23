import { Instagram } from 'lucide-react';

interface InstagramBadgeProps {
  username?: string;
  permalink?: string;
}

/**
 * Badge to display on comments that originated from Instagram
 * Shows Instagram icon and optionally links to the Instagram comment
 */
export function InstagramBadge({ username, permalink }: InstagramBadgeProps) {
  const content = (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 text-xs font-medium text-white">
      <Instagram className="h-3 w-3" />
      <span>Instagram</span>
      {username && <span className="opacity-90">@{username}</span>}
    </span>
  );

  if (permalink) {
    return (
      <a
        href={permalink}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-opacity hover:opacity-80"
        title="View on Instagram"
      >
        {content}
      </a>
    );
  }

  return content;
}
