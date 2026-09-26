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

  const [accentColor, setAccentColor] = useState(() => {
    try {
      return localStorage.getItem('hooplogs_accent') || 'orange';
    } catch {
      return 'orange';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accentColor);

    const active = ACCENT_COLORS.find((a) => a.id === accentColor) || ACCENT_COLORS[0];
    const root = document.documentElement;

    root.style.setProperty('--orange', active.hex);
    root.style.setProperty('--orange-hot', active.hex);
    root.style.setProperty('--orange-blaze', active.hex);
    root.style.setProperty('--orange-light', active.hex);
    root.style.setProperty('--brand-primary', active.hex);
    root.style.setProperty('--brand-hover', active.hex);
    root.style.setProperty('--accent-orange', active.hex);
    root.style.setProperty('--t-orange', active.hex);
    root.style.setProperty('--orange-glow', active.glow);
    root.style.setProperty('--brand-glow', active.glow);
    root.style.setProperty('--shadow-orange', `0 0 20px ${active.glow}`);
    root.style.setProperty('--border-accent', active.glow);

    try {
      localStorage.setItem('hooplogs_theme', theme);
      localStorage.setItem('hooplogs_accent', accentColor);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  }, [theme, accentColor]);

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
