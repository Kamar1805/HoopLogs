// src/services/basketballCommunityService.js
// Pure Supabase Basketball Community Data Layer

import { supabase } from '../supabase';

/**
 * 1. Fetch Unified Hoopers based on Supabase 'profiles' (SOURCE OF TRUTH)
 * Strictly uses Supabase data.
 */
export async function fetchUnifiedHoopers() {
  const playersMap = new Map();

  // A. Fetch primary registered hoopers from Supabase 'profiles' (Source of Truth)
  try {
    const { data: profs, error } = await supabase.from('profiles').select('*');
    if (!error && profs) {
      profs.forEach((p) => {
        const localCachedWa = typeof window !== 'undefined' ? localStorage.getItem(`hooplogs_wa_${p.id}`) : '';
        const rawWa = p.phone_number || p.whatsapp || localCachedWa || '';
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
          team_name: p.team_name || null,
          team_emblem: '🏀',
          whatsapp: cleanWa,
          phoneNumber: cleanWa,
          phone_number: cleanWa,
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

  // B. Merge Supabase Team Memberships
  try {
    const { data: tm, error: tmErr } = await supabase
      .from('team_members')
      .select('player_id, team_id, teams (name, emblem)');
    if (!tmErr && tm) {
      tm.forEach((item) => {
        if (
          item.player_id &&
          item.teams &&
          !item.teams.name?.toLowerCase().includes('varsity') &&
          playersMap.has(item.player_id)
        ) {
          const p = playersMap.get(item.player_id);
          p.team_name = item.teams.name;
          p.team_emblem = item.teams.emblem || '🏀';
        }
      });
    }
  } catch (_) {}

  // C. Fetch Supabase player_season_stats (if table exists)
  try {
    const { data: statsData } = await supabase
      .from('player_season_stats')
      .select('*');
    if (statsData) {
      statsData.forEach((s) => {
        const pId = s.player_id || s.id;
        if (pId && playersMap.has(pId)) {
          const p = playersMap.get(pId);
          p.ppg = parseFloat(s.ppg || 0);
          p.rpg = parseFloat(s.rpg || 0);
          p.apg = parseFloat(s.apg || 0);
          p.spg = parseFloat(s.spg || 0);
          p.bpg = parseFloat(s.bpg || 0);
          p.topg = parseFloat(s.topg || 0);
          p.gp = parseInt(s.gp || 0, 10);
          if (s.team_name && !s.team_name.toLowerCase().includes('varsity')) {
            p.team_name = s.team_name;
          }
        }
      });
    }
  } catch (_) {}

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

  // E. Merge LocalStorage Custom Rosters fallback
  try {
    const customTeams = JSON.parse(localStorage.getItem('hooplogs_custom_teams') || '[]');
    const customRosters = JSON.parse(localStorage.getItem('hooplogs_custom_rosters') || '{}');
    customTeams.forEach((t) => {
      if (t.name && !t.name.toLowerCase().includes('varsity')) {
        const r = customRosters[t.id] || [];
        r.forEach((m) => {
          const pId = m.user_id || m.player_id || m.id;
          if (pId && playersMap.has(pId)) {
            const p = playersMap.get(pId);
            p.team_name = t.name;
            p.team_emblem = t.logo || t.emblem || '🏀';
          }
        });
      }
    });
  } catch (_) {}

  return Array.from(playersMap.values());
}

/**
 * 2. Save / Update User WhatsApp Number in Supabase
 */
export async function saveUserWhatsApp(userId, phoneRaw) {
  const cleanWa = String(phoneRaw || '').replace(/[^0-9]/g, '');
  if (!userId) return cleanWa;

  // A. LocalStorage Immediate
  try {
    localStorage.setItem(`hooplogs_wa_${userId}`, cleanWa);
  } catch (_) {}

  // B. Supabase 'profiles' (update phone_number column, avoiding non-existent columns)
  try {
    const { error } = await supabase.from('profiles').update({
      phone_number: cleanWa,
      updated_at: new Date().toISOString()
    }).eq('id', userId);
    if (error) {
      console.warn('Supabase profiles phone_number update notice:', error);
    }
  } catch (e) {
    console.warn('Supabase save WhatsApp notice:', e);
  }

  // C. Supabase Auth user metadata update so session retains whatsapp & phone_number
  try {
    await supabase.auth.updateUser({
      data: {
        phone_number: cleanWa,
        whatsapp: cleanWa
      }
    });
  } catch (authErr) {
    console.warn('Supabase auth.updateUser notice:', authErr);
  }

  return cleanWa;
}

/**
 * 3. Assign Player to Team via Supabase
 */
export async function assignPlayerToTeam(playerId, teamId, teamName, playerProfile = null) {
  if (!playerId || !teamId) return false;

  // A. Supabase team_members
  try {
    await supabase.from('team_members').upsert({
      team_id: teamId,
      player_id: playerId,
      joined_at: new Date().toISOString()
    }, { onConflict: 'team_id,player_id' });
  } catch (e) {
    console.warn('Supabase team_members insert notice:', e);
  }

  // B. Supabase profiles team_name update
  try {
    await supabase.from('profiles').update({
      team_name: teamName
    }).eq('id', playerId);
  } catch (e) {
    console.warn('Supabase profiles team update notice:', e);
  }

  // C. LocalStorage cache update with full profile
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
 * 4. Save Post-Game Box Score Stats into Supabase & localStorage
 * Recalculates season averages (PPG, RPG, APG, SPG, BPG, TOPG) and publishes them live.
 */
export async function saveGameBoxScores(gameId, teamId, teamName, playerStatsMap) {
  if (!playerStatsMap || Object.keys(playerStatsMap).length === 0) return;

  const currentLocalAvg = JSON.parse(localStorage.getItem('hooplogs_player_game_averages') || '{}');

  for (const [playerId, st] of Object.entries(playerStatsMap)) {
    let existing = currentLocalAvg[playerId] || {
      gp: 0,
      totalPts: 0,
      totalReb: 0,
      totalAst: 0,
      totalStl: 0,
      totalBlk: 0,
      totalTo: 0,
    };

    // Try fetching existing from Supabase player_season_stats
    try {
      const { data } = await supabase
        .from('player_season_stats')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (data) {
        existing = {
          gp: data.gp || existing.gp || 0,
          totalPts: data.total_pts || (parseFloat(data.ppg || 0) * (data.gp || 1)) || 0,
          totalReb: data.total_reb || (parseFloat(data.rpg || 0) * (data.gp || 1)) || 0,
          totalAst: data.total_ast || (parseFloat(data.apg || 0) * (data.gp || 1)) || 0,
          totalStl: data.total_stl || (parseFloat(data.spg || 0) * (data.gp || 1)) || 0,
          totalBlk: data.total_blk || (parseFloat(data.bpg || 0) * (data.gp || 1)) || 0,
          totalTo: data.total_to || (parseFloat(data.topg || 0) * (data.gp || 1)) || 0,
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
      player_id: playerId,
      gp: newGp,
      total_pts: newTotalPts,
      total_reb: newTotalReb,
      total_ast: newTotalAst,
      total_stl: newTotalStl,
      total_blk: newTotalBlk,
      total_to: newTotalTo,
      ppg: (newTotalPts / newGp).toFixed(1),
      rpg: (newTotalReb / newGp).toFixed(1),
      apg: (newTotalAst / newGp).toFixed(1),
      spg: (newTotalStl / newGp).toFixed(1),
      bpg: (newTotalBlk / newGp).toFixed(1),
      topg: (newTotalTo / newGp).toFixed(1),
      team_name: teamName || 'Hooper',
      updated_at: new Date().toISOString()
    };

    // A. Upsert to Supabase player_season_stats
    try {
      await supabase.from('player_season_stats').upsert(updatedStats, { onConflict: 'player_id' });
    } catch (e) {
      console.warn('Supabase player_season_stats upsert notice:', e);
    }

    // B. Local storage backup
    currentLocalAvg[playerId] = {
      ...updatedStats,
      totalPts: newTotalPts,
      totalReb: newTotalReb,
      totalAst: newTotalAst,
      totalStl: newTotalStl,
      totalBlk: newTotalBlk,
      totalTo: newTotalTo,
    };
  }

  localStorage.setItem('hooplogs_player_game_averages', JSON.stringify(currentLocalAvg));
}

/**
 * 5. Create Team with League Assignment & Standings Initialization (Supabase)
 */
export async function createTeamWithLeague(teamData, leagueId = 'default_league') {
  const newTeamObj = {
    id: teamData.id || `team-${Date.now()}`,
    name: teamData.name.trim(),
    logo: teamData.logo || '🏀',
    emblem: teamData.logo || '🏀',
    coach_name: teamData.coach_name || 'Coach',
    coach_id: teamData.coach_id || null,
    league_id: leagueId,
    created_at: new Date().toISOString(),
    team_members: [{ count: 0 }]
  };

  // A. Supabase teams table
  try {
    const { data, error } = await supabase.from('teams').insert({
      name: newTeamObj.name,
      coach_id: newTeamObj.coach_id,
      emblem: newTeamObj.emblem
    }).select().single();

    if (!error && data) {
      newTeamObj.id = data.id;
    }
  } catch (e) {
    console.warn('Supabase team creation notice:', e);
  }

  // B. Supabase league_standings table (if available)
  try {
    await supabase.from('league_standings').upsert({
      team_id: newTeamObj.id,
      team_name: newTeamObj.name,
      emblem: newTeamObj.emblem,
      league_id: leagueId,
      gp: 0,
      wins: 0,
      losses: 0,
      pts_for: 0,
      pts_against: 0,
      diff: 0,
      win_pct: '.000',
      updated_at: new Date().toISOString()
    }, { onConflict: 'team_id' });
  } catch (e) {
    console.warn('Supabase league_standings init notice:', e);
  }

  // C. LocalStorage sync
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
