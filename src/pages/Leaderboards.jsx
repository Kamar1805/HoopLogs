// src/pages/Leaderboards.jsx (Hoopers Directory & Stats)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import SiteHeader from '../components/SiteHeader';
import MobileBottomNav from '../components/MobileBottomNav';
import {
  LuGlobe,
  LuUsers,
  LuCrosshair,
  LuFlame,
  LuCrown,
  LuMedal,
  LuSearch,
  LuClock,
  LuDumbbell,
  LuShield,
  LuArrowUpDown
} from 'react-icons/lu';
import { IoBasketball, IoLogoWhatsapp } from 'react-icons/io5';
import './Leaderboards.css';

const POSITIONS = ['ALL', 'PG', 'SG', 'SF', 'PF', 'C'];

const STAT_METRICS = [
  { key: 'ppg', label: 'POINTS (PPG)' },
  { key: 'apg', label: 'ASSISTS (APG)' },
  { key: 'rpg', label: 'REBOUNDS (RPG)' },
  { key: 'spg', label: 'STEALS (SPG)' },
  { key: 'bpg', label: 'BLOCKS (BPG)' },
  { key: 'topg', label: 'TURNOVERS (TOPG)' },
  { key: 'accuracy', label: 'FG ACCURACY %' }
];

export default function Leaderboards() {
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('ppg');
  const [searchQuery, setSearchQuery] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('ALL');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load custom teams and Supabase teams
  useEffect(() => {
    const loadTeams = async () => {
      let loadedTeams = [];

      try {
        const { data } = await supabase.from('teams').select('id, name, emblem').order('name');
        if (data && data.length > 0) {
          loadedTeams = [...data];
        }
      } catch (err) {
        console.warn('Supabase teams fetch warn:', err);
      }

      // Check local storage custom teams
      try {
        const stored = localStorage.getItem('hooplogs_custom_teams');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.forEach((pt) => {
            if (!loadedTeams.some((t) => t.id === pt.id || t.name === pt.name)) {
              loadedTeams.push(pt);
            }
          });
        }
      } catch (e) {
        console.warn('Local teams read warn:', e);
      }

      if (loadedTeams.length > 0) {
        setTeams(loadedTeams);
      }
    };

    loadTeams();
  }, []);

  // Fetch players, combine with shooting stats and team assignments
  const fetchRankings = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch profiles safely with select('*')
      let dbProfiles = [];
      try {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('*');
        if (!profErr && profs) {
          dbProfiles = [...profs];
        } else if (profErr) {
          console.warn('Profiles query error:', profErr);
        }
      } catch (e) {
        console.warn('Profiles query warn:', e);
      }

      // 2. Fetch global leaderboard shooting stats
      let dbStats = [];
      try {
        const { data: stats } = await supabase.from('leaderboard_global').select('*');
        if (stats) dbStats = stats;
      } catch (e) {
        console.warn('Stats view query warn:', e);
      }

      // 3. Load recorded Season Game Averages from local storage (or Supabase)
      let storedAverages = {};
      try {
        storedAverages = JSON.parse(localStorage.getItem('hooplogs_player_game_averages') || '{}');
      } catch (e) {}

      // 4. Fetch team members
      let teamMap = {}; // player_id -> { team_name, team_emblem }
      try {
        const { data: tm } = await supabase
          .from('team_members')
          .select('player_id, team_id, teams (name, emblem)');
        if (tm) {
          tm.forEach((item) => {
            if (item.player_id && item.teams) {
              teamMap[item.player_id] = {
                team_name: item.teams.name,
                team_emblem: item.teams.emblem || '🏀'
              };
            }
          });
        }
      } catch (e) {
        console.warn('Team members query warn:', e);
      }

      // Merge players from custom team rosters if created
      try {
        const customRosters = localStorage.getItem('hooplogs_custom_rosters');
        const customTeams = localStorage.getItem('hooplogs_custom_teams');
        if (customRosters && customTeams) {
          const rosters = JSON.parse(customRosters);
          const teamsList = JSON.parse(customTeams);
          const teamIdToMeta = {};
          teamsList.forEach((t) => {
            teamIdToMeta[t.id] = { name: t.name, emblem: t.logo || t.emblem || '🏀' };
          });

          Object.entries(rosters).forEach(([teamId, members]) => {
            const tMeta = teamIdToMeta[teamId];
            if (Array.isArray(members)) {
              members.forEach((m) => {
                const pid = typeof m === 'string' ? m : m.user_id || m.id;
                if (pid) {
                  if (tMeta) {
                    teamMap[pid] = { team_name: tMeta.name, team_emblem: tMeta.emblem };
                  }
                  if (!dbProfiles.some((p) => p.id === pid)) {
                    dbProfiles.push({
                      id: pid,
                      full_name: m.full_name || m.name || 'Hooper',
                      nickname: m.nickname || '',
                      position: m.position || 'G',
                      role: 'player',
                      avatar_url: m.avatar_url || null,
                      created_at: new Date().toISOString()
                    });
                  }
                }
              });
            }
          });
        }
      } catch (e) {
        console.warn('Local rosters parse error:', e);
      }

      // Map combined players (Zero mock data - default to 0 stats if admin hasn't added them yet)
      const combined = dbProfiles.map((p) => {
        const stat = dbStats.find((s) => s.user_id === p.id) || {};
        const teamInfo = teamMap[p.id];
        const avg = storedAverages[p.id] || {};

        let lastActiveStr = 'Recent';
        if (p.updated_at || p.created_at) {
          try {
            const date = new Date(p.updated_at || p.created_at);
            lastActiveStr = date.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric'
            });
          } catch (_) {}
        }

        return {
          user_id: p.id,
          full_name: p.full_name || p.nickname || 'Hooper',
          nickname: p.nickname || 'hooper',
          position: p.position || 'PG',
          team_name: teamInfo?.team_name || null,
          team_emblem: teamInfo?.team_emblem || null,
          accuracy_percentage: stat.accuracy_percentage || 0,
          total_made: stat.total_made || 0,
          total_attempted: stat.total_attempted || 0,
          // Season game averages (defaults to 0.0)
          ppg: parseFloat(avg.ppg || 0),
          apg: parseFloat(avg.apg || 0),
          rpg: parseFloat(avg.rpg || 0),
          spg: parseFloat(avg.spg || 0),
          bpg: parseFloat(avg.bpg || 0),
          topg: parseFloat(avg.topg || 0),
          gp: parseInt(avg.gp || 0, 10),
          whatsapp: p.whatsapp || '',
          last_active: lastActiveStr,
          avatar_url: p.avatar_url || null,
        };
      });

      setPlayers(combined);
    } catch (err) {
      console.error('Error fetching hoopers:', err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let result = [...players];

    // Filter by Position
    if (positionFilter !== 'ALL') {
      result = result.filter(
        (p) => (p.position || '').toUpperCase() === positionFilter.toUpperCase()
      );
    }

    // Filter by Squad/Team
    if (selectedTeamId !== 'ALL') {
      const activeTeam = teams.find((t) => t.id === selectedTeamId);
      if (activeTeam) {
        result = result.filter(
          (p) => p.team_name?.toLowerCase() === activeTeam.name?.toLowerCase()
        );
      }
    }

    // Filter by Search Query (Name, Nickname, Team)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.full_name?.toLowerCase().includes(q) ||
          p.nickname?.toLowerCase().includes(q) ||
          p.team_name?.toLowerCase().includes(q) ||
          p.position?.toLowerCase().includes(q)
      );
    }

    // Sort by metric
    result.sort((a, b) => {
      if (sortBy === 'accuracy') {
        return b.accuracy_percentage - a.accuracy_percentage;
      }
      return (b[sortBy] || 0) - (a[sortBy] || 0);
    });

    return result;
  }, [players, positionFilter, selectedTeamId, teams, searchQuery, sortBy]);

  return (
    <div className="leaderboards-page">
      <SiteHeader />

      <main className="leaderboards-container">
        {/* Header */}
        <div className="lb-arena-header">
          <h1>HOOPERS DIRECTORY</h1>
          <p>Verified Athletes • Season Box Scores • Position Filters • Direct Connect</p>
        </div>

        {/* Search Bar */}
        <div className="lb-search-wrap">
          <LuSearch className="lb-search-icon" />
          <input
            type="text"
            className="lb-search-input"
            placeholder="Search by hooper name, @nickname, squad or position…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="lb-search-clear" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>

        {/* Position Filter Chips */}
        <div className="lb-pos-chips-container">
          <span className="lb-chips-label">POSITION:</span>
          <div className="lb-pos-chips-flex">
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                className={`lb-pos-chip ${positionFilter === pos ? 'active' : ''}`}
                onClick={() => setPositionFilter(pos)}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Sort & Team Filter Bar */}
        <div className="lb-controls-bar">
          <div className="lb-control-group">
            <label className="lb-control-label">
              <LuArrowUpDown size={13} /> SORT STAT:
            </label>
            <select
              className="lb-select-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {STAT_METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lb-control-group">
            <label className="lb-control-label">
              <LuUsers size={13} /> SQUAD:
            </label>
            <select
              className="lb-select-input"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="ALL">All Squads ({players.length})</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.logo || t.emblem || '🏀'} {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hoopers Roster Stream */}
        <div className="lb-ranks-card">
          <div className="lb-card-top-title">
            <span>REGISTERED HOOPERS</span>
            <span className="lb-count-pill">{filteredAndSorted.length} Players</span>
          </div>

          {loading ? (
            <div className="lb-loading-state">
              <IoBasketball className="spin-icon" size={28} color="#ff5500" />
              <span>Loading arena hoopers…</span>
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="lb-empty-state">
              <IoBasketball size={42} color="#ff5500" />
              <h3>NO HOOPERS FOUND</h3>
              <p>Try searching for a different position or clear your search query.</p>
            </div>
          ) : (
            <div className="lb-players-list">
              {filteredAndSorted.map((player, idx) => {
                const rank = idx + 1;
                const cleanWa = (player.whatsapp || '').replace(/[^0-9]/g, '');
                const hasWa = cleanWa.length >= 7;

                return (
                  <div key={player.user_id || idx} className="lb-player-row hooper-card-elevated">
                    {/* Rank Badge */}
                    <div className={`lb-rank-badge rank-${rank <= 3 ? rank : 'standard'}`}>
                      {rank}
                    </div>

                    {/* Avatar */}
                    <div className="lb-avatar-wrap">
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt="" className="lb-avatar-img" />
                      ) : (
                        <div className="lb-avatar-circle">
                          {player.full_name?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                      )}
                    </div>

                    {/* Player Info & Metadata */}
                    <div className="lb-player-center">
                      <div className="lb-player-name-row">
                        <span className="lb-player-name">{player.full_name}</span>
                        {player.position && (
                          <span className="lb-pos-pill">{player.position}</span>
                        )}
                        {/* Team Badge */}
                        {player.team_name ? (
                          <span className="lb-squad-badge">
                            {player.team_emblem || '🏀'} {player.team_name}
                          </span>
                        ) : (
                          <span className="lb-squad-badge free-agent">
                            Free Agent
                          </span>
                        )}
                      </div>

                      {/* Season Box Score Row (Zero Default) */}
                      <div className="hooper-stat-line-chips">
                        <span className="hooper-stat-chip highlight">
                          <strong>{player.ppg.toFixed(1)}</strong> PPG
                        </span>
                        <span className="hooper-stat-chip">
                          <strong>{player.apg.toFixed(1)}</strong> APG
                        </span>
                        <span className="hooper-stat-chip">
                          <strong>{player.rpg.toFixed(1)}</strong> RPG
                        </span>
                        <span className="hooper-stat-chip">
                          <strong>{player.spg.toFixed(1)}</strong> SPG
                        </span>
                        <span className="hooper-stat-chip">
                          <strong>{player.bpg.toFixed(1)}</strong> BPG
                        </span>
                        <span className="hooper-stat-chip">
                          <strong>{player.topg.toFixed(1)}</strong> TO
                        </span>
                        <span className="hooper-stat-chip subtle">
                          {player.gp} GP
                        </span>
                      </div>
                    </div>

                    {/* Right WhatsApp Action */}
                    <div className="lb-player-right">
                      {hasWa ? (
                        <a
                          href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                            `Hey ${player.full_name}! Connecting with you from HoopLogs 🏀`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lb-wa-btn active"
                          title={`Chat with ${player.full_name} on WhatsApp`}
                        >
                          <IoLogoWhatsapp size={15} /> CHAT
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="lb-wa-btn disabled"
                          disabled
                          title="This player hasn't added their WhatsApp number yet"
                        >
                          <IoLogoWhatsapp size={15} /> NO WA
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
