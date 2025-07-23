// src/components/HalfCourtSVG.jsx
import React from "react";
import "./HalfCourtSVG.css";

const zones = [
  { id: "topKey", cx: 250, cy: 70, label: "Top of Key" },
  { id: "rightElbow", cx: 330, cy: 160, label: "Right Elbow" },
  { id: "leftElbow", cx: 170, cy: 160, label: "Left Elbow" },
  { id: "leftWing", cx: 80, cy: 120, label: "Left Wing" },
  { id: "rightWing", cx: 420, cy: 120, label: "Right Wing" },
  { id: "leftCorner", cx: 20, cy: 285, label: "Left Corner" },
  { id: "rightCorner", cx: 482, cy: 285, label: "Right Corner" },
  { id: "leftShortCorner", cx: 110, cy: 285, label: "Left Short Corner" },
  { id: "rightShortCorner", cx: 390, cy: 285, label: "Right Short Corner" },
  { id: "freeThrow", cx: 250, cy: 150, label: "Free Throw" },
];

const HalfCourtSVG = ({ onZoneClick }) => {
  return (
    <div className="court-wrapper">
      <p className="court-instruction">
        🏀 Click on any spot from the court to record your shots.
      </p>
      <svg
        viewBox="0 0 500 300"
        className="court-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect width="900" height="300" fill="#F9C48D" />
        <line x1="0" y1="300" x2="500" y2="300" stroke="#333" strokeWidth="2" />
        <path
          d="M 40 300 A 210 210 0 0 1 460 300"
          fill="none"
          stroke="#333"
          strokeWidth="2"
        />
        <rect
          x="200"
          y="160"
          width="100"
          height="140"
          fill="red"
          stroke="#333"
          strokeWidth="2"
        />
        <circle cx="250" cy="160" r="40" fill="none" stroke="#333" strokeWidth="2" />
        <circle cx="250" cy="290" r="7" fill="#333" />
        <line x1="230" y1="285" x2="270" y2="285" stroke="#333" strokeWidth="2" />

        {zones.map((zone) => (
          <circle
            key={zone.id}
            cx={zone.cx}
            cy={zone.cy}
            r="10"
            fill="#384959"
            stroke="#fff"
            strokeWidth="2"
            className="shot-zone"
            onClick={() => onZoneClick(zone)}
          >
            <title>{zone.label}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
};

export default HalfCourtSVG;
