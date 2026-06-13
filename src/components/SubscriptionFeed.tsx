import React, { useState, useEffect } from 'react';

import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

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

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const getDb = async () => {
    try {
      const hasDb = await exists('db.json', { baseDir: BaseDirectory.AppData });
      if (!hasDb) {
        const defaultDb = { subscriptions: [], watchProgress: {} };
        await writeTextFile('db.json', JSON.stringify(defaultDb), { baseDir: BaseDirectory.AppData });
        return defaultDb;
      }
      const text = await readTextFile('db.json', { baseDir: BaseDirectory.AppData });
      return JSON.parse(text);
    } catch (e) {
      console.error(e);
      return { subscriptions: [], watchProgress: {} };
    }
  };

  const loadSubscriptions = async () => {
    const db = await getDb();
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
      const response = await tauriFetch(rssUrl, { method: 'GET' });
      const xmlData = await response.text();
      
      if (!xmlData) return [];

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, "text/xml");
      const entries = Array.from(xmlDoc.getElementsByTagName("entry"));
      
      return entries.map((entry) => {
        const id = entry.getElementsByTagName("yt:videoId")[0]?.textContent || "";
        const title = entry.getElementsByTagName("title")[0]?.textContent || "";
        const author = entry.getElementsByTagName("name")[0]?.textContent || "";
        const mediaGroup = entry.getElementsByTagName("media:group")[0];
        const thumbnail = mediaGroup?.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url") || "";
        
        return { id, title, thumbnail, author };
      });
    } catch (err) {
      console.error('Failed to parse RSS for', channelId, err);
      return [];
    }
  };

  const handleSubscribe = async () => {
    if (!channelInput) return;
    const channelId = channelInput.includes('channel/') 
      ? channelInput.split('channel/')[1].split('/')[0] 
      : channelInput;

    const db = await getDb();
    if (!db.subscriptions) db.subscriptions = [];
    if (!db.subscriptions.includes(channelId)) {
      db.subscriptions.push(channelId);
      await writeTextFile('db.json', JSON.stringify(db, null, 2), { baseDir: BaseDirectory.AppData });
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
          placeholder="Paste YouTube Channel ID"
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
