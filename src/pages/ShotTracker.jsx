// src/pages/ShotTracker.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import SiteHeader from '../components/SiteHeader';
import MobileBottomNav from '../components/MobileBottomNav';
import Court5ZonesSVG, { ZONES_CONFIG } from '../components/Court5ZonesSVG';
import ZoneLogModal from '../components/ZoneLogModal';
import AthleticWorkoutView from '../components/AthleticWorkoutView';
import { IoBasketball } from 'react-icons/io5';
import {
  LuZap,
  LuTrophy,
  LuTrendingUp,
  LuTrendingDown,
  LuPlus,
  LuRotateCcw,
  LuCircleCheck
} from 'react-icons/lu';
import './ShotTracker.css';

const DEFAULT_ZONE_STATS = {
  corner_3: { attempted: 0, made: 0 },
  wing_3: { attempted: 0, made: 0 },
  top_key_3: { attempted: 0, made: 0 },
  elbow_2: { attempted: 0, made: 0 },
  paint_2: { attempted: 0, made: 0 },
};

const ShotTracker = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Court View Mode: 'shots' (5-Zone Tracker) or 'workout' (Speed, Vertical, Strength, Conditioning)
  const [courtTab, setCourtTab] = useState('shots');

  // Active zone state
  const [selectedZone, setSelectedZone] = useState(ZONES_CONFIG[2]); // Default Top Key
  const [modalZone, setModalZone] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [sessionTitle, setSessionTitle] = useState('Training Session');
  const [zoneStats, setZoneStats] = useState(DEFAULT_ZONE_STATS);
  const [syncStatus, setSyncStatus] = useState('READY');

  // Cumulative career stats and historical zone benchmarks
  const [careerStats, setCareerStats] = useState({ attempted: 0, made: 0, sessionsCount: 0 });
  const [zoneBenchmarks, setZoneBenchmarks] = useState({});

  const autoSaveTimerRef = useRef(null);

  // 1. Load active in-progress session or create one
  const loadOrCreateSession = useCallback(async (userId) => {
    try {
      setSyncStatus('SYNCING…');

      const { data: existingSessions, error: sessionErr } = await supabase
        .from('shot_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1);

      if (sessionErr) console.error('Error fetching session:', sessionErr);

      if (existingSessions && existingSessions.length > 0) {
        const active = existingSessions[0];
        setSessionId(active.id);
        setSessionTitle(active.title || 'Training Session');

        const { data: logs, error: logsErr } = await supabase
          .from('shot_zone_logs')
          .select('*')
          .eq('session_id', active.id);

        if (!logsErr && logs) {
          const loadedStats = { ...DEFAULT_ZONE_STATS };
          logs.forEach((log) => {
            if (loadedStats[log.zone]) {
              loadedStats[log.zone] = {
                attempted: log.attempted,
                made: log.made,
              };
            }
          });
          setZoneStats(loadedStats);
        }
        setSyncStatus('RESUMED');
      } else {
        const { data: newSession, error: createErr } = await supabase
          .from('shot_sessions')
          .insert({
            user_id: userId,
            title: `Session ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
            status: 'in_progress',
          })
          .select()
          .single();

        if (!createErr && newSession) {
          setSessionId(newSession.id);
          setSessionTitle(newSession.title);
          setZoneStats(DEFAULT_ZONE_STATS);
          setSyncStatus('READY');
        }
      }
    } catch (err) {
      console.error('Session load catch:', err);
      setSyncStatus('LOCAL');
    }
  }, []);

  // 2. Fetch cumulative career stats and zone benchmarks
  const loadCareerStats = useCallback(async (userId) => {
    try {
      const { data: completedLogs, error } = await supabase
        .from('shot_sessions')
        .select('id, shot_zone_logs(zone, attempted, made)')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (!error && completedLogs) {
        let totalAtt = 0;
        let totalMade = 0;
        const zoneAccumulator = {
          corner_3: { attempted: 0, made: 0 },
          wing_3: { attempted: 0, made: 0 },
          top_key_3: { attempted: 0, made: 0 },
          elbow_2: { attempted: 0, made: 0 },
          paint_2: { attempted: 0, made: 0 },
        };

        completedLogs.forEach((sess) => {
          sess.shot_zone_logs?.forEach((zl) => {
            totalAtt += zl.attempted || 0;
            totalMade += zl.made || 0;
            if (zoneAccumulator[zl.zone]) {
              zoneAccumulator[zl.zone].attempted += zl.attempted || 0;
              zoneAccumulator[zl.zone].made += zl.made || 0;
            }
          });
        });

        const benchmarks = {};
        Object.keys(zoneAccumulator).forEach((zKey) => {
          const zAtt = zoneAccumulator[zKey].attempted;
          const zMade = zoneAccumulator[zKey].made;
          benchmarks[zKey] = {
            attempted: zAtt,
            made: zMade,
            accuracy: zAtt > 0 ? Math.round((zMade / zAtt) * 100) : null,
          };
        });

        setZoneBenchmarks(benchmarks);
        setCareerStats({
          attempted: totalAtt,
          made: totalMade,
          sessionsCount: completedLogs.length,
        });
      }
    } catch (err) {
      console.error('Error loading career stats:', err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadOrCreateSession(user.id);
        loadCareerStats(user.id);
      } else {
        const saved = localStorage.getItem('hooplogs_guest_session');
        if (saved) {
          try {
            setZoneStats(JSON.parse(saved));
          } catch (e) {}
        }
      }
    }
  }, [user, authLoading, loadOrCreateSession, loadCareerStats]);

  // 3. Auto-save session debounced to Supabase
  const persistSessionChanges = useCallback(
    (newStats) => {
      localStorage.setItem('hooplogs_active_session', JSON.stringify(newStats));

      if (!user || !sessionId) return;

      setSyncStatus('SAVING…');
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          const upsertPromises = Object.entries(newStats).map(([zone, stat]) => {
            return supabase.from('shot_zone_logs').upsert(
              {
                session_id: sessionId,
                user_id: user.id,
                zone,
                attempted: stat.attempted,
                made: stat.made,
              },
              { onConflict: 'session_id,zone' }
            );
          });

          await Promise.all(upsertPromises);

          await supabase
            .from('shot_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sessionId);

          setSyncStatus('SAVED');
        } catch (err) {
          console.error('Auto-save error:', err);
          setSyncStatus('OFFLINE');
        }
      }, 500);
    },
    [user, sessionId]
  );

  // Handle clicking a zone on the court: selects zone and opens set logging sheet
  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
    setModalZone(zone);
    setIsModalOpen(true);
  };

  // Record a complete set of makes and misses without breaking shooting rhythm
  const handleSaveSet = (makes, misses, totalShots) => {
    const targetZoneId = modalZone?.id || selectedZone.id;

    setZoneStats((prev) => {
      const current = prev[targetZoneId] || { attempted: 0, made: 0 };
      const updated = {
        ...prev,
        [targetZoneId]: {
          attempted: current.attempted + totalShots,
          made: current.made + makes,
        },
      };
      persistSessionChanges(updated);
      return updated;
    });
  };

  const handleResetZone = (zoneId) => {
    setZoneStats((prev) => {
      const updated = {
        ...prev,
        [zoneId]: { attempted: 0, made: 0 },
      };
      persistSessionChanges(updated);
      return updated;
    });
  };

  const handleCompleteSession = async () => {
    if (!user || !sessionId) {
      alert('Please log in to save sessions to your permanent career record.');
      return;
    }

    if (totalSessionAttempted === 0) {
      alert('Log at least 1 shooting set before completing your workout.');
      return;
    }

    try {
      setSyncStatus('FINALIZING…');
      const { error } = await supabase
        .from('shot_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      alert(`🔥 Workout Completed!\n${totalSessionMade}/${totalSessionAttempted} (${sessionPct}%) saved to your career record.`);
      await loadCareerStats(user.id);

      // Start fresh session
      const { data: nextSession } = await supabase
        .from('shot_sessions')
        .insert({
          user_id: user.id,
          title: `Session ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
          status: 'in_progress',
        })
        .select()
        .single();

      if (nextSession) {
        setSessionId(nextSession.id);
        setSessionTitle(nextSession.title);
        setZoneStats(DEFAULT_ZONE_STATS);
        setSyncStatus('SAVED');
      }
    } catch (err) {
      console.error('Session complete error:', err);
      alert('Could not complete workout. Check connection.');
      setSyncStatus('ERROR');
    }
  };

  const handleStartNewSession = () => {
    if (window.confirm('Reset current reps and start fresh?')) {
      setZoneStats(DEFAULT_ZONE_STATS);
      persistSessionChanges(DEFAULT_ZONE_STATS);
    }
  };

  // Calculations
  let totalSessionAttempted = 0;
  let totalSessionMade = 0;
  Object.values(zoneStats).forEach((st) => {
    totalSessionAttempted += st.attempted || 0;
    totalSessionMade += st.made || 0;
  });

  const sessionPct =
    totalSessionAttempted > 0
      ? Math.round((totalSessionMade / totalSessionAttempted) * 100)
      : 0;

  // Career cumulative comparison
  const careerHistoricalPct =
    careerStats.attempted > 0
      ? Math.round((careerStats.made / careerStats.attempted) * 100)
      : null;

  const overallTrendDiff =
    careerHistoricalPct !== null && totalSessionAttempted > 0
      ? sessionPct - careerHistoricalPct
      : null;

  return (
    <div className="shot-tracker-page">
      <SiteHeader />

      <main className="tracker-main-container">
        {/* Court Section Tabs: 5-Zone Shot Tracker vs Athletic Workouts */}
        <div className="court-mode-switch-tabs">
          <button
            type="button"
            className={`court-mode-tab ${courtTab === 'shots' ? 'active' : ''}`}
            onClick={() => setCourtTab('shots')}
          >
            <IoBasketball size={15} /> 5-Zone Shot Tracker
          </button>
          <button
            type="button"
            className={`court-mode-tab ${courtTab === 'workout' ? 'active' : ''}`}
            onClick={() => setCourtTab('workout')}
          >
            <LuZap size={14} /> My Athletic Workouts
          </button>
        </div>

        {courtTab === 'workout' ? (
          <AthleticWorkoutView />
        ) : (
          <>
            {/* Arena Title Bar */}
            <div className="arena-header-banner">
              <div className="arena-header-title">
                <IoBasketball size={20} color="#ff5500" />
                <h1>5-Zone Shot Tracker</h1>
              </div>

              <div className="persistence-status-pill">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: syncStatus.includes('SAVING') ? '#fbbf24' : '#10b981',
                    display: 'inline-block',
                  }}
                />
                {syncStatus}
              </div>
            </div>

        {/* JUMBOTRON SCOREBOARD */}
        <div className="arena-jumbotron">
          <div className="jumbotron-top-row">
            <span className="jumbotron-session-tag">
              <IoBasketball size={13} color="#ff5500" /> LIVE SESSION
            </span>
            <span className="jumbotron-career-tag">
              CAREER: {careerStats.sessionsCount} SESSIONS
            </span>
          </div>

          <div className="jumbotron-metrics-grid">
            <div className="jumbotron-metric-box">
              <span className="jumbotron-metric-label">TOTAL SHOTS</span>
              <span className="jumbotron-metric-value makes">
                {totalSessionMade}
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>
                  /{totalSessionAttempted}
                </span>
              </span>
              <span className="jumbotron-metric-sub">
                {totalSessionAttempted - totalSessionMade} Misses
              </span>
            </div>

            <div className="jumbotron-metric-box">
              <span className="jumbotron-metric-label">ACCURACY</span>
              <span className="jumbotron-metric-value accuracy">
                {sessionPct}%
              </span>
              <span className="jumbotron-metric-sub">EFFICIENCY</span>
            </div>

            <div className="jumbotron-metric-box">
              <span className="jumbotron-metric-label">SHOT TREND</span>
              <div className="jumbotron-trend-value">
                {overallTrendDiff !== null && totalSessionAttempted > 0 ? (
                  overallTrendDiff >= 0 ? (
                    <span className="trend-text positive">
                      <LuTrendingUp size={14} /> +{overallTrendDiff}%
                    </span>
                  ) : (
                    <span className="trend-text negative">
                      <LuTrendingDown size={14} /> {overallTrendDiff}%
                    </span>
                  )
                ) : (
                  <span className="trend-text neutral">Tracking</span>
                )}
              </div>
              <span className="jumbotron-metric-sub">VS CAREER AVG</span>
            </div>
          </div>

          {/* Quick Action Bar inside Jumbotron */}
          <div className="jumbotron-actions-strip">
            <button
              type="button"
              className="btn-complete-workout"
              onClick={handleCompleteSession}
            >
              <LuTrophy size={15} />
              <span>Complete Workout</span>
            </button>
            <button
              type="button"
              className="btn-new-reps"
              onClick={handleStartNewSession}
              title="Reset and start new set"
            >
              <LuRotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Interactive Court SVG: Click Zone to Open Set Logger */}
        <section className="tracker-court-section">
          <Court5ZonesSVG
            selectedZoneId={selectedZone.id}
            onSelectZone={handleZoneSelect}
            zoneStats={zoneStats}
          />
        </section>

        {/* 5-ZONE CARDS WITH TREND COMPARISON */}
        <section className="zones-breakdown-section">
          <div className="breakdown-header">
            <div className="breakdown-title">
              <LuZap size={14} color="#ff5500" />
              <span>5-Zone Performance (Tap to Log Set)</span>
            </div>
          </div>

          <div className="zone-cards-grid">
            {ZONES_CONFIG.map((z) => {
              const stat = zoneStats[z.id] || { attempted: 0, made: 0 };
              const currentPct =
                stat.attempted > 0 ? Math.round((stat.made / stat.attempted) * 100) : 0;
              const benchmark = zoneBenchmarks[z.id]?.accuracy ?? null;
              const diff =
                benchmark !== null && stat.attempted > 0
                  ? currentPct - benchmark
                  : null;

              return (
                <div
                  key={z.id}
                  className={`zone-performance-card ${selectedZone.id === z.id ? 'active' : ''}`}
                  onClick={() => handleZoneSelect(z)}
                >
                  <div className="zone-card-top">
                    <span className="zone-dot-indicator" style={{ background: z.color }} />
                    <span className="zone-name-label">{z.shortLabel}</span>
                    <span className="zone-pts-tag">{z.points}P</span>
                  </div>

                  <div className="zone-card-middle">
                    <div className="zone-makes-ratio">
                      {stat.made}/{stat.attempted}
                    </div>
                    <div className="zone-pct-large" style={{ color: z.color }}>
                      {stat.attempted > 0 ? `${currentPct}%` : '—'}
                    </div>
                  </div>

                  <div className="zone-card-bottom">
                    {diff !== null ? (
                      diff >= 0 ? (
                        <span className="zone-trend-pill positive">
                          <LuTrendingUp size={11} /> +{diff}%
                        </span>
                      ) : (
                        <span className="zone-trend-pill negative">
                          <LuTrendingDown size={11} /> {diff}%
                        </span>
                      )
                    ) : (
                      <span className="zone-trend-pill neutral">Tap to log</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </>
        )}
      </main>

      {/* Set Recording Modal Sheet */}
      {isModalOpen && modalZone && (
        <ZoneLogModal
          zone={modalZone}
          currentStats={zoneStats[modalZone.id] || { attempted: 0, made: 0 }}
          pastBenchmark={zoneBenchmarks[modalZone.id] || null}
          onSaveSet={handleSaveSet}
          onResetZone={handleResetZone}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <MobileBottomNav />
    </div>
  );
};

export default ShotTracker;
