// src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

export const ACCENT_COLORS = [
  { id: 'orange', name: 'Flame Orange', hex: '#ff5500', glow: 'rgba(255, 85, 0, 0.4)' },
  { id: 'pink', name: 'Court Pink', hex: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)' },
  { id: 'navy', name: 'Navy Blue', hex: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.4)' },
  { id: 'darkblue', name: 'Dark Indigo', hex: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)' },
  { id: 'red', name: 'Crimson Red', hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
  { id: 'yellow', name: 'Showtime Gold', hex: '#eab308', glow: 'rgba(234, 179, 8, 0.4)' },
];

const ThemeContext = createContext({
  theme: 'dark',
  accentColor: 'orange',
  toggleTheme: () => {},
  setTheme: () => {},
  setAccentColor: () => {},
  accents: ACCENT_COLORS,
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('hooplogs_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [accentColor, setAccentColor] = useState('orange');

  useEffect(() => {
    try {
      localStorage.setItem('hooplogs_accent', 'orange');
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', 'orange');

    const root = document.documentElement;
    const orangeHex = '#ff5500';
    const orangeHot = '#ff7a2e';
    const orangeGlow = 'rgba(255, 85, 0, 0.25)';

    root.style.setProperty('--orange', orangeHex);
    root.style.setProperty('--orange-hot', orangeHot);
    root.style.setProperty('--orange-blaze', orangeHex);
    root.style.setProperty('--orange-light', orangeHot);
    root.style.setProperty('--brand-primary', orangeHex);
    root.style.setProperty('--brand-hover', orangeHot);
    root.style.setProperty('--accent-orange', orangeHex);
    root.style.setProperty('--t-orange', orangeHex);
    root.style.setProperty('--orange-glow', orangeGlow);
    root.style.setProperty('--brand-glow', orangeGlow);
    root.style.setProperty('--shadow-orange', `0 0 16px ${orangeGlow}`);
    root.style.setProperty('--border-accent', 'rgba(255, 85, 0, 0.35)');

    try {
      localStorage.setItem('hooplogs_theme', theme);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        accentColor,
        setTheme,
        toggleTheme,
        setAccentColor,
        accents: ACCENT_COLORS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
