// src/components/RouteTransitionLoader.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { IoBasketball } from 'react-icons/io5';
import './RouteTransitionLoader.css';

export default function RouteTransitionLoader() {
  const location = useLocation();
  const [animating, setAnimating] = useState(false);
  const firstRender = useRef(true);
  const timerRef = useRef(null);

  useEffect(() => {
    // Skip initial page mount to allow ArenaSplashLoader to handle first boot
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setAnimating(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setAnimating(false);
    }, 320);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname]);

  if (!animating) return null;

  return (
    <div className="route-transition-overlay" role="status" aria-label="Navigating arena">
      <div className="route-spinner-card">
        <div className="route-ball-orbit">
          <IoBasketball className="route-spinning-ball" size={46} />
          <div className="route-orbit-ring" />
        </div>
        <div className="route-loading-pill">
          <span className="route-pulsing-dot" />
          <span className="route-loading-text">LOADING ARENA…</span>
        </div>
      </div>
    </div>
  );
}
