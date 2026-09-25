// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LuLogIn, LuCircleAlert, LuCircleCheck } from 'react-icons/lu';
import { IoBasketball } from 'react-icons/io5';
import './Signup.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const redirectMsg = sessionStorage.getItem('redirectMsg');
    if (redirectMsg) {
      setError(redirectMsg);
      sessionStorage.removeItem('redirectMsg');
      setTimeout(() => setError(''), 5000);
    }

    if (location.state?.signupSuccess) {
      setSuccessMessage('Account created successfully! Welcome to the court.');
      setTimeout(() => setSuccessMessage(''), 5000);
    }
    if (location.state?.redirected) {
      setError('You must be signed in to access this feature.');
      setTimeout(() => setError(''), 5000);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      console.error('Supabase login error:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please verify your credentials.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Email not confirmed yet. Check your inbox or disable "Confirm email" in Supabase Auth settings.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
      setTimeout(() => setError(''), 6000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <img src="/hooplogs-logo.png" alt="HoopLogs" style={{ width: '36px', height: '36px', borderRadius: '9px', objectFit: 'cover' }} />
          </div>
          <h1 className="auth-brand-title">ENTER THE ARENA</h1>
          <p className="auth-brand-sub">SIGN IN TO TRACK YOUR GRIND</p>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="auth-alert success">
            <LuCircleCheck size={16} />
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="auth-alert error">
            <LuCircleAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-fields">
            <div className="auth-field-group">
              <label className="auth-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="hooper@hooplogs.com"
                className="auth-input"
                autoComplete="email"
              />
            </div>

            <div className="auth-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="auth-label">Password</label>
                <Link to="/forgot-password" style={{ fontSize: '0.72rem', color: '#ff5500', textDecoration: 'none', fontWeight: 700 }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="auth-input"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '6px' }}
          >
            <LuLogIn size={18} />
            <span>{loading ? 'SIGNING IN…' : 'SIGN IN TO HOOPLOGS'}</span>
          </button>
        </form>

        <div className="auth-footer">
          <span>NEW TO HOOPLOGS?</span>
          <Link to="/signup">CREATE ACCOUNT</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
