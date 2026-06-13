import React, { useState, useEffect } from 'react';

import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { open } from '@tauri-apps/plugin-dialog';
import { Command } from '@tauri-apps/plugin-shell';

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
  const [searchInput, setSearchInput] = useState('');
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

  const handleSearch = async () => {
    if (!searchInput) {
      loadSubscriptions();
      return;
    }
    setLoading(true);
    let success = false;
    
    // Try multiple APIs
    const invidiousApis = [
      'https://iv.melmac.space/api/v1/search?q=',
      'https://invidious.lunar.icu/api/v1/search?q=',
      'https://invidious.jing.rocks/api/v1/search?q='
    ];

    for (const api of invidiousApis) {
      try {
        const response = await tauriFetch(`${api}${encodeURIComponent(searchInput)}`, { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          const searchResults = data
            .filter((item: any) => item.type === "video")
            .map((item: any) => ({
              id: item.videoId,
              title: item.title,
              thumbnail: item.videoThumbnails?.find((t: any) => t.quality === 'medium')?.url || item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
              author: item.author
            }));
          
          if (searchResults.length > 0) {
            setVideos(searchResults);
            success = true;
            break;
          }
        }
      } catch (err) {
        console.warn('API failed:', api);
      }
    }

    if (!success) {
      // Fallback to yt-dlp native search
      try {
        const command = Command.sidecar('bin/yt-dlp', [`ytsearch15:${searchInput}`, '-J']);
        const output = await command.execute();
        
        if (output.code === 0) {
          const data = JSON.parse(output.stdout);
          const searchResults = (data.entries || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            author: item.uploader || item.channel
          }));
          
          if (searchResults.length > 0) {
            setVideos(searchResults);
            success = true;
          }
        }
      } catch (err) {
        console.error('yt-dlp search failed', err);
      }
    }
    
    if (!success) {
        alert("Search failed. The public APIs might be down. Try again later.");
        setVideos([]);
    }
    setLoading(false);
  };

  const resolveChannelId = async (input: string) => {
    if (input.startsWith('UC') && input.length === 24) return input;
    
    let urlToFetch = input;
    if (input.startsWith('@')) {
      urlToFetch = `https://www.youtube.com/${input}`;
    } else if (!input.startsWith('http')) {
      urlToFetch = `https://www.youtube.com/@${input}`;
    }

    try {
      const res = await tauriFetch(urlToFetch, { method: 'GET' });
      const html = await res.text();
      
      const match = html.match(/channelId":"(UC[a-zA-Z0-9_-]+)"/);
      if (match && match[1]) return match[1];
      
      const metaMatch = html.match(/<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]+)">/);
      if (metaMatch && metaMatch[1]) return metaMatch[1];
    } catch(e) {
      console.error("Failed to resolve channel id", e);
    }
    return null;
  };

  const handleSubscribe = async () => {
    if (!channelInput) return;
    
    setLoading(true);
    let channelId = channelInput.includes('channel/') 
      ? channelInput.split('channel/')[1].split('/')[0] 
      : channelInput;

    if (!channelId.startsWith('UC') || channelId.length !== 24) {
      const resolved = await resolveChannelId(channelInput);
      if (resolved) {
        channelId = resolved;
      } else {
        alert("Could not resolve channel ID. Please provide a valid YouTube URL, handle, or channel ID.");
        setLoading(false);
        return;
      }
    }

    const db = await getDb();
    if (!db.subscriptions) db.subscriptions = [];
    if (!db.subscriptions.includes(channelId)) {
      db.subscriptions.push(channelId);
      await writeTextFile('db.json', JSON.stringify(db, null, 2), { baseDir: BaseDirectory.AppData });
    }
    
    setChannelInput('');
    setLoading(false);
    loadSubscriptions();
  };

  const handleImport = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      });
      if (!selectedPath) return;
      
      // read file
      const contents = await readTextFile(selectedPath as string);
      const lines = contents.split('\n');
      
      const db = await getDb();
      if (!db.subscriptions) db.subscriptions = [];
      let added = 0;
      
      for (const line of lines) {
        // basic CSV parsing, channel ID is usually in the first column or contains UC...
        if (line.includes('Channel Id')) continue; // skip header
        const columns = line.split(',');
        let channelId = columns[0]?.replace(/"/g, '').trim();
        
        // Sometimes it's a URL, sometimes just ID
        if (channelId && channelId.includes('channel/')) {
          channelId = channelId.split('channel/')[1].split('/')[0];
        }
        
        if (channelId && channelId.startsWith('UC') && !db.subscriptions.includes(channelId)) {
          db.subscriptions.push(channelId);
          added++;
        }
      }
      
      if (added > 0) {
        await writeTextFile('db.json', JSON.stringify(db, null, 2), { baseDir: BaseDirectory.AppData });
        loadSubscriptions();
        alert(`Imported ${added} new channels!`);
      } else {
        alert('No new channels found in CSV.');
      }
    } catch (e) {
      console.error('Failed to import', e);
      alert('Failed to import subscriptions.');
    }
  };

  return (
    <div className="main-content">
      <div className="feed-header">
        <h1>{searchInput ? 'Search Results' : 'Your Subscriptions'}</h1>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', padding: '0 40px', marginBottom: '1rem' }}>
        <div className="subscribe-form" style={{ flex: 1, padding: 0, margin: 0 }}>
          <input 
            type="text" 
            className="subscribe-input"
            placeholder="Search YouTube..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button className="subscribe-btn" onClick={handleSearch}>Search</button>
        </div>
        
        <div className="subscribe-form" style={{ flex: 1, padding: 0, margin: 0, display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            className="subscribe-input"
            placeholder="YouTube Channel URL, @handle, or ID"
            value={channelInput}
            onChange={e => setChannelInput(e.target.value)}
          />
          <button className="subscribe-btn" onClick={handleSubscribe}>Subscribe</button>
          <button className="subscribe-btn secondary" onClick={handleImport}>Import CSV</button>
        </div>
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
