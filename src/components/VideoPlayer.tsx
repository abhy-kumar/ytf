import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';

interface VideoPlayerProps {
  videoId: string;
  onBack: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, onBack }) => {
  const [startOffset, setStartOffset] = useState<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [videoId]);

  const getDb = async () => {
    try {
      const hasDb = await exists('db.json', { baseDir: BaseDirectory.AppData });
      if (!hasDb) {
        await writeTextFile('db.json', JSON.stringify({ subscriptions: [], watchProgress: {} }), { baseDir: BaseDirectory.AppData });
        return { subscriptions: [], watchProgress: {} };
      }
      const text = await readTextFile('db.json', { baseDir: BaseDirectory.AppData });
      return JSON.parse(text);
    } catch (e) {
      console.error(e);
      return { subscriptions: [], watchProgress: {} };
    }
  };

  const loadProgress = async () => {
    const db = await getDb();
    if (db.watchProgress && db.watchProgress[videoId]) {
      setStartOffset(db.watchProgress[videoId]);
    }
    setReady(true);
  };

  // With iframe, we cannot accurately track progress as easily as react-player without messaging.
  // But Piped respects start= parameter. For simplicity without a heavy polling, we'll rely on Piped's playback.
  
  if (!ready) return null;

  return (
    <div className="player-view">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={24} />
      </button>
      
      <div className="player-wrapper">
        <iframe
          src={`https://piped.video/embed/${videoId}?autoplay=1&t=${Math.floor(startOffset)}`}
          title="Piped Video Player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      </div>
      
      <div className="player-details">
        <h2 className="player-title">Now Playing</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Playing via Piped - 1080p Ad-Free Native Embed.
        </p>
      </div>
    </div>
  );
};
