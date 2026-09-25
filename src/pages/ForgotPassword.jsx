// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  LuKeyRound,
  LuMail,
  LuLock,
  LuCircleAlert,
  LuCircleCheck,
  LuArrowLeft
} from 'react-icons/lu';
import { IoBasketball } from 'react-icons/io5';
import './Signup.css';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter OTP & New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isResetComplete, setIsResetComplete] = useState(false);
  const navigate = useNavigate();

  // Step 1: Request Password Reset OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your account email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetErr) throw resetErr;

      setSuccess('We sent a 6-digit password reset OTP code to your email!');
      setStep(2);
    } catch (err) {
      console.error('Password reset request error:', err);
      setError(err.message || 'Could not send reset code. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Update Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, '');

    if (cleanOtp.length < 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Verify OTP with type 'recovery'
      let verifyRes = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanOtp,
        type: 'recovery',
      });

      if (verifyRes.error) {
        // Fallback: try 'email' type
        verifyRes = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: cleanOtp,
          type: 'email',
        });
      }

      if (verifyRes.error) throw verifyRes.error;

      // 2. Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) throw updateErr;

      setIsResetComplete(true);
    } catch (err) {
      console.error('Password update error:', err);
      setError(err.message || 'Invalid or expired OTP code. Please check your spam folder.');
    } finally {
      setLoading(false);
    }
  };

  if (isResetComplete) {
    return (
      <div className="auth-page">
        <div className="auth-card signup-success-card">
          <div className="success-logo-wrap">
            <img src="/hooplogs-logo.png" alt="HoopLogs" className="success-playbook-logo" />
          </div>
          <h2 className="success-card-title">PASSWORD UPDATED! 🏀</h2>
          <p className="success-card-sub">
            Your HoopLogs athlete account password has been successfully reset.
          </p>

          <div className="coach-welcome-note">
            <div className="coach-note-header">
              <IoBasketball size={15} color="#ff5500" />
              <span>MESSAGE FROM HOOPLOGS</span>
            </div>
            <p className="coach-note-body">
              Your security is updated. You can now log right into your dashboard and get back to your grind.
            </p>
            <span className="coach-note-signoff">— Kamar, AK. Hooplogs Team</span>
          </div>

          <div className="success-action-btns">
            <button
              onClick={() => navigate('/login')}
              className="btn-proceed-login"
            >
              LOG IN NOW 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <img src="/hooplogs-logo.png" alt="HoopLogs" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
          </div>
          <h1 className="auth-brand-title">RESET PASSWORD</h1>
          <p className="auth-brand-sub">RECOVER YOUR HOOPLOGS ACCOUNT</p>
        </div>

        {error && (
          <div className="auth-alert error">
            <LuCircleAlert size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-alert success">
            <LuCircleCheck size={16} />
            <span>{success}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="auth-form">
            <div className="field-group">
              <label>Account Login Email</label>
              <div className="input-with-icon">
                <LuMail className="input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  autoFocus
                  required
                />
              </div>
              <span className="field-hint">
                We'll email you a 6-digit OTP code to verify your identity.
              </span>
            </div>

            <button type="submit" disabled={loading} className="btn-auth-primary">
              {loading ? 'SENDING OTP…' : 'SEND 6-DIGIT RESET CODE'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link to="/login" style={{ color: 'var(--orange, #ff5500)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700 }}>
                ← Back to Log In
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="coach-welcome-note" style={{ marginBottom: '1rem' }}>
              <div className="coach-note-header">
                <IoBasketball size={14} color="#ff5500" />
                <span>CHECK INBOX & SPAM</span>
              </div>
              <p className="coach-note-body" style={{ fontSize: '0.78rem' }}>
                We sent a 6-digit code to <strong>{email}</strong>. Check your Primary Inbox and Spam / Junk folder.
              </p>
            </div>

            <div className="field-group">
              <label>Enter 6-Digit OTP Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="otp-code-input"
                autoFocus
                required
              />
            </div>

            <div className="field-group">
              <label>New Password</label>
              <div className="input-with-icon">
                <LuLock className="input-icon" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label>Confirm New Password</label>
              <div className="input-with-icon">
                <LuLock className="input-icon" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading || otp.length < 6} className="btn-auth-primary">
              {loading ? 'RESETTING PASSWORD…' : 'UPDATE PASSWORD & PROCEED 🏀'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Change Email / Resend
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
