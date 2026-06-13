import { useState, useCallback, useRef, useEffect } from 'react';
import type { Video, ChannelInfo } from '../lib/yt-dlp';
import {
  resolveChannel,
  getAllChannelVideos,
  searchYouTube,
  getChannelName,
} from '../lib/yt-dlp';
import { parseChannelInput } from '../lib/youtube';
import {
  getSubscriptions,
  addSubscription,
  removeSubscription,
} from '../lib/db';

export interface SubscriptionEntry {
  channelId: string;
  channelName: string;
}

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionEntry[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<{ done: number; total: number } | null>(null);
  const abortRef = useRef(false);
  const initRef = useRef(true);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    abortRef.current = false;

    try {
      const channelIds = await getSubscriptions();

      const entries: SubscriptionEntry[] = [];
      const names = await Promise.allSettled(
        channelIds.map(async (id) => ({
          channelId: id,
          channelName: await getChannelName(id),
        })),
      );
      for (const r of names) {
        if (r.status === 'fulfilled') entries.push(r.value);
      }
      setSubscriptions(entries);

      if (channelIds.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }

      setLoadProgress({ done: 0, total: channelIds.length });

      const allVideos = await getAllChannelVideos(channelIds, 30, (done, total) => {
        if (abortRef.current) return;
        setLoadProgress({ done, total });
      });

      if (!abortRef.current) {
        setVideos(
          allVideos
            .filter((v) => v.id)
            .sort((a, b) => {
              if (a.uploadDate && b.uploadDate) return b.uploadDate.localeCompare(a.uploadDate);
              return 0;
            }),
        );
      }
    } catch (e) {
      console.error('Failed to load subscriptions:', e);
      setError('Failed to load subscriptions. Check your connection and try again.');
    } finally {
      if (!abortRef.current) {
        setLoading(false);
        setLoadProgress(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!initRef.current) return;
    initRef.current = false;
    loadSubscriptions();
  }, [loadSubscriptions]);

  const subscribe = useCallback(
    async (input: string): Promise<{ success: boolean; message: string }> => {
      const parsed = parseChannelInput(input);
      if (!parsed) {
        return { success: false, message: 'Invalid input.' };
      }

      let info: ChannelInfo | null;
      if (/^UC[\w-]{22}$/.test(parsed)) {
        info = { id: parsed, name: await getChannelName(parsed) };
      } else {
        info = await resolveChannel(parsed);
      }

      if (!info || !info.id) {
        return { success: false, message: 'Could not resolve channel. Check the URL.' };
      }

      const added = await addSubscription(info.id);
      if (!added) {
        return { success: false, message: 'Already subscribed.' };
      }

      setSubscriptions((prev) => [...prev, { channelId: info!.id, channelName: info!.name }]);
      loadSubscriptions();
      return { success: true, message: `Subscribed to ${info.name}` };
    },
    [loadSubscriptions],
  );

  const unsubscribe = useCallback(async (channelId: string) => {
    await removeSubscription(channelId);
    setSubscriptions((prev) => prev.filter((s) => s.channelId !== channelId));
  }, []);

  const search = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchYouTube(query);
      setVideos(results);
      if (results.length === 0) setError('No results found.');
    } catch {
      setError('Search failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  return {
    subscriptions,
    videos,
    loading,
    error,
    loadProgress,
    subscribe,
    unsubscribe,
    search,
    clearSearch,
    refresh: loadSubscriptions,
  };
}
