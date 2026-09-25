import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase';
import SiteHeader from '../components/SiteHeader';
import MobileBottomNav from '../components/MobileBottomNav';
import { compressImage } from '../utils/imageCompressor';
import {
  LuUser,
  LuShield,
  LuShieldCheck,
  LuPencil,
  LuSave,
  LuX,
  LuCheck,
  LuMessageSquare,
  LuLock,
  LuLockOpen,
  LuKey,
  LuCalendar,
  LuCamera,
  LuUpload,
  LuBell,
  LuPalette,
  LuSun,
  LuMoon,
  LuSearch,
  LuUserCheck
} from 'react-icons/lu';
import { IoBasketball, IoLogoWhatsapp } from 'react-icons/io5';
import './MyProfile.css';

export default function MyProfile() {
  const { user, profile, isAdmin, updateProfile, upgradeToAdmin, refreshProfile } = useAuth();
  const { theme, toggleTheme, accentColor, setAccentColor, accents } = useTheme();
  const navigate = useNavigate();
  const isCoach = isAdmin || (typeof window !== 'undefined' && localStorage.getItem('hooplogs_admin_elevated') === 'true');

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Coach Note Writing State & Athlete Target (for coach/admin)
  const [coachNewNote, setCoachNewNote] = useState('');
  const [savingCoachNote, setSavingCoachNote] = useState(false);
  const [targetAthlete, setTargetAthlete] = useState(null);
  const [athleteQuery, setAthleteQuery] = useState('');
  const [athleteList, setAthleteList] = useState([]);
  const [searchingAthletes, setSearchingAthletes] = useState(false);
  const [targetAthleteReviews, setTargetAthleteReviews] = useState([]);

  // Form states
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('Male');
  const [whatsapp, setWhatsapp] = useState('');
  const [position, setPosition] = useState('PG');
  const [experience, setExperience] = useState('High School');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bio, setBio] = useState('');

  // Admin elevation states
  const [showAdminCard, setShowAdminCard] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminStatus, setAdminStatus] = useState({ state: 'idle', msg: '' });

  // Coach reviews states
  const [reviews, setReviews] = useState([]);

  // Season Game Averages & Team Assignment
  const [assignedTeam, setAssignedTeam] = useState({ name: 'Free Agent', emblem: '🏀' });
  const [seasonStats, setSeasonStats] = useState({
    ppg: '0.0',
    apg: '0.0',
    rpg: '0.0',
    spg: '0.0',
    bpg: '0.0',
    topg: '0.0',
    gp: 0
  });

  // Sync profile data when loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || profile.name || '');
      setNickname(profile.nickname || '');
      setGender(profile.gender || 'Male');
      setWhatsapp(profile.whatsapp || profile.phoneNumber || '');
      setPosition(profile.position || 'PG');
      setExperience(profile.experience || 'High School');
      setJerseyNumber(profile.jersey_number || profile.jersey || '');
      setHeight(profile.height || '');
      setWeight(profile.weight || '');
      setBio(profile.bio || '');

      const savedLocalAvatar = user?.id ? localStorage.getItem(`hooplogs_avatar_${user.id}`) : null;
      setAvatarUrl(profile.avatar_url || savedLocalAvatar || '');
    }
  }, [profile, user]);

  // Load Season Stats & Team
  useEffect(() => {
    if (!user?.id) return;
    try {
      const storedAverages = JSON.parse(localStorage.getItem('hooplogs_player_game_averages') || '{}');
      if (storedAverages[user.id]) {
        setSeasonStats(storedAverages[user.id]);
      }
    } catch (e) {}

    const findTeam = async () => {
      try {
        const customRosters = JSON.parse(localStorage.getItem('hooplogs_custom_rosters') || '{}');
        const customTeams = JSON.parse(localStorage.getItem('hooplogs_custom_teams') || '[]');
        for (const [teamId, members] of Object.entries(customRosters)) {
          if (Array.isArray(members) && members.some(m => (typeof m === 'string' ? m === user.id : m.user_id === user.id || m.id === user.id))) {
            const tObj = customTeams.find(t => t.id === teamId);
            if (tObj) {
              setAssignedTeam({ name: tObj.name, emblem: tObj.logo || tObj.emblem || '🏀' });
              return;
            }
          }
        }

        const { data } = await supabase.from('team_members').select('team_id, teams(name, emblem)').eq('player_id', user.id).maybeSingle();
        if (data?.teams) {
          setAssignedTeam({ name: data.teams.name, emblem: data.teams.emblem || '🏀' });
        }
      } catch (err) {
        console.warn('Find assigned team catch:', err);
      }
    };
    findTeam();
  }, [user]);

  // Handle Image Upload with Client-Side HTML5 Canvas Compression (<50KB)
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressingPhoto(true);
      setErrorMsg('');

      // High-efficiency client compression (340x340, 0.70 quality -> ~25-45 KB)
      const compressedDataUrl = await compressImage(file, 340, 340, 0.70);
      setAvatarUrl(compressedDataUrl);

      if (user?.id) {
        localStorage.setItem(`hooplogs_avatar_${user.id}`, compressedDataUrl);
      }

      // Save to Supabase profile
      try {
        if (updateProfile) {
          await updateProfile({ avatar_url: compressedDataUrl });
        } else if (user?.id) {
          await supabase
            .from('profiles')
            .update({ avatar_url: compressedDataUrl })
            .eq('id', user.id);
        }
      } catch (dbErr) {
        console.warn('Supabase avatar update warn (persisted locally):', dbErr);
      }

      setSuccessMsg('Profile photo compressed & saved! (<45 KB) ⚡');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Photo compression error:', err);
      setErrorMsg('Could not compress photo. Please try a different image.');
    } finally {
      setCompressingPhoto(false);
    }
  };

  // Load reviews for this player
  useEffect(() => {
    if (!user) return;
    try {
      const stored = localStorage.getItem('hooplogs_player_reviews');
      if (stored) {
        const parsed = JSON.parse(stored);
        const myReviews = parsed[user.id] || [];
        setReviews(myReviews);
      }
    } catch (e) {
      console.warn('Could not read player reviews:', e);
    }
  }, [user]);

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Clean whatsapp
      const cleanWa = whatsapp.replace(/[^0-9]/g, '');

      const updates = {
        full_name: fullName.trim(),
        nickname: nickname.trim(),
        gender: gender,
        whatsapp: cleanWa,
        position,
        experience,
        jersey_number: jerseyNumber.trim(),
        height: height.trim(),
        weight: weight.trim(),
        bio: bio.trim(),
      };

      // Try saving to Supabase
      if (updateProfile) {
        await updateProfile(updates);
      } else {
        // Direct fallback
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
        if (refreshProfile) refreshProfile();
      }

      setSuccessMsg('Profile updated successfully! 🏀');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Error saving profile:', err);
      // Fallback: If some columns don't exist yet, save safe subset
      try {
        await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            nickname: nickname.trim(),
            position,
            experience,
          })
          .eq('id', user.id);
        setSuccessMsg('Profile basic details saved!');
        setIsEditing(false);
        setTimeout(() => setSuccessMsg(''), 3500);
      } catch (innerErr) {
        setErrorMsg('Failed to update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle Admin Passcode Elevation
  const handleUnlockAdmin = async (e) => {
    e.preventDefault();
    if (!adminPasscode.trim()) {
      setAdminStatus({ state: 'error', msg: 'Enter the admin passcode.' });
      return;
    }

    if (adminPasscode.trim() !== 'hooplogsadmin001') {
      setAdminStatus({ state: 'error', msg: 'Invalid passcode. Access denied.' });
      return;
    }

    try {
      setAdminStatus({ state: 'loading', msg: 'Verifying credentials…' });
      localStorage.setItem('hooplogs_admin_elevated', 'true');
      if (user && upgradeToAdmin) {
        await upgradeToAdmin(adminPasscode.trim());
      }
      setAdminStatus({ state: 'success', msg: 'Welcome Coach! Admin access granted.' });
      setTimeout(() => {
        setShowAdminCard(false);
        setAdminStatus({ state: 'idle', msg: '' });
      }, 1500);
    } catch (err) {
      setAdminStatus({ state: 'error', msg: err.message || 'Verification failed.' });
    }
  };

  // Load target athlete reviews
  useEffect(() => {
    if (!targetAthlete) return;
    try {
      const stored = JSON.parse(localStorage.getItem('hooplogs_player_reviews') || '{}');
      setTargetAthleteReviews(stored[targetAthlete.id] || []);
    } catch (e) {
      setTargetAthleteReviews([]);
    }
  }, [targetAthlete]);

  // Search registered athletes for feedback
  useEffect(() => {
    if (!athleteQuery.trim() || !isCoach) {
      setAthleteList([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingAthletes(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, nickname, position, avatar_url, whatsapp')
          .or(`full_name.ilike.%${athleteQuery.trim()}%,nickname.ilike.%${athleteQuery.trim()}%`)
          .limit(6);
        if (!error && data) {
          setAthleteList(data);
        }
      } catch (err) {
        console.warn('Athlete feedback search error:', err);
      } finally {
        setSearchingAthletes(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [athleteQuery, isCoach]);

  // Handle saving coach improvement note (to self or selected athlete)
  const handleSaveCoachNote = async (e) => {
    e.preventDefault();
    if (!coachNewNote.trim()) return;
    setSavingCoachNote(true);

    const recipientId = targetAthlete?.id || user?.id;
    const recipientName = targetAthlete?.full_name || profile?.full_name || 'Athlete';

    const note = {
      id: `note-${Date.now()}`,
      coachName: profile?.full_name || 'Kamar, AK (HoopLogs Staff)',
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      text: coachNewNote.trim(),
      recipientId,
    };

    if (recipientId) {
      try {
        const stored = JSON.parse(localStorage.getItem('hooplogs_player_reviews') || '{}');
        const existing = stored[recipientId] || [];
        const updated = [note, ...existing];
        stored[recipientId] = updated;
        localStorage.setItem('hooplogs_player_reviews', JSON.stringify(stored));

        if (targetAthlete) {
          setTargetAthleteReviews(updated);
        } else {
          setReviews(updated);
        }
      } catch (err) {
        console.warn('Could not save coach review:', err);
      }
    }

    setCoachNewNote('');
    setSavingCoachNote(false);
    setSuccessMsg(`Coach improvement note saved for ${recipientName}! 🏀`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const cleanWhatsAppNumber = (profile?.whatsapp || whatsapp || '').replace(/[^0-9]/g, '');

  return (
    <div className="profile-page-wrapper">
      <SiteHeader />

      <main className="profile-main-content">
        {/* COACH IMPROVEMENTS NOTIFICATION BADGE */}
        {reviews.length > 0 && (
          <div className="profile-coach-alert-banner">
            <div className="coach-alert-left">
              <span className="pulse-alert-dot" />
              <LuBell size={15} color="#ff5500" />
              <span><strong>{reviews.length} Coach Improvement Note{reviews.length > 1 ? 's' : ''}</strong> from Staff</span>
            </div>
            <a href="#coach-notes-box" className="btn-jump-coach-notes">
              VIEW NOTES ↓
            </a>
          </div>
        )}

        {/* TOP ATHLETE HEADER CARD */}
        <div className="athlete-hero-card">
          <div className="athlete-avatar-wrap">
            <div className="athlete-avatar-circle">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Athlete Avatar" className="athlete-avatar-img" />
              ) : (
                <IoBasketball className="athlete-avatar-icon" />
              )}
            </div>

            {/* Auto-compressing Photo Upload Button (<45KB) */}
            <label className="avatar-camera-btn" title="Upload photo (Auto-compressed to <45KB)">
              <LuCamera size={13} />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
                disabled={compressingPhoto}
              />
            </label>

            {jerseyNumber && (
              <span className="athlete-jersey-badge">#{jerseyNumber}</span>
            )}
          </div>

          <div className="athlete-hero-info">
            <div className="athlete-name-row">
              <h1 className="athlete-fullname">
                {profile?.full_name || user?.user_metadata?.full_name || 'Hooper'}
              </h1>
              {isCoach ? (
                <span className="role-pill coach-pill">
                  <LuShieldCheck /> COACH / ADMIN
                </span>
              ) : (
                <span className="role-pill player-pill">
                  <LuUser /> ATHLETE
                </span>
              )}
            </div>

            <div className="athlete-meta-tags">
              <span className="meta-tag position-tag">{position}</span>
              {user?.email && <span className="meta-tag email-tag">{user.email}</span>}
              <span className="meta-tag exp-tag">{experience}</span>
            </div>

            {nickname && <p className="athlete-nickname">"{nickname}"</p>}

            {/* WHATSAPP ACTION BUTTON */}
            {cleanWhatsAppNumber ? (
              <a
                href={`https://wa.me/${cleanWhatsAppNumber}?text=Hey%20${encodeURIComponent(profile?.full_name || 'Hooper')},%20connecting%20via%20HoopLogs!`}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-wa-btn"
              >
                <IoLogoWhatsapp /> Chat on WhatsApp ({cleanWhatsAppNumber})
              </a>
            ) : (
              <p className="no-wa-hint">
                <IoLogoWhatsapp /> No WhatsApp linked. Tap Edit to connect!
              </p>
            )}
          </div>
        </div>

        {/* SEASON GAME AVERAGES & TEAM CARD */}
        <div className="season-averages-card">
          <div className="season-card-top">
            <div className="season-team-badge">
              <span className="team-emblem-icon">{assignedTeam.emblem}</span>
              <div>
                <span className="season-card-sub">CURRENT SQUAD</span>
                <h3 className="season-team-title">{assignedTeam.name}</h3>
              </div>
            </div>
            <div className="season-gp-pill">
              <span className="gp-number">{seasonStats.gp || 0}</span>
              <span className="gp-label">GP</span>
            </div>
          </div>

          <div className="season-stats-grid">
            <div className="season-stat-box highlight">
              <span className="stat-metric-val">{seasonStats.ppg || '0.0'}</span>
              <span className="stat-metric-label">PPG</span>
            </div>
            <div className="season-stat-box">
              <span className="stat-metric-val">{seasonStats.apg || '0.0'}</span>
              <span className="stat-metric-label">APG</span>
            </div>
            <div className="season-stat-box">
              <span className="stat-metric-val">{seasonStats.rpg || '0.0'}</span>
              <span className="stat-metric-label">RPG</span>
            </div>
            <div className="season-stat-box">
              <span className="stat-metric-val">{seasonStats.spg || '0.0'}</span>
              <span className="stat-metric-label">SPG</span>
            </div>
            <div className="season-stat-box">
              <span className="stat-metric-val">{seasonStats.bpg || '0.0'}</span>
              <span className="stat-metric-label">BPG</span>
            </div>
            <div className="season-stat-box">
              <span className="stat-metric-val">{seasonStats.topg || '0.0'}</span>
              <span className="stat-metric-label">TOPG</span>
            </div>
          </div>
          <div className="season-stat-footnote">
            Official league game statistics recorded by team statkeepers
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {successMsg && (
          <div className="profile-alert success-alert">
            <LuCheck /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="profile-alert error-alert">
            <LuX /> {errorMsg}
          </div>
        )}

        {/* PROFILE DETAILS & EDIT FORM */}
        <section className="profile-section-card">
          <div className="section-card-header">
            <div className="section-title-wrap">
              <LuUser className="section-icon" />
              <h2>Player Details</h2>
            </div>
            {!isEditing ? (
              <button
                type="button"
                className="edit-toggle-btn"
                onClick={() => setIsEditing(true)}
              >
                <LuPencil /> Edit
              </button>
            ) : (
              <button
                type="button"
                className="cancel-toggle-btn"
                onClick={() => setIsEditing(false)}
              >
                <LuX /> Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="profile-form">
            <div className="form-grid-2">
              <div className="field-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g. LeBron James"
                  required
                />
              </div>

              <div className="field-group">
                <label>Nickname / Handle</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g. KingJames"
                />
              </div>
            </div>

            {/* ACCOUNT LOGIN EMAIL */}
            <div className="field-group">
              <label>Account Login Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                placeholder="athlete@example.com"
                style={{ opacity: 0.85 }}
              />
              <span className="field-hint">Your verified login and notification email address.</span>
            </div>

            {/* WHATSAPP INPUT */}
            <div className="field-group">
              <label className="label-with-icon">
                <IoLogoWhatsapp className="wa-icon" /> WhatsApp Direct Connect
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                disabled={!isEditing}
                placeholder="e.g. 2348012345678 or +1234567890"
              />
              <span className="field-hint">
                Coaches & teammates can message you directly on WhatsApp from the Roster and Chat.
              </span>
            </div>

            <div className="form-grid-3">
              <div className="field-group">
                <label>Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="PG">PG - Point Guard</option>
                  <option value="SG">SG - Shooting Guard</option>
                  <option value="SF">SF - Small Forward</option>
                  <option value="PF">PF - Power Forward</option>
                  <option value="C">C - Center</option>
                </select>
              </div>

              <div className="field-group">
                <label>Experience</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="Rookie">Rookie / Youth</option>
                  <option value="High School">High School</option>
                  <option value="College">College / NCAA</option>
                  <option value="Semi-Pro">Semi-Pro</option>
                  <option value="Pro">Pro / Elite</option>
                </select>
              </div>

              <div className="field-group">
                <label>Jersey #</label>
                <input
                  type="text"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  disabled={!isEditing}
                  placeholder="23"
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field-group">
                <label>Height (ft/in or cm)</label>
                <input
                  type="text"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g. 6'6&quot; or 198cm"
                />
              </div>

              <div className="field-group">
                <label>Weight (lbs or kg)</label>
                <input
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g. 215 lbs / 98kg"
                />
              </div>
            </div>

            <div className="field-group">
              <label>Scouting Bio / Player Notes</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!isEditing}
                rows={3}
                placeholder="Sharpshooter specializing in corner 3s and lockdown perimeter defense..."
              />
            </div>

            {isEditing && (
              <button
                type="submit"
                disabled={saving}
                className="save-profile-btn"
              >
                <LuSave /> {saving ? 'Saving Updates…' : 'Save Changes'}
              </button>
            )}
          </form>
        </section>

        {/* ARENA THEME & COLOR PICKER */}
        <section className="profile-section-card">
          <div className="section-card-header">
            <div className="section-title-wrap">
              <LuPalette className="section-icon" />
              <h2>Arena Theme & Preferred Colors</h2>
            </div>
            <button
              type="button"
              className="theme-mode-pill-btn"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <LuMoon size={14} /> : <LuSun size={14} />}
              <span>{theme === 'dark' ? 'Dark Arena' : 'Light Court'}</span>
            </button>
          </div>
          <p className="profile-theme-desc">
            Personalize your HoopLogs look. Select your favorite team accent color and toggle court mode.
          </p>
          <div className="profile-theme-swatches-grid">
            {accents.map((acc) => (
              <button
                key={acc.id}
                type="button"
                className={`profile-theme-swatch ${accentColor === acc.id ? 'active' : ''}`}
                onClick={() => setAccentColor(acc.id)}
              >
                <span className="swatch-color-dot" style={{ background: acc.hex }} />
                <span className="swatch-color-name">{acc.name}</span>
                {accentColor === acc.id && <LuCheck size={14} className="swatch-check-icon" />}
              </button>
            ))}
          </div>
        </section>

        {/* COACH FEEDBACK & SCOUTING NOTES */}
        <section id="coach-notes-box" className="profile-section-card">
          <div className="section-card-header">
            <div className="section-title-wrap">
              <LuMessageSquare className="section-icon" />
              <h2>
                {targetAthlete ? `Coach Feedback for ${targetAthlete.full_name}` : 'Coach Feedback & Scouting Advice'}
              </h2>
            </div>
            <span className="badge-count">
              {targetAthlete ? targetAthleteReviews.length : reviews.length}
            </span>
          </div>

          {/* Coach Search & Selector to Give Feedback to ANY Athlete */}
          {isCoach && (
            <div className="coach-athlete-selector-box">
              <div className="athlete-search-bar-wrap">
                <LuSearch size={14} className="search-icon-inside" />
                <input
                  type="text"
                  placeholder="Search player by name or handle to give feedback..."
                  value={athleteQuery}
                  onChange={(e) => setAthleteQuery(e.target.value)}
                  className="athlete-feedback-search-input"
                />
                {searchingAthletes && <span className="searching-spinner-text">Searching…</span>}
              </div>

              {/* Search Results Dropdown */}
              {athleteList.length > 0 && (
                <div className="athlete-search-dropdown">
                  {athleteList.map((ath) => (
                    <div
                      key={ath.id}
                      className="athlete-search-result-item"
                      onClick={() => {
                        setTargetAthlete(ath);
                        setAthleteQuery('');
                        setAthleteList([]);
                      }}
                    >
                      <div className="search-res-avatar">
                        {ath.avatar_url ? (
                          <img src={ath.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                        ) : (
                          ath.full_name?.charAt(0) || 'P'
                        )}
                      </div>
                      <div className="search-res-info">
                        <strong>{ath.full_name}</strong>
                        <span>@{ath.nickname || 'hooper'} • {ath.position || 'G'}</span>
                      </div>
                      <button type="button" className="btn-select-athlete-chip">
                        Give Feedback →
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Selected Athlete Banner */}
              {targetAthlete && (
                <div className="target-athlete-active-banner">
                  <div className="target-athlete-left">
                    <LuUserCheck size={16} color="#10b981" />
                    <span>Selected: <strong>{targetAthlete.full_name}</strong> (@{targetAthlete.nickname || 'hooper'})</span>
                  </div>
                  <button
                    type="button"
                    className="btn-clear-target-athlete"
                    onClick={() => setTargetAthlete(null)}
                  >
                    Switch to My Notes
                  </button>
                </div>
              )}

              {/* Feedback Composer Form */}
              <form onSubmit={handleSaveCoachNote} className="coach-note-composer-box">
                <div className="composer-title-row">
                  <LuShieldCheck size={14} color="#10b981" />
                  <span>
                    Post Tactical Improvement Note for {targetAthlete ? targetAthlete.full_name : 'Athlete'}
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={coachNewNote}
                  onChange={(e) => setCoachNewNote(e.target.value)}
                  placeholder={`e.g. Work on off-hand floaters, 50 corner 3s every morning, and quicker drop-step for ${targetAthlete ? targetAthlete.full_name : 'this athlete'}...`}
                  required
                  className="coach-note-textarea"
                />
                <button
                  type="submit"
                  disabled={savingCoachNote || !coachNewNote.trim()}
                  className="btn-submit-coach-note"
                >
                  {savingCoachNote ? 'Posting Note…' : `+ Post Improvement Note for ${targetAthlete ? targetAthlete.full_name : 'Athlete'}`}
                </button>
              </form>
            </div>
          )}

          {/* Reviews Stream */}
          {(targetAthlete ? targetAthleteReviews : reviews).length === 0 ? (
            <div className="empty-reviews-state">
              <IoBasketball className="empty-reviews-icon" />
              <p className="empty-reviews-title">No Coach Feedback Yet</p>
              <p className="empty-reviews-desc">
                {targetAthlete
                  ? `No feedback has been recorded for ${targetAthlete.full_name} yet. Type a note above to give them improvement advice.`
                  : 'When coaches review your shot charts or game stats, their improvement advice and custom drills will appear here.'}
              </p>
            </div>
          ) : (
            <div className="profile-reviews-stream">
              {(targetAthlete ? targetAthleteReviews : reviews).map((rev) => (
                <div key={rev.id || Math.random()} className="profile-review-card">
                  <div className="review-card-head">
                    <span className="review-coach-name">
                      <LuShieldCheck /> {rev.coachName || 'Staff Coach'}
                    </span>
                    <span className="review-date-label">
                      <LuCalendar /> {rev.date}
                    </span>
                  </div>
                  <p className="review-text-content">{rev.text}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ADMIN ELEVATION CARD (Strictly Protected with hooplogsadmin001) */}
        {!isCoach ? (
          <section className="profile-section-card admin-upgrade-section">
            <div
              className="admin-accordion-header"
              onClick={() => setShowAdminCard(!showAdminCard)}
            >
              <div className="admin-accordion-title">
                <LuLock className="lock-icon" />
                <div>
                  <h3>Coach / Staff Elevation</h3>
                  <p>Are you a coach or admin? Enter the staff passcode.</p>
                </div>
              </div>
              <button type="button" className="unlock-toggle-btn">
                {showAdminCard ? <LuX /> : <LuKey />}
              </button>
            </div>

            {showAdminCard && (
              <form onSubmit={handleUnlockAdmin} className="admin-elevation-form">
                <p className="admin-instructions">
                  Admin privileges allow managing teams, inviting athletes, logging coach feedback, and exporting PDF rosters.
                </p>
                <div className="passcode-input-row">
                  <input
                    type="password"
                    placeholder="Enter Staff Passcode"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={adminStatus.state === 'loading'}
                    className="verify-passcode-btn"
                  >
                    <LuLockOpen /> {adminStatus.state === 'loading' ? 'Checking…' : 'Unlock'}
                  </button>
                </div>

                {adminStatus.msg && (
                  <p className={`admin-status-msg ${adminStatus.state}`}>
                    {adminStatus.msg}
                  </p>
                )}
              </form>
            )}
          </section>
        ) : (
          <section className="profile-section-card admin-verified-section">
            <div className="admin-verified-wrap">
              <LuShieldCheck className="verified-shield" />
              <div>
                <h3>Staff Privileges Active</h3>
                <p>You have full Coach/Admin clearance across all rosters and leaderboards.</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <MobileBottomNav activeTab="profile" />
    </div>
  );
}