import React from 'react';
import { IoBasketball } from 'react-icons/io5';
import './Court5ZonesSVG.css';

export const ZONES_CONFIG = [
  {
    id: 'corner_3',
    label: 'Corner Three-Pointer',
    shortLabel: 'Corner 3',
    points: 3,
    color: '#38bdf8', // Sky blue
  },
  {
    id: 'wing_3',
    label: 'Wing / Angle Three-Pointer',
    shortLabel: 'Wing 3',
    points: 3,
    color: '#818cf8', // Indigo
  },
  {
    id: 'top_key_3',
    label: 'Center / Top of Key Three-Pointer',
    shortLabel: 'Top Key 3',
    points: 3,
    color: '#c084fc', // Purple
  },
  {
    id: 'elbow_2',
    label: 'Elbow / Free-Throw Line Area',
    shortLabel: 'Elbow / FT',
    points: 2,
    color: '#34d399', // Emerald
  },
  {
    id: 'left_short_corner',
    label: 'Left Short Corner (Baseline Mid-Range)',
    shortLabel: 'L Short Corner',
    points: 2,
    color: '#fbbf24', // Amber Gold
  },
  {
    id: 'right_short_corner',
    label: 'Right Short Corner (Baseline Mid-Range)',
    shortLabel: 'R Short Corner',
    points: 2,
    color: '#f59e0b', // Amber Orange
  },
  {
    id: 'paint_2',
    label: 'Paint / Restricted Area',
    shortLabel: 'Paint',
    points: 2,
    color: '#f87171', // Rose
  },
];

const Court5ZonesSVG = ({ selectedZoneId, onSelectZone, zoneStats = {} }) => {
  const getStatString = (zoneId) => {
    const stat = zoneStats[zoneId];
    if (!stat || stat.attempted === 0) return '0/0 (0%)';
    const pct = Math.round((stat.made / stat.attempted) * 100);
    return `${stat.made}/${stat.attempted} (${pct}%)`;
  };

  const getZone = (id) => ZONES_CONFIG.find((z) => z.id === id) || ZONES_CONFIG[0];

  return (
    <div className="court-container">
      <div className="court-instruction-bar">
        <IoBasketball size={18} color="#ff5500" />
        <span>Tap any court zone below to log makes and attempts</span>
      </div>

      <div className="court-svg-wrapper">
        <svg
          viewBox="0 0 500 420"
          className="court-svg-canvas"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Court Wood/Floor Background */}
          <rect width="500" height="420" fill="#1e293b" rx="12" />

          {/* Hardwood texture lines (subtle) */}
          <line x1="0" y1="140" x2="500" y2="140" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="0" y1="280" x2="500" y2="280" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />

          {/* ZONE 1: Left Corner 3 */}
          <polygon
            points="0,300 45,300 45,420 0,420"
            fill={getZone('corner_3').color}
            className={`zone-polygon ${selectedZoneId === 'corner_3' ? 'selected' : ''}`}
            onClick={() => onSelectZone(getZone('corner_3'))}
          />
          {/* ZONE 1: Right Corner 3 */}
          <polygon
            points="455,300 500,300 500,420 455,420"
            fill={getZone('corner_3').color}
            className={`zone-polygon ${selectedZoneId === 'corner_3' ? 'selected' : ''}`}
            onClick={() => onSelectZone(getZone('corner_3'))}
          />

          {/* ZONE 2: Left Wing 3 */}
          <path
            d="M 0,160 L 150,160 L 120,250 L 45,300 L 0,300 Z"
            fill={getZone('wing_3').color}
            className={`zone-polygon ${selectedZoneId === 'wing_3' ? 'selected' : ''}`}
            onClick={() => onSelectZone(getZone('wing_3'))}
          />
          {/* ZONE 2: Right Wing 3 */}
          <path
            d="M 350,160 L 500,160 L 500,300 L 455,300 L 380,250 Z"
            fill={getZone('wing_3').color}
            className={`zone-polygon ${selectedZoneId === 'wing_3' ? 'selected' : ''}`}
            onClick={() => onSelectZone(getZone('wing_3'))}
          />

          {/* ZONE 3: Center / Top of Key 3 */}
          <polygon
            points="0,0 500,0 500,160 350,160 250,110 150,160 0,160"
            fill={getZone('top_key_3').color}
            className={`zone-polygon ${selectedZoneId === 'top_key_3' ? 'selected' : ''}`}
            onClick={() => onSelectZone(getZone('top_key_3'))}
          />

          {/* ZONE 4: Elbow & Mid-Range / Free Throw Line Area */}
          <path
            d="M 120,250 L 150,160 L 250,110 L 350,160 L 380,250 L 330,260 L 170,260 Z"
            fill={getZone('elbow_2').color}
            className={`zone-polygon ${selectedZoneId === 'elbow_2' ? 'selected' : ''}`}
            onClick={() => onSelectZone(getZone('elbow_2'))}
          />

          {/* ZONE: Left Short Corner (Baseline Mid-Range) */}
          <polygon
            points="45,420 45,300 120,250 170,260 170,420"
            fill={getZone('left_short_corner').color}
            className={`zone-polygon ${selectedZoneId === 'left_short_corner' ? 'selected' : ''}`}
            onClick={() => onSelectZone(getZone('left_short_corner'))}
          />

          {/* ZONE: Right Short Corner (Baseline Mid-Range) */}
          <polygon
            points="330,420 330,260 380,250 455,300 455,420"
            fill={getZone('right_short_corner').color}
            className={`zone-polygon ${selectedZoneId === 'right_short_corner' ? 'selected' : ''}`}
            onClick={() => onSelectZone(getZone('right_short_corner'))}
          />

          {/* ZONE 5: Paint / Restricted Area (The Key & Rim) */}
          <rect
            x="170"
            y="260"
            width="160"
            height="160"
            fill={getZone('paint_2').color}
            className={`zone-polygon ${selectedZoneId === 'paint_2' ? 'selected' : ''}`}
            onClick={() => onSelectZone(getZone('paint_2'))}
          />

          {/* Basketball Court Regulation Markings (Overlay) */}
          {/* Baseline */}
          <line x1="0" y1="418" x2="500" y2="418" stroke="#ffffff" strokeWidth="2.5" />

          {/* 3-Point Arc */}
          {/* Left straight line */}
          <line x1="45" y1="300" x2="45" y2="418" stroke="#ffffff" strokeWidth="2" />
          {/* Right straight line */}
          <line x1="455" y1="300" x2="455" y2="418" stroke="#ffffff" strokeWidth="2" />
          {/* Arc connecting corners */}
          <path
            d="M 45 300 A 215 215 0 0 1 455 300"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
          />

          {/* Key / Lane Borders */}
          <rect
            x="170"
            y="260"
            width="160"
            height="158"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
          />

          {/* Free throw circle top half (dashed & solid) */}
          <circle cx="250" cy="260" r="50" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeDasharray="6 4" />
          {/* Free throw line */}
          <line x1="170" y1="260" x2="330" y2="260" stroke="#ffffff" strokeWidth="2" />

          {/* Restricted Area Arc near hoop */}
          <path
            d="M 220 395 A 30 30 0 0 1 280 395"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
          />

          {/* Backboard & Rim */}
          <line x1="225" y1="402" x2="275" y2="402" stroke="#ffffff" strokeWidth="4" />
          <line x1="250" y1="402" x2="250" y2="396" stroke="#ea580c" strokeWidth="2" />
          <circle cx="250" cy="392" r="8" fill="none" stroke="#ea580c" strokeWidth="2.5" />

          {/* ZONE LABELS AND BADGES */}
          {/* Top of Key 3 */}
          <g transform="translate(250, 75)" textAnchor="middle">
            <rect x="-80" y="-18" width="160" height="34" rx="6" fill="#0f172a" fillOpacity="0.85" stroke="#c084fc" strokeWidth="1.5" />
            <text y="-2" className="zone-badge-label">Top of Key (3 PT)</text>
            <text y="11" className="zone-badge-stat">{getStatString('top_key_3')}</text>
          </g>

          {/* Wing 3 Left */}
          <g transform="translate(70, 220)" textAnchor="middle">
            <rect x="-55" y="-18" width="110" height="34" rx="6" fill="#0f172a" fillOpacity="0.85" stroke="#818cf8" strokeWidth="1.5" />
            <text y="-2" className="zone-badge-label">Wing 3 (L)</text>
            <text y="11" className="zone-badge-stat">{getStatString('wing_3')}</text>
          </g>

          {/* Wing 3 Right */}
          <g transform="translate(430, 220)" textAnchor="middle">
            <rect x="-55" y="-18" width="110" height="34" rx="6" fill="#0f172a" fillOpacity="0.85" stroke="#818cf8" strokeWidth="1.5" />
            <text y="-2" className="zone-badge-label">Wing 3 (R)</text>
            <text y="11" className="zone-badge-stat">{getStatString('wing_3')}</text>
          </g>

          {/* Elbow / Free Throw Area */}
          <g transform="translate(250, 205)" textAnchor="middle">
            <rect x="-75" y="-18" width="150" height="34" rx="6" fill="#0f172a" fillOpacity="0.85" stroke="#34d399" strokeWidth="1.5" />
            <text y="-2" className="zone-badge-label">Elbow / FT (2 PT)</text>
            <text y="11" className="zone-badge-stat">{getStatString('elbow_2')}</text>
          </g>

          {/* Corner 3 Left */}
          <g transform="translate(24, 360)" textAnchor="middle">
            <rect x="-20" y="-18" width="40" height="34" rx="4" fill="#0f172a" fillOpacity="0.85" stroke="#38bdf8" strokeWidth="1.5" />
            <text y="-2" className="zone-badge-label">LC3</text>
            <text y="11" className="zone-badge-stat">{getStatString('corner_3')}</text>
          </g>

          {/* Left Short Corner */}
          <g transform="translate(108, 345)" textAnchor="middle">
            <rect x="-48" y="-18" width="96" height="34" rx="4" fill="#0f172a" fillOpacity="0.85" stroke="#fbbf24" strokeWidth="1.5" />
            <text y="-2" className="zone-badge-label">L Short Cor (2P)</text>
            <text y="11" className="zone-badge-stat">{getStatString('left_short_corner')}</text>
          </g>

          {/* Right Short Corner */}
          <g transform="translate(392, 345)" textAnchor="middle">
            <rect x="-48" y="-18" width="96" height="34" rx="4" fill="#0f172a" fillOpacity="0.85" stroke="#f59e0b" strokeWidth="1.5" />
            <text y="-2" className="zone-badge-label">R Short Cor (2P)</text>
            <text y="11" className="zone-badge-stat">{getStatString('right_short_corner')}</text>
          </g>

          {/* Corner 3 Right */}
          <g transform="translate(476, 360)" textAnchor="middle">
            <rect x="-20" y="-18" width="40" height="34" rx="4" fill="#0f172a" fillOpacity="0.85" stroke="#38bdf8" strokeWidth="1.5" />
            <text y="-2" className="zone-badge-label">RC3</text>
            <text y="11" className="zone-badge-stat">{getStatString('corner_3')}</text>
          </g>

          {/* Paint Area */}
          <g transform="translate(250, 335)" textAnchor="middle">
            <rect x="-60" y="-18" width="120" height="34" rx="6" fill="#0f172a" fillOpacity="0.85" stroke="#f87171" strokeWidth="1.5" />
            <text y="-2" className="zone-badge-label">Paint (2 PT)</text>
            <text y="11" className="zone-badge-stat">{getStatString('paint_2')}</text>
          </g>
        </svg>
      </div>

      {/* Quick Select Buttons */}
      <div className="court-quick-select-pills">
        {ZONES_CONFIG.map((z) => (
          <button
            key={z.id}
            type="button"
            className={`zone-pill-btn ${selectedZoneId === z.id ? 'active' : ''}`}
            onClick={() => onSelectZone(z)}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: z.color,
                display: 'inline-block',
              }}
            />
            {z.label} ({z.points}P)
          </button>
        ))}
      </div>
    </div>
  );
};

export default Court5ZonesSVG;
