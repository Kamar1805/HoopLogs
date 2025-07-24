// SplashScreen.jsx
import React from "react";
import "./SplashScreen.css";

const SplashScreen = ({ fadeOut }) => {
  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
      <h1 className="splash-logo">🏀 HoopLogs</h1>
      <p className="splash-tagline">Tracking greatness, one shot at a time...</p>
    </div>
  );
};

export default SplashScreen;
