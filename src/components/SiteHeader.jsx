// src/components/SiteHeader.jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LuLogOut, LuShieldCheck, LuZap, LuSun, LuMoon } from 'react-icons/lu';
import { IoBasketball, IoBasketballOutline } from 'react-icons/io5';
import './SiteHeader.css';

const SiteHeader = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isCoach = isAdmin || (typeof window !== 'undefined' && localStorage.getItem('hooplogs_admin_elevated') === 'true');

  const handleLogout = (e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      localStorage.removeItem('hooplogs_admin_elevated');
      await signOut();
      setShowLogoutModal(false);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      <header className="arena-top-header">
        <div className="arena-top-header-inner">
          <div className="top-header-left">
            <Link to="/" className="arena-brand-link">
              <div className="arena-logo-badge">
                <img src="/hooplogs-logo.png" alt="HoopLogs" style={{ width: '32px', height: '32px', borderRadius: '7px', objectFit: 'cover' }} />
              </div>
              <div className="arena-brand-text">
                <span className="brand-hoop">HOOP</span>
                <span className="brand-logs">LOGS</span>
              </div>
            </Link>
          </div>

          <div className="top-header-right">
            {/* LIGHT / DARK MODE TOGGLE */}
            <button
              type="button"
              onClick={toggleTheme}
              className="arena-theme-toggle-btn"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <LuSun size={15} /> : <LuMoon size={15} />}
            </button>

            {user ? (
              <div className="auth-profile-pill-group">
                <Link to="/profile" className="arena-avatar-pill" title="My Profile">
                  <div className="arena-avatar-circle">
                    {profile?.photo_url || profile?.photoURL || profile?.avatar_url ? (
                      <img
                        src={profile.photo_url || profile.photoURL || profile.avatar_url}
                        alt="Profile"
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <img
                        src="/hooplogs-logo.png"
                        alt="HoopLogs"
                        style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                      />
                    )}
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="arena-logout-icon-btn"
                  title="Sign Out"
                >
                  <LuLogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="auth-guest-links">
                <Link to="/login" className="arena-login-btn">
                  Log In
                </Link>
                <Link to="/signup" className="arena-signup-btn">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Sheet rendered into body to escape sticky header constraints */}
      {showLogoutModal && typeof document !== 'undefined' && createPortal(
        <div className="arena-modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="arena-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-basketball-icon">
              <IoBasketballOutline size={48} color="#ff5500" />
            </div>
            <h3>Leaving the Court?</h3>
            <p>Your session stats are synced to the cloud. Ready to sign out?</p>
            <div className="arena-modal-actions">
              <button className="modal-btn-confirm" onClick={confirmLogout}>
                YES, SIGN OUT
              </button>
              <button className="modal-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                STAY ON COURT
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SiteHeader;