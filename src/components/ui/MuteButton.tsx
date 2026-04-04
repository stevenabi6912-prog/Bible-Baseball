'use client';

import { useState } from 'react';
import { soundManager } from '../../lib/sounds';

export default function MuteButton() {
  const [muted, setMuted] = useState(false);

  const toggle = () => {
    const newState = soundManager.toggleMute();
    setMuted(newState);
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 bg-navy-800 text-white p-2 rounded-full shadow-lg hover:bg-navy-700 transition-colors"
      aria-label={muted ? 'Unmute' : 'Mute'}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {muted ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
}
