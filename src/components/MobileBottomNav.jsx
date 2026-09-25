// src/components/MobileBottomNav.jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LuLayoutDashboard, LuTrophy, LuUsers, LuUser } from 'react-icons/lu';
import { IoBasketball } from 'react-icons/io5';
import './MobileBottomNav.css';

const MobileBottomNav = () => {
  const location = useLocation();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Home',
      icon: LuLayoutDashboard,
      isActiveMatch: (path) => path === '/' || path === '/dashboard',
    },
    {
      to: '/hoopers',
      label: 'Hoopers',
      icon: LuTrophy,
      isActiveMatch: (path) => path === '/hoopers' || path === '/leaderboards',
    },
    {
      to: '/shottracker',
      label: 'Court',
      icon: IoBasketball,
      isPrimary: true,
      isActiveMatch: (path) => path === '/shottracker' || path === '/workouttracker',
    },
    {
      to: '/teams',
      label: 'Teams',
      icon: LuUsers,
      isActiveMatch: (path) => path === '/teams' || path === '/rosters',
    },
    {
      to: '/profile',
      label: 'Profile',
      icon: LuUser,
      isActiveMatch: (path) => path === '/profile',
    },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const isActive = item.isActiveMatch(location.pathname);
        const IconComponent = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`bottom-nav-item ${isActive ? 'active' : ''} ${item.isPrimary ? 'primary-tracker' : ''}`}
          >
            {isActive && <div className="bottom-nav-indicator" />}
            {item.isPrimary ? (
              <div className="tracker-ball-badge">
                <IconComponent size={22} />
              </div>
            ) : (
              <IconComponent size={20} className="bottom-nav-icon" />
            )}
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
