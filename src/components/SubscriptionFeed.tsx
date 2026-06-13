import React, { useState, useCallback } from 'react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import type { SubscriptionEntry } from '../hooks/useSubscriptions';
import type { Video } from '../lib/yt-dlp';
import { formatDuration, formatDate, formatViews } from '../lib/youtube';
import { Trash2, RefreshCw, Loader2 } from 'lucide-react';

interface SubscriptionFeedProps {
  onPlayVideo: (videoId: string) => void;
}

export const SubscriptionFeed: React.FC<SubscriptionFeedProps> = ({ onPlayVideo }) => {
  const {
    subscriptions,
    videos,
    loading,
    error,
    loadProgress,
    subscribe,
    unsubscribe,
    search,
    clearSearch,
    refresh,
  } = useSubscriptions();

  const [channelInput, setChannelInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [subscribeMsg, setSubscribeMsg] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showSubs, setShowSubs] = useState(false);

  const handleSubscribe = useCallback(async () => {
    if (!channelInput.trim()) return;
    setSubscribeMsg(null);
    const result = await subscribe(channelInput.trim());
    setSubscribeMsg(result.message);
    setChannelInput('');
    setTimeout(() => setSubscribeMsg(null), 4000);
  }, [channelInput, subscribe]);

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) {
      setIsSearchMode(false);
      clearSearch();
      return;
    }
    setIsSearchMode(true);
    await search(searchInput.trim());
  }, [searchInput, search, clearSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setIsSearchMode(false);
    clearSearch();
  }, [clearSearch]);

  const progressText = loadProgress
    ? `Loading videos (${loadProgress.done}/${loadProgress.total})...`
    : 'Loading latest videos...';

  return (
    <div className="main-content">
      <div className="feed-header">
        <h1>{isSearchMode ? 'Search Results' : 'Your Subscriptions'}</h1>
      </div>

      <div className="subscribe-bar">
        <div className="subscribe-form">
          <input
            type="text"
            className="subscribe-input"
            placeholder="Search YouTube..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="subscribe-btn" onClick={handleSearch} disabled={loading}>
            Search
          </button>
          {isSearchMode && (
            <button className="subscribe-btn secondary" onClick={handleClearSearch}>
              Clear
            </button>
          )}
        </div>

        <div className="subscribe-form">
          <input
            type="text"
            className="subscribe-input"
            placeholder="YouTube URL, @handle, or channel ID"
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
          />
          <button className="subscribe-btn" onClick={handleSubscribe} disabled={loading}>
            Subscribe
          </button>
          <button
            className="subscribe-btn secondary"
            onClick={() => setShowSubs(!showSubs)}
          >
            {showSubs ? 'Hide' : `Channels (${subscriptions.length})`}
          </button>
        </div>
      </div>

      {subscribeMsg && (
        <div className={`subscribe-msg ${subscribeMsg.includes('Could not') || subscribeMsg.includes('Invalid') || subscribeMsg.includes('Already') ? 'error' : 'success'}`}>
          {subscribeMsg}
        </div>
      )}

      {showSubs && (
        <div className="subscriptions-panel">
          <div className="subscriptions-panel-header">
            <h3>Your Channels</h3>
            <button className="icon-btn" onClick={refresh} disabled={loading} title="Refresh feed">
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
          </div>
          {subscriptions.length === 0 ? (
            <p className="text-dim">No subscriptions yet.</p>
          ) : (
            <div className="subscriptions-list">
              {subscriptions.map((sub: SubscriptionEntry) => (
                <div key={sub.channelId} className="subscription-item">
                  <div className="subscription-info">
                    <span className="subscription-name">{sub.channelName}</span>
                    <span className="subscription-id">{sub.channelId}</span>
                  </div>
                  <button
                    className="unsubscribe-btn"
                    onClick={() => unsubscribe(sub.channelId)}
                    title="Unsubscribe"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="video-grid">
        {loading ? (
          <div className="feed-loading">
            <Loader2 size={32} className="spin" />
            <p>{progressText}</p>
          </div>
        ) : videos.length === 0 ? (
          <p style={{ padding: '0 40px', color: 'var(--text-dim)' }}>
            {subscriptions.length === 0
              ? 'Subscribe to a channel to get started.'
              : 'No videos found.'}
          </p>
        ) : (
          videos.map((vid: Video) => (
            <div key={vid.id} className="video-card" onClick={() => onPlayVideo(vid.id)}>
              <div className="video-thumbnail-wrapper">
                <img src={vid.thumbnail} alt={vid.title} className="video-thumbnail" loading="lazy" />
                {vid.duration ? (
                  <span className="video-duration">{formatDuration(vid.duration)}</span>
                ) : null}
              </div>
              <div className="video-info">
                <div className="video-title">{vid.title}</div>
                <div className="video-meta">
                  <span className="video-channel">{vid.author}</span>
                  {(vid.viewCount || vid.uploadDate) && (
                    <span className="video-stats">
                      {vid.viewCount ? formatViews(vid.viewCount) : ''}
                      {vid.viewCount && vid.uploadDate ? ' \u00b7 ' : ''}
                      {vid.uploadDate ? formatDate(vid.uploadDate) : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
