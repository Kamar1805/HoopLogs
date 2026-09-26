// src/services/basketballCommunityService.js
// Unified Real-Time Basketball Data Layer connecting Firebase Firestore & Supabase

import { db } from '../firebase';
import { supabase } from '../supabase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot
} from 'firebase/firestore';

/**
 * 1. Fetch Unified Hoopers based on Supabase 'profiles' (SOURCE OF TRUTH)
 * Only hoopers registered in Supabase are included; users from former Firebase DB who are not on Supabase are excluded.
 */
export async function fetchUnifiedHoopers() {
  const playersMap = new Map();

  // A. Fetch primary registered hoopers from Supabase 'profiles' (Source of Truth)
  try {
    const { data: profs, error } = await supabase.from('profiles').select('*');
    if (!error && profs) {
      profs.forEach((p) => {
        const rawWa = p.whatsapp || p.phone_number || '';
        const cleanWa = String(rawWa).replace(/[^0-9]/g, '');

        playersMap.set(p.id, {
          user_id: p.id,
          id: p.id,
          full_name: p.full_name || p.nickname || 'Hooper',
          nickname: p.nickname || '',
          position: p.position || 'PG',
          gender: p.gender || 'Male',
          height: p.height || "—",
          weight: p.weight || "—",
          avatar_url: p.avatar_url || p.photo_url || p.photoURL || null,
          team_name: null,
          team_emblem: '🏀',
          whatsapp: cleanWa,
          phoneNumber: cleanWa,
          phonePublic: true,
          source: 'supabase',
          ppg: 0.0,
          rpg: 0.0,
          apg: 0.0,
          spg: 0.0,
          bpg: 0.0,
          topg: 0.0,
          gp: 0,
          accuracy_percentage: 0
        });
      });
    }
  } catch (sbErr) {
    console.warn('Supabase profiles fetch notice:', sbErr);
  }

  // B. Enrich ONLY existing Supabase athletes with any team/phone updates from Firestore (no phantom Firebase users)
  try {
    const snap = await getDocs(collection(db, 'users'));
    snap.forEach((d) => {
      if (playersMap.has(d.id)) {
        const u = d.data();
        const existing = playersMap.get(d.id);
        if (!existing.team_name && u.teamName && u.teamName !== 'No') {
          existing.team_name = u.teamName;
        }
        if (!existing.whatsapp) {
          const rawWa = u.phoneNumber || u.whatsapp || u.phone || '';
          const cleanWa = String(rawWa).replace(/[^0-9]/g, '');
          if (cleanWa) existing.whatsapp = cleanWa;
        }
      }
    });
  } catch (fbErr) {
    console.warn('Firebase users enrich notice:', fbErr);
  }

  // C. Fetch Live Season Box Score Averages from Firebase Firestore 'player_season_stats'
  try {
    const statsSnap = await getDocs(collection(db, 'player_season_stats'));
    statsSnap.forEach((docSnap) => {
      const s = docSnap.data();
      const pId = docSnap.id;
      if (playersMap.has(pId)) {
        const p = playersMap.get(pId);
        p.ppg = parseFloat(s.ppg || 0);
        p.rpg = parseFloat(s.rpg || 0);
        p.apg = parseFloat(s.apg || 0);
        p.spg = parseFloat(s.spg || 0);
        p.bpg = parseFloat(s.bpg || 0);
        p.topg = parseFloat(s.topg || 0);
        p.gp = parseInt(s.gp || 0, 10);
        if (s.teamName) p.team_name = s.teamName;
      }
    });
  } catch (statsErr) {
    console.warn('Firestore player_season_stats notice:', statsErr);
  }

  // D. Merge local cached averages fallback
  try {
    const localAvg = JSON.parse(localStorage.getItem('hooplogs_player_game_averages') || '{}');
    Object.entries(localAvg).forEach(([pId, s]) => {
      if (playersMap.has(pId)) {
        const p = playersMap.get(pId);
        if (p.gp === 0 && s.gp > 0) {
          p.ppg = parseFloat(s.ppg || 0);
          p.rpg = parseFloat(s.rpg || 0);
          p.apg = parseFloat(s.apg || 0);
          p.spg = parseFloat(s.spg || 0);
          p.bpg = parseFloat(s.bpg || 0);
          p.topg = parseFloat(s.topg || 0);
          p.gp = parseInt(s.gp || 0, 10);
        }
      }
    });
  } catch (_) {}

  // E. Merge Supabase Team Memberships
  try {
    const { data: tm } = await supabase
      .from('team_members')
      .select('player_id, team_id, teams (name, emblem)');
    if (tm) {
      tm.forEach((item) => {
        if (item.player_id && item.teams && playersMap.has(item.player_id)) {
          const p = playersMap.get(item.player_id);
          p.team_name = item.teams.name;
          p.team_emblem = item.teams.emblem || '🏀';
        }
      });
    }
  } catch (_) {}

  return Array.from(playersMap.values());
}

/**
 * 2. Save / Update User WhatsApp Number across both Supabase and Firebase
 */
export async function saveUserWhatsApp(userId, phoneRaw) {
  const cleanWa = String(phoneRaw || '').replace(/[^0-9]/g, '');
  if (!userId) return cleanWa;

  // A. LocalStorage Immediate
  try {
    localStorage.setItem(`hooplogs_wa_${userId}`, cleanWa);
  } catch (_) {}

  // B. Firebase Firestore 'users' collection
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      phoneNumber: cleanWa,
      whatsapp: cleanWa,
      phonePublic: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Firebase save WhatsApp notice:', e);
  }

  // C. Supabase 'profiles'
  try {
    await supabase.from('profiles').update({
      whatsapp: cleanWa,
      updated_at: new Date().toISOString()
    }).eq('id', userId);
  } catch (e) {
    console.warn('Supabase save WhatsApp notice:', e);
  }

  return cleanWa;
}

export async function assignPlayerToTeam(playerId, teamId, teamName, playerProfile = null) {
  if (!playerId || !teamId) return false;

  // A. Supabase team_members with column 'player_id'
  try {
    await supabase.from('team_members').upsert({
      team_id: teamId,
      player_id: playerId,
      joined_at: new Date().toISOString()
    }, { onConflict: 'team_id,player_id' });
  } catch (e) {
    console.warn('Supabase team_members insert notice:', e);
  }

  // B. Firebase Firestore 'users' collection
  try {
    const uRef = doc(db, 'users', playerId);
    await setDoc(uRef, {
      inTeam: 'Yes',
      teamName: teamName,
      teamId: teamId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Firebase users team update notice:', e);
  }

  // C. Firestore 'team_rosters' collection for real-time team view
  try {
    const rosterDocRef = doc(db, 'team_rosters', `${teamId}_${playerId}`);
    await setDoc(rosterDocRef, {
      teamId,
      playerId,
      teamName,
      profiles: playerProfile || {},
      addedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore team_rosters update notice:', e);
  }

  // D. LocalStorage cache update with full profile so athletes are NEVER unnamed
  try {
    const customRosters = JSON.parse(localStorage.getItem('hooplogs_custom_rosters') || '{}');
    const list = customRosters[teamId] || [];
    const filtered = list.filter(m => (m.user_id !== playerId && m.id !== playerId && m.player_id !== playerId));
    filtered.push({
      user_id: playerId,
      id: playerId,
      player_id: playerId,
      team_id: teamId,
      joined_at: new Date().toISOString(),
      profiles: playerProfile || {
        id: playerId,
        full_name: 'Hooper',
        position: 'GUARD',
        gender: 'Male'
      }
    });
    customRosters[teamId] = filtered;
    localStorage.setItem('hooplogs_custom_rosters', JSON.stringify(customRosters));
  } catch (_) {}

  return true;
}

/**
 * 4. Save Post-Game Box Score Stats across Firebase, Supabase and localStorage
 * Recalculates season averages (PPG, RPG, APG, SPG, BPG, TOPG) and publishes them live.
 */
export async function saveGameBoxScores(gameId, teamId, teamName, playerStatsMap) {
  if (!playerStatsMap || Object.keys(playerStatsMap).length === 0) return;

  const currentLocalAvg = JSON.parse(localStorage.getItem('hooplogs_player_game_averages') || '{}');

  for (const [playerId, st] of Object.entries(playerStatsMap)) {
    // 1. Fetch current historical stats for this player from Firestore or local
    let existing = currentLocalAvg[playerId] || {
      gp: 0,
      totalPts: 0,
      totalReb: 0,
      totalAst: 0,
      totalStl: 0,
      totalBlk: 0,
      totalTo: 0,
    };

    try {
      const statDoc = await getDoc(doc(db, 'player_season_stats', playerId));
      if (statDoc.exists()) {
        const d = statDoc.data();
        existing = {
          gp: d.gp || existing.gp || 0,
          totalPts: d.totalPts || (parseFloat(d.ppg || 0) * (d.gp || 1)) || 0,
          totalReb: d.totalReb || (parseFloat(d.rpg || 0) * (d.gp || 1)) || 0,
          totalAst: d.totalAst || (parseFloat(d.apg || 0) * (d.gp || 1)) || 0,
          totalStl: d.totalStl || (parseFloat(d.spg || 0) * (d.gp || 1)) || 0,
          totalBlk: d.totalBlk || (parseFloat(d.bpg || 0) * (d.gp || 1)) || 0,
          totalTo: d.totalTo || (parseFloat(d.topg || 0) * (d.gp || 1)) || 0,
        };
      }
    } catch (_) {}

    const newGp = (existing.gp || 0) + 1;
    const newTotalPts = (existing.totalPts || 0) + (Number(st.pts) || 0);
    const newTotalReb = (existing.totalReb || 0) + (Number(st.reb) || 0);
    const newTotalAst = (existing.totalAst || 0) + (Number(st.ast) || 0);
    const newTotalStl = (existing.totalStl || 0) + (Number(st.stl) || 0);
    const newTotalBlk = (existing.totalBlk || 0) + (Number(st.blk) || 0);
    const newTotalTo = (existing.totalTo || 0) + (Number(st.to) || 0);

    const updatedStats = {
      gp: newGp,
      totalPts: newTotalPts,
      totalReb: newTotalReb,
      totalAst: newTotalAst,
      totalStl: newTotalStl,
      totalBlk: newTotalBlk,
      totalTo: newTotalTo,
      ppg: (newTotalPts / newGp).toFixed(1),
      rpg: (newTotalReb / newGp).toFixed(1),
      apg: (newTotalAst / newGp).toFixed(1),
      spg: (newTotalStl / newGp).toFixed(1),
      bpg: (newTotalBlk / newGp).toFixed(1),
      topg: (newTotalTo / newGp).toFixed(1),
      teamName: teamName || 'Hooper',
      lastUpdated: new Date().toISOString()
    };

    // A. Persist to Firebase Firestore 'player_season_stats'
    try {
      await setDoc(doc(db, 'player_season_stats', playerId), updatedStats, { merge: true });
    } catch (e) {
      console.warn('Error syncing player season stats to Firestore:', e);
    }

    // B. Local storage backup
    currentLocalAvg[playerId] = updatedStats;
  }

  localStorage.setItem('hooplogs_player_game_averages', JSON.stringify(currentLocalAvg));
}

/**
 * 5. Create Team with League Assignment & Standings Initialization
 */
export async function createTeamWithLeague(teamData, leagueId = 'default_league') {
  const newTeamObj = {
    id: teamData.id || `team-${Date.now()}`,
    name: teamData.name.trim(),
    logo: teamData.logo || '🏀',
    emblem: teamData.logo || '🏀',
    coach_name: teamData.coach_name || 'Coach AK',
    coach_id: teamData.coach_id || null,
    league_id: leagueId,
    created_at: new Date().toISOString(),
    team_members: [{ count: 0 }]
  };

  // A. Supabase
  try {
    const { data } = await supabase.from('teams').insert({
      name: newTeamObj.name,
      coach_id: newTeamObj.coach_id,
      emblem: newTeamObj.emblem
    }).select().single();
    if (data) newTeamObj.id = data.id;
  } catch (e) {
    console.warn('Supabase team creation notice:', e);
  }

  // B. Firebase Firestore 'teams'
  try {
    await setDoc(doc(db, 'teams', String(newTeamObj.id)), newTeamObj, { merge: true });
  } catch (e) {
    console.warn('Firestore team creation notice:', e);
  }

  // C. Initialize League Standings in Firestore and Local
  try {
    const standingsRef = doc(db, 'league_standings', String(newTeamObj.id));
    await setDoc(standingsRef, {
      teamId: newTeamObj.id,
      teamName: newTeamObj.name,
      emblem: newTeamObj.emblem,
      leagueId: leagueId,
      gp: 0,
      wins: 0,
      losses: 0,
      ptsFor: 0,
      ptsAgainst: 0,
      diff: 0,
      winPct: '.000',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Standings init notice:', e);
  }

  // D. LocalStorage
  try {
    const localTeams = JSON.parse(localStorage.getItem('hooplogs_custom_teams') || '[]');
    localTeams.unshift(newTeamObj);
    localStorage.setItem('hooplogs_custom_teams', JSON.stringify(localTeams));

    const localStandings = JSON.parse(localStorage.getItem('hooplogs_league_standings_v1') || '{}');
    localStandings[newTeamObj.id] = { gp: 0, wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0 };
    localStorage.setItem('hooplogs_league_standings_v1', JSON.stringify(localStandings));
  } catch (_) {}

  return newTeamObj;
}
