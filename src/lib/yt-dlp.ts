import { Command } from '@tauri-apps/plugin-shell';

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  duration?: number;
  viewCount?: number;
  uploadDate?: string;
}

export interface ChannelInfo {
  id: string;
  name: string;
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

async function exec(
  args: string[],
  timeoutMs = 30000,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const command = Command.sidecar('bin/yt-dlp', args);
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`yt-dlp timed out after ${timeoutMs}ms`)), timeoutMs),
  );
  return Promise.race([command.execute(), timeout]);
}

function parseJsonLines(raw: string): Record<string, unknown>[] {
  const clean = stripBom(raw);
  const results: Record<string, unknown>[] = [];
  for (const line of clean.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      results.push(JSON.parse(trimmed));
    } catch {
      // skip invalid JSON lines
    }
  }
  return results;
}

function parseJsonSingle(raw: string): Record<string, unknown> | null {
  const trimmed = stripBom(raw).trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function toVideo(item: Record<string, unknown>): Video {
  return {
    id: (item.id as string) || '',
    title: (item.title as string) || (item.fulltitle as string) || '',
    thumbnail:
      (item.thumbnail as string) ||
      (item.thumbnails as Array<Record<string, unknown>>)?.pop()?.url as string ||
      `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
    author: (item.channel as string) || (item.uploader as string) || '',
    duration: typeof item.duration === 'number' ? item.duration : undefined,
    viewCount: typeof item.view_count === 'number' ? item.view_count : undefined,
    uploadDate: typeof item.upload_date === 'string' ? item.upload_date : undefined,
  };
}

export async function resolveChannel(input: string): Promise<ChannelInfo | null> {
  if (/^UC[\w-]{22}$/.test(input)) {
    const name = await getChannelName(input);
    return { id: input, name };
  }

  try {
    const { stdout, code } = await exec(
      ['--flat-playlist', '--dump-json', '--playlist-items', '1:1', input],
      30000,
    );
    if (code !== 0) return null;
    const item = parseJsonSingle(stdout);
    if (!item) return null;
    const id = (item.channel_id as string) || '';
    const name = (item.channel as string) || (item.uploader as string) || id;
    if (!id) return null;
    return { id, name };
  } catch (e) {
    console.error('resolveChannel failed:', e);
    return null;
  }
}

export async function getChannelName(channelId: string): Promise<string> {
  try {
    const { stdout, code } = await exec(
      ['--flat-playlist', '--dump-json', '--playlist-items', '1:1',
        `https://www.youtube.com/channel/${channelId}/videos`],
      20000,
    );
    if (code !== 0) return channelId;
    const item = parseJsonSingle(stdout);
    return (item?.channel as string) || (item?.uploader as string) || channelId;
  } catch {
    return channelId;
  }
}

export async function getChannelVideos(
  channelId: string,
  maxVideos = 50,
): Promise<Video[]> {
  try {
    const { stdout, code } = await exec(
      ['--flat-playlist', '--dump-json', '--playlist-items', `1:${maxVideos}`,
        `https://www.youtube.com/channel/${channelId}/videos`],
      45000,
    );
    if (code !== 0) return [];
    return parseJsonLines(stdout).map(toVideo).filter((v) => v.id);
  } catch (e) {
    console.error('getChannelVideos failed:', e);
    return [];
  }
}

export async function getAllChannelVideos(
  channelIds: string[],
  maxPerChannel = 30,
  onProgress?: (done: number, total: number) => void,
): Promise<Video[]> {
  let done = 0;
  const total = channelIds.length;
  const results = await Promise.allSettled(
    channelIds.map(async (id) => {
      const videos = await getChannelVideos(id, maxPerChannel);
      done++;
      onProgress?.(done, total);
      return videos;
    }),
  );
  const all: Video[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return all;
}

export async function searchYouTube(
  query: string,
  maxResults = 20,
): Promise<Video[]> {
  try {
    const { stdout, code } = await exec(
      ['--flat-playlist', '--dump-json', `ytsearch${maxResults}:${query}`],
      45000,
    );
    if (code !== 0) return [];
    return parseJsonLines(stdout).map(toVideo).filter((v) => v.id);
  } catch (e) {
    console.error('searchYouTube failed:', e);
    return [];
  }
}

export async function getStreamUrl(videoId: string): Promise<string | null> {
  try {
    const { stdout, code } = await exec(
      ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '-g',
        `https://www.youtube.com/watch?v=${videoId}`],
      30000,
    );
    if (code !== 0 || !stdout.trim()) return null;
    return stdout.trim();
  } catch (e) {
    console.error('getStreamUrl failed:', e);
    return null;
  }
}

export async function downloadVideo(
  videoId: string,
  destDir: string,
): Promise<boolean> {
  try {
    const { code } = await exec(
      ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '-P', destDir, `https://www.youtube.com/watch?v=${videoId}`],
      300000,
    );
    return code === 0;
  } catch (e) {
    console.error('downloadVideo failed:', e);
    return false;
  }
}
