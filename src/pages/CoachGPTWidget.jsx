import React, { useState } from "react";
import "./CoachGPTWidget.css";

// Place your image in /public or /src/assets and use the correct path
const CoachGPTWidget = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="coachgpt-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open CoachGPT"
      >
        <img
          src="/coachgpt-icon.png" // e.g. public/coachgpt-icon.png
          alt="CoachGPT"
          className="coachgpt-img-icon"
          width={32}
          height={32}
        />
      </button>
      {open && (
        <div className="coachgpt-widget-modal">
          <div className="coachgpt-widget-header">
            <span>CoachGPT</span>
            <button className="close-btn" onClick={() => setOpen(false)}>&times;</button>
          </div>
          <iframe
            className="coachgpt-iframe"
            src="https://app.vectorshift.ai/chatbots/deployed/688006bd8a19f94d0915270b"
            width="350"
            height="500"
            style={{ border: "none" }}
            allow="clipboard-read; clipboard-write; microphone"
            title="CoachGPT"
          />
        </div>
      )}
    </>
  );
};

export default CoachGPTWidget;