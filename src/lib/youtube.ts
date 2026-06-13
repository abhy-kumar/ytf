import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { Command } from '@tauri-apps/plugin-shell';

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
}

export interface ChannelInfo {
  channelId: string;
  name: string;
}

const FETCH_TIMEOUT_MS = 15000;

const INVIDIOUS_APIS = [
  'https://iv.melmac.space/api/v1/search?q=',
  'https://invidious.lunar.icu/api/v1/search?q=',
  'https://invidious.jing.rocks/api/v1/search?q=',
];

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  return withTimeout(tauriFetch(url, init), FETCH_TIMEOUT_MS);
}

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
      const path = url.pathname;
      if (path.startsWith('/channel/')) {
        const id = path.split('/')[2];
        if (/^UC[\w-]{22}$/.test(id)) return id;
      }
      const segments = path.split('/').filter(Boolean);
      if (segments.length === 1 && segments[0].startsWith('@')) return segments[0];
    } catch {
      // not a valid URL, fall through
    }
  }

  return trimmed;
}

export async function resolveChannelId(input: string): Promise<ChannelInfo | null> {
  if (/^UC[\w-]{22}$/.test(input)) {
    return { channelId: input, name: input };
  }

  let urlToFetch: string;
  if (input.startsWith('@')) {
    urlToFetch = `https://www.youtube.com/${input}`;
  } else if (input.startsWith('http')) {
    urlToFetch = input;
  } else {
    urlToFetch = `https://www.youtube.com/@${input}`;
  }

  try {
    const res = await fetchWithTimeout(urlToFetch, { method: 'GET' });
    const html = await res.text();

    const nameMatch = html.match(/<link[^>]+itemprop="name"[^>]+content="([^"]+)"/);
    const name = nameMatch?.[1] ?? input;

    const idMatch = html.match(/"channelId"\s*:\s*"(UC[\w-]{22})"/);
    if (idMatch) return { channelId: idMatch[1], name };

    const metaMatch = html.match(/<meta\s+itemprop="channelId"\s+content="(UC[\w-]{22})">/);
    if (metaMatch) return { channelId: metaMatch[1], name };

    const externalMatch = html.match(/"externalId"\s*:\s*"(UC[\w-]{22})"/);
    if (externalMatch) return { channelId: externalMatch[1], name };
  } catch (e) {
    console.error('Failed to resolve channel:', e);
  }
  return null;
}

export async function fetchChannelName(channelId: string): Promise<string> {
  try {
    const url = `https://www.youtube.com/channel/${channelId}`;
    const res = await fetchWithTimeout(url, { method: 'GET' });
    const html = await res.text();

    const nameMatch = html.match(/<link[^>]+itemprop="name"[^>]+content="([^"]+)"/);
    if (nameMatch) return nameMatch[1];

    const ogMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
    if (ogMatch) return ogMatch[1];

    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) return titleMatch[1].replace(' - YouTube', '').trim();
  } catch (e) {
    console.warn('Failed to fetch channel name for', channelId, e);
  }
  return channelId;
}

export async function fetchChannelVideos(channelId: string): Promise<Video[]> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await fetchWithTimeout(rssUrl, { method: 'GET' });
    const xmlData = await response.text();

    if (!xmlData) return [];

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
    const entries = Array.from(xmlDoc.getElementsByTagName('entry'));

    return entries.map((entry) => {
      const id = entry.getElementsByTagName('yt:videoId')[0]?.textContent || '';
      const title = entry.getElementsByTagName('title')[0]?.textContent || '';
      const author = entry.getElementsByTagName('name')[0]?.textContent || '';
      const mediaGroup = entry.getElementsByTagName('media:group')[0];
      const thumbnail =
        mediaGroup?.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url') || '';
      return { id, title, thumbnail, author };
    });
  } catch (err) {
    console.warn('Failed to fetch RSS for', channelId, err);
    return [];
  }
}

export async function fetchAllChannelVideos(
  channelIds: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Video[]> {
  let done = 0;
  const total = channelIds.length;

  const results = await Promise.allSettled(
    channelIds.map(async (id) => {
      const videos = await fetchChannelVideos(id);
      done++;
      onProgress?.(done, total);
      return videos;
    }),
  );

  const allVideos: Video[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allVideos.push(...result.value);
    }
  }
  return allVideos;
}

export async function searchVideos(query: string): Promise<Video[]> {
  for (const api of INVIDIOUS_APIS) {
    try {
      const response = await fetchWithTimeout(`${api}${encodeURIComponent(query)}`, {
        method: 'GET',
      });
      if (!response.ok) continue;

      const data = await response.json();
      const results = data
        .filter((item: Record<string, unknown>) => item.type === 'video')
        .map((item: Record<string, unknown>) => ({
          id: item.videoId as string,
          title: item.title as string,
          thumbnail:
            (item.videoThumbnails as Array<Record<string, unknown>>)?.find(
              (t) => t.quality === 'medium',
            )?.url ||
            (item.videoThumbnails as Array<Record<string, unknown>>)?.[0]?.url ||
            `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
          author: item.author as string,
        }));

      if (results.length > 0) return results;
    } catch {
      console.warn('Invidious API failed:', api);
    }
  }

  return searchVideosYtDlp(query);
}

async function searchVideosYtDlp(query: string): Promise<Video[]> {
  try {
    const command = Command.sidecar('bin/yt-dlp', [
      '--no-warnings',
      '--ignore-errors',
      '--dump-json',
      `ytsearch15:${query}`,
    ]);
    const output = await command.execute();

    let rawOut = output.stdout;
    if (rawOut.charCodeAt(0) === 0xfeff) {
      rawOut = rawOut.slice(1);
    }

    const lines = rawOut.split('\n');
    const results: Video[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('{')) continue;
      try {
        const item = JSON.parse(trimmed);
        if (item.id && item.title) {
          results.push({
            id: item.id,
            title: item.title,
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            author: item.uploader || item.channel || 'YouTube',
          });
        }
      } catch {
        // skip invalid JSON lines
      }
    }
    return results;
  } catch (err) {
    console.error('yt-dlp search failed:', err);
    return [];
  }
}

export async function extractStreamUrl(videoId: string): Promise<string | null> {
  try {
    const command = Command.sidecar('bin/yt-dlp', [
      '-f',
      'best[ext=mp4]/best',
      '-g',
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);
    const output = await command.execute();
    if (output.code === 0 && output.stdout.trim()) {
      return output.stdout.trim();
    }
    console.error('yt-dlp stream extraction failed:', output.stderr);
    return null;
  } catch (err) {
    console.error('Error calling yt-dlp for stream:', err);
    return null;
  }
}

export async function downloadVideo(videoId: string, destDir: string): Promise<boolean> {
  try {
    const command = Command.sidecar('bin/yt-dlp', [
      '-f',
      'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '-P',
      destDir,
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);
    const output = await command.execute();
    return output.code === 0;
  } catch (err) {
    console.error('Download failed:', err);
    return false;
  }
}
