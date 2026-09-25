// src/pages/RosterManagement.jsx - Teams, Leagues, Arena Scoreboard & Live Statkeeper
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import SiteHeader from '../components/SiteHeader';
import MobileBottomNav from '../components/MobileBottomNav';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LuShieldCheck,
  LuZap,
  LuFileSpreadsheet,
  LuFileText,
  LuSearch,
  LuMessageSquare,
  LuX,
  LuSend,
  LuPlus,
  LuCheck,
  LuTrophy,
  LuTv,
  LuUsers,
  LuPlay,
  LuPause,
  LuRotateCcw,
  LuQrCode,
  LuCopy,
  LuExternalLink,
  LuCalendar,
  LuSave,
  LuClock,
  LuSmartphone
} from 'react-icons/lu';
import { IoBasketball, IoLogoWhatsapp } from 'react-icons/io5';
import './RosterManagement.css';

const TEAM_BADGES = ['👑', '🦅', '⚡', '🔥', '🏀', '🦁', '🐺', '🦈', '🚀', '⭐'];
const POSITIONS = ['ALL', 'PG', 'SG', 'SF', 'PF', 'C'];
const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'OT'];

export default function RosterManagement() {
  const { user, profile, isAdmin } = useAuth();
  const isCoach = isAdmin || (typeof window !== 'undefined' && localStorage.getItem('hooplogs_admin_elevated') === 'true');

  // Top Section View Tab: 'teams' | 'standings' | 'scoreboard' | 'postgame'
  const [activeTab, setActiveTab] = useState('teams');

  // Teams & Roster State
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [rosterMembers, setRosterMembers] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('👑');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Global Player Search state (Admin Feature)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPosFilter, setSearchPosFilter] = useState('ALL');

  // Coach Feedback / Review Modal State
  const [feedbackPlayer, setFeedbackPlayer] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [savedReviews, setSavedReviews] = useState({});

  // ----------------------------------------------------
  // LEAGUE & STANDINGS STATE
  // ----------------------------------------------------
  const [leagues, setLeagues] = useState([
    {
      id: 'league-default',
      name: 'HoopLogs Premier League',
      format: '4 Quarters • 10 Min',
      season: '2026 Season'
    }
  ]);
  const [selectedLeagueId, setSelectedLeagueId] = useState('league-default');
  const [showCreateLeagueModal, setShowCreateLeagueModal] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueFormat, setNewLeagueFormat] = useState('4 Quarters (10 min)');
  const [standings, setStandings] = useState({});

  // ----------------------------------------------------
  // ARENA SCOREBOARD STATE
  // ----------------------------------------------------
  const [gameId, setGameId] = useState(() => `game-${Date.now()}`);
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [period, setPeriod] = useState('Q1');
  const [timeoutsA, setTimeoutsA] = useState(3);
  const [timeoutsB, setTimeoutsB] = useState(3);
  const [foulsA, setFoulsA] = useState(0);
  const [foulsB, setFoulsB] = useState(0);
  const [clockSeconds, setClockSeconds] = useState(600); // 10:00
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [gameDate, setGameDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // ----------------------------------------------------
  // MANUAL POST-GAME STATS ENTRY STATE
  // ----------------------------------------------------
  const [postGameTeamId, setPostGameTeamId] = useState('');
  const [postGameOpponentId, setPostGameOpponentId] = useState('');
  const [postGameDate, setPostGameDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [postGameStats, setPostGameStats] = useState({}); // { [playerId]: { pts, ast, reb, stl, blk, to } }
  const [postGameRoster, setPostGameRoster] = useState([]);
  const [postGameSaveSuccess, setPostGameSaveSuccess] = useState('');

  // Timer interval ref
  const timerRef = useRef(null);

  // Clock effect
  useEffect(() => {
    if (isClockRunning) {
      timerRef.current = setInterval(() => {
        setClockSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsClockRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isClockRunning]);

  // Format Clock MM:SS
  const formatClock = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Fetch Teams
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      let loadedTeams = [];

      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*, team_members(count)')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          loadedTeams = data;
        }
      } catch (sbErr) {
        console.warn('Supabase fetch teams fallback:', sbErr);
      }

      // Check localStorage for custom teams
      const localCustom = JSON.parse(localStorage.getItem('hooplogs_custom_teams') || '[]');
      const combinedMap = new Map();

      // Priority: local custom teams -> Supabase live teams (ZERO mock teams)
      [...localCustom, ...loadedTeams].forEach((t) => {
        if (!combinedMap.has(t.id)) combinedMap.set(t.id, t);
      });

      const finalTeams = Array.from(combinedMap.values());
      setTeams(finalTeams);

      if (finalTeams.length > 0) {
        if (!selectedTeam) setSelectedTeam(finalTeams[0]);
        if (!teamAId) setTeamAId(finalTeams[0].id);
        if (!teamBId && finalTeams.length > 1) setTeamBId(finalTeams[1].id);
        if (!postGameTeamId) setPostGameTeamId(finalTeams[0].id);
        if (!postGameOpponentId && finalTeams.length > 1) setPostGameOpponentId(finalTeams[1].id);
      }
    } catch (err) {
      console.error('Fetch teams error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, teamAId, teamBId, postGameTeamId, postGameOpponentId]);

  // 2. Fetch Roster Members for Active Team
  const fetchRosterMembers = useCallback(async (teamId) => {
    if (!teamId) return;
    try {
      setLoading(true);
      let members = [];

      try {
        const { data, error } = await supabase
          .from('team_members')
          .select(`
            id,
            team_id,
            user_id,
            joined_at,
            profiles (
              id,
              full_name,
              nickname,
              position,
              height,
              gender,
              whatsapp,
              experience
            )
          `)
          .eq('team_id', teamId);

        if (!error && data && data.length > 0) {
          members = data;
        }
      } catch (sbErr) {
        console.warn('Supabase fetch roster fallback:', sbErr);
      }

      // Merge with custom local rosters
      const localRosters = JSON.parse(localStorage.getItem('hooplogs_custom_rosters') || '{}');
      const teamCustom = localRosters[teamId] || [];

      const memberMap = new Map();
      [...members, ...teamCustom].forEach((m) => {
        if (m && m.user_id && !memberMap.has(m.user_id)) {
          memberMap.set(m.user_id, m);
        }
      });

      const enriched = Array.from(memberMap.values()).map((m) => ({
        ...m,
        stats: m.stats || {
          total_made: 0,
          total_attempted: 0,
          accuracy_percentage: 0,
        },
      }));

      setRosterMembers(enriched);
    } catch (err) {
      console.error('Fetch roster members catch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Leagues and Standings from localStorage
  useEffect(() => {
    try {
      const storedLeagues = localStorage.getItem('hooplogs_leagues_v1');
      if (storedLeagues) setLeagues(JSON.parse(storedLeagues));

      const storedStandings = localStorage.getItem('hooplogs_league_standings_v1');
      if (storedStandings) setStandings(JSON.parse(storedStandings));

      const storedReviews = localStorage.getItem('hooplogs_player_reviews');
      if (storedReviews) setSavedReviews(JSON.parse(storedReviews));
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedTeam?.id) {
      fetchRosterMembers(selectedTeam.id);
    }
  }, [selectedTeam, fetchRosterMembers]);

  // 3. Search Users to Add (Coach Feature)
  useEffect(() => {
    if (!searchQuery.trim() || !isCoach) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        let found = [];

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, nickname, position, gender, whatsapp')
            .or(`full_name.ilike.%${searchQuery}%,nickname.ilike.%${searchQuery}%`)
            .limit(10);

          if (!error && data) {
            found = data;
          }
        } catch (sbErr) {}

        const currentMemberIds = new Set(rosterMembers.map((m) => m.user_id));
        const filtered = found.filter((p) => !currentMemberIds.has(p.id));
        setSearchResults(filtered);
      } catch (err) {
        console.error('Player search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isCoach, rosterMembers]);

  // Load post-game roster when postGameTeamId changes
  useEffect(() => {
    if (!postGameTeamId) return;
    const loadPostGameRoster = async () => {
      const localRosters = JSON.parse(localStorage.getItem('hooplogs_custom_rosters') || '{}');
      const teamCustom = localRosters[postGameTeamId] || [];
      const formatted = teamCustom.map((m) => ({
        id: m.user_id || m.id,
        name: m.profiles?.full_name || m.name || 'Hooper',
        nickname: m.profiles?.nickname || m.nickname || '',
        position: m.profiles?.position || m.position || 'G'
      }));
      setPostGameRoster(formatted);

      // Pre-fill postGameStats state
      const initialStats = {};
      formatted.forEach((p) => {
        initialStats[p.id] = { pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, to: 0 };
      });
      setPostGameStats(initialStats);
    };
    loadPostGameRoster();
  }, [postGameTeamId]);

  // Handlers for Team & Roster
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const newTeamObj = {
      id: `team-${Date.now()}`,
      name: newTeamName.trim(),
      logo: selectedBadge,
      emblem: selectedBadge,
      coach_name: profile?.full_name || 'Coach Kamar (AK)',
      coach_id: user?.id || null,
      created_at: new Date().toISOString(),
      team_members: [{ count: 0 }]
    };

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: newTeamName.trim(),
          coach_id: user?.id || null,
        })
        .select()
        .single();

      if (!error && data) {
        newTeamObj.id = data.id;
      }
    } catch (err) {
      console.warn('Supabase team creation fallback:', err);
    }

    const currentCustom = JSON.parse(localStorage.getItem('hooplogs_custom_teams') || '[]');
    const updatedCustom = [newTeamObj, ...currentCustom];
    localStorage.setItem('hooplogs_custom_teams', JSON.stringify(updatedCustom));

    setTeams((prev) => [newTeamObj, ...prev]);
    setSelectedTeam(newTeamObj);
    setNewTeamName('');
    setShowCreateForm(false);
  };

  const handleAddPlayer = async (playerProfile) => {
    if (!selectedTeam) return;

    const newMember = {
      id: `mem-${Date.now()}`,
      team_id: selectedTeam.id,
      user_id: playerProfile.id,
      joined_at: new Date().toISOString(),
      profiles: playerProfile,
      stats: { total_made: 0, total_attempted: 0, accuracy_percentage: 0 }
    };

    try {
      await supabase.from('team_members').insert({
        team_id: selectedTeam.id,
        user_id: playerProfile.id,
      });
    } catch (err) {
      console.warn('Supabase add player fallback:', err);
    }

    const customRosters = JSON.parse(localStorage.getItem('hooplogs_custom_rosters') || '{}');
    const teamRoster = customRosters[selectedTeam.id] || [];
    if (!teamRoster.some((m) => m.user_id === playerProfile.id)) {
      customRosters[selectedTeam.id] = [...teamRoster, newMember];
      localStorage.setItem('hooplogs_custom_rosters', JSON.stringify(customRosters));
    }

    setRosterMembers((prev) => [...prev, newMember]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemovePlayer = async (membershipId, playerName) => {
    if (!window.confirm(`Remove ${playerName || 'this player'} from ${selectedTeam.name}?`)) {
      return;
    }

    try {
      await supabase.from('team_members').delete().eq('id', membershipId);
    } catch (err) {
      console.warn('Supabase remove fallback:', err);
    }

    const customRosters = JSON.parse(localStorage.getItem('hooplogs_custom_rosters') || '{}');
    if (customRosters[selectedTeam.id]) {
      customRosters[selectedTeam.id] = customRosters[selectedTeam.id].filter((m) => m.id !== membershipId);
      localStorage.setItem('hooplogs_custom_rosters', JSON.stringify(customRosters));
    }

    setRosterMembers((prev) => prev.filter((m) => m.id !== membershipId));
  };

  // Coach Feedback Submission
  const handleSaveFeedback = (e) => {
    e.preventDefault();
    if (!feedbackPlayer || !feedbackText.trim()) return;

    const coachName = profile?.full_name || 'Coach Kamar (AK)';
    const newReview = {
      id: `rev-${Date.now()}`,
      coachName,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      text: feedbackText.trim()
    };

    const playerId = feedbackPlayer.id;
    const existing = savedReviews[playerId] || [];
    const updated = {
      ...savedReviews,
      [playerId]: [newReview, ...existing]
    };

    setSavedReviews(updated);
    try {
      localStorage.setItem('hooplogs_player_reviews', JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not save review:', err);
    }

    setFeedbackText('');
    setFeedbackPlayer(null);
  };

  // ----------------------------------------------------
  // LEAGUE CREATION HANDLER
  // ----------------------------------------------------
  const handleCreateLeague = (e) => {
    e.preventDefault();
    if (!newLeagueName.trim()) return;

    const newLeague = {
      id: `league-${Date.now()}`,
      name: newLeagueName.trim(),
      format: newLeagueFormat,
      season: '2026 Season'
    };

    const updated = [...leagues, newLeague];
    setLeagues(updated);
    setSelectedLeagueId(newLeague.id);
    localStorage.setItem('hooplogs_leagues_v1', JSON.stringify(updated));
    setNewLeagueName('');
    setShowCreateLeagueModal(false);
  };

  // Calculate Standings Table List
  const standingsList = teams.map((team) => {
    const s = standings[team.id] || { gp: 0, wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0 };
    const gp = s.gp || 0;
    const wins = s.wins || 0;
    const losses = s.losses || 0;
    const ptsFor = s.ptsFor || 0;
    const ptsAgainst = s.ptsAgainst || 0;
    const diff = ptsFor - ptsAgainst;
    const winPct = gp > 0 ? (wins / gp).toFixed(3) : '.000';

    return {
      id: team.id,
      name: team.name,
      emblem: team.logo || team.emblem || '🏀',
      gp,
      wins,
      losses,
      ptsFor,
      ptsAgainst,
      diff,
      winPct
    };
  }).sort((a, b) => {
    if (b.winPct !== a.winPct) return parseFloat(b.winPct) - parseFloat(a.winPct);
    return b.diff - a.diff;
  });

  // ----------------------------------------------------
  // SCOREBOARD HANDLERS
  // ----------------------------------------------------
  const handleSyncGameToStorage = () => {
    const currentGames = JSON.parse(localStorage.getItem('hooplogs_league_games_v1') || '[]');
    const teamAObj = teams.find((t) => t.id === teamAId) || { name: 'Team Alpha', logo: '🦁' };
    const teamBObj = teams.find((t) => t.id === teamBId) || { name: 'Team Beta', logo: '⚡' };

    const gameObj = {
      id: gameId,
      leagueId: selectedLeagueId,
      teamAId,
      teamBId,
      teamAName: teamAObj.name,
      teamBName: teamBObj.name,
      teamAScore: scoreA,
      teamBScore: scoreB,
      quarter: period,
      date: gameDate,
      clock: formatClock(clockSeconds),
      timeoutsA,
      timeoutsB,
      foulsA,
      foulsB,
      updatedAt: new Date().toISOString()
    };

    const idx = currentGames.findIndex((g) => g.id === gameId);
    if (idx >= 0) {
      currentGames[idx] = { ...currentGames[idx], ...gameObj };
    } else {
      currentGames.unshift(gameObj);
    }
    localStorage.setItem('hooplogs_league_games_v1', JSON.stringify(currentGames));
  };

  // Finalize Scoreboard Game & Update Standings
  const handleFinalizeScoreboard = () => {
    if (!teamAId || !teamBId || teamAId === teamBId) {
      alert('Please select two distinct teams for the game.');
      return;
    }

    handleSyncGameToStorage();

    // Update standings
    const currentStandings = JSON.parse(localStorage.getItem('hooplogs_league_standings_v1') || '{}');
    const sA = currentStandings[teamAId] || { gp: 0, wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0 };
    const sB = currentStandings[teamBId] || { gp: 0, wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0 };

    const teamAWon = scoreA > scoreB;
    const teamBWon = scoreB > scoreA;

    currentStandings[teamAId] = {
      gp: sA.gp + 1,
      wins: sA.wins + (teamAWon ? 1 : 0),
      losses: sA.losses + (teamBWon ? 1 : 0),
      ptsFor: sA.ptsFor + scoreA,
      ptsAgainst: sA.ptsAgainst + scoreB
    };

    currentStandings[teamBId] = {
      gp: sB.gp + 1,
      wins: sB.wins + (teamBWon ? 1 : 0),
      losses: sB.losses + (teamAWon ? 1 : 0),
      ptsFor: sB.ptsFor + scoreB,
      ptsAgainst: sB.ptsAgainst + scoreA
    };

    setStandings(currentStandings);
    localStorage.setItem('hooplogs_league_standings_v1', JSON.stringify(currentStandings));

    setSaveSuccessMsg(`🏆 Final Game Saved! Standings & Records updated (${scoreA} - ${scoreB}).`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // ----------------------------------------------------
  // POST-GAME MANUAL STATS SAVE HANDLER
  // ----------------------------------------------------
  const handleSavePostGameStats = (e) => {
    e.preventDefault();
    if (!postGameTeamId) return;

    // Load current averages
    const currentAverages = JSON.parse(localStorage.getItem('hooplogs_player_game_averages') || '{}');

    // Update each player's season averages
    Object.entries(postGameStats).forEach(([playerId, stats]) => {
      const existing = currentAverages[playerId] || {
        ppg: '0.0',
        apg: '0.0',
        rpg: '0.0',
        spg: '0.0',
        bpg: '0.0',
        topg: '0.0',
        gp: 0
      };

      const oldGP = existing.gp || 0;
      const newGP = oldGP + 1;

      const newPPG = ((parseFloat(existing.ppg) * oldGP + (stats.pts || 0)) / newGP).toFixed(1);
      const newAPG = ((parseFloat(existing.apg) * oldGP + (stats.ast || 0)) / newGP).toFixed(1);
      const newRPG = ((parseFloat(existing.rpg) * oldGP + (stats.reb || 0)) / newGP).toFixed(1);
      const newSPG = ((parseFloat(existing.spg) * oldGP + (stats.stl || 0)) / newGP).toFixed(1);
      const newBPG = ((parseFloat(existing.bpg) * oldGP + (stats.blk || 0)) / newGP).toFixed(1);
      const newTOPG = ((parseFloat(existing.topg) * oldGP + (stats.to || 0)) / newGP).toFixed(1);

      currentAverages[playerId] = {
        ppg: newPPG,
        apg: newAPG,
        rpg: newRPG,
        spg: newSPG,
        bpg: newBPG,
        topg: newTOPG,
        gp: newGP
      };
    });

    localStorage.setItem('hooplogs_player_game_averages', JSON.stringify(currentAverages));

    setPostGameSaveSuccess('✅ Player stats successfully updated and reflected on player profiles!');
    setTimeout(() => setPostGameSaveSuccess(''), 4500);
  };

  // Statkeeper URL & QR Code
  const statkeeperUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/live-stat/${gameId}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(statkeeperUrl)}`;

  // PDF Export
  const handleExportPDF = () => {
    if (!selectedTeam) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(255, 85, 0);
    doc.text(`HOOPLOGS OFFICIAL ROSTER`, 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(`Team: ${selectedTeam.name} | Total Players: ${rosterMembers.length}`, 14, 28);

    const tableData = rosterMembers.map((m, idx) => [
      idx + 1,
      m.profiles?.full_name || 'Unknown',
      m.profiles?.nickname ? `@${m.profiles.nickname}` : '—',
      m.profiles?.gender || 'M',
      m.profiles?.position || '—',
      m.profiles?.height || '—',
      m.profiles?.whatsapp ? `+${m.profiles.whatsapp}` : '—',
      `${m.stats.accuracy_percentage}% (${m.stats.total_made}/${m.stats.total_attempted})`
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['#', 'Player Name', 'Handle', 'Gender', 'Pos', 'Height', 'WhatsApp', 'Accuracy (FG)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [255, 85, 0], textColor: [255, 255, 255] },
      styles: { fontSize: 8.5 },
    });

    doc.save(`${selectedTeam.name.replace(/\s+/g, '_')}_Roster.pdf`);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!selectedTeam) return;
    const headers = ['#', 'Name', 'Nickname', 'Gender', 'Position', 'Height', 'WhatsApp', 'Accuracy %', 'Makes', 'Attempts'];
    const rows = rosterMembers.map((m, idx) => [
      idx + 1,
      `"${m.profiles?.full_name || ''}"`,
      `"${m.profiles?.nickname || ''}"`,
      `"${m.profiles?.gender || 'Male'}"`,
      `"${m.profiles?.position || ''}"`,
      `"${m.profiles?.height || ''}"`,
      `"${m.profiles?.whatsapp || ''}"`,
      m.stats.accuracy_percentage,
      m.stats.total_made,
      m.stats.total_attempted
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedTeam.name}_roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="roster-page-wrapper">
      <SiteHeader />

      <main className="roster-main-container">
        {/* Main Title Bar */}
        <div className="roster-arena-title-bar">
          <div className="roster-title-left">
            <IoBasketball size={20} color="#ff5500" />
            <h1>Teams & Arena League</h1>
          </div>
          {isCoach && (
            <div className="admin-mode-pill admin">
              <LuShieldCheck size={13} />
              <span>ADMIN MODE</span>
            </div>
          )}
        </div>

        {/* Feature Navigation Tabs */}
        <div className="arena-nav-tabs">
          <button
            type="button"
            className={`arena-nav-tab ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            <LuUsers size={15} /> SQUADS & ROSTERS
          </button>
          <button
            type="button"
            className={`arena-nav-tab ${activeTab === 'standings' ? 'active' : ''}`}
            onClick={() => setActiveTab('standings')}
          >
            <LuTrophy size={15} /> LEAGUE STANDINGS
          </button>
          <button
            type="button"
            className={`arena-nav-tab ${activeTab === 'scoreboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('scoreboard');
              handleSyncGameToStorage();
            }}
          >
            <LuTv size={15} /> ARENA SCOREBOARD
          </button>
          {isCoach && (
            <button
              type="button"
              className={`arena-nav-tab ${activeTab === 'postgame' ? 'active' : ''}`}
              onClick={() => setActiveTab('postgame')}
            >
              <LuSave size={15} /> POST-GAME STATS
            </button>
          )}
        </div>

        {/* ========================================================
            TAB 1: SQUADS & ROSTERS
           ======================================================== */}
        {activeTab === 'teams' && (
          <>
            {/* Horizontal Teams Bar */}
            <div className="teams-horizontal-bar">
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`team-tab-btn ${selectedTeam?.id === t.id ? 'active' : ''}`}
                  onClick={() => setSelectedTeam(t)}
                >
                  <span>{t.logo || t.emblem || '🏀'} {t.name}</span>
                </button>
              ))}

              {isCoach && (
                <button
                  type="button"
                  className="team-tab-btn new-team"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  <LuPlus size={14} /> NEW TEAM
                </button>
              )}
            </div>

            {/* Create Team Form (Coach Modal / Card) */}
            {isCoach && showCreateForm && (
              <div className="create-team-banner">
                <form onSubmit={handleCreateTeam} className="create-team-form-mobile">
                  <div className="team-badge-selector-row">
                    <span className="badge-picker-label">Choose Emblem:</span>
                    <div className="badges-flex">
                      {TEAM_BADGES.map((b) => (
                        <button
                          key={b}
                          type="button"
                          className={`badge-opt-btn ${selectedBadge === b ? 'selected' : ''}`}
                          onClick={() => setSelectedBadge(b)}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="team-input-row">
                    <input
                      type="text"
                      placeholder="Team Name (e.g. Amazon Girls, Apex Ballers)"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="team-input-mobile"
                      required
                    />
                    <button type="submit" className="btn-add-team-mobile">
                      CREATE SQUAD
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Active Team Card */}
            {selectedTeam ? (
              <>
                <div className="team-details-header">
                  <div className="team-title-row">
                    <h2>{selectedTeam.logo || selectedTeam.emblem || '🏀'} {selectedTeam.name}</h2>
                    <span className="roster-count-sub">
                      {rosterMembers.length} ROSTERED
                    </span>
                  </div>

                  <div className="export-row-btns">
                    <button type="button" onClick={handleExportCSV} className="arena-export-btn csv">
                      <LuFileSpreadsheet size={14} /> <span>CSV</span>
                    </button>
                    <button type="button" onClick={handleExportPDF} className="arena-export-btn pdf">
                      <LuFileText size={14} /> <span>PDF</span>
                    </button>
                  </div>
                </div>

                {/* Division Filter Tabs */}
                <div className="gender-filter-bar">
                  <button
                    type="button"
                    className={`gender-filter-pill ${genderFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setGenderFilter('ALL')}
                  >
                    ALL ({rosterMembers.length})
                  </button>
                  <button
                    type="button"
                    className={`gender-filter-pill ${genderFilter === 'Male' ? 'active' : ''}`}
                    onClick={() => setGenderFilter('Male')}
                  >
                    MEN
                  </button>
                  <button
                    type="button"
                    className={`gender-filter-pill ${genderFilter === 'Female' ? 'active' : ''}`}
                    onClick={() => setGenderFilter('Female')}
                  >
                    WOMEN
                  </button>
                </div>

                {/* Coach Feature: Search and Add Registered Users */}
                {isCoach && (
                  <div className="admin-player-search-card">
                    <div className="search-title-bar">
                      <LuSearch size={14} color="#ff5500" />
                      <span>ADD ATHLETE TO {selectedTeam.name.toUpperCase()}</span>
                    </div>

                    <div className="search-pos-chips">
                      {POSITIONS.map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          className={`search-pos-chip ${searchPosFilter === pos ? 'active' : ''}`}
                          onClick={() => setSearchPosFilter(pos)}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Search hooper by name or nickname..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="admin-search-input"
                    />

                    {isSearching && (
                      <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                        Searching database…
                      </p>
                    )}

                    {searchResults.length > 0 && (
                      <div className="search-results-tray">
                        {searchResults.map((p) => (
                          <div key={p.id} className="search-result-row">
                            <div>
                              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>
                                {p.full_name} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({p.gender || 'M'})</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                @{p.nickname || 'hooper'} • {p.position || 'G'}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn-assign-player"
                              onClick={() => handleAddPlayer(p)}
                            >
                              + ADD
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Roster Cards Stream */}
                {rosterMembers.length === 0 ? (
                  <div className="empty-roster-state">
                    <IoBasketball size={48} color="#ff5500" />
                    <p className="empty-roster-title">NO PLAYERS ROSTERED</p>
                    {isCoach ? (
                      <p className="empty-roster-sub">Use the search box above to add registered hoopers to {selectedTeam.name}.</p>
                    ) : (
                      <p className="empty-roster-sub">Your team roster will appear here once your coach assigns players.</p>
                    )}
                  </div>
                ) : (
                  <div className="roster-players-stack">
                    {rosterMembers.map((m) => {
                      const player = m.profiles || {};
                      const cleanWa = player.whatsapp ? player.whatsapp.replace(/\D/g, '') : null;
                      const playerReviews = savedReviews[player.id] || [];

                      return (
                        <div key={m.id} className="roster-athlete-card">
                          <div className="athlete-card-left">
                            <div className="athlete-card-avatar">
                              {player.full_name?.charAt(0) || 'H'}
                            </div>
                          </div>

                          <div className="athlete-card-body">
                            <div className="athlete-top-info">
                              <div>
                                <h3 className="athlete-name">{player.full_name || 'Unnamed Athlete'}</h3>
                                <div className="athlete-meta-chips">
                                  <span className="athlete-tag-pos">{player.position || 'GUARD'}</span>
                                  <span className="athlete-tag-gender">{player.gender || 'Male'}</span>
                                  {player.height && <span className="athlete-tag-height">{player.height}</span>}
                                  {player.nickname && <span className="athlete-tag-handle">@{player.nickname}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="athlete-action-buttons">
                              {cleanWa ? (
                                <a
                                  href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(`Hey ${player.full_name}, connecting with you via HoopLogs!`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="roster-wa-btn"
                                  title="Chat on WhatsApp"
                                >
                                  <IoLogoWhatsapp size={13} color="#22c55e" />
                                  <span>WhatsApp</span>
                                </a>
                              ) : (
                                <span className="roster-wa-btn disabled">
                                  <IoLogoWhatsapp size={13} color="#64748b" />
                                  <span>No WhatsApp</span>
                                </span>
                              )}

                              {isCoach && (
                                <button
                                  type="button"
                                  className="btn-feedback-trigger"
                                  onClick={() => {
                                    setFeedbackPlayer(player);
                                    setFeedbackText('');
                                  }}
                                  title="Leave Coach Feedback / Review"
                                >
                                  <LuMessageSquare size={12} />
                                  <span>Review ({playerReviews.length})</span>
                                </button>
                              )}

                              {isCoach && (
                                <button
                                  type="button"
                                  className="btn-remove-player"
                                  onClick={() => handleRemovePlayer(m.id, player.full_name)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-roster-state">
                <IoBasketball size={48} color="#ff5500" />
                <p className="empty-roster-title">NO SQUADS AVAILABLE</p>
                {isCoach ? (
                  <p className="empty-roster-sub">Tap "+ NEW TEAM" above to start building your squad.</p>
                ) : (
                  <p className="empty-roster-sub">Your team roster will appear here once your coach assigns you to a squad.</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ========================================================
            TAB 2: LEAGUE STANDINGS TABLE (NBA / SofaScore Format)
           ======================================================== */}
        {activeTab === 'standings' && (
          <div className="league-standings-section">
            <div className="standings-header-row">
              <div>
                <span className="standings-season-tag">OFFICIAL LEAGUE TABLE</span>
                <h2 className="standings-league-title">
                  {leagues.find((l) => l.id === selectedLeagueId)?.name || 'HoopLogs Premier League'}
                </h2>
              </div>

              {isCoach && (
                <button
                  type="button"
                  className="btn-create-league"
                  onClick={() => setShowCreateLeagueModal(true)}
                >
                  <LuPlus size={14} /> NEW LEAGUE
                </button>
              )}
            </div>

            {/* Standings Table */}
            <div className="standings-table-container">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th className="th-rank">#</th>
                    <th className="th-team">TEAM</th>
                    <th>GP</th>
                    <th>W</th>
                    <th>L</th>
                    <th>PTS</th>
                    <th>DIFF</th>
                    <th>WIN%</th>
                  </tr>
                </thead>
                <tbody>
                  {standingsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No teams available in this league yet.
                      </td>
                    </tr>
                  ) : (
                    standingsList.map((t, idx) => (
                      <tr
                        key={t.id}
                        className="standings-row"
                        onClick={() => {
                          const found = teams.find((item) => item.id === t.id);
                          if (found) {
                            setSelectedTeam(found);
                            setActiveTab('teams');
                          }
                        }}
                        title={`Click to view ${t.name} roster`}
                      >
                        <td className="td-rank">
                          <span className={`rank-badge ${idx < 3 ? 'top' : ''}`}>{idx + 1}</span>
                        </td>
                        <td className="td-team">
                          <span className="team-emblem">{t.emblem}</span>
                          <span className="team-name-text">{t.name}</span>
                        </td>
                        <td className="td-num">{t.gp}</td>
                        <td className="td-num win">{t.wins}</td>
                        <td className="td-num loss">{t.losses}</td>
                        <td className="td-num">{t.ptsFor}</td>
                        <td className={`td-num diff ${t.diff >= 0 ? 'pos' : 'neg'}`}>
                          {t.diff > 0 ? `+${t.diff}` : t.diff}
                        </td>
                        <td className="td-num pct">{t.winPct}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="standings-table-hint">
              💡 Tap any team row to inspect their roster and player box scores.
            </p>
          </div>
        )}

        {/* ========================================================
            TAB 3: ARENA SCOREBOARD & LIVE STATKEEPER QR CODE
           ======================================================== */}
        {activeTab === 'scoreboard' && (
          <div className="arena-scoreboard-section">
            {/* Landscape Phone Advisory Tip */}
            <div className="scoreboard-landscape-banner">
              <LuSmartphone size={18} className="landscape-icon" />
              <span>📱 Arena Tip: Rotate your phone to landscape for the authentic full-court jumbotron scoreboard view!</span>
            </div>

            {/* Matchup Team Selectors (Admin) */}
            {isCoach && (
              <div className="matchup-selectors-bar">
                <div className="matchup-select-group">
                  <label>HOME TEAM</label>
                  <select value={teamAId} onChange={(e) => setTeamAId(e.target.value)}>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.logo || t.emblem || '🏀'} {t.name}</option>
                    ))}
                  </select>
                </div>
                <span className="matchup-vs-pill">VS</span>
                <div className="matchup-select-group">
                  <label>AWAY TEAM</label>
                  <select value={teamBId} onChange={(e) => setTeamBId(e.target.value)}>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.logo || t.emblem || '🏀'} {t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* JUMBOTRON DIGITAL SCOREBOARD */}
            <div className="jumbotron-scoreboard">
              {/* Top Banner: Date & Period */}
              <div className="jumbotron-top-bar">
                <span className="jumbotron-league-label">HOOPLOGS ARENA • {gameDate}</span>
                <div className="period-selector-row">
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`period-btn ${period === p ? 'active' : ''}`}
                      onClick={() => setPeriod(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Clock Display */}
              <div className="jumbotron-clock-wrap">
                <div className="digital-clock-face">{formatClock(clockSeconds)}</div>
                <div className="clock-controls-row">
                  <button
                    type="button"
                    className="clock-btn"
                    onClick={() => setIsClockRunning(!isClockRunning)}
                  >
                    {isClockRunning ? <LuPause size={14} /> : <LuPlay size={14} />}
                    <span>{isClockRunning ? 'PAUSE' : 'START'}</span>
                  </button>
                  <button
                    type="button"
                    className="clock-btn reset"
                    onClick={() => {
                      setIsClockRunning(false);
                      setClockSeconds(600);
                    }}
                  >
                    <LuRotateCcw size={14} />
                    <span>RESET (10:00)</span>
                  </button>
                </div>
              </div>

              {/* Scoreboard Body: Team A vs Team B */}
              <div className="jumbotron-teams-grid">
                {/* Team A */}
                <div className="jumbotron-team-col">
                  <div className="jumbotron-team-emblem">
                    {teams.find((t) => t.id === teamAId)?.logo || '🦁'}
                  </div>
                  <h3 className="jumbotron-team-name">
                    {teams.find((t) => t.id === teamAId)?.name || 'Team Alpha'}
                  </h3>
                  <div className="digital-score-display">{scoreA}</div>

                  {/* +1, +2, +3 Controls */}
                  <div className="score-control-buttons">
                    <button type="button" className="score-step-btn" onClick={() => setScoreA(s => s + 1)}>+1</button>
                    <button type="button" className="score-step-btn" onClick={() => setScoreA(s => s + 2)}>+2</button>
                    <button type="button" className="score-step-btn" onClick={() => setScoreA(s => s + 3)}>+3</button>
                    <button type="button" className="score-step-btn minus" onClick={() => setScoreA(s => Math.max(0, s - 1))}>-1</button>
                  </div>

                  <div className="team-subs-panel">
                    <div className="sub-stat-pill">
                      <span>TIMEOUTS:</span>
                      <strong>{timeoutsA}</strong>
                      <button type="button" onClick={() => setTimeoutsA(t => Math.max(0, t - 1))}>-</button>
                    </div>
                    <div className="sub-stat-pill">
                      <span>FOULS:</span>
                      <strong>{foulsA}</strong>
                      <button type="button" onClick={() => setFoulsA(f => f + 1)}>+</button>
                    </div>
                  </div>
                </div>

                {/* Scoreboard Divider */}
                <div className="jumbotron-center-divider">
                  <span className="vs-tag">VS</span>
                </div>

                {/* Team B */}
                <div className="jumbotron-team-col">
                  <div className="jumbotron-team-emblem">
                    {teams.find((t) => t.id === teamBId)?.logo || '⚡'}
                  </div>
                  <h3 className="jumbotron-team-name">
                    {teams.find((t) => t.id === teamBId)?.name || 'Team Beta'}
                  </h3>
                  <div className="digital-score-display">{scoreB}</div>

                  {/* +1, +2, +3 Controls */}
                  <div className="score-control-buttons">
                    <button type="button" className="score-step-btn" onClick={() => setScoreB(s => s + 1)}>+1</button>
                    <button type="button" className="score-step-btn" onClick={() => setScoreB(s => s + 2)}>+2</button>
                    <button type="button" className="score-step-btn" onClick={() => setScoreB(s => s + 3)}>+3</button>
                    <button type="button" className="score-step-btn minus" onClick={() => setScoreB(s => Math.max(0, s - 1))}>-1</button>
                  </div>

                  <div className="team-subs-panel">
                    <div className="sub-stat-pill">
                      <span>TIMEOUTS:</span>
                      <strong>{timeoutsB}</strong>
                      <button type="button" onClick={() => setTimeoutsB(t => Math.max(0, t - 1))}>-</button>
                    </div>
                    <div className="sub-stat-pill">
                      <span>FOULS:</span>
                      <strong>{foulsB}</strong>
                      <button type="button" onClick={() => setFoulsB(f => f + 1)}>+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="jumbotron-actions-bar">
                {isCoach && (
                  <button
                    type="button"
                    className="btn-statkeeper-qr"
                    onClick={() => {
                      handleSyncGameToStorage();
                      setShowQrModal(true);
                    }}
                  >
                    <LuQrCode size={16} /> LET SOMEONE ELSE KEEP STAT
                  </button>
                )}

                <button
                  type="button"
                  className="btn-finalize-game"
                  onClick={handleFinalizeScoreboard}
                >
                  <LuSave size={16} /> FINALIZE & UPDATE STANDINGS
                </button>
              </div>

              {saveSuccessMsg && (
                <div className="scoreboard-success-toast">
                  <LuCheck size={16} /> {saveSuccessMsg}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: POST-GAME MANUAL STATS ENTRY (Coach)
           ======================================================== */}
        {activeTab === 'postgame' && isCoach && (
          <div className="postgame-stats-section">
            <div className="postgame-header">
              <h2>Post-Game Player Box Score Entry</h2>
              <p>Select the team and opponent, then enter each player's individual points, assists, and rebounds for this game. Changes automatically update player profile season averages.</p>
            </div>

            <form onSubmit={handleSavePostGameStats} className="postgame-form">
              <div className="postgame-selectors-grid">
                <div className="postgame-field">
                  <label>Select Team</label>
                  <select value={postGameTeamId} onChange={(e) => setPostGameTeamId(e.target.value)}>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.logo || t.emblem || '🏀'} {t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="postgame-field">
                  <label>Select Opponent</label>
                  <select value={postGameOpponentId} onChange={(e) => setPostGameOpponentId(e.target.value)}>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.logo || t.emblem || '🏀'} {t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="postgame-field">
                  <label>Game Date</label>
                  <input
                    type="date"
                    value={postGameDate}
                    onChange={(e) => setPostGameDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Player Stat Rows */}
              <div className="postgame-roster-table">
                <div className="postgame-table-header">
                  <span>PLAYER</span>
                  <span>PTS</span>
                  <span>AST</span>
                  <span>REB</span>
                  <span>STL</span>
                  <span>BLK</span>
                  <span>TO</span>
                </div>

                {postGameRoster.length === 0 ? (
                  <p className="no-players-postgame">No players in this roster. Add players in the Squads tab first.</p>
                ) : (
                  postGameRoster.map((p) => {
                    const st = postGameStats[p.id] || { pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, to: 0 };
                    return (
                      <div key={p.id} className="postgame-player-row">
                        <div className="postgame-player-meta">
                          <strong>{p.name}</strong>
                          <small>@{p.nickname || 'hooper'} • {p.position}</small>
                        </div>

                        <input
                          type="number"
                          min="0"
                          value={st.pts}
                          onChange={(e) => setPostGameStats({
                            ...postGameStats,
                            [p.id]: { ...st, pts: parseInt(e.target.value) || 0 }
                          })}
                        />
                        <input
                          type="number"
                          min="0"
                          value={st.ast}
                          onChange={(e) => setPostGameStats({
                            ...postGameStats,
                            [p.id]: { ...st, ast: parseInt(e.target.value) || 0 }
                          })}
                        />
                        <input
                          type="number"
                          min="0"
                          value={st.reb}
                          onChange={(e) => setPostGameStats({
                            ...postGameStats,
                            [p.id]: { ...st, reb: parseInt(e.target.value) || 0 }
                          })}
                        />
                        <input
                          type="number"
                          min="0"
                          value={st.stl}
                          onChange={(e) => setPostGameStats({
                            ...postGameStats,
                            [p.id]: { ...st, stl: parseInt(e.target.value) || 0 }
                          })}
                        />
                        <input
                          type="number"
                          min="0"
                          value={st.blk}
                          onChange={(e) => setPostGameStats({
                            ...postGameStats,
                            [p.id]: { ...st, blk: parseInt(e.target.value) || 0 }
                          })}
                        />
                        <input
                          type="number"
                          min="0"
                          value={st.to}
                          onChange={(e) => setPostGameStats({
                            ...postGameStats,
                            [p.id]: { ...st, to: parseInt(e.target.value) || 0 }
                          })}
                        />
                      </div>
                    );
                  })
                )}
              </div>

              <button type="submit" className="btn-save-postgame">
                <LuSave size={16} /> SAVE GAME STATS & UPDATE PROFILES
              </button>

              {postGameSaveSuccess && (
                <div className="postgame-success-toast">
                  <LuCheck size={16} /> {postGameSaveSuccess}
                </div>
              )}
            </form>
          </div>
        )}
      </main>

      {/* STATKEEPER QR CODE MODAL SHEET */}
      {showQrModal && (
        <div className="feedback-modal-backdrop" onClick={() => setShowQrModal(false)}>
          <div className="feedback-modal-sheet qr-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-sheet-header">
              <div className="feedback-player-title">
                <LuQrCode size={20} color="#ff5500" />
                <h3>Live Game Statkeeper Invitation</h3>
              </div>
              <button type="button" className="feedback-close-btn" onClick={() => setShowQrModal(false)}>
                <LuX size={16} />
              </button>
            </div>

            <div className="qr-modal-body">
              <p className="qr-modal-desc">
                Have up to <strong>2 statkeepers</strong> scan this QR code on their phones. They will log in, select one team to track, and log live points, assists, and rebounds!
              </p>

              <div className="qr-code-display-wrap">
                <img src={qrCodeImageUrl} alt="Statkeeper QR Code" className="qr-code-img" />
              </div>

              <div className="qr-link-copy-box">
                <input type="text" readOnly value={statkeeperUrl} className="qr-link-input" />
                <button
                  type="button"
                  className="btn-copy-qr-link"
                  onClick={() => {
                    navigator.clipboard.writeText(statkeeperUrl);
                    setQrCopied(true);
                    setTimeout(() => setQrCopied(false), 3000);
                  }}
                >
                  {qrCopied ? <LuCheck size={14} /> : <LuCopy size={14} />}
                  <span>{qrCopied ? 'COPIED!' : 'COPY'}</span>
                </button>
              </div>

              <div className="qr-modal-rules-card">
                <span className="rules-title">STATKEEPER RULES:</span>
                <ul>
                  <li>Maximum 2 statkeepers at the same time.</li>
                  <li>Once Statkeeper 1 claims Team A, Team A is locked and Statkeeper 2 can only claim Team B.</li>
                  <li>All stats synchronize directly to the match record and player profile season averages upon save.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE LEAGUE MODAL */}
      {showCreateLeagueModal && (
        <div className="feedback-modal-backdrop" onClick={() => setShowCreateLeagueModal(false)}>
          <div className="feedback-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-sheet-header">
              <div className="feedback-player-title">
                <LuTrophy size={18} color="#ff5500" />
                <h3>Create New League</h3>
              </div>
              <button type="button" className="feedback-close-btn" onClick={() => setShowCreateLeagueModal(false)}>
                <LuX size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLeague} className="create-league-form">
              <label>League / Tournament Name</label>
              <input
                type="text"
                placeholder="e.g. HoopLogs Premier League 2026"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                required
              />

              <label>Game Format</label>
              <select
                value={newLeagueFormat}
                onChange={(e) => setNewLeagueFormat(e.target.value)}
              >
                <option value="4 Quarters (10 min)">4 Quarters (10 min)</option>
                <option value="4 Quarters (12 min)">4 Quarters (12 min)</option>
                <option value="2 Halves (20 min)">2 Halves (20 min)</option>
              </select>

              <button type="submit" className="btn-submit-feedback">
                <LuPlus size={14} /> Create League & Standings
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COACH FEEDBACK / SCOUTING MODAL SHEET */}
      {feedbackPlayer && (
        <div className="feedback-modal-backdrop" onClick={() => setFeedbackPlayer(null)}>
          <div className="feedback-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-sheet-header">
              <div className="feedback-player-title">
                <LuMessageSquare size={18} color="#ff5500" />
                <h3>Coach Review for {feedbackPlayer.full_name}</h3>
              </div>
              <button type="button" className="feedback-close-btn" onClick={() => setFeedbackPlayer(null)}>
                <LuX size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFeedback} className="feedback-input-form">
              <textarea
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Log shooting form adjustments, training notes, or scouting feedback..."
                className="feedback-textarea"
                required
              />

              <button type="submit" className="btn-submit-feedback">
                <LuSend size={13} /> Save & Send Feedback
              </button>
            </form>

            <div className="previous-reviews-container">
              <span className="reviews-list-title">PAST REVIEWS:</span>
              {(savedReviews[feedbackPlayer.id] || []).length === 0 ? (
                <p className="no-reviews-note">No coach feedback logged yet for this player.</p>
              ) : (
                <div className="reviews-list-stream">
                  {(savedReviews[feedbackPlayer.id] || []).map((rev) => (
                    <div key={rev.id} className="review-bubble">
                      <div className="review-bubble-header">
                        <span className="review-author">{rev.coachName}</span>
                        <span className="review-date">{rev.date}</span>
                      </div>
                      <p className="review-body">{rev.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
