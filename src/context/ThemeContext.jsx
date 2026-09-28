// src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { IoBasketball } from 'react-icons/io5';

export const ACCENT_COLORS = [
  { id: 'orange', name: 'Flame Orange', hex: '#ff5500', hot: '#ff7a2e', glow: 'rgba(255, 85, 0, 0.35)' },
  { id: 'pink', name: 'Court Pink', hex: '#ec4899', hot: '#f472b6', glow: 'rgba(236, 72, 153, 0.35)' },
  { id: 'navy', name: 'Navy Blue', hex: '#0ea5e9', hot: '#38bdf8', glow: 'rgba(14, 165, 233, 0.35)' },
  { id: 'darkblue', name: 'Dark Indigo', hex: '#6366f1', hot: '#818cf8', glow: 'rgba(99, 102, 241, 0.35)' },
  { id: 'red', name: 'Crimson Red', hex: '#ef4444', hot: '#f87171', glow: 'rgba(239, 68, 68, 0.35)' },
  { id: 'yellow', name: 'Showtime Gold', hex: '#eab308', hot: '#fde047', glow: 'rgba(234, 179, 8, 0.35)' },
];

const ThemeContext = createContext({
  theme: 'dark',
  accentColor: 'orange',
  themeLoading: false,
  toggleTheme: () => {},
  setTheme: () => {},
  setAccentColor: () => {},
  changeThemeWithSpinner: () => {},
  changeAccentWithSpinner: () => {},
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

  const [themeLoading, setThemeLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Updating Arena Theme…');

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-accent', accentColor);

    const activeAcc = ACCENT_COLORS.find((c) => c.id === accentColor) || ACCENT_COLORS[0];

    root.style.setProperty('--orange', activeAcc.hex);
    root.style.setProperty('--orange-hot', activeAcc.hot);
    root.style.setProperty('--orange-blaze', activeAcc.hex);
    root.style.setProperty('--orange-light', activeAcc.hot);
    root.style.setProperty('--brand-primary', activeAcc.hex);
    root.style.setProperty('--brand-hover', activeAcc.hot);
    root.style.setProperty('--brand-glow', activeAcc.glow);
    root.style.setProperty('--brand-subtle', `${activeAcc.hex}22`);
    root.style.setProperty('--accent-orange', activeAcc.hex);
    root.style.setProperty('--accent-color', activeAcc.hex);
    root.style.setProperty('--accent', activeAcc.hex);
    root.style.setProperty('--primary', activeAcc.hex);
    root.style.setProperty('--primary-color', activeAcc.hex);
    root.style.setProperty('--color-primary', activeAcc.hex);
    root.style.setProperty('--t-orange', activeAcc.hot);
    root.style.setProperty('--orange-glow', activeAcc.glow);
    root.style.setProperty('--shadow-orange', `0 0 22px ${activeAcc.glow}`);
    root.style.setProperty('--border-accent', `${activeAcc.hex}66`);

    // Light / Dark specific background adjustments
    if (theme === 'light') {
      root.style.setProperty('--bg-0', '#cbd5e1');
      root.style.setProperty('--bg-1', '#f8fafc');
      root.style.setProperty('--bg-2', '#ffffff');
      root.style.setProperty('--bg-3', '#f1f5f9');
      root.style.setProperty('--bg-4', '#e2e8f0');
      root.style.setProperty('--t-primary', '#0f172a');
      root.style.setProperty('--t-secondary', '#475569');
      root.style.setProperty('--t-muted', '#64748b');
      root.style.setProperty('--border-subtle', '#e2e8f0');
    } else {
      root.style.setProperty('--bg-0', '#060810');
      root.style.setProperty('--bg-1', '#0a0d16');
      root.style.setProperty('--bg-2', '#0f1522');
      root.style.setProperty('--bg-3', '#141c2c');
      root.style.setProperty('--bg-4', '#1a2338');
      root.style.setProperty('--t-primary', '#f8fafc');
      root.style.setProperty('--t-secondary', '#94a3b8');
      root.style.setProperty('--t-muted', '#64748b');
      root.style.setProperty('--border-subtle', 'rgba(255, 255, 255, 0.08)');
    }

    try {
      localStorage.setItem('hooplogs_theme', theme);
      localStorage.setItem('hooplogs_accent', accentColor);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  }, [theme, accentColor]);

  const changeThemeWithSpinner = (newTheme) => {
    setLoadingMsg(`SWITCHING TO ${newTheme === 'dark' ? 'DARK ARENA' : 'LIGHT COURT'}…`);
    setThemeLoading(true);
    setTimeout(() => {
      setTheme(newTheme);
      setTimeout(() => {
        setThemeLoading(false);
      }, 400);
    }, 450);
  };

  const changeAccentWithSpinner = (newAccentId) => {
    const acc = ACCENT_COLORS.find((a) => a.id === newAccentId);
    setLoadingMsg(`APPLYING ${acc?.name?.toUpperCase() || 'ACCENT'} PALETTE…`);
    setThemeLoading(true);
    setTimeout(() => {
      setAccentColor(newAccentId);
      setTimeout(() => {
        setThemeLoading(false);
      }, 400);
    }, 450);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    changeThemeWithSpinner(next);
  };

  const activeAccentObj = ACCENT_COLORS.find((c) => c.id === accentColor) || ACCENT_COLORS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        accentColor,
        themeLoading,
        setTheme,
        toggleTheme,
        setAccentColor,
        changeThemeWithSpinner,
        changeAccentWithSpinner,
        accents: ACCENT_COLORS,
      }}
    >
      {themeLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: theme === 'dark' ? 'rgba(6, 8, 16, 0.88)' : 'rgba(248, 250, 252, 0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            style={{
              padding: '28px 36px',
              borderRadius: '24px',
              background: theme === 'dark' ? '#0f1522' : '#ffffff',
              border: `1.5px solid ${activeAccentObj.hex}55`,
              boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 30px ${activeAccentObj.glow}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '-6px',
                  borderRadius: '50%',
                  border: `2px dashed ${activeAccentObj.hex}`,
                  opacity: 0.5,
                  animation: 'spin 2.5s linear infinite',
                }}
              />
              <div style={{ animation: 'spin 0.8s linear infinite', display: 'flex' }}>
                <IoBasketball size={54} color={activeAccentObj.hex} />
              </div>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '999px',
                background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                border: '1px solid var(--border-1, rgba(255,255,255,0.1))',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: activeAccentObj.hex,
                  boxShadow: `0 0 8px ${activeAccentObj.hex}`,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--f-athletic, 'Plus Jakarta Sans', sans-serif)",
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: theme === 'dark' ? '#ffffff' : '#0f172a',
                }}
              >
                {loadingMsg}
              </span>
            </div>
          </div>
        </div>
      )}
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

