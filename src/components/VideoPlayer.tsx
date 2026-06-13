import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { Command } from '@tauri-apps/plugin-shell';
import { downloadDir } from '@tauri-apps/api/path';

interface VideoPlayerProps {
  videoId: string;
  onBack: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, onBack }) => {
  const [startOffset, setStartOffset] = useState<number>(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Initializing player...');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadProgress();
    extractStreamUrl();
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
  };

  const saveProgress = async (time: number) => {
    const db = await getDb();
    if (!db.watchProgress) db.watchProgress = {};
    db.watchProgress[videoId] = time;
    await writeTextFile('db.json', JSON.stringify(db, null, 2), { baseDir: BaseDirectory.AppData });
  };

  const extractStreamUrl = async () => {
    setLoadingMsg('Extracting high-quality stream via yt-dlp...');
    try {
      const command = Command.sidecar('bin/yt-dlp', [
        '-f', 'best[ext=mp4]/best',
        '-g',
        `https://www.youtube.com/watch?v=${videoId}`
      ]);
      const output = await command.execute();
      if (output.code === 0) {
        setStreamUrl(output.stdout.trim());
      } else {
        setLoadingMsg('Failed to extract stream.');
        console.error(output.stderr);
      }
    } catch (err) {
      setLoadingMsg('Error calling yt-dlp sidecar.');
      console.error(err);
    }
  };

  const handleDownload = async () => {
    try {
      const dDir = await downloadDir();
      alert('Download started! Check your Downloads folder soon.');
      const command = Command.sidecar('bin/yt-dlp', [
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '-P', dDir,
        `https://www.youtube.com/watch?v=${videoId}`
      ]);
      const output = await command.execute();
      if (output.code === 0) {
        alert('Download completed successfully!');
      } else {
        alert('Download failed: ' + output.stderr);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while downloading.');
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      // Save progress every 5 seconds roughly
      const time = videoRef.current.currentTime;
      if (time % 5 < 0.5) {
        saveProgress(time);
      }
    }
  };

  return (
    <div className="player-view">
      <div className="player-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <button className="subscribe-btn" onClick={handleDownload} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
          Download 1080p
        </button>
      </div>
      
      <div className="player-wrapper">
        {!streamUrl ? (
          <div style={{ color: 'var(--text-main)', fontSize: '18px' }}>{loadingMsg}</div>
        ) : (
          <video
            ref={videoRef}
            src={streamUrl}
            autoPlay
            controls
            onLoadedMetadata={(e) => {
              if (startOffset > 0) {
                e.currentTarget.currentTime = startOffset;
              }
            }}
            onTimeUpdate={handleTimeUpdate}
            style={{ width: '100%', height: '100%', outline: 'none', background: '#000' }}
          />
        )}
      </div>
      
      <div className="player-details">
        <h2 className="player-title">Now Playing</h2>
        <p style={{ color: 'var(--accent-cyan)' }}>
          Playing via yt-dlp Native Engine - Ad-Free
        </p>
      </div>
    </div>
  );
};
