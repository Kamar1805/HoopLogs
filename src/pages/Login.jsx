// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import './Signup.css'; // reuse the same styles
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../Firebase';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const redirectMsg = sessionStorage.getItem("redirectMsg");
  if (redirectMsg) {
    setError(redirectMsg);
    sessionStorage.removeItem("redirectMsg");
    setTimeout(() => setError(''), 5000);
  }

    if (location.state?.signupSuccess) {
      setSuccessMessage('Account created successfully. Please login.');
      setTimeout(() => setSuccessMessage(''), 5000);
    }
    if (location.state?.redirected) {
      setError('You have to be logged in to track your shots.');
      setTimeout(() => setError(''), 5000);
    }
    if (location.state?.errorMessage) {
      setError(location.state.errorMessage);
    }
    
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      console.log('Logged in:', userCredential.user.uid);
      navigate('/');
    } catch (err) {
      console.error('Firebase login error:', err.code, err.message);
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No user found with that email.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        case 'auth/invalid-email':
          setError('Email badly formatted.');
          break;
        default:
          setError('Login failed. Please check your details.');
      }
      setTimeout(() => setError(''), 5000);
    }

    setLoading(false);
  };

  return (
    <div className="signup-page"> {/* same wrapper/video styles */}
      <form onSubmit={handleSubmit} className="form-box">
        <img src="/hooplogs.png" alt="Hoop Logs Logo" className="logo" />
        <h2>Log In to Hoop Logs</h2>

        {successMessage && <p className="success-text">{successMessage}</p>}
        {error && <p className="error-text">{error}</p>}

        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Logging in…' : 'Log In'}
        </button>

        <div className="form-footer">
          <p>
            Don’t have an account?{' '}
            <Link to="/signup" className="login-link">Sign up</Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
