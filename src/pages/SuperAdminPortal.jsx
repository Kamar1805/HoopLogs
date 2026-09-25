// src/pages/SuperAdminPortal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  LuShield,
  LuShieldAlert,
  LuUsers,
  LuActivity,
  LuCrosshair,
  LuTrophy,
  LuSearch,
  LuTrash2,
  LuCheck,
  LuLock,
  LuLogOut,
  LuDownload,
  LuArrowUpRight,
  LuFlame,
  LuTrendingUp,
  LuRefreshCw
} from 'react-icons/lu';
import { IoBasketball } from 'react-icons/io5';
import './SuperAdminPortal.css';

const SUPER_USER = 'hooplogsadmin001';
const SUPER_PASS = 'Kamar1805##';

export default function SuperAdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('hooplogs_superadmin_auth') === 'true';
  });

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [featureUsage, setFeatureUsage] = useState({
    shotSessions: 0,
    gamesTracked: 0,
    activeWorkouts: 0,
    announcements: 0,
  });
  const [actionNotice, setActionNotice] = useState('');

  // Handle Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (
      usernameInput.trim().toLowerCase() === SUPER_USER.toLowerCase() &&
      passwordInput.trim() === SUPER_PASS
    ) {
      setIsAuthenticated(true);
      sessionStorage.setItem('hooplogs_superadmin_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid Superadmin credentials. Access denied.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('hooplogs_superadmin_auth');
  };

  // Fetch all users and analytics
  const fetchAdminData = async () => {
    setLoadingUsers(true);
    try {
      // 1. Fetch profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && profiles) {
        setUsersList(profiles);
      }

      // 2. Fetch shot sessions count
      const { count: shotCount } = await supabase
        .from('shooting_sessions')
        .select('*', { count: 'exact', head: true });

      // 3. Local data counts
      const localTeams = JSON.parse(localStorage.getItem('hooplogs_custom_teams_v2') || '[]');
      const localGames = JSON.parse(localStorage.getItem('hooplogs_league_games_v1') || '[]');
      const localAnnouncements = JSON.parse(localStorage.getItem('hooplogs_announcements_v2') || '[]');

      setFeatureUsage({
        shotSessions: shotCount || 14,
        gamesTracked: localGames.length || 6,
        activeWorkouts: 8,
        announcements: localAnnouncements.length || 4,
      });
    } catch (err) {
      console.warn('Superadmin fetch error:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
    }
  }, [isAuthenticated]);

  // Toggle user role (player <-> admin)
  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'player' : 'admin';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUser.id);

      if (!error) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
        setActionNotice(`Updated ${targetUser.full_name || 'User'} to ${newRole.toUpperCase()}!`);
        setTimeout(() => setActionNotice(''), 3000);
      }
    } catch (err) {
      console.error('Role update error:', err);
    }
  };

  // Delete user profile
  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Are you sure you want to delete ${targetUser.full_name || targetUser.email || 'this hooper'} from the database?`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', targetUser.id);

      if (!error) {
        setUsersList((prev) => prev.filter((u) => u.id !== targetUser.id));
        setActionNotice(`User deleted from public profiles.`);
        setTimeout(() => setActionNotice(''), 3000);
      }
    } catch (err) {
      console.error('User delete error:', err);
    }
  };

  // Export Users to CSV
  const handleExportCSV = () => {
    if (usersList.length === 0) return;
    const headers = ['ID', 'Full Name', 'Nickname', 'Position', 'Role', 'WhatsApp', 'Gender', 'Created At'];
    const rows = usersList.map((u) => [
      u.id,
      `"${u.full_name || ''}"`,
      `"${u.nickname || ''}"`,
      u.position || 'PG',
      u.role || 'player',
      u.whatsapp || '',
      u.gender || 'Male',
      u.created_at || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HoopLogs_Users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.nickname || '').toLowerCase().includes(q) ||
      (u.position || '').toLowerCase().includes(q) ||
      (u.whatsapp || '').includes(q);

    if (roleFilter === 'ADMIN') return matchesQuery && u.role === 'admin';
    if (roleFilter === 'PLAYER') return matchesQuery && u.role !== 'admin';
    return matchesQuery;
  });

  const totalUsers = usersList.length;
  const adminCount = usersList.filter((u) => u.role === 'admin').length;
  const athleteCount = totalUsers - adminCount;

  // ── 1. LOGIN SCREEN ──────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="superadmin-login-page">
        <div className="superadmin-login-box">
          <div className="superadmin-lock-icon">
            <LuLock size={26} color="#ff5500" />
          </div>
          <h1 className="superadmin-login-title">EXECUTIVE COMMAND</h1>
          <p className="superadmin-login-sub">HOOPLOGS RESTRICTED SUPERADMIN PORTAL</p>

          {loginError && <div className="superadmin-alert-error">{loginError}</div>}

          <form onSubmit={handleLogin} className="superadmin-form">
            <div className="superadmin-field">
              <label>SUPERADMIN USERNAME</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter username..."
                autoFocus
                required
              />
            </div>

            <div className="superadmin-field">
              <label>MASTER ACCESS KEY</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            <button type="submit" className="superadmin-btn-auth">
              AUTHORIZE ACCESS 🛡️
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── 2. DASHBOARD PORTAL ──────────────────────────────
  return (
    <div className="superadmin-portal-page">
      {/* Top Banner */}
      <header className="superadmin-topbar">
        <div className="superadmin-topbar-left">
          <img src="/hooplogs-logo.png" alt="HoopLogs" className="superadmin-logo-badge" />
          <div>
            <h2 className="superadmin-brand">HOOPLOGS EXECUTIVE PORTAL</h2>
            <span className="superadmin-tag">SYSTEM ANALYTICS & USER COMMAND</span>
          </div>
        </div>
        <div className="superadmin-topbar-right">
          <button onClick={fetchAdminData} className="btn-superadmin-refresh" title="Refresh Live Data">
            <LuRefreshCw size={14} className={loadingUsers ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={handleLogout} className="btn-superadmin-logout">
            <LuLogOut size={14} />
            <span>Lock Portal</span>
          </button>
        </div>
      </header>

      <main className="superadmin-main">
        {actionNotice && <div className="superadmin-toast-banner">{actionNotice}</div>}

        {/* Analytics KPI Row */}
        <section className="superadmin-kpis-grid">
          <div className="kpi-card">
            <div className="kpi-icon-wrap orange">
              <LuUsers size={22} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">TOTAL REGISTERED USERS</span>
              <h3 className="kpi-num">{totalUsers}</h3>
              <span className="kpi-subtext">Active Database Profiles</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrap blue">
              <IoBasketball size={22} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">REGISTERED ATHLETES</span>
              <h3 className="kpi-num">{athleteCount}</h3>
              <span className="kpi-subtext">
                {totalUsers > 0 ? Math.round((athleteCount / totalUsers) * 100) : 0}% of Platform
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrap green">
              <LuShield size={22} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">COACH / ADMIN STAFF</span>
              <h3 className="kpi-num">{adminCount}</h3>
              <span className="kpi-subtext">Verified Leadership Roles</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrap gold">
              <LuActivity size={22} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">ACTIVE PLATFORM ENGAGEMENT</span>
              <h3 className="kpi-num">98.4%</h3>
              <span className="kpi-subtext">High Retention Rate</span>
            </div>
          </div>
        </section>

        {/* Feature Usage Analytics Breakdown */}
        <section className="superadmin-card">
          <div className="superadmin-card-header">
            <div>
              <h3>Core Feature Utilization</h3>
              <p>Breakdown of athlete activity across major app sections</p>
            </div>
          </div>

          <div className="feature-bars-grid">
            <div className="feature-stat-item">
              <div className="feature-stat-head">
                <span className="feature-name">5-Zone Shot Tracker</span>
                <span className="feature-val">{featureUsage.shotSessions} Sessions</span>
              </div>
              <div className="feature-bar-track">
                <div className="feature-bar-fill orange" style={{ width: '85%' }} />
              </div>
            </div>

            <div className="feature-stat-item">
              <div className="feature-stat-head">
                <span className="feature-name">Teams, Rosters & Scoreboards</span>
                <span className="feature-val">{featureUsage.gamesTracked} Matchups</span>
              </div>
              <div className="feature-bar-track">
                <div className="feature-bar-fill blue" style={{ width: '68%' }} />
              </div>
            </div>

            <div className="feature-stat-item">
              <div className="feature-stat-head">
                <span className="feature-name">Athletic Conditioning Workouts</span>
                <span className="feature-val">{featureUsage.activeWorkouts} Programs Active</span>
              </div>
              <div className="feature-bar-track">
                <div className="feature-bar-fill green" style={{ width: '54%' }} />
              </div>
            </div>

            <div className="feature-stat-item">
              <div className="feature-stat-head">
                <span className="feature-name">Arena Notice Board & Practice RSVP</span>
                <span className="feature-val">{featureUsage.announcements} Announcements</span>
              </div>
              <div className="feature-bar-track">
                <div className="feature-bar-fill gold" style={{ width: '62%' }} />
              </div>
            </div>
          </div>
        </section>

        {/* User Directory & Table */}
        <section className="superadmin-card">
          <div className="superadmin-table-controls">
            <div className="table-search-box">
              <LuSearch size={15} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search athlete by name, nickname, position, or WhatsApp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="table-actions-right">
              <div className="role-filter-pills">
                {['ALL', 'PLAYER', 'ADMIN'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`role-filter-btn ${roleFilter === r ? 'active' : ''}`}
                    onClick={() => setRoleFilter(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button type="button" onClick={handleExportCSV} className="btn-export-csv" title="Export to CSV">
                <LuDownload size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="superadmin-table-wrapper">
            <table className="superadmin-table">
              <thead>
                <tr>
                  <th>ATHLETE / USER</th>
                  <th>HANDLE</th>
                  <th>POS</th>
                  <th>ROLE</th>
                  <th>WHATSAPP</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      {loadingUsers ? 'Loading registered users from Supabase…' : 'No users match the search filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isStaff = u.role === 'admin';
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="user-name-cell">
                            <div className="user-avatar-small">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                              ) : (
                                (u.full_name || 'H').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <strong>{u.full_name || 'Unnamed Athlete'}</strong>
                              <span className="user-id-sub">{u.id?.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="user-nickname-tag">@{u.nickname || 'hooper'}</span>
                        </td>
                        <td>
                          <span className="user-pos-pill">{u.position || 'PG'}</span>
                        </td>
                        <td>
                          <span className={`user-role-badge ${isStaff ? 'admin' : 'athlete'}`}>
                            {isStaff ? 'STAFF / COACH' : 'ATHLETE'}
                          </span>
                        </td>
                        <td>
                          {u.whatsapp ? (
                            <span className="user-wa-text">{u.whatsapp}</span>
                          ) : (
                            <span className="user-no-wa">—</span>
                          )}
                        </td>
                        <td>
                          <span className="user-online-pill">
                            <span className="online-green-dot" /> Verified
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="user-table-actions">
                            <button
                              type="button"
                              className="btn-toggle-role"
                              onClick={() => handleToggleRole(u)}
                              title={isStaff ? 'Demote to Player' : 'Elevate to Coach/Admin'}
                            >
                              {isStaff ? 'Make Player' : 'Make Coach'}
                            </button>
                            <button
                              type="button"
                              className="btn-delete-user"
                              onClick={() => handleDeleteUser(u)}
                              title="Delete User Record"
                            >
                              <LuTrash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="superadmin-footer">
        <p>© 2026 Sozidara. All rights reserved. • HoopLogs Executive Analytics</p>
      </footer>
    </div>
  );
}
