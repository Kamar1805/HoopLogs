import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import hoopLogo from '../assets/hooplogs.png';
import './Dashboard.css';

const SiteHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, [auth]);

  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
  const toggleDropdown = () => setIsDropdownOpen(prev => !prev);

  const handleLogout = () => {
    signOut(auth);
    navigate('/login');
  };

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
              <a href="/shottracker" className="dropdown-item">Shot Tracker</a>
              <a href="#" className="dropdown-item">Workout Tracker</a>
              <a href="#" className="dropdown-item">Progress Summary</a>
            </div>
          )}
        </div>
        <a href="/" className="dropdown-item">Dashboard</a>
        <a href="#" className="dropdown-item">Hoopers of HoopLogs</a>
        <a href="/coachgpt" className="dropdown-item">Talk with CoachGPT</a>
        <a href="/profile" className="dropdown-item">My Profile</a>

        {user ? (
  <button onClick={handleLogout} className="nav-auth-btn">Log Out</button>
) : (
  <a href="/login" className="nav-auth-btn">Log In</a>
)}

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
