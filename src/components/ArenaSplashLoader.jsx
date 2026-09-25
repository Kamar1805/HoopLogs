// src/components/ArenaSplashLoader.jsx
import React from 'react';
import './ArenaSplashLoader.css';

export default function ArenaSplashLoader({ subtitle = 'ENTERING ARENA…' }) {
  return (
    <div className="arena-splash-container" role="status" aria-label="Loading HoopLogs">
      <div className="arena-splash-content">
        {/* BOUNCING BASKETBALL ANIMATION */}
        <div className="bouncing-ball-wrapper">
          <div className="basketball-sphere">
            <svg viewBox="0 0 100 100" className="ball-svg">
              <circle cx="50" cy="50" r="48" fill="#ff5500" />
              {/* Basketball Texture & Seams */}
              <circle cx="50" cy="50" r="48" fill="url(#ballGlow)" />
              {/* Outer border */}
              <circle cx="50" cy="50" r="48" fill="none" stroke="#111827" strokeWidth="3" />
              {/* Seams */}
              <line x1="2" y1="50" x2="98" y2="50" stroke="#111827" strokeWidth="2.5" />
              <line x1="50" y1="2" x2="50" y2="98" stroke="#111827" strokeWidth="2.5" />
              <path d="M 22 10 Q 55 50 22 90" fill="none" stroke="#111827" strokeWidth="2.5" />
              <path d="M 78 10 Q 45 50 78 90" fill="none" stroke="#111827" strokeWidth="2.5" />
              
              <defs>
                <radialGradient id="ballGlow" cx="35%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#ff7a2e" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#ff5500" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#9a2f00" stopOpacity="0.9" />
                </radialGradient>
              </defs>
            </svg>
          </div>
          {/* Synchronized Court Shadow */}
          <div className="court-ball-shadow" />
        </div>

        {/* BRAND TITLE & MOTTO */}
        <div className="arena-splash-brand">
          <div className="arena-brand-title">
            <span className="hoop-text">HOOP</span>
            <span className="logs-text">LOGS</span>
          </div>
          <p className="arena-tagline">TRACK YOUR GRIND. LEVEL UP YOUR GAME.</p>
        </div>

        {/* LOADING SUBTITLE */}
        <div className="arena-status-pill">
          <span className="status-dot" />
          <span className="status-label">{subtitle}</span>
        </div>
      </div>

      {/* FOOTER BADGE */}
      <div className="arena-splash-footer">
        <span>POWERED BY <strong className="sozidara-brand">SOZIDARA</strong></span>
      </div>
    </div>
  );
}
