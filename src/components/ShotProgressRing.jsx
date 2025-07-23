// src/components/ShotProgressRing.jsx
import React from "react";

const ShotProgressRing = ({ title, pct, subtitle }) => {
  const radius = 60;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (pct / 100) * circumference;

  return (
    <div style={{ textAlign: "center" }}>
      <svg height={radius * 2} width={radius * 2}>
        <circle
          fill="none"
          stroke="#eee"
          strokeWidth={stroke}
          cx={radius}
          cy={radius}
          r={normalizedRadius}
        />
        <circle
          fill="none"
          stroke="#384959"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference + " " + circumference}
          strokeDashoffset={strokeDashoffset}
          cx={radius}
          cy={radius}
          r={normalizedRadius}
        />
        <text
          x="50%"
          y="50%"
          dy="0.3em"
          textAnchor="middle"
          fontSize="20px"
          fill="#384959"
        >
          {pct}%
        </text>
      </svg>
      <h4 style={{ margin: "8px 0 4px" }}>{title}</h4>
      <p style={{ fontSize: "14px", color: "#666" }}>{subtitle}</p>
    </div>
  );
};

export default ShotProgressRing;
