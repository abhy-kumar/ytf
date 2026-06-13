import { useState } from 'react';
import { SubscriptionFeed } from './components/SubscriptionFeed';
import { VideoPlayer } from './components/VideoPlayer';
import { PlaySquare } from 'lucide-react';

function App() {
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="brand">
          <PlaySquare className="brand-icon" size={36} />
          YTF Desktop
        </div>

        <div className="nav-item active">
          <PlaySquare size={22} />
          Subscriptions
        </div>


        <div style={{ marginTop: 'auto', padding: '16px', fontSize: '14px', color: 'var(--text-dim)', textAlign: 'center' }}>
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
