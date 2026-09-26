import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
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

import { fetchUnifiedHoopers } from '../services/basketballCommunityService';

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

  // Load custom teams from Supabase, Firestore & localStorage (zero mock teams)
  useEffect(() => {
    const loadTeams = async () => {
      let loadedTeams = [];

      try {
        const { data } = await supabase.from('teams').select('id, name, emblem').order('name');
        if (data && data.length > 0) {
          loadedTeams = data.filter((t) => t && t.name && !t.name.toLowerCase().includes('varsity'));
        }
      } catch (err) {
        console.warn('Supabase teams fetch warn:', err);
      }

      // Fetch from Firestore 'teams'
      try {
        const snap = await getDocs(collection(db, 'teams'));
        snap.forEach((d) => {
          const t = { id: d.id, ...d.data() };
          if (t.name && !t.name.toLowerCase().includes('varsity')) {
            if (!loadedTeams.some((lt) => lt.id === t.id || lt.name === t.name)) {
              loadedTeams.push(t);
            }
          }
        });
      } catch (e) {
        console.warn('Firestore teams read warn:', e);
      }

      // Check local storage custom teams (purging Varsity Squad)
      try {
        const stored = localStorage.getItem('hooplogs_custom_teams');
        if (stored) {
          const parsed = JSON.parse(stored);
          const cleaned = parsed.filter((pt) => pt && pt.name && !pt.name.toLowerCase().includes('varsity'));
          localStorage.setItem('hooplogs_custom_teams', JSON.stringify(cleaned));
          cleaned.forEach((pt) => {
            if (!loadedTeams.some((t) => t.id === pt.id || t.name === pt.name)) {
              loadedTeams.push(pt);
            }
          });
        }
      } catch (e) {
        console.warn('Local teams read warn:', e);
      }

      setTeams(loadedTeams);
    };

    loadTeams();
  }, []);

  // Fetch unified hoopers across Firebase Firestore, Supabase, and live season stats
  const fetchRankings = useCallback(async () => {
    try {
      setLoading(true);
      const unifiedList = await fetchUnifiedHoopers();
      setPlayers(unifiedList);
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

                      {/* Clean Pro Stat Strip (NBA / SofaScore Style) */}
                      <div className="hooper-stat-bar">
                        <div className="stat-cell highlight">
                          <span className="stat-cell-num">{player.ppg.toFixed(1)}</span>
                          <span className="stat-cell-dim">PPG</span>
                        </div>
                        <div className="stat-cell-divider" />
                        <div className="stat-cell">
                          <span className="stat-cell-num">{player.rpg.toFixed(1)}</span>
                          <span className="stat-cell-dim">RPG</span>
                        </div>
                        <div className="stat-cell-divider" />
                        <div className="stat-cell">
                          <span className="stat-cell-num">{player.apg.toFixed(1)}</span>
                          <span className="stat-cell-dim">APG</span>
                        </div>
                        <div className="stat-cell-divider" />
                        <div className="stat-cell">
                          <span className="stat-cell-num">{player.spg.toFixed(1)}</span>
                          <span className="stat-cell-dim">SPG</span>
                        </div>
                        <div className="stat-cell-divider" />
                        <div className="stat-cell">
                          <span className="stat-cell-num">{player.bpg.toFixed(1)}</span>
                          <span className="stat-cell-dim">BPG</span>
                        </div>
                        <div className="stat-cell-divider" />
                        <div className="stat-cell subtle">
                          <span className="stat-cell-num">{player.gp}</span>
                          <span className="stat-cell-dim">GP</span>
                        </div>
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
                          <IoLogoWhatsapp size={14} /> CHAT
                        </a>
                      ) : (
                        <div
                          className="lb-wa-unlinked"
                          title="WhatsApp not linked"
                        >
                          <IoLogoWhatsapp size={15} />
                        </div>
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
