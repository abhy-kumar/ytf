import React, { useRef, useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { ArrowLeft } from 'lucide-react';

interface VideoPlayerProps {
  videoId: string;
  onBack: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, onBack }) => {
  const playerRef = useRef<any>(null);
  const [startOffset, setStartOffset] = useState<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [videoId]);

  const loadProgress = async () => {
    // @ts-ignore
    const db = await window.electronAPI.getDb();
    if (db.watchProgress && db.watchProgress[videoId]) {
      setStartOffset(db.watchProgress[videoId]);
    }
    setReady(true);
  };

  const saveProgress = async () => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    if (currentTime > 5) {
      // @ts-ignore
      const db = await window.electronAPI.getDb();
      if (!db.watchProgress) db.watchProgress = {};
      db.watchProgress[videoId] = currentTime;
      // @ts-ignore
      await window.electronAPI.saveDb(db);
    }
  };

  const handleProgress = (state: any) => {
    // Save progress periodically (e.g. every 5 seconds)
    if (Math.floor(state.playedSeconds) % 5 === 0) {
      saveProgress();
    }
  };

  // Ensure progress is saved when going back
  const handleBack = async () => {
    await saveProgress();
    onBack();
  };

  if (!ready) return null;

  return (
    <div className="player-view">
      <button className="back-btn" onClick={handleBack}>
        <ArrowLeft size={24} />
      </button>
      
      <div className="player-wrapper">
        <ReactPlayer
          ref={playerRef}
          className="react-player"
          url={`https://www.youtube.com/watch?v=${videoId}`}
          width="100%"
          height="100%"
          playing={true}
          controls={true}
          onProgress={handleProgress}
          config={{
            youtube: {
              // @ts-ignore
              playerVars: { 
                autoplay: 1,
                start: Math.floor(startOffset),
                vq: 'hd1080'
              }
            }
          }}
        />
      </div>
      
      <div className="player-details">
        <h2 className="player-title">Now Playing</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Ad-free playback handled at the network level. Progress is automatically saved locally.
        </p>
      </div>
    </div>
  );
};

