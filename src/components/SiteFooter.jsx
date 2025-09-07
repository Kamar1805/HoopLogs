import React from 'react';
import './Dashboard.css';   // footer styles already live here
import CoachGPTWidget from "../pages/CoachGPTWidget";

const SiteFooter = () => (
  <footer className="dashboard-footer">
    <p>&copy; 2025 HoopLogs. All rights reserved.</p>
    <CoachGPTWidget />
  </footer>
);

export default SiteFooter;
