import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { useVideoPlayer } from '../hooks/useVideoPlayer';

interface VideoPlayerProps {
  videoId: string;
  onBack: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    streamUrl,
    loading,
    loadingMsg,
    startOffset,
    downloading,
    loadVideo,
    handleTimeUpdate,
    handleDownload,
    cleanup,
  } = useVideoPlayer(videoId);

  useEffect(() => {
    loadVideo(videoId);
    return () => cleanup();
  }, [videoId, loadVideo, cleanup]);

  const onTimeUpdate = () => {
    if (videoRef.current) handleTimeUpdate(videoRef.current.currentTime);
  };

  return (
    <div className="player-view">
      <div className="player-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <button
          className="subscribe-btn"
          onClick={async () => {
            const ok = await handleDownload();
            alert(ok ? 'Download completed!' : 'Download failed.');
          }}
          disabled={downloading}
          style={{ width: 'auto', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {downloading ? (
            <>
              <Loader2 size={18} className="spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download size={18} />
              Download 1080p
            </>
          )}
        </button>
      </div>

      <div className="player-wrapper">
        {loading || !streamUrl ? (
          <div className="player-loading">
            {loading ? (
              <>
                <Loader2 size={48} className="spin" />
                <p>{loadingMsg || 'Loading video...'}</p>
              </>
            ) : (
              <p>{loadingMsg || 'Failed to load video.'}</p>
            )}
          </div>
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
            onTimeUpdate={onTimeUpdate}
            style={{ width: '100%', height: '100%', outline: 'none', background: '#000' }}
          />
        )}
      </div>

      <div className="player-details">
        <h2 className="player-title">Now Playing</h2>
        <p style={{ color: 'var(--accent-cyan)' }}>
          Ad-Free &bull; High Quality
        </p>
      </div>
    </div>
  );
};
