// src/pages/CoachGPT.jsx
import React from 'react';
import './CoachGPT.css';
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const CoachGPT = () => {
  return (
      <div className="contain">
        <SiteHeader />
      <iframe className="iframe-container"
  

        src="https://app.vectorshift.ai/chatbots/deployed/688006bd8a19f94d0915270b"
        width="1000px"
        height="600px"
        style={{ border: 'none' }}
        allow="clipboard-read; clipboard-write; microphone"
        title="CoachGPT"
      />
      <SiteFooter />
      </div>
   
  );
};

export default CoachGPT;
