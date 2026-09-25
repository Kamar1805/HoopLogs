import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ArenaSplashLoader from './components/ArenaSplashLoader';
import Signup from './pages/Signup';
import Login from './pages/Login';
import './App.css';
import Dashboard from './components/Dashboard';
import ShotTracker from './pages/ShotTracker';
import MyProfile from './pages/MyProfile';
import RequestCoaching from './pages/RequestCoaching';
import WorkoutTracker from './pages/WorkoutTracker';
import LandingPage from './pages/LandingPage';
import Statstracker from './pages/Statstracker';
import RosterManagement from './pages/RosterManagement';
import Leaderboards from './pages/Leaderboards';

import SuperAdminPortal from './pages/SuperAdminPortal';
import ForgotPassword from './pages/ForgotPassword';
import LiveGameStatkeeper from './pages/LiveGameStatkeeper';

const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return <ArenaSplashLoader subtitle="ENTERING ARENA…" />;
  }
  return user ? <Dashboard /> : <LandingPage />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/land" element={<LandingPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/superadmin" element={<SuperAdminPortal />} />
          <Route path="/shottracker" element={<ShotTracker />} />
          <Route path="/teams" element={<RosterManagement />} />
          <Route path="/rosters" element={<RosterManagement />} />
          <Route path="/hoopers" element={<Leaderboards />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/live-stat/:gameId" element={<LiveGameStatkeeper />} />
          <Route path="/chat" element={<Navigate to="/hoopers" replace />} />
          <Route path="/statstracker" element={<Statstracker />} />
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/request-coaching" element={<RequestCoaching />} />
          <Route path="/workouttracker" element={<WorkoutTracker />} />
        </Routes>
      </Router>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
