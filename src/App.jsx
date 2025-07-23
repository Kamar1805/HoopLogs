import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import './App.css';
import Dashboard from './components/Dashboard';
import CoachGPT from './pages/CoachGPT';
import ShotTracker from './pages/ShotTracker';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/coachgpt" element={<CoachGPT />} />
        <Route path="/shottracker" element={<ShotTracker />} />
      </Routes>
    </Router>
  );
}

export default App;
