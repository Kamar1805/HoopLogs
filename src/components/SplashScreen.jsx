import React from "react";
import "./SplashScreen.css";

const SplashScreen = ({ fadeOut }) => {
  const logo = "HoopLogs";
  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
      <div className="splash-anim-wrapper">
        <div className="ball-shadow"></div>
        <div className="ball" aria-label="Bouncing basketball">
          🏀
        </div>
        <div className="note-wrapper" aria-label="Taking notes">
          <div className="note-sheet">
            <div className="note-line"></div>
            <div className="note-line short"></div>
          </div>
            <div className="pencil"></div>
        </div>
      </div>

      <h1 className="splash-logo" aria-label={logo}>
        {logo.split("").map((ch, i) => (
          <span style={{ "--i": i }} key={i} aria-hidden="true">
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </h1>

      <p className="splash-tagline fancy-tagline">
        <span className="tag-frag" style={{ "--d": 0 }}>Tracking</span>
        <span className="tag-frag" style={{ "--d": 1 }}>greatness,</span>
        <span className="tag-frag" style={{ "--d": 2 }}>one</span>
        <span className="tag-frag" style={{ "--d": 3 }}>shot</span>
        <span className="tag-frag" style={{ "--d": 4 }}>at</span>
        <span className="tag-frag" style={{ "--d": 5 }}>a</span>
        <span className="tag-frag" style={{ "--d": 6 }}>time...</span>
      </p>
    </div>
  );
};

export default SplashScreen;