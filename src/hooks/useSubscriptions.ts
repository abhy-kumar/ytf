import { useState, useCallback, useRef, useEffect } from 'react';
import type { Video } from '../lib/youtube';
import {
  parseChannelInput,
  resolveChannelId,
  fetchAllChannelVideos,
  searchVideos,
  fetchChannelName,
} from '../lib/youtube';
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

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    abortRef.current = false;

    try {
      const channelIds = await getSubscriptions();

      const entries: SubscriptionEntry[] = [];
      const resolvedNames = await Promise.allSettled(
        channelIds.map(async (id) => {
          const name = await fetchChannelName(id);
          return { channelId: id, channelName: name ?? id };
        }),
      );
      for (const r of resolvedNames) {
        if (r.status === 'fulfilled') entries.push(r.value);
      }
      setSubscriptions(entries);

      if (channelIds.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }

      setLoadProgress({ done: 0, total: channelIds.length });

      const allVideos = await fetchAllChannelVideos(channelIds, (done, total) => {
        if (abortRef.current) return;
        setLoadProgress({ done, total });
      });

      if (!abortRef.current) {
        const sorted = allVideos
          .filter((v) => v.id)
          .sort(() => Math.random() - 0.5);
        setVideos(sorted);
      }
    } catch (e) {
      console.error('Failed to load subscriptions:', e);
      setError('Failed to load subscriptions. Please try again.');
    } finally {
      if (!abortRef.current) {
        setLoading(false);
        setLoadProgress(null);
      }
    }
  }, []);

  const initRef = useRef(true);

  useEffect(() => {
    if (!initRef.current) return;
    initRef.current = false;
    (async () => {
      await loadSubscriptions();
    })();
  }, [loadSubscriptions]);

  const subscribe = useCallback(
    async (input: string): Promise<{ success: boolean; message: string }> => {
      const parsed = parseChannelInput(input);
      if (!parsed) {
        return { success: false, message: 'Invalid input. Enter a YouTube URL, @handle, or channel ID.' };
      }

      let channelId: string;
      let channelName: string;

      if (/^UC[\w-]{22}$/.test(parsed)) {
        channelId = parsed;
        channelName = await fetchChannelName(parsed).catch(() => parsed);
      } else {
        const info = await resolveChannelId(parsed);
        if (!info) {
          return { success: false, message: 'Could not resolve channel. Check the URL and try again.' };
        }
        channelId = info.channelId;
        channelName = info.name;
      }

      const added = await addSubscription(channelId);
      if (!added) {
        return { success: false, message: 'Already subscribed to this channel.' };
      }

      setSubscriptions((prev) => [...prev, { channelId, channelName }]);
      loadSubscriptions();
      return { success: true, message: `Subscribed to ${channelName}` };
    },
    [loadSubscriptions],
  );

  const unsubscribe = useCallback(
    async (channelId: string) => {
      await removeSubscription(channelId);
      setSubscriptions((prev) => prev.filter((s) => s.channelId !== channelId));
    },
    [],
  );

  const search = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchVideos(query);
      setVideos(results);
      if (results.length === 0) {
        setError('No results found.');
      }
    } catch {
      setError('Search failed. Try again later.');
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
