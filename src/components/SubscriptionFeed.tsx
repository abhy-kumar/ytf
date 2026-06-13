import React, { useState, useEffect } from 'react';
import { parseStringPromise } from 'xml2js';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
}

interface SubscriptionFeedProps {
  onPlayVideo: (videoId: string) => void;
}

export const SubscriptionFeed: React.FC<SubscriptionFeedProps> = ({ onPlayVideo }) => {
  const [channelInput, setChannelInput] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  // In a real app, we'd load subscriptions from DB and fetch all their RSS feeds.
  // For simplicity, we just fetch one or let user add and store in DB.

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    // @ts-ignore
    const db = await window.electronAPI.getDb();
    if (db.subscriptions && db.subscriptions.length > 0) {
      setLoading(true);
      let allVideos: Video[] = [];
      for (const channelId of db.subscriptions) {
        const channelVideos = await fetchChannelVideos(channelId);
        allVideos = [...allVideos, ...channelVideos];
      }
      setVideos(allVideos);
      setLoading(false);
    }
  };

  const fetchChannelVideos = async (channelId: string) => {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      // @ts-ignore
      const xmlData = await window.electronAPI.fetchRss(rssUrl);
      if (!xmlData) return [];

      const result = await parseStringPromise(xmlData);
      const entries = result.feed.entry || [];
      
      return entries.map((entry: any) => ({
        id: entry['yt:videoId'][0],
        title: entry.title[0],
        thumbnail: entry['media:group'][0]['media:thumbnail'][0].$.url,
        author: entry.author[0].name[0]
      }));
    } catch (err) {
      console.error('Failed to parse RSS for', channelId, err);
      return [];
    }
  };

  const handleSubscribe = async () => {
    if (!channelInput) return;
    
    // Extract channel ID from URL or assume it's an ID
    // Simplification: assume user pastes channel ID directly for now
    const channelId = channelInput.includes('channel/') 
      ? channelInput.split('channel/')[1].split('/')[0] 
      : channelInput;

    // @ts-ignore
    const db = await window.electronAPI.getDb();
    if (!db.subscriptions) db.subscriptions = [];
    if (!db.subscriptions.includes(channelId)) {
      db.subscriptions.push(channelId);
      // @ts-ignore
      await window.electronAPI.saveDb(db);
    }
    
    setChannelInput('');
    loadSubscriptions();
  };

  return (
    <div className="main-content">
      <div className="feed-header">
        <h1>Your Subscriptions</h1>
      </div>
      
      <div className="subscribe-form">
        <input 
          type="text" 
          className="subscribe-input"
          placeholder="Paste YouTube Channel ID (e.g. UCX6OQ3DkcsbYNE6H8uQQuVA)"
          value={channelInput}
          onChange={e => setChannelInput(e.target.value)}
        />
        <button className="subscribe-btn" onClick={handleSubscribe}>Subscribe</button>
      </div>

      <div className="video-grid">
        {loading ? (
          <p style={{ padding: '0 40px', color: 'var(--text-muted)' }}>Loading latest videos...</p>
        ) : videos.length === 0 ? (
          <p style={{ padding: '0 40px', color: 'var(--text-muted)' }}>No videos found. Subscribe to a channel to get started.</p>
        ) : (
          videos.map((vid, i) => (
            <div key={i} className="video-card" onClick={() => onPlayVideo(vid.id)}>
              <img src={vid.thumbnail} alt={vid.title} className="video-thumbnail" />
              <div className="video-info">
                <div className="video-title">{vid.title}</div>
                <div className="video-channel">{vid.author}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
