export function parseChannelInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^UC[\w-]{22}$/.test(trimmed)) return trimmed;

  const channelMatch = trimmed.match(/\/channel\/(UC[\w-]{22})/);
  if (channelMatch) return channelMatch[1];

  const handleMatch = trimmed.match(/youtube\.com\/(@[\w.-]+)/);
  if (handleMatch) return handleMatch[1];

  const userMatch = trimmed.match(/youtube\.com\/(user\/[\w.-]+)/);
  if (userMatch) return userMatch[1];

  if (trimmed.startsWith('@')) return trimmed;

  if (/^https?:\/\//.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments[0] === 'channel' && /^UC[\w-]{22}$/.test(segments[1])) {
        return segments[1];
      }
      if (segments.length === 1 && segments[0].startsWith('@')) return segments[0];
    } catch {
      // not a valid URL
    }
  }

  return trimmed;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return '';
  const y = parseInt(dateStr.slice(0, 4));
  const m = parseInt(dateStr.slice(4, 6)) - 1;
  const d = parseInt(dateStr.slice(6, 8));
  const date = new Date(y, m, d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function formatViews(count: number): string {
  if (!count) return '';
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B views`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} views`;
}
