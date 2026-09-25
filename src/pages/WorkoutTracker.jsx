// src/pages/WorkoutTracker.jsx
import React from 'react';
import SiteHeader from '../components/SiteHeader';
import MobileBottomNav from '../components/MobileBottomNav';
import AthleticWorkoutView from '../components/AthleticWorkoutView';

export default function WorkoutTracker() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0, #080b11)', paddingBottom: '80px' }}>
      <SiteHeader />
      <div style={{ maxWidth: '580px', margin: '0 auto', padding: '12px 14px' }}>
        <AthleticWorkoutView />
      </div>
      <MobileBottomNav activeTab="court" />
    </div>
  );
}