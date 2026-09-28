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
  LuSmartphone,
  LuArrowLeft
} from 'react-icons/lu';
import { IoBasketball, IoLogoWhatsapp } from 'react-icons/io5';
import {
  fetchUnifiedHoopers,
  assignPlayerToTeam,
  createTeamWithLeague,
  saveGameBoxScores
} from '../services/basketballCommunityService';
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
  const [selectedLeagueIdForNewTeam, setSelectedLeagueIdForNewTeam] = useState('main-league');
  const [teamViewMode, setTeamViewMode] = useState('roster'); // 'roster' | 'games'
  const [sectionLoading, setSectionLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Generate dynamic round-robin league schedule for all real teams in selectedTeam's league (NO dummy data)
  const getLeagueSchedule = (targetTeam) => {
    if (!targetTeam) return { nextGames: [], pastGames: [], leagueTeams: [], isSingleTeam: true };
    const targetLeagueId = targetTeam.league_id || targetTeam.leagueId || 'main-league';
    const leagueTeams = teams.filter((t) => (t.league_id || t.leagueId || 'main-league') === targetLeagueId);

    if (leagueTeams.length < 2) {
      return { nextGames: [], pastGames: [], leagueTeams, isSingleTeam: true };
    }

    const allMatches = [];
    let day = 1;

    for (let i = 0; i < leagueTeams.length; i++) {
      for (let j = i + 1; j < leagueTeams.length; j++) {
        const home = leagueTeams[i];
        const away = leagueTeams[j];
        const gameKey = `league_game_${home.id}_vs_${away.id}`;

        let saved = null;
        try {
          const scoresMap = JSON.parse(localStorage.getItem('hooplogs_league_game_scores') || '{}');
          saved = scoresMap[gameKey] || null;
        } catch (_) {}

        allMatches.push({
          id: gameKey,
          matchday: `Matchday ${day++}`,
          home,
          away,
          isCurrentTeam: home.id === targetTeam.id || away.id === targetTeam.id,
          completed: Boolean(saved),
          scoreHome: saved ? saved.scoreA : null,
          scoreAway: saved ? saved.scoreB : null,
          date: saved?.date || 'Upcoming Match',
          time: '6:00 PM',
          court: 'Arena Court 1'
        });
      }
    }

    const teamMatches = allMatches.filter((m) => m.isCurrentTeam);
    const nextGames = teamMatches.filter((m) => !m.completed);
    const pastGames = teamMatches.filter((m) => m.completed);

    return { nextGames, pastGames, leagueTeams, isSingleTeam: false };
  };

  // Global Player Search state (Admin Feature)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPosFilter, setSearchPosFilter] = useState('ALL');
  const [searchGenderFilter, setSearchGenderFilter] = useState('ALL'); // 'ALL' | 'Male' | 'Female'
  const [addingPlayerId, setAddingPlayerId] = useState(null);
  const [addedSuccessId, setAddedSuccessId] = useState(null);

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

      // A. Supabase Live Teams
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

      // B. Check localStorage for custom teams (purging Varsity Squad)
      let localCustom = [];
      try {
        const raw = localStorage.getItem('hooplogs_custom_teams');
        if (raw) {
          const parsed = JSON.parse(raw);
          localCustom = parsed.filter((t) => t && t.name && !t.name.toLowerCase().includes('varsity'));
          localStorage.setItem('hooplogs_custom_teams', JSON.stringify(localCustom));
        }
      } catch (_) {}

      const combinedMap = new Map();
      [...loadedTeams, ...localCustom].forEach((t) => {
        if (!combinedMap.has(t.id) && !t.name?.toLowerCase().includes('varsity')) {
          combinedMap.set(t.id, t);
        }
      });

      const finalTeams = Array.from(combinedMap.values());
      setTeams(finalTeams);

      if (finalTeams.length > 0) {
        if (selectedTeam && selectedTeam.name?.toLowerCase().includes('varsity')) {
          setSelectedTeam(null);
        }
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

      // A. Fetch Supabase profiles map (Source of truth for hooper names)
      const profileMap = new Map();
      try {
        const { data: profs } = await supabase.from('profiles').select('*');
        if (profs) {
          profs.forEach((p) => profileMap.set(p.id, p));
        }
      } catch (pErr) {
        console.warn('Profiles map error:', pErr);
      }

      // B. Fetch from Supabase team_members
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('id, team_id, player_id, joined_at')
          .eq('team_id', teamId);

        if (!error && data && data.length > 0) {
          members = data.map((m) => ({
            ...m,
            user_id: m.player_id || m.user_id
          }));
        }
      } catch (sbErr) {
        console.warn('Supabase fetch roster fallback:', sbErr);
      }

      // C. Merge with custom local rosters & heal any missing profile data
      const localRosters = JSON.parse(localStorage.getItem('hooplogs_custom_rosters') || '{}');
      const teamCustom = localRosters[teamId] || [];

      // Fetch unified hoopers to get real season/career game stats
      let statsLookup = new Map();
      try {
        const hoopers = await fetchUnifiedHoopers();
        hoopers.forEach((h) => statsLookup.set(h.id || h.user_id, h));
      } catch (e) {}

      const memberMap = new Map();
      [...members, ...teamCustom].forEach((m) => {
        const uId = m.player_id || m.user_id || m.id;
        if (uId && !memberMap.has(uId)) {
          const prof = profileMap.get(uId) || m.profiles || m || {};
          const s = statsLookup.get(uId) || {};
          const cleanProfile = {
            id: uId,
            full_name: prof.full_name || prof.name || m.full_name || m.name || 'Hooper',
            nickname: prof.nickname || m.nickname || '',
            position: prof.position || m.position || 'GUARD',
            gender: prof.gender || m.gender || 'Male',
            height: prof.height || m.height || '—',
            whatsapp: prof.whatsapp || m.whatsapp || '',
            avatar_url: prof.avatar_url || m.avatar_url || null
          };

          memberMap.set(uId, {
            id: m.id || `mem-${uId}`,
            team_id: teamId,
            user_id: uId,
            player_id: uId,
            joined_at: m.joined_at || new Date().toISOString(),
            profiles: cleanProfile,
            stats: {
              ppg: typeof s.ppg === 'number' ? s.ppg : parseFloat(s.ppg || 0),
              rpg: typeof s.rpg === 'number' ? s.rpg : parseFloat(s.rpg || 0),
              apg: typeof s.apg === 'number' ? s.apg : parseFloat(s.apg || 0),
              spg: typeof s.spg === 'number' ? s.spg : parseFloat(s.spg || 0),
              bpg: typeof s.bpg === 'number' ? s.bpg : parseFloat(s.bpg || 0),
              gp: typeof s.gp === 'number' ? s.gp : parseInt(s.gp || 0, 10),
              accuracy_percentage: s.accuracy_percentage || 0,
            },
          });
        }
      });

      const enriched = Array.from(memberMap.values());
      // Self-heal localStorage so unnamed athlete never persists
      try {
        localRosters[teamId] = enriched;
        localStorage.setItem('hooplogs_custom_rosters', JSON.stringify(localRosters));
      } catch (_) {}

      setRosterMembers(enriched);
    } catch (err) {
      console.error('Fetch roster members catch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Leagues and Standings from Supabase & localStorage
  useEffect(() => {
    const loadStandingsData = async () => {
      try {
        const storedLeagues = localStorage.getItem('hooplogs_leagues_v1');
        if (storedLeagues) setLeagues(JSON.parse(storedLeagues));

        const standingsMap = JSON.parse(localStorage.getItem('hooplogs_league_standings_v1') || '{}');
        delete standingsMap['team-1790431461390']; // Eradicate Varsity Squad

        // Live Supabase league_standings
        try {
          const { data } = await supabase.from('league_standings').select('*');
          if (data) {
            data.forEach((row) => {
              if (row.team_id !== 'team-1790431461390' && !row.team_name?.toLowerCase().includes('varsity')) {
                standingsMap[row.team_id] = {
                  ...row,
                  id: row.team_id,
                  teamName: row.team_name,
                  wins: row.wins,
                  losses: row.losses,
                  gp: row.gp
                };
              }
            });
          }
        } catch (e) {
          console.warn('Supabase league_standings fetch notice:', e);
        }

        setStandings(standingsMap);

        const storedReviews = localStorage.getItem('hooplogs_player_reviews');
        if (storedReviews) setSavedReviews(JSON.parse(storedReviews));
      } catch (e) {}
    };

    loadStandingsData();
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedTeam?.id) {
      fetchRosterMembers(selectedTeam.id);
    }
  }, [selectedTeam, fetchRosterMembers]);

  // 3. Search Users to Add (Coach Feature) - Supabase with Gender and Position filters
  useEffect(() => {
    if (!isCoach) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const allHoopers = await fetchUnifiedHoopers();
        const currentMemberIds = new Set(rosterMembers.map((m) => m.user_id || m.id));
        const q = searchQuery.toLowerCase().trim();

        const filtered = allHoopers.filter((p) => {
          const id = p.id || p.user_id;
          if (currentMemberIds.has(id)) return false;

          // Gender filter
          if (searchGenderFilter === 'Male') {
            const g = (p.gender || '').toLowerCase();
            const isMale = g === 'male' || g === 'm' || g === 'men';
            if (!isMale) return false;
          } else if (searchGenderFilter === 'Female') {
            const g = (p.gender || '').toLowerCase();
            const isFemale = g === 'female' || g === 'f' || g === 'women';
            if (!isFemale) return false;
          }

          // Position filter
          if (searchPosFilter && searchPosFilter !== 'ALL') {
            const pos = (p.position || '').toUpperCase();
            if (!pos.includes(searchPosFilter.toUpperCase())) return false;
          }

          // Text query filter
          if (q) {
            const nameMatch = p.full_name && p.full_name.toLowerCase().includes(q);
            const nickMatch = p.nickname && p.nickname.toLowerCase().includes(q);
            const posMatch = p.position && p.position.toLowerCase().includes(q);
            if (!nameMatch && !nickMatch && !posMatch) return false;
          }

          return true;
        });

        setSearchResults(filtered.slice(0, 15));
      } catch (err) {
        console.error('Player search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, searchGenderFilter, searchPosFilter, isCoach, rosterMembers]);

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

    try {
      const created = await createTeamWithLeague({
        name: newTeamName.trim(),
        logo: selectedBadge,
        emblem: selectedBadge,
        coach_name: profile?.full_name || 'Coach',
        coach_id: user?.id || null
      }, selectedLeagueIdForNewTeam);

      setTeams((prev) => [created, ...prev]);
      setSelectedTeam(created);
      setNewTeamName('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating team with league:', err);
    }
  };

  const handleAddPlayer = async (playerProfile) => {
    if (!selectedTeam) return;
    const pId = playerProfile.id || playerProfile.user_id;
    if (!pId) return;

    if (addingPlayerId) return; // Prevent duplicate rapid clicks
    setAddingPlayerId(pId);

    try {
      // 1. Check if athlete is ALREADY on this team
      const alreadyOnTeam = rosterMembers.some((m) => (m.user_id === pId || m.player_id === pId || m.id === pId));
      if (alreadyOnTeam) {
        alert(`${playerProfile.full_name || 'This hooper'} is already rostered on ${selectedTeam.name}.`);
        setAddingPlayerId(null);
        return;
      }

      // 2. LEAGUE CONSTRAINT CHECK:
      // "a player can belong to different teams but he cant belong to different team in a particular league.."
      const targetLeagueId = selectedTeam.league_id || selectedTeam.leagueId || 'main-league';
      const teamsInSameLeague = teams.filter(
        (t) => t.id !== selectedTeam.id && (t.league_id || t.leagueId || 'main-league') === targetLeagueId
      );

      // Check localStorage custom rosters for conflicting team in same league
      const customRosters = JSON.parse(localStorage.getItem('hooplogs_custom_rosters') || '{}');
      let conflictingTeam = null;

      for (const otherTeam of teamsInSameLeague) {
        const otherRoster = customRosters[otherTeam.id] || [];
        if (otherRoster.some((m) => (m.user_id === pId || m.player_id === pId || m.id === pId))) {
          conflictingTeam = otherTeam;
          break;
        }
      }

      // Also check Supabase team_members for other teams in this league
      if (!conflictingTeam && teamsInSameLeague.length > 0) {
        try {
          const otherIds = teamsInSameLeague.map((t) => t.id);
          const { data: existingMemberships } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('player_id', pId)
            .in('team_id', otherIds);

          if (existingMemberships && existingMemberships.length > 0) {
            const foundId = existingMemberships[0].team_id;
            conflictingTeam = teamsInSameLeague.find((t) => t.id === foundId);
          }
        } catch (checkErr) {
          console.warn('League membership check notice:', checkErr);
        }
      }

      if (conflictingTeam) {
        alert(
          `Cannot add ${playerProfile.full_name || 'this hooper'}: They are already playing for "${conflictingTeam.name}" in this league.\n\nHoopLogs Rule: An athlete can play for teams in different leagues, but cannot belong to two different teams in the same league.`
        );
        setAddingPlayerId(null);
        return;
      }

      // 3. Persist team assignment across Supabase and LocalStorage
      await assignPlayerToTeam(pId, selectedTeam.id, selectedTeam.name, playerProfile);

      // 4. Update UI with full profile metadata
      const cleanProfile = {
        id: pId,
        full_name: playerProfile.full_name || 'Hooper',
        nickname: playerProfile.nickname || '',
        position: playerProfile.position || 'GUARD',
        gender: playerProfile.gender || 'Male',
        height: playerProfile.height || '—',
        whatsapp: playerProfile.whatsapp || '',
        avatar_url: playerProfile.avatar_url || null
      };

      const newMember = {
        id: `mem-${Date.now()}-${pId}`,
        team_id: selectedTeam.id,
        user_id: pId,
        player_id: pId,
        joined_at: new Date().toISOString(),
        profiles: cleanProfile,
        stats: { total_made: 0, total_attempted: 0, accuracy_percentage: 0 }
      };

      setRosterMembers((prev) => [...prev, newMember]);
      setAddedSuccessId(pId);

      // Show success checkmark for 1 second, then clear and remove from search list
      setTimeout(() => {
        setAddedSuccessId(null);
        setAddingPlayerId(null);
        setSearchResults((prev) => prev.filter((p) => (p.id || p.user_id) !== pId));
      }, 1000);
    } catch (err) {
      console.error('Error adding player:', err);
      setAddingPlayerId(null);
    }
  };

  const handleRemovePlayer = async (membershipId, playerName, userId) => {
    if (!window.confirm(`Remove ${playerName || 'this player'} from ${selectedTeam.name}?`)) {
      return;
    }

    try {
      if (membershipId && !String(membershipId).startsWith('mem-')) {
        await supabase.from('team_members').delete().eq('id', membershipId);
      }
      if (userId) {
        await supabase.from('team_members').delete().match({ team_id: selectedTeam.id, player_id: userId });
      }
    } catch (err) {
      console.warn('Supabase remove fallback:', err);
    }

    const customRosters = JSON.parse(localStorage.getItem('hooplogs_custom_rosters') || '{}');
    if (customRosters[selectedTeam.id]) {
      customRosters[selectedTeam.id] = customRosters[selectedTeam.id].filter(
        (m) => m.id !== membershipId && (m.user_id || m.player_id) !== userId
      );
      localStorage.setItem('hooplogs_custom_rosters', JSON.stringify(customRosters));
    }

    setRosterMembers((prev) => prev.filter((m) => m.id !== membershipId && (m.user_id || m.player_id) !== userId));
  };

  // Coach Feedback Submission
  const handleSaveFeedback = (e) => {
    e.preventDefault();
    if (!feedbackPlayer || !feedbackText.trim()) return;

    const coachName = profile?.full_name || 'Coach';
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
  const handleSavePostGameStats = async (e) => {
    e.preventDefault();
    if (!postGameTeamId) return;

    const teamObj = teams.find((t) => t.id === postGameTeamId) || { name: 'Squad' };

    try {
      await saveGameBoxScores(gameId || `game-${Date.now()}`, postGameTeamId, teamObj.name, postGameStats);
      setPostGameSaveSuccess('✅ Player stats successfully updated and reflected on player profiles!');
      setTimeout(() => setPostGameSaveSuccess(''), 4500);
    } catch (err) {
      console.error('Error saving post-game box scores:', err);
      setPostGameSaveSuccess('⚠️ Stats saved locally.');
      setTimeout(() => setPostGameSaveSuccess(''), 3500);
    }
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
            {/* If no squad is selected, show the clean Teams Directory */}
            {!selectedTeam ? (
              <div className="teams-directory-wrapper">
                <div className="teams-directory-header">
                  <div className="teams-directory-title-area">
                    <div className="teams-directory-icon">🏀</div>
                    <div>
                      <h2 className="teams-directory-title">LEAGUE SQUADS & TEAMS</h2>
                      <p className="teams-directory-sub">
                        Select any squad to inspect their roster, player career stats across all games, and dynamic league schedule.
                      </p>
                    </div>
                  </div>

                  {isCoach && (
                    <button
                      type="button"
                      className="btn-create-team-trigger"
                      onClick={() => setShowCreateForm(!showCreateForm)}
                    >
                      <LuPlus size={16} /> <span>{showCreateForm ? 'CLOSE FORM' : 'NEW SQUAD'}</span>
                    </button>
                  )}
                </div>

                {/* Create Team Form (Coach) */}
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

                      <div className="team-league-selector-row" style={{ marginTop: '8px', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ff5500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <LuTrophy size={13} /> ADD TO LEAGUE & STANDINGS:
                        </label>
                        <select
                          value={selectedLeagueIdForNewTeam}
                          onChange={(e) => setSelectedLeagueIdForNewTeam(e.target.value)}
                          className="team-league-select"
                          style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.35)',
                            border: '1.5px solid rgba(255,255,255,0.15)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            color: '#fff',
                            fontSize: '0.82rem',
                            fontWeight: '700',
                            outline: 'none',
                            marginTop: '4px'
                          }}
                        >
                          <option value="main-league">🏆 Main Arena League (Active Standings)</option>
                          {leagues.map((l) => (
                            <option key={l.id} value={l.id}>🏆 {l.name} ({l.season || '2026'})</option>
                          ))}
                        </select>
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

                {/* Grid of All Registered Squads */}
                {teams.length === 0 ? (
                  <div className="empty-roster-state">
                    <IoBasketball size={48} color="#ff5500" />
                    <p className="empty-roster-title">NO SQUADS REGISTERED YET</p>
                    {isCoach ? (
                      <p className="empty-roster-sub">Tap "+ NEW SQUAD" above to create your team and join the league.</p>
                    ) : (
                      <p className="empty-roster-sub">Squads created by coaches will appear here with rosters and league schedules.</p>
                    )}
                  </div>
                ) : (
                  <div className="teams-directory-grid">
                    {teams.map((t) => {
                      const targetLeagueId = t.league_id || t.leagueId || 'main-league';
                      const leagueObj = leagues.find((l) => l.id === targetLeagueId);
                      const leagueName = leagueObj ? leagueObj.name : 'Main Arena League';

                      let rosterCount = 0;
                      try {
                        const localRosters = JSON.parse(localStorage.getItem('hooplogs_custom_rosters') || '{}');
                        rosterCount = (localRosters[t.id] || []).length;
                      } catch (_) {}

                      return (
                        <div
                          key={t.id}
                          className="team-directory-card"
                          onClick={() => {
                            setSelectedTeam(t);
                            setTeamViewMode('roster');
                          }}
                        >
                          <div className="team-directory-card-top">
                            <div className="team-directory-emblem">
                              {t.logo || t.emblem || '🏀'}
                            </div>
                            <div className="team-directory-info">
                              <h3 className="team-directory-name">{t.name}</h3>
                              <span className="team-directory-league">
                                <LuTrophy size={12} color="#ff5500" /> {leagueName}
                              </span>
                            </div>
                          </div>

                          <div className="team-directory-meta-strip">
                            <span className="team-roster-count-badge">
                              <LuUsers size={13} /> {rosterCount > 0 ? `${rosterCount} Rostered` : 'Squad Open'}
                            </span>
                            <span className="team-card-open-link">
                              View Squad & Games →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Team Detailed View */
              <>
                {/* Back to All Teams Navigation & Quick Switcher */}
                <div className="team-nav-switcher-bar">
                  <button
                    type="button"
                    className="btn-back-to-all-teams"
                    onClick={() => setSelectedTeam(null)}
                  >
                    <LuArrowLeft size={16} /> <span>ALL TEAMS</span>
                  </button>

                  <div className="team-quick-switcher-row">
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`team-quick-tab-pill ${selectedTeam.id === t.id ? 'active' : ''}`}
                        onClick={() => setSelectedTeam(t)}
                      >
                        {t.logo || t.emblem || '🏀'} {t.name}
                      </button>
                    ))}

                    {isCoach && (
                      <button
                        type="button"
                        className="team-quick-tab-pill new-squad"
                        onClick={() => setShowCreateForm(!showCreateForm)}
                      >
                        <LuPlus size={13} /> SQUAD
                      </button>
                    )}
                  </div>
                </div>

                {/* Create Team Form (Coach inside team view) */}
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

                      <div className="team-league-selector-row" style={{ marginTop: '8px', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ff5500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <LuTrophy size={13} /> ADD TO LEAGUE & STANDINGS:
                        </label>
                        <select
                          value={selectedLeagueIdForNewTeam}
                          onChange={(e) => setSelectedLeagueIdForNewTeam(e.target.value)}
                          className="team-league-select"
                          style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.35)',
                            border: '1.5px solid rgba(255,255,255,0.15)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            color: '#fff',
                            fontSize: '0.82rem',
                            fontWeight: '700',
                            outline: 'none',
                            marginTop: '4px'
                          }}
                        >
                          <option value="main-league">🏆 Main Arena League (Active Standings)</option>
                          {leagues.map((l) => (
                            <option key={l.id} value={l.id}>🏆 {l.name} ({l.season || '2026'})</option>
                          ))}
                        </select>
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

                {/* Team Details Banner Header */}
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

                {/* Sub-View Tabs: SQUAD ROSTER & STATS vs LEAGUE GAMES & SCHEDULE */}
                <div className="team-view-mode-bar">
                  <button
                    type="button"
                    className={`team-mode-tab-btn ${teamViewMode === 'roster' ? 'active' : ''}`}
                    onClick={() => setTeamViewMode('roster')}
                  >
                    <LuUsers size={15} />
                    <span>SQUAD ROSTER & STATS ({rosterMembers.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`team-mode-tab-btn ${teamViewMode === 'games' ? 'active' : ''}`}
                    onClick={() => setTeamViewMode('games')}
                  >
                    <LuCalendar size={15} />
                    <span>LEAGUE GAMES & SCHEDULE</span>
                  </button>
                </div>

                {/* ========================================================
                    SUB-TAB A: SQUAD ROSTER & PLAYER STATS
                   ======================================================== */}
                {teamViewMode === 'roster' && (
                  <>
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

                        <div className="search-filter-controls">
                          {/* Gender Selector: ALL / MALE / FEMALE */}
                          <div className="search-filter-group">
                            <span className="search-filter-label">GENDER:</span>
                            <div className="search-filter-btn-group">
                              <button
                                type="button"
                                className={`search-gender-pill ${searchGenderFilter === 'ALL' ? 'active' : ''}`}
                                onClick={() => setSearchGenderFilter('ALL')}
                              >
                                ALL
                              </button>
                              <button
                                type="button"
                                className={`search-gender-pill male ${searchGenderFilter === 'Male' ? 'active' : ''}`}
                                onClick={() => setSearchGenderFilter('Male')}
                              >
                                MALE (M)
                              </button>
                              <button
                                type="button"
                                className={`search-gender-pill female ${searchGenderFilter === 'Female' ? 'active' : ''}`}
                                onClick={() => setSearchGenderFilter('Female')}
                              >
                                FEMALE (F)
                              </button>
                            </div>
                          </div>

                          {/* Position Filter */}
                          <div className="search-filter-group">
                            <span className="search-filter-label">POSITION:</span>
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
                          </div>
                        </div>

                        <input
                          type="text"
                          placeholder="Search hooper by name or @nickname..."
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
                            {searchResults.map((p) => {
                              const isFem = (p.gender || '').toLowerCase() === 'female' || (p.gender || '').toLowerCase() === 'women' || (p.gender || '').toLowerCase() === 'f';
                              return (
                                <div key={p.id} className="search-result-row">
                                  <div className="search-result-info">
                                    <div className="search-result-name-line">
                                      <span className="search-player-name">{p.full_name}</span>
                                      <span className={`search-gender-tag ${isFem ? 'female' : 'male'}`}>
                                        {isFem ? 'FEMALE (F)' : 'MALE (M)'}
                                      </span>
                                    </div>
                                    <div className="search-result-subinfo">
                                      @{p.nickname || 'hooper'} • {p.position || 'G'} {p.height && p.height !== '—' ? `• ${p.height}` : ''}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className={`btn-assign-player ${addingPlayerId === (p.id || p.user_id) ? 'loading' : ''} ${addedSuccessId === (p.id || p.user_id) ? 'success' : ''}`}
                                    disabled={Boolean(addingPlayerId)}
                                    onClick={() => handleAddPlayer(p)}
                                  >
                                    {addingPlayerId === (p.id || p.user_id) ? (
                                      <span className="btn-spinner" />
                                    ) : addedSuccessId === (p.id || p.user_id) ? (
                                      <span>✓ ADDED</span>
                                    ) : (
                                      <span>+ ADD</span>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Roster Cards Stream with Filter and Career Stats across all games */}
                    {(() => {
                      const filteredMembers = rosterMembers.filter((m) => {
                        if (genderFilter === 'ALL') return true;
                        const player = m.profiles || m || {};
                        const g = (player.gender || m.gender || '').toLowerCase();
                        if (genderFilter === 'Male') return g === 'male' || g === 'm' || g === 'men';
                        if (genderFilter === 'Female') return g === 'female' || g === 'f' || g === 'women';
                        return true;
                      });

                      if (filteredMembers.length === 0) {
                        return (
                          <div className="empty-roster-state">
                            <IoBasketball size={48} color="#ff5500" />
                            <p className="empty-roster-title">NO PLAYERS ROSTERED</p>
                            {isCoach ? (
                              <p className="empty-roster-sub">Use the search box above to add registered hoopers to {selectedTeam.name}.</p>
                            ) : (
                              <p className="empty-roster-sub">Your team roster will appear here once your coach assigns players.</p>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="roster-players-stack">
                          {filteredMembers.map((m) => {
                            const player = m.profiles || m || {};
                            const athleteDisplayName = player.full_name || player.name || m.full_name || m.name || 'Hooper';
                            const athletePos = player.position || m.position || 'GUARD';
                            const athleteGender = player.gender || m.gender || 'Male';
                            const athleteHandle = player.nickname || m.nickname || '';
                            const athleteInitial = athleteDisplayName.charAt(0) || 'H';
                            const playerReviews = savedReviews[player.id || m.user_id || m.id] || [];

                            // Career stats across all games
                            const stats = m.stats || player.stats || {
                              ppg: player.ppg || 0,
                              rpg: player.rpg || 0,
                              apg: player.apg || 0,
                              spg: player.spg || 0,
                              bpg: player.bpg || 0,
                              gp: player.gp || 0,
                              accuracy_percentage: player.accuracy_percentage || 0
                            };

                            const ppg = typeof stats.ppg === 'number' ? stats.ppg.toFixed(1) : parseFloat(stats.ppg || 0).toFixed(1);
                            const rpg = typeof stats.rpg === 'number' ? stats.rpg.toFixed(1) : parseFloat(stats.rpg || 0).toFixed(1);
                            const apg = typeof stats.apg === 'number' ? stats.apg.toFixed(1) : parseFloat(stats.apg || 0).toFixed(1);
                            const spg = typeof stats.spg === 'number' ? stats.spg.toFixed(1) : parseFloat(stats.spg || 0).toFixed(1);
                            const bpg = typeof stats.bpg === 'number' ? stats.bpg.toFixed(1) : parseFloat(stats.bpg || 0).toFixed(1);
                            const gp = stats.gp || 0;
                            const fgPct = stats.accuracy_percentage ? `${stats.accuracy_percentage}%` : '—';

                            return (
                              <div key={m.id} className="roster-athlete-card">
                                <div className="athlete-card-left">
                                  {player.avatar_url ? (
                                    <img
                                      src={player.avatar_url}
                                      alt={athleteDisplayName}
                                      className="athlete-card-avatar-img"
                                    />
                                  ) : (
                                    <div className="athlete-card-avatar">
                                      {athleteInitial}
                                    </div>
                                  )}
                                </div>

                                <div className="athlete-card-body">
                                  <div className="athlete-top-info">
                                    <div>
                                      <h3 className="athlete-name">{athleteDisplayName}</h3>
                                      <div className="athlete-meta-chips">
                                        <span className="athlete-tag-pos">{athletePos}</span>
                                        <span className="athlete-tag-gender">{athleteGender}</span>
                                        {player.height && player.height !== '—' && (
                                          <span className="athlete-tag-height">{player.height}</span>
                                        )}
                                        {player.weight && player.weight !== '—' && (
                                          <span className="athlete-tag-height">{player.weight}</span>
                                        )}
                                        {athleteHandle && <span className="athlete-tag-handle">@{athleteHandle}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Career stats across all games played */}
                                  <div className="roster-career-stats-bar">
                                    <div className="roster-stat-unit">
                                      <span className="roster-stat-val">{ppg}</span>
                                      <span className="roster-stat-lbl">PPG</span>
                                    </div>
                                    <div className="roster-stat-unit">
                                      <span className="roster-stat-val">{rpg}</span>
                                      <span className="roster-stat-lbl">RPG</span>
                                    </div>
                                    <div className="roster-stat-unit">
                                      <span className="roster-stat-val">{apg}</span>
                                      <span className="roster-stat-lbl">APG</span>
                                    </div>
                                    <div className="roster-stat-unit">
                                      <span className="roster-stat-val">{spg}</span>
                                      <span className="roster-stat-lbl">SPG</span>
                                    </div>
                                    <div className="roster-stat-unit">
                                      <span className="roster-stat-val">{bpg}</span>
                                      <span className="roster-stat-lbl">BPG</span>
                                    </div>
                                    <div className="roster-stat-unit">
                                      <span className="roster-stat-val">{gp}</span>
                                      <span className="roster-stat-lbl">GP</span>
                                    </div>
                                    <div className="roster-stat-unit">
                                      <span className="roster-stat-val">{fgPct}</span>
                                      <span className="roster-stat-lbl">FG%</span>
                                    </div>
                                  </div>

                                  {/* Coach Actions (WhatsApp removed here per specification) */}
                                  {isCoach && (
                                    <div className="athlete-action-buttons">
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

                                      <button
                                        type="button"
                                        className="btn-remove-player"
                                        onClick={() => handleRemovePlayer(m.id, athleteDisplayName, m.user_id || m.player_id)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* ========================================================
                    SUB-TAB B: LEAGUE GAMES & DYNAMIC ROUND-ROBIN SCHEDULE
                   ======================================================== */}
                {teamViewMode === 'games' && (() => {
                  const { nextGames, pastGames, leagueTeams, isSingleTeam } = getLeagueSchedule(selectedTeam);
                  const targetLeagueId = selectedTeam.league_id || selectedTeam.leagueId || 'main-league';
                  const leagueObj = leagues.find((l) => l.id === targetLeagueId);
                  const leagueName = leagueObj ? leagueObj.name : 'Main Arena League';

                  return (
                    <div className="league-schedule-view">
                      <div className="schedule-header-card">
                        <div className="schedule-header-info">
                          <div className="schedule-league-pill">
                            <LuTrophy size={14} /> {leagueName} Format
                          </div>
                          <h3 className="schedule-title">Dynamic Round-Robin Schedule</h3>
                          <p className="schedule-subtitle">
                            Auto-generated league match fixtures for all registered squads in this division. (Zero dummy data).
                          </p>
                        </div>
                        <div className="schedule-squads-count-badge">
                          <span className="count-num">{leagueTeams.length}</span>
                          <span className="count-lbl">Squads</span>
                        </div>
                      </div>

                      {isSingleTeam ? (
                        <div className="single-team-league-notice">
                          <IoBasketball size={44} color="#ff5500" />
                          <h4>AWAITING LEAGUE OPPONENTS</h4>
                          <p>
                            {selectedTeam.name} is currently the only squad registered in {leagueName}.
                            When additional squads join this league, official match fixtures and round-robin games will automatically generate here. (No fake teams).
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Upcoming Next Games */}
                          <div className="schedule-section">
                            <div className="schedule-section-title">
                              <LuClock size={16} color="#ff5500" />
                              <span>UPCOMING MATCHES (NEXT GAMES)</span>
                              <span className="schedule-badge">{nextGames.length}</span>
                            </div>

                            {nextGames.length === 0 ? (
                              <div className="empty-schedule-box">
                                <p>No upcoming matches pending for this squad.</p>
                              </div>
                            ) : (
                              <div className="league-matches-grid">
                                {nextGames.map((m) => (
                                  <div key={m.id} className="league-match-card upcoming">
                                    <div className="match-card-meta">
                                      <span className="matchday-pill">{m.matchday}</span>
                                      <span className="match-court-tag">📍 {m.court}</span>
                                    </div>

                                    <div className="match-teams-row">
                                      <div className={`match-team-col ${m.home.id === selectedTeam.id ? 'highlight' : ''}`}>
                                        <span className="match-team-emblem">{m.home.logo || m.home.emblem || '🏀'}</span>
                                        <span className="match-team-name">{m.home.name}</span>
                                        {m.home.id === selectedTeam.id && <span className="squad-tag">THIS SQUAD</span>}
                                      </div>

                                      <div className="match-vs-divider">
                                        <span className="vs-badge">VS</span>
                                        <span className="match-time-tag">{m.time}</span>
                                      </div>

                                      <div className={`match-team-col ${m.away.id === selectedTeam.id ? 'highlight' : ''}`}>
                                        <span className="match-team-emblem">{m.away.logo || m.away.emblem || '🏀'}</span>
                                        <span className="match-team-name">{m.away.name}</span>
                                        {m.away.id === selectedTeam.id && <span className="squad-tag">THIS SQUAD</span>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Completed Past Games */}
                          <div className="schedule-section" style={{ marginTop: '24px' }}>
                            <div className="schedule-section-title">
                              <LuCheck size={16} color="#22c55e" />
                              <span>PAST GAMES & COMPLETED RESULTS</span>
                              <span className="schedule-badge">{pastGames.length}</span>
                            </div>

                            {pastGames.length === 0 ? (
                              <div className="empty-schedule-box">
                                <p>No past games recorded yet for {selectedTeam.name}. Completed scores will appear here when recorded via the Arena Scoreboard.</p>
                              </div>
                            ) : (
                              <div className="league-matches-grid">
                                {pastGames.map((m) => (
                                  <div key={m.id} className="league-match-card completed">
                                    <div className="match-card-meta">
                                      <span className="matchday-pill">{m.matchday}</span>
                                      <span className="match-final-badge">FINAL SCORE</span>
                                    </div>

                                    <div className="match-teams-row">
                                      <div className="match-team-col">
                                        <span className="match-team-emblem">{m.home.logo || m.home.emblem || '🏀'}</span>
                                        <span className="match-team-name">{m.home.name}</span>
                                        <span className="match-score">{m.scoreHome}</span>
                                      </div>

                                      <div className="match-vs-divider">
                                        <span className="vs-badge">-</span>
                                      </div>

                                      <div className="match-team-col">
                                        <span className="match-team-emblem">{m.away.logo || m.away.emblem || '🏀'}</span>
                                        <span className="match-team-name">{m.away.name}</span>
                                        <span className="match-score">{m.scoreAway}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </>
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

              {/* Responsive Player Box Score Cards */}
              <div className="postgame-roster-cards">
                {postGameRoster.length === 0 ? (
                  <p className="no-players-postgame">No players in this roster. Add players in the Squads tab first.</p>
                ) : (
                  postGameRoster.map((p) => {
                    const st = postGameStats[p.id] || { pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, to: 0 };
                    return (
                      <div key={p.id} className="postgame-player-card">
                        <div className="postgame-player-header">
                          <div className="postgame-player-meta">
                            <strong className="postgame-name">{p.name}</strong>
                            <small className="postgame-sub">@{p.nickname || 'hooper'} • {p.position}</small>
                          </div>
                          <div className="postgame-pts-pill">
                            <span>{st.pts} PTS</span>
                          </div>
                        </div>

                        <div className="postgame-stats-grid-6">
                          <div className="postgame-stat-box pts">
                            <label>PTS</label>
                            <input
                              type="number"
                              min="0"
                              value={st.pts}
                              onChange={(e) => setPostGameStats({
                                ...postGameStats,
                                [p.id]: { ...st, pts: Math.max(0, parseInt(e.target.value) || 0) }
                              })}
                            />
                          </div>

                          <div className="postgame-stat-box ast">
                            <label>AST</label>
                            <input
                              type="number"
                              min="0"
                              value={st.ast}
                              onChange={(e) => setPostGameStats({
                                ...postGameStats,
                                [p.id]: { ...st, ast: Math.max(0, parseInt(e.target.value) || 0) }
                              })}
                            />
                          </div>

                          <div className="postgame-stat-box reb">
                            <label>REB</label>
                            <input
                              type="number"
                              min="0"
                              value={st.reb}
                              onChange={(e) => setPostGameStats({
                                ...postGameStats,
                                [p.id]: { ...st, reb: Math.max(0, parseInt(e.target.value) || 0) }
                              })}
                            />
                          </div>

                          <div className="postgame-stat-box stl">
                            <label>STL</label>
                            <input
                              type="number"
                              min="0"
                              value={st.stl}
                              onChange={(e) => setPostGameStats({
                                ...postGameStats,
                                [p.id]: { ...st, stl: Math.max(0, parseInt(e.target.value) || 0) }
                              })}
                            />
                          </div>

                          <div className="postgame-stat-box blk">
                            <label>BLK</label>
                            <input
                              type="number"
                              min="0"
                              value={st.blk}
                              onChange={(e) => setPostGameStats({
                                ...postGameStats,
                                [p.id]: { ...st, blk: Math.max(0, parseInt(e.target.value) || 0) }
                              })}
                            />
                          </div>

                          <div className="postgame-stat-box to">
                            <label>TO</label>
                            <input
                              type="number"
                              min="0"
                              value={st.to}
                              onChange={(e) => setPostGameStats({
                                ...postGameStats,
                                [p.id]: { ...st, to: Math.max(0, parseInt(e.target.value) || 0) }
                              })}
                            />
                          </div>
                        </div>
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
