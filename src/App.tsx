import { useState } from 'react';
import { SubscriptionFeed } from './components/SubscriptionFeed';
import { VideoPlayer } from './components/VideoPlayer';
import { PlaySquare, Search, Compass } from 'lucide-react';

function App() {
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  return (
    <div className="app-container">
      <div className="sidebar glass">
        <div className="brand">
          <PlaySquare size={32} color="#ff3366" />
          YTF Desktop
        </div>

        <div className="nav-item active">
          <PlaySquare size={20} />
          Subscriptions
        </div>
        <div className="nav-item" style={{ opacity: 0.5 }}>
          <Compass size={20} />
          Discover (WIP)
        </div>
        <div className="nav-item" style={{ opacity: 0.5 }}>
          <Search size={20} />
          Search (WIP)
        </div>

        <div style={{ marginTop: 'auto', padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Ad-Free &bull; 1080p
        </div>
      </div>

      {currentVideoId ? (
        <VideoPlayer 
          videoId={currentVideoId} 
          onBack={() => setCurrentVideoId(null)} 
        />
      ) : (
        <SubscriptionFeed onPlayVideo={setCurrentVideoId} />
      )}
    </div>
  );
}

export default App;
