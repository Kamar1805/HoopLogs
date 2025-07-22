// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import hoopLogo from '../assets/hooplogs.png';
import { auth, db } from '../Firebase';
import { doc, getDoc } from 'firebase/firestore';


const motivationalQuotes = [
  "Let's get back to the grind...",
  "Every day is a chance to get better.",
  "Hard work beats talent when talent doesn’t work hard.",
  "Success is earned one rep at a time.",
  "Grind now, shine later."
];

const Dashboard = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
  const toggleDropdown = () => setIsDropdownOpen(prev => !prev);

  useEffect(() => {
    const fetchUserNickname = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNickname(docSnap.data().nickname || docSnap.data().name || 'Hooper');
        }
      }
    };
    fetchUserNickname();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-wrapper">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="logo-container">
          <img src={hoopLogo} alt="HoopLogs Logo" className="logo-img" />
          
        </div>

        <nav className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
          {/* Dropdown Group */}
          <div className="nav-item dropdown" onClick={toggleDropdown}>
            <span className="nav-link dropdown-toggle">Progress Tracker ▾</span>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <a href="#" className="dropdown-item">Shot Tracker</a>
                <a href="#" className="dropdown-item">Workout Tracker</a>
                <a href="#" className="dropdown-item">Progress Summary</a>
              </div>
            )}
          </div>
          <a href="#" className="dropdown-item">Hoopers of HoopLogs</a>
          <a href="#" className="dropdown-item">Talk with CoachGPT</a>
          <a href="#" className="dropdown-item">My Profile</a>
          <a href="/login" className="dropdown-item">Log Out</a>
        </nav>

        <div className="hamburger" onClick={toggleMobileMenu}>
          <div className="bar" />
          <div className="bar" />
          <div className="bar" />
        </div>
      </header>

      {/* CONTENT */}
      <main className="dashboard-content">
  <div className="welcome-box">
    <h1>Welcome {nickname}!</h1>
    <p className="motivation-text">{motivationalQuotes[quoteIndex]}</p>
  </div>
</main>


      {/* FOOTER */}
      <footer className="dashboard-footer">
        <p>&copy; 2025 HoopLogs. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Dashboard;
