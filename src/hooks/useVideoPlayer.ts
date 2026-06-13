import { useState, useCallback, useRef } from 'react';
import { extractStreamUrl, downloadVideo } from '../lib/youtube';
import { getWatchProgress, saveWatchProgress } from '../lib/db';
import { downloadDir } from '@tauri-apps/api/path';

export function useVideoPlayer(videoId: string | null) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [startOffset, setStartOffset] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const lastSavedRef = useRef(0);
  const abortRef = useRef(false);

  const loadVideo = useCallback(async (id: string) => {
    abortRef.current = false;
    setLoading(true);
    setLoadingMsg('Loading video...');
    setStreamUrl(null);
    setStartOffset(0);

    try {
      const [progress, url] = await Promise.all([
        getWatchProgress(id),
        extractStreamUrl(id),
      ]);

      if (abortRef.current) return;

      if (progress > 0) setStartOffset(progress);
      if (url) {
        setStreamUrl(url);
      } else {
        setLoadingMsg('Failed to extract video stream.');
      }
    } catch (e) {
      console.error('Failed to load video:', e);
      if (!abortRef.current) setLoadingMsg('Error loading video.');
    } finally {
      if (!abortRef.current) setLoading(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(
    (currentTime: number) => {
      if (!videoId) return;
      const now = Date.now();
      if (now - lastSavedRef.current < 5000) return;
      lastSavedRef.current = now;
      saveWatchProgress(videoId, currentTime).catch(console.error);
    },
    [videoId],
  );

  const handleDownload = useCallback(async () => {
    if (!videoId || downloading) return;
    setDownloading(true);
    try {
      const dir = await downloadDir();
      const success = await downloadVideo(videoId, dir);
      return success;
    } finally {
      setDownloading(false);
    }
  }, [videoId, downloading]);

  const cleanup = useCallback(() => {
    abortRef.current = true;
    setStreamUrl(null);
    setLoading(false);
    setStartOffset(0);
  }, []);

  return {
    streamUrl,
    loading,
    loadingMsg,
    startOffset,
    downloading,
    loadVideo,
    handleTimeUpdate,
    handleDownload,
    cleanup,
  };
}
