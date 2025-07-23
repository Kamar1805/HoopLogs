import React, { useState } from 'react';
import hoopLogo from '../assets/hooplogs.png';
import './Dashboard.css';            // re‑use your existing styles

const SiteHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
  const toggleDropdown   = () => setIsDropdownOpen(prev => !prev);

  return (
    <header className="dashboard-header">
      <div className="logo-container">
        <img src={hoopLogo} alt="HoopLogs Logo" className="logo-img" />
      </div>

      <nav className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="nav-item dropdown" onClick={toggleDropdown}>
          <span className="nav-link dropdown-toggle">Progress Tracker ▾</span>
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <a href="/shottracker"     className="dropdown-item">Shot Tracker</a>
              <a href="#"                className="dropdown-item">Workout Tracker</a>
              <a href="#"                className="dropdown-item">Progress Summary</a>
            </div>
          )}
        </div>
        <a href="/dashboard"          className="dropdown-item">Dashboard</a>
        <a href="#"          className="dropdown-item">Hoopers of HoopLogs</a>
        <a href="/coachgpt"  className="dropdown-item">Talk with CoachGPT</a>
        <a href="#"          className="dropdown-item">My Profile</a>
        <a href="/login"     className="dropdown-item">Log Out</a>
      </nav>

      <div className="hamburger" onClick={toggleMobileMenu}>
        <div className="bar" />
        <div className="bar" />
        <div className="bar" />
      </div>
    </header>
  );
};

export default SiteHeader;
