// src/components/AppGuideModal.jsx
import React, { useState } from 'react';
import {
  LuCrosshair,
  LuTrophy,
  LuUsers,
  LuActivity,
  LuArrowRight,
  LuArrowLeft,
  LuX,
  LuCheck,
  LuCompass,
  LuPalette,
  LuSun,
  LuMoon
} from 'react-icons/lu';
import { IoBasketball } from 'react-icons/io5';
import { useTheme } from '../context/ThemeContext';
import './AppGuideModal.css';

const TOUR_STEPS = [
  {
    step: 1,
    id: 'welcome',
    title: 'Welcome to HoopLogs',
    badge: 'ATHLETE HUB',
    icon: IoBasketball,
    iconColor: '#ff5500',
    headline: 'Your Complete Basketball Training Operating System',
    description:
      'HoopLogs is designed for serious hoopers and coaches. Track your shooting efficiency across 5 court zones, follow explosive athletic workouts, connect with coaches, and climb leaderboards.',
    tip: 'Everything automatically syncs to the cloud and is 100% free.',
  },
  {
    step: 2,
    id: 'theme-picker',
    title: 'Light & Dark Court Mode',
    badge: 'DISPLAY MODE',
    icon: LuSun,
    iconColor: '#ff5500',
    headline: 'Toggle Dark Arena or Light Mode',
    description:
      'Easily switch between high-contrast Dark Arena Mode and clean Light Court Mode depending on your training environment.',
    tip: 'Tap the button below to toggle theme mode, or use the sun/moon icon anytime in the top header.',
  },
  {
    step: 3,
    id: 'shot-tracker',
    title: '5-Zone Shot Tracker',
    badge: 'SHOOTING EFFICIENCY',
    icon: LuCrosshair,
    iconColor: '#ff7a2e',
    headline: 'Log Sets Without Breaking Your Rhythm',
    description:
      'Shoot your set (e.g. 10 or 20 shots). Simply tap the zone on the court (Corner 3, Wing 3, Top Key, Mid-Range, Paint) and enter your makes & misses in seconds.',
    tip: 'The app tracks if your shooting percentage improved (↑) or dipped (↓) over time.',
  },
  {
    step: 4,
    id: 'workouts',
    title: 'Athletic Workouts',
    badge: 'LEGS LOADING',
    icon: LuActivity,
    iconColor: '#10b981',
    headline: 'Speed, Vertical, Strength & Conditioning',
    description:
      'Select your goal (Vertical Rim Elevation, First Step Speed, Contact Armor, or Stamina) and whether you are training in a gym or with home/bodyweight drills.',
    tip: 'Your active workout appears on your Home dashboard so you never miss a day.',
  },
  {
    step: 5,
    id: 'leaderboard',
    title: 'Live Leaderboards & WhatsApp',
    badge: 'GLOBAL COMPETITION',
    icon: LuTrophy,
    iconColor: '#f59e0b',
    headline: 'Compete On Global Ranks & Direct Connect',
    description:
      'See all hoopers, their assigned squads, and last active sessions. Connect directly with teammates on WhatsApp with 1 tap.',
    tip: 'Add your WhatsApp number in your profile so coaches can reach you directly!',
  },
];

const AppGuideModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { theme, toggleTheme, accentColor, setAccentColor, accents } = useTheme();

  if (!isOpen) return null;

  const current = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const IconComponent = current.icon;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hooplogs_tour_completed', 'true');
    localStorage.setItem('hooplogs_guide_dismissed', 'true');
    onClose();
  };

  return (
    <div className="tour-modal-backdrop" onClick={onClose}>
      <div className="tour-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="tour-sheet-header">
          <div className="tour-step-pill">
            <LuCompass size={12} color="var(--brand-primary, #ff7a2e)" />
            <span>APP GUIDE • STEP {current.step} OF {TOUR_STEPS.length}</span>
          </div>
          <button type="button" className="tour-close-btn" onClick={handleComplete} title="Close Guide">
            <LuX size={16} />
          </button>
        </div>

        {/* Step Visual Icon */}
        <div className="tour-icon-cluster">
          <div className="tour-icon-ring" style={{ borderColor: `${current.iconColor}40` }}>
            <div className="tour-icon-circle" style={{ background: `${current.iconColor}18` }}>
              <IconComponent size={28} color={current.iconColor} />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="tour-body">
          <span className="tour-badge" style={{ color: current.iconColor }}>
            {current.badge}
          </span>
          <h2 className="tour-headline">{current.headline}</h2>
          <p className="tour-desc">{current.description}</p>

          {/* LIGHT / DARK MODE STEP */}
          {current.id === 'theme-picker' && (
            <div className="tour-theme-picker-card">
              <div className="theme-mode-row" style={{ width: '100%', justifyContent: 'center' }}>
                <button
                  type="button"
                  className={`theme-mode-toggle-btn ${theme === 'dark' ? 'active-dark' : 'active-light'}`}
                  onClick={toggleTheme}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  {theme === 'dark' ? <LuMoon size={16} /> : <LuSun size={16} />}
                  <span>{theme === 'dark' ? 'Dark Arena Mode (Active)' : 'Light Court Mode (Active)'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="tour-tip-box">
            <span className="tour-tip-label">PRO TIP:</span>
            <span className="tour-tip-text">{current.tip}</span>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="tour-dots-row">
          {TOUR_STEPS.map((s, idx) => (
            <div
              key={s.step}
              className={`tour-dot ${idx === currentStep ? 'active' : idx < currentStep ? 'done' : ''}`}
              onClick={() => setCurrentStep(idx)}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="tour-actions-row">
          <button
            type="button"
            className="tour-btn-secondary"
            onClick={isFirst ? handleComplete : handleBack}
          >
            {isFirst ? 'Skip Tour' : (
              <>
                <LuArrowLeft size={14} /> Back
              </>
            )}
          </button>

          <button
            type="button"
            className="tour-btn-primary"
            onClick={handleNext}
          >
            {isLast ? (
              <>
                <LuCheck size={16} /> Let's Hoop!
              </>
            ) : (
              <>
                Next <LuArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppGuideModal;
