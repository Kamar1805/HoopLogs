// src/pages/LiveGameStatkeeper.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import SiteHeader from '../components/SiteHeader';
import MobileBottomNav from '../components/MobileBottomNav';
import {
  LuShield,
  LuUsers,
  LuUserCheck,
  LuCircleCheck,
  LuPlus,
  LuMinus,
  LuSave,
  LuRotateCcw,
  LuArrowLeft,
  LuClock,
  LuCircleAlert
} from 'react-icons/lu';
import { IoBasketball } from 'react-icons/io5';
import './LiveGameStatkeeper.css';

export default function LiveGameStatkeeper() {
  const { gameId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [claimedTeam, setClaimedTeam] = useState(null); // 'A' or 'B'
  const [statkeeperSlots, setStatkeeperSlots] = useState({ A: null, B: null });
  const [teamRoster, setTeamRoster] = useState([]);
  const [playerStats, setPlayerStats] = useState({});
  const [savedSuccess, setSavedSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Load Game Data
  useEffect(() => {
    try {
      const storedGames = JSON.parse(localStorage.getItem('hooplogs_league_games_v1') || '[]');
      const found = storedGames.find((g) => g.id === gameId);

      if (found) {
        setGame(found);
        setStatkeeperSlots({
          A: found.statkeeperA || null,
          B: found.statkeeperB || null,
        });

        // If current user is already keeper for one team
        if (user) {
          if (found.statkeeperA?.userId === user.id) {
            setClaimedTeam('A');
          } else if (found.statkeeperB?.userId === user.id) {
            setClaimedTeam('B');
          }
        }
      } else {
        // Fallback default demo matchup
        const defaultGame = {
          id: gameId || 'game-default',
          teamAId: 'team-alpha',
          teamAName: 'Thunder Bolts',
          teamBId: 'team-beta',
          teamBName: 'Amazon Hoopers',
          teamAScore: 0,
          teamBScore: 0,
          date: new Date().toLocaleDateString(),
          quarter: 'Q1',
          status: 'live',
        };
        setGame(defaultGame);
      }
    } catch (e) {
      console.warn('Game load error:', e);
    }
  }, [gameId, user]);

  // 2. Load players for the claimed team
  useEffect(() => {
    if (!claimedTeam || !game) return;

    const targetTeamId = claimedTeam === 'A' ? game.teamAId : game.teamBId;
    const targetTeamName = claimedTeam === 'A' ? game.teamAName : game.teamBName;

    // Look for roster in localStorage
    try {
      const storedRosters = JSON.parse(localStorage.getItem('hooplogs_team_rosters_v1') || '{}');
      const teamPlayers = storedRosters[targetTeamId] || [];

      if (teamPlayers.length > 0) {
        setTeamRoster(teamPlayers);
        initPlayerStats(teamPlayers);
      } else {
        // If empty, fetch from Supabase profiles or populate default slots
        fetchTeamPlayersFallback(targetTeamName);
      }
    } catch (e) {
      fetchTeamPlayersFallback(targetTeamName);
    }
  }, [claimedTeam, game]);

  const fetchTeamPlayersFallback = async (teamName) => {
    try {
      const { data } = await supabase.from('profiles').select('id, full_name, nickname, position').limit(8);
      if (data && data.length > 0) {
        setTeamRoster(data);
        initPlayerStats(data);
      } else {
        const dummyPlayers = [
          { id: 'p1', full_name: 'Player 1', nickname: 'Shooter', position: 'PG' },
          { id: 'p2', full_name: 'Player 2', nickname: 'Wing', position: 'SG' },
          { id: 'p3', full_name: 'Player 3', nickname: 'Forward', position: 'SF' },
          { id: 'p4', full_name: 'Player 4', nickname: 'Big', position: 'PF' },
          { id: 'p5', full_name: 'Player 5', nickname: 'Center', position: 'C' },
        ];
        setTeamRoster(dummyPlayers);
        initPlayerStats(dummyPlayers);
      }
    } catch {
      // fallback
    }
  };

  const initPlayerStats = (players) => {
    const initial = {};
    players.forEach((p) => {
      initial[p.id] = {
        pts: 0,
        ast: 0,
        reb: 0,
        stl: 0,
        blk: 0,
        to: 0,
        pf: 0,
      };
    });
    setPlayerStats(initial);
  };

  // 3. Claim Team (Max 2 statkeepers, second person cannot choose claimed team)
  const handleClaimTeam = (teamChoice) => {
    if (!user) {
      setErrorMsg('Please log in or sign up first to track live stats for this game.');
      return;
    }

    const keeperInfo = {
      userId: user.id,
      name: profile?.full_name || user.email || 'Statkeeper',
    };

    const updatedSlots = { ...statkeeperSlots };

    if (teamChoice === 'A') {
      if (updatedSlots.A && updatedSlots.A.userId !== user.id) {
        setErrorMsg(`${game.teamAName} is already being tracked by ${updatedSlots.A.name}.`);
        return;
      }
      updatedSlots.A = keeperInfo;
      setClaimedTeam('A');
    } else {
      if (updatedSlots.B && updatedSlots.B.userId !== user.id) {
        setErrorMsg(`${game.teamBName} is already being tracked by ${updatedSlots.B.name}.`);
        return;
      }
      updatedSlots.B = keeperInfo;
      setClaimedTeam('B');
    }

    setStatkeeperSlots(updatedSlots);
    setErrorMsg('');

    // Save keeper slots into game
    try {
      const storedGames = JSON.parse(localStorage.getItem('hooplogs_league_games_v1') || '[]');
      const updated = storedGames.map((g) => {
        if (g.id === game.id) {
          return {
            ...g,
            statkeeperA: updatedSlots.A,
            statkeeperB: updatedSlots.B,
          };
        }
        return g;
      });
      localStorage.setItem('hooplogs_league_games_v1', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save keeper slots:', e);
    }
  };

  // 4. Increment / Decrement Stat for a player
  const handleStatChange = (playerId, statKey, delta) => {
    setPlayerStats((prev) => {
      const current = prev[playerId] || { pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, to: 0, pf: 0 };
      const newVal = Math.max(0, (current[statKey] || 0) + delta);
      return {
        ...prev,
        [playerId]: {
          ...current,
          [statKey]: newVal,
        },
      };
    });
  };

  // 5. Finalize & Save Stats
  const handleFinalizeStats = () => {
    const teamName = claimedTeam === 'A' ? game.teamAName : game.teamBName;
    const teamTotalPts = Object.values(playerStats).reduce((sum, p) => sum + (p.pts || 0), 0);

    try {
      // 1. Update Game Score and Player Stats in stored games
      const storedGames = JSON.parse(localStorage.getItem('hooplogs_league_games_v1') || '[]');
      const updatedGames = storedGames.map((g) => {
        if (g.id === game.id) {
          const currentStats = g.playerStats || {};
          return {
            ...g,
            [claimedTeam === 'A' ? 'teamAScore' : 'teamBScore']: teamTotalPts,
            playerStats: {
              ...currentStats,
              ...playerStats,
            },
          };
        }
        return g;
      });
      localStorage.setItem('hooplogs_league_games_v1', JSON.stringify(updatedGames));

      // 2. Update Cumulative Career/Season stats for each player
      const storedAverages = JSON.parse(localStorage.getItem('hooplogs_player_game_averages') || '{}');

      Object.entries(playerStats).forEach(([pId, stats]) => {
        const prev = storedAverages[pId] || {
          gp: 0,
          pts: 0,
          ast: 0,
          reb: 0,
          stl: 0,
          blk: 0,
          to: 0,
          team: teamName,
        };

        const newGp = prev.gp + 1;
        const newPts = prev.pts + (stats.pts || 0);
        const newAst = prev.ast + (stats.ast || 0);
        const newReb = prev.reb + (stats.reb || 0);
        const newStl = prev.stl + (stats.stl || 0);
        const newBlk = prev.blk + (stats.blk || 0);
        const newTo = prev.to + (stats.to || 0);

        storedAverages[pId] = {
          gp: newGp,
          pts: newPts,
          ast: newAst,
          reb: newReb,
          stl: newStl,
          blk: newBlk,
          to: newTo,
          ppg: Number((newPts / newGp).toFixed(1)),
          apg: Number((newAst / newGp).toFixed(1)),
          rpg: Number((newReb / newGp).toFixed(1)),
          spg: Number((newStl / newGp).toFixed(1)),
          bpg: Number((newBlk / newGp).toFixed(1)),
          topg: Number((newTo / newGp).toFixed(1)),
          team: teamName,
        };
      });

      localStorage.setItem('hooplogs_player_game_averages', JSON.stringify(storedAverages));

      setSavedSuccess(`Stats saved successfully for ${teamName}! Player profiles & league standings updated.`);
      setTimeout(() => setSavedSuccess(''), 4500);
    } catch (e) {
      console.error('Error saving game stats:', e);
      setErrorMsg('Could not save game stats. Please try again.');
    }
  };

  // If user is not logged in
  if (!user) {
    return (
      <div className="statkeeper-page">
        <SiteHeader />
        <div className="statkeeper-container">
          <div className="statkeeper-auth-guard">
            <IoBasketball size={36} color="#ff5500" />
            <h2>Live Game Statkeeping Portal</h2>
            <p>
              You've been invited by the coach to track live player box scores for this matchup.
              Please log in or sign up below to claim your team.
            </p>
            <div className="statkeeper-auth-btns">
              <Link to="/login" className="btn-statkeeper-login">Log In to Track Stats</Link>
              <Link to="/signup" className="btn-statkeeper-signup">Create Free Account</Link>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="statkeeper-page">
      <SiteHeader />

      <main className="statkeeper-container">
        {/* Top Header Card */}
        <div className="statkeeper-header-card">
          <Link to="/teams" className="btn-back-to-teams">
            <LuArrowLeft /> Exit to Teams
          </Link>

          <div className="game-banner-title">
            <span className="live-pulse-badge">🔴 LIVE MATCHUP</span>
            <h1>{game?.teamAName || 'Team A'} vs {game?.teamBName || 'Team B'}</h1>
            <span className="game-date-sub">{game?.date || 'Today'} • Official League Matchup</span>
          </div>

          {errorMsg && (
            <div className="statkeeper-alert error">
              <LuCircleAlert size={15} /> {errorMsg}
            </div>
          )}
          {savedSuccess && (
            <div className="statkeeper-alert success">
              <LuCircleCheck size={15} /> {savedSuccess}
            </div>
          )}
        </div>

        {/* STEP 1: Claim Team Selection (Max 2 Statkeepers, First-Come-First-Claim) */}
        {!claimedTeam ? (
          <div className="claim-team-section">
            <h2>Select The Team You Are Tracking</h2>
            <p className="claim-team-sub">
              To prevent duplicate records, only 1 statkeeper is assigned to each team (maximum 2 statkeepers per game).
            </p>

            <div className="claim-teams-grid">
              {/* Team A Option */}
              <div className={`claim-team-card ${statkeeperSlots.A ? 'claimed' : ''}`}>
                <div className="claim-card-head">
                  <IoBasketball size={28} color="#ff5500" />
                  <h3>{game?.teamAName || 'Team A'}</h3>
                </div>
                {statkeeperSlots.A ? (
                  <div className="claimed-status-pill">
                    <LuUserCheck /> Claimed by {statkeeperSlots.A.name}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleClaimTeam('A')}
                    className="btn-claim-team"
                  >
                    Track Stats for {game?.teamAName} →
                  </button>
                )}
              </div>

              {/* Team B Option */}
              <div className={`claim-team-card ${statkeeperSlots.B ? 'claimed' : ''}`}>
                <div className="claim-card-head">
                  <IoBasketball size={28} color="#0ea5e9" />
                  <h3>{game?.teamBName || 'Team B'}</h3>
                </div>
                {statkeeperSlots.B ? (
                  <div className="claimed-status-pill">
                    <LuUserCheck /> Claimed by {statkeeperSlots.B.name}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleClaimTeam('B')}
                    className="btn-claim-team"
                  >
                    Track Stats for {game?.teamBName} →
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: Live Player-By-Player Box Score Entry */
          <div className="active-statkeeper-box">
            <div className="claimed-team-bar">
              <div>
                <span className="tracking-label">CURRENTLY TRACKING:</span>
                <h2>{claimedTeam === 'A' ? game?.teamAName : game?.teamBName}</h2>
              </div>
              <button
                type="button"
                className="btn-switch-team"
                onClick={() => setClaimedTeam(null)}
              >
                Change Team
              </button>
            </div>

            <div className="statkeeper-players-list">
              {teamRoster.map((player) => {
                const s = playerStats[player.id] || { pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, to: 0, pf: 0 };
                return (
                  <div key={player.id} className="player-stat-row-card">
                    <div className="player-stat-head">
                      <div className="player-meta-left">
                        <span className="player-pos-tag">{player.position || 'G'}</span>
                        <strong className="player-stat-name">{player.full_name}</strong>
                        {player.nickname && <span className="player-stat-nick">@{player.nickname}</span>}
                      </div>
                      <div className="player-score-glance">
                        <span className="pts-glance-badge">{s.pts} PTS</span>
                      </div>
                    </div>

                    {/* Quick Action Stat Buttons */}
                    <div className="stat-buttons-grid">
                      {/* Points (+2, +3, +1) */}
                      <button
                        type="button"
                        className="btn-action-stat pts"
                        onClick={() => handleStatChange(player.id, 'pts', 2)}
                      >
                        +2 PTS
                      </button>
                      <button
                        type="button"
                        className="btn-action-stat pts-3"
                        onClick={() => handleStatChange(player.id, 'pts', 3)}
                      >
                        +3 PTS
                      </button>
                      <button
                        type="button"
                        className="btn-action-stat ft"
                        onClick={() => handleStatChange(player.id, 'pts', 1)}
                      >
                        +1 FT
                      </button>

                      {/* Assists, Rebounds, Steals, Blocks */}
                      <button
                        type="button"
                        className="btn-action-stat ast"
                        onClick={() => handleStatChange(player.id, 'ast', 1)}
                      >
                        +AST ({s.ast})
                      </button>
                      <button
                        type="button"
                        className="btn-action-stat reb"
                        onClick={() => handleStatChange(player.id, 'reb', 1)}
                      >
                        +REB ({s.reb})
                      </button>
                      <button
                        type="button"
                        className="btn-action-stat stl"
                        onClick={() => handleStatChange(player.id, 'stl', 1)}
                      >
                        +STL ({s.stl})
                      </button>
                      <button
                        type="button"
                        className="btn-action-stat blk"
                        onClick={() => handleStatChange(player.id, 'blk', 1)}
                      >
                        +BLK ({s.blk})
                      </button>

                      {/* Turnovers & Fouls */}
                      <button
                        type="button"
                        className="btn-action-stat to"
                        onClick={() => handleStatChange(player.id, 'to', 1)}
                      >
                        +TO ({s.to})
                      </button>
                      <button
                        type="button"
                        className="btn-action-stat foul"
                        onClick={() => handleStatChange(player.id, 'pf', 1)}
                      >
                        +PF ({s.pf})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save & Finalize Button */}
            <div className="finalize-actions-bar">
              <button
                type="button"
                className="btn-finalize-game-stats"
                onClick={handleFinalizeStats}
              >
                <LuSave size={18} />
                <span>SAVE & FINALIZE TEAM STATS 🏀</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
