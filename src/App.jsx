import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import './App.css';
import Dashboard from './components/Dashboard';
import CoachGPT from './pages/CoachGPT';
import ShotTracker from './pages/ShotTracker';
import MyProfile from './pages/MyProfile';
import RequestCoaching from './pages/RequestCoaching';
import CourtSideChat from './pages/CourtSideChat';
import WorkoutTracker from './pages/WorkoutTracker';
import LandingPage from "./pages/LandingPage";
import Statstracker from './pages/Statstracker';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/coachgpt" element={<CoachGPT />} />
        <Route path="/shottracker" element={<ShotTracker />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/request-coaching" element={<RequestCoaching />} />
        <Route path="/chat" element={<CourtSideChat />} />
        <Route path="/workouttracker" element={<WorkoutTracker />} />
        <Route path="/land" element={<LandingPage />} />
        <Route path="/statstracker" element={<Statstracker />} />
      </Routes>
    </Router>
  );
}

export default App;
