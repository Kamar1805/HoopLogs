// src/pages/Signup.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import {
  LuUserPlus, LuCircleAlert, LuCircleCheck,
  LuArrowRight, LuArrowLeft, LuShieldCheck, LuZap, LuLock
} from 'react-icons/lu';
import { IoBasketball, IoLogoWhatsapp } from 'react-icons/io5';
import { sendWelcomeEmail } from '../utils/sendWelcomeEmail';
import './Signup.css';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const LEVELS    = ['Beginner', 'Intermediate', 'Pro'];
const GENDERS   = ['Male', 'Female'];
const ADMIN_SECRET = 'hooplogsadmin001';

const Signup = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    gender: 'Male', level: 'Beginner', position: 'PG',
    height: '', weight: '', nickname: '',
    whatsapp: '', role: 'player', adminPasscode: '',
  });
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [verified, setVerified] = useState(false);

  const { signUp } = useAuth();
  const navigate   = useNavigate();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const handleChange = e => set(e.target.name, e.target.value);

  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(''); setSuccess(''); }, 5000);
    return () => clearTimeout(t);
  }, [error, success]);

  const nextStep = () => {
    if (step === 1) {
      if (!form.name || !form.email || !form.password) { setError('Fill out all required fields.'); return; }
      if (form.password.length < 6)                    { setError('Password needs at least 6 characters.'); return; }
      if (form.password !== form.confirmPassword)       { setError('Passwords do not match.'); return; }
    }
    setError('');
    setStep(s => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Admin passcode verification
    if (form.role === 'admin') {
      if (form.adminPasscode?.trim() !== ADMIN_SECRET) {
        setError('Invalid admin passcode. Only authorized staff can create an admin account.');
        setLoading(false);
        return;
      }
    }

    try {
      const userMeta = {
        full_name: form.name,
        nickname:  form.nickname || '',
        role:      form.role,
        gender:    form.gender,
        whatsapp:  form.whatsapp || '',
      };

      const res = await signUp(form.email, form.password, userMeta);
      const user = res?.user;

      if (user) {
        try {
          if (form.whatsapp) {
            localStorage.setItem(`hooplogs_wa_${user.id}`, form.whatsapp);
          }
        } catch (e) {}

        try {
          await supabase.from('profiles').upsert({
            id:         user.id,
            full_name:  form.name,
            nickname:   form.nickname || '',
            height:     form.height || null,
            weight:     form.weight || null,
            position:   form.position,
            experience: form.level,
            role:       form.role,
            updated_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('Profile upsert note:', dbErr);
        }
      }

      // Send official welcome email via Resend
      sendWelcomeEmail({ email: form.email, name: form.name }).catch((err) => {
        console.warn('Welcome email dispatch note:', err);
      });

      // Show welcome screen immediately!
      setVerified(true);
    } catch (err) {
      console.error('Signup error:', err);
      if (err.message?.includes('already registered') || err.message?.includes('User already registered')) {
        setError('This email is already registered. Try logging in.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [
    { num: 1, label: 'Account' },
    { num: 2, label: 'Athlete' },
    { num: 3, label: 'Details' },
  ];

  // 1. VERIFIED WELCOME SCREEN
  if (verified) {
    const greetingName = form.nickname?.trim() || form.name?.trim() || 'Hooper';

    return (
      <div className="auth-page">
        <div className="auth-card signup-success-card">
          <div className="success-logo-wrap">
            <img src="/hooplogs-logo.png" alt="HoopLogs" className="success-playbook-logo" />
          </div>
          <h2 className="success-card-title">WELCOME TO HOOPLOGS ARENA! 🏀</h2>
          <p className="success-card-sub">
            Your athlete account (<strong className="user-email-highlight">{form.email}</strong>) is officially ready!
          </p>

          <div className="coach-welcome-note">
            <div className="coach-note-header">
              <IoBasketball size={15} color="var(--orange, #ff5500)" />
              <span>OFFICIAL WELCOME FROM HOOPLOGS</span>
            </div>
            <p className="coach-note-body">
              "Hey {greetingName}, it's Kamar again.. Welcome to the team!<br /><br />
              If you are here, it means you're serious about taking your basketball game to the highest level. 
              Track your shooting percentages from all 5 zones, follow your tailored athletic workouts, communicate with your coach, and climb the leaderboards.<br /><br />
              I wish you nothing but greatness and success in your grind. See you on the court!"
            </p>
            <span className="coach-note-signoff">— Kamar, AK. Hooplogs Team</span>
          </div>

          <div className="success-action-btns">
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('hooplogs_tour_completed');
                  localStorage.removeItem('hooplogs_guide_dismissed');
                } catch (e) {}
                navigate('/dashboard', { state: { openTour: true } });
              }}
              className="btn-proceed-login"
            >
              ENTER MY DASHBOARD 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <img src="/hooplogs-logo.png" alt="HoopLogs" style={{ width: '36px', height: '36px', borderRadius: '9px', objectFit: 'cover' }} />
          </div>
          <h1 className="auth-brand-title">JOIN THE LEAGUE</h1>
          <p className="auth-brand-sub">Create your athlete profile</p>
        </div>

        {/* Step Indicator */}
        <div className="auth-steps">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className={`auth-step ${step === s.num ? 'active' : step > s.num ? 'done' : ''}`}>
                <div className="auth-step-circle">
                  {step > s.num ? <LuCircleCheck size={14} /> : s.num}
                </div>
                <span className="auth-step-label">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="auth-step-connector" />}
            </React.Fragment>
          ))}
        </div>

        {/* Alerts */}
        {error   && <div className="auth-alert error"><LuCircleAlert size={16}/><span>{error}</span></div>}
        {success && <div className="auth-alert success"><LuCircleCheck size={16}/><span>{success}</span></div>}

        <form onSubmit={handleSubmit}>

          {/* ─ STEP 1 ─ Account ─────────────────────── */}
          {step === 1 && (
            <div className="auth-fields">
              <div className="auth-field-group">
                <label className="auth-label">Full Name</label>
                <input name="name" value={form.name} onChange={handleChange}
                  required placeholder="Kobe Bryant" className="auth-input" />
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  required placeholder="kobe@mamba.com" className="auth-input" />
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Password</label>
                <input name="password" type="password" value={form.password} onChange={handleChange}
                  required placeholder="Min. 6 characters" className="auth-input" />
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Confirm Password</label>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange}
                  required placeholder="Repeat password" className="auth-input" />
              </div>

              <button type="button" onClick={nextStep} className="auth-btn-primary" style={{ width: '100%', marginTop: '6px' }}>
                CONTINUE <LuArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ─ STEP 2 ─ Athlete Profile & Gender ─────── */}
          {step === 2 && (
            <div className="auth-fields">
              {/* Gender Selection */}
              <div className="auth-field-group">
                <label className="auth-label">Gender</label>
                <div className="auth-chips">
                  {GENDERS.map(g => (
                    <div
                      key={g}
                      className={`auth-chip ${form.gender === g ? 'selected' : ''}`}
                      onClick={() => set('gender', g)}
                    >
                      {g}
                    </div>
                  ))}
                </div>
              </div>

              {/* Position */}
              <div className="auth-field-group">
                <label className="auth-label">Primary Position</label>
                <div className="auth-chips">
                  {POSITIONS.map(pos => (
                    <div
                      key={pos}
                      className={`auth-chip ${form.position === pos ? 'selected' : ''}`}
                      onClick={() => set('position', pos)}
                    >
                      {pos}
                    </div>
                  ))}
                </div>
              </div>

              {/* Skill Level */}
              <div className="auth-field-group">
                <label className="auth-label">Skill Level</label>
                <div className="auth-chips">
                  {LEVELS.map(lvl => (
                    <div
                      key={lvl}
                      className={`auth-chip ${form.level === lvl ? 'selected' : ''}`}
                      onClick={() => set('level', lvl)}
                    >
                      {lvl}
                    </div>
                  ))}
                </div>
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Height (Optional)</label>
                <input name="height" value={form.height} onChange={handleChange}
                  placeholder='e.g. 6&apos;2"' className="auth-input" />
              </div>

              <div className="auth-btn-row">
                <button type="button" onClick={() => setStep(1)} className="auth-btn-back">
                  <LuArrowLeft size={16} />
                </button>
                <button type="button" onClick={nextStep} className="auth-btn-primary">
                  NEXT <LuArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ─ STEP 3 ─ Details, WhatsApp & Role ─────── */}
          {step === 3 && (
            <div className="auth-fields">
              <div className="auth-field-group">
                <label className="auth-label">Handle / Nickname <span style={{color:'var(--t-muted)',fontWeight:400}}>(optional)</span></label>
                <input name="nickname" value={form.nickname} onChange={handleChange}
                  placeholder="e.g. SplashBro" className="auth-input" />
              </div>

              {/* WhatsApp Details */}
              <div className="auth-field-group">
                <label className="auth-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <IoLogoWhatsapp size={14} color="#22c55e" />
                  <span>WhatsApp Number</span>
                  <span style={{color:'var(--t-muted)',fontWeight:400}}>(optional)</span>
                </label>
                <input
                  name="whatsapp"
                  type="tel"
                  value={form.whatsapp}
                  onChange={handleChange}
                  placeholder="e.g. +1 555 123 4567"
                  className="auth-input"
                />
                <span style={{ fontSize: '0.68rem', color: 'var(--t-muted)', marginTop: '3px' }}>
                  Allows teammates and coaches to message you on WhatsApp.
                </span>
              </div>

              {/* Account Role with Secret Admin Passcode */}
              <div className="auth-field-group">
                <label className="auth-label">Account Type</label>
                <div className="auth-chips">
                  <div
                    className={`auth-chip ${form.role === 'player' ? 'selected' : ''}`}
                    onClick={() => set('role', 'player')}
                  >
                    Athlete / Player
                  </div>
                  <div
                    className={`auth-chip ${form.role === 'admin' ? 'selected' : ''}`}
                    onClick={() => set('role', 'admin')}
                  >
                    Staff / Admin
                  </div>
                </div>
              </div>

              {/* Secret Admin Passcode Field (if Admin selected) */}
              {form.role === 'admin' && (
                <div className="auth-field-group" style={{ animation: 'slide-up 0.25s ease' }}>
                  <label className="auth-label" style={{ color: 'var(--orange-hot)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <LuLock size={12} />
                    <span>Admin Security Passcode</span>
                  </label>
                  <input
                    name="adminPasscode"
                    type="password"
                    value={form.adminPasscode}
                    onChange={handleChange}
                    required
                    placeholder="Enter admin passcode"
                    className="auth-input"
                    style={{ borderColor: 'var(--orange)' }}
                  />
                  <span style={{ fontSize: '0.68rem', color: 'var(--t-muted)', marginTop: '3px' }}>
                    Protected access: only authorized staff with code can register as Admin.
                  </span>
                </div>
              )}

              <div className="auth-btn-row" style={{ marginTop: '8px' }}>
                <button type="button" onClick={() => setStep(2)} className="auth-btn-back">
                  <LuArrowLeft size={16} />
                </button>
                <button type="submit" className="auth-btn-primary" disabled={loading}>
                  <LuUserPlus size={16} />
                  <span>{loading ? 'CREATING…' : 'CREATE ACCOUNT'}</span>
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="auth-footer">
          Already have an account?
          <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
