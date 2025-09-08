import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import hoopLogo from '../assets/hooplogs.png';
import './Dashboard.css';

const SiteHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
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
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    signOut(auth);
    setShowLogoutModal(false);
    navigate('/login');
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
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
              <a href="workouttracker" className="dropdown-item">Workout Tracker</a>
              <a href="#" className="dropdown-item">Progress Summary</a>
              <a href="/statstracker" className="dropdown-item">Stats Tracker</a>
            </div>
          )}
        </div>
        <a href="/" className="dropdown-item">Dashboard</a>
        <a href="/hoopers" className="dropdown-item">Hoopers of Hooplogs</a>
        <a href="/request-coaching" className="dropdown-item">Request Coaching</a>
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

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <div className="coachpt-emoji" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>😢</div>
            <h3>CoachPT says...</h3>
            <p>Are you sure you want to log out?<br />We'll miss you on the court!</p>
            <div className="logout-modal-actions">
              <button className="logout-yes" onClick={confirmLogout}>Yes, Log Out</button>
              <button className="logout-no" onClick={cancelLogout}>No, Stay</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default SiteHeader;