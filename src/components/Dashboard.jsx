/**
 * Dashboard.jsx
 * Daily Workout Snapshot + Season Stats now side‑by‑side (same row) using .ws-two-col grid.
 * Mini stats hooks are placed before conditional returns to satisfy Rules of Hooks.
 * Ensure Dashboard.css updated with new responsive .ws-two-col styles.
 */

import SplashScreen from "./SplashScreen";
import React, { useState, useEffect, useMemo } from "react";
import "./Dashboard.css";
import { Link } from "react-router-dom";

import { auth, db } from "../Firebase";
import {
  collection, doc, getDoc,
  query, where, onSnapshot
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import SiteHeader   from "./SiteHeader";
import SiteFooter   from "./SiteFooter";
import ShotProgressRing from "./ShotProgressRing";

/* BASE (legacy) LOCAL STORAGE KEYS */
const LS_PLAN_KEY_BASE = "hl_schedule_v2";
const LS_DONE_KEY_BASE = "hl_completed_v2";

/* QUOTES */
const dashboardQuotes = [
  `Michael Jordan: “I’ve missed more than 9,000 shots in my career. ...”`,
  `Kobe Bryant: “The most important thing is to try and inspire people ...”`,
  `Larry Bird: “If you give 100% all of the time, somehow things will work out ...”`,
  `Magic Johnson: “Ask not what your teammates can do for you. Ask what you can do ...”`,
  `LeBron James: “You can’t be afraid to fail. It’s the only way you succeed.”`,
  `Tim Duncan: “Good, better, best. Never let it rest ...”`,
  `Kevin Durant: “Hard work beats talent when talent fails to work hard.”`,
];

const welcomeQuotes = [
  "Let's get back to the grind...",
  "Every day is a chance to get better.",
  "Hard work beats talent when talent doesn’t work hard.",
  "Success is earned one rep at a time.",
  "Grind now, shine later.",
];

const Dashboard = () => {
  const navigate = useNavigate();

  /* auth / ui state */
  const [nicknameLoading, setNicknameLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [nickname, setNickname]   = useState("Hoop Logger");
  const [user, setUser]           = useState(null);

  /* rotating quote indexes */
  const [welcomeIdx, setWelcomeIdx] = useState(0);
  const [legendIdx,  setLegendIdx]  = useState(0);
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    // Fetch user profile from Firestore
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
      else setProfile(null);
    });
  }, [user]);

  // Define required fields for completeness
  const requiredFields = [
    "name",
    "nickname",
    "height",
    "weight",
    "position",
    "experience",
    "photoURL",
    "bio",
    "teamName"
  ];

  // Check if any required field is missing or empty
  const isProfileIncomplete =
    !!user &&
    profile &&
    requiredFields.some(
      (field) =>
        profile[field] === undefined ||
        profile[field] === null ||
        profile[field] === "" ||
        (field === "photoURL" && !profile.photoURL)
    );
  /* shot stats */
  const [latest, setLatest] = useState(null);
  const [best,   setBest]   = useState(null);
  const [worst,  setWorst]  = useState(null);
  const [fav,    setFav]    = useState(null);

  /* workout snapshot (user‑scoped) */
  const [planData, setPlanData] = useState(null);
  const [completedDates, setCompletedDates] = useState([]);
  const [planLoading, setPlanLoading] = useState(false);

  /* derive user‑scoped keys */
  const planKey = user ? `${LS_PLAN_KEY_BASE}_${user.uid}` : null;
  const doneKey = user ? `${LS_DONE_KEY_BASE}_${user.uid}` : null;

  /* -------- MINI GAMES / STATS (before returns) -------- */
  const [miniGames, setMiniGames] = useState([]);

  useEffect(() => {
    if (!user) {
      setMiniGames([]);
      return;
    }
    try {
      const key = `hl_stats_games_${user.uid}`;
      const raw = localStorage.getItem(key);
      setMiniGames(raw ? JSON.parse(raw) : []);
    } catch {
      setMiniGames([]);
    }
  }, [user]);

  const miniStats = useMemo(() => {
    if (!miniGames.length) {
      return {
        gp: 0,
        avg: { ppg:0,rpg:0,apg:0,bpg:0,spg:0,topg:0 },
        pct: { fg:0, three:0, ft:0 }
      };
    }
    const totals = miniGames.reduce((a,g)=>{
      a.pts+=g.pts; a.reb+=g.reb; a.ast+=g.ast; a.blk+=g.blk; a.stl+=g.stl; a.tov+=g.tov;
      a.fgM+=g.fgM; a.fgA+=g.fgA; a.threeM+=g.threeM; a.threeA+=g.threeA; a.ftM+=g.ftM; a.ftA+=g.ftA;
      return a;
    }, {pts:0,reb:0,ast:0,blk:0,stl:0,tov:0,fgM:0,fgA:0,threeM:0,threeA:0,ftM:0,ftA:0});
    const gp = miniGames.length;
    const avg = {
      ppg:+(totals.pts/gp).toFixed(1),
      rpg:+(totals.reb/gp).toFixed(1),
      apg:+(totals.ast/gp).toFixed(1),
      bpg:+(totals.blk/gp).toFixed(1),
      spg:+(totals.stl/gp).toFixed(1),
      topg:+(totals.tov/gp).toFixed(1)
    };
    const pct = {
      fg: totals.fgA ? +(totals.fgM/totals.fgA*100).toFixed(1) : 0,
      three: totals.threeA ? +(totals.threeM/totals.threeA*100).toFixed(1) : 0,
      ft: totals.ftA ? +(totals.ftM/totals.ftA*100).toFixed(1) : 0
    };
    return { gp, avg, pct };
  }, [miniGames]);

  const MiniStat = ({ label, value, suffix="" }) => (
    <div className="mini-stat-badge">
      <span className="mini-stat-label">{label}</span>
      <span className="mini-stat-value">{value}{suffix}</span>
    </div>
  );
  /* ---------------------------------------------------- */

  /* auth listener */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          setNickname(
            snap.data().nickname || snap.data().name || "Hoop Logger"
          );
        } else {
          setNickname("Hoop Logger");
        }
        setTimeout(() => {
          setNicknameLoading(false);
          setShowSplash(false);
        }, 800);

        /* subscribe to this user's shots */
        const q = query(
          collection(db, "shots"),
          where("userId", "==", firebaseUser.uid)
        );
        const unsubShots = onSnapshot(q, (snap) => {
          const docs = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(s => s.attempted > 0);

            if (!docs.length) {
              setLatest(null); setBest(null); setWorst(null); setFav(null);
              return;
            }

            setLatest(
              [...docs].sort(
                (a, b) =>
                  (b.timestamp?.toMillis?.() || 0) -
                  (a.timestamp?.toMillis?.() || 0)
              )[0]
            );
            setBest(
              [...docs].sort(
                (a, b) => b.made / b.attempted - a.made / a.attempted
              )[0]
            );
            setWorst(
              [...docs].sort(
                (a, b) => a.made / a.attempted - b.made / b.attempted
              )[0]
            );

            const maxAttempt = Math.max(...docs.map(d => d.attempted));
            const mostAttempted = docs.filter(d => d.attempted === maxAttempt);
            if (mostAttempted.length === 1) {
              setFav(mostAttempted[0]);
            } else {
              const bestSpot = mostAttempted.sort((a, b) => {
                const aPct = a.attempted ? a.made / a.attempted : 0;
                const bPct = b.attempted ? b.made / b.attempted : 0;
                return bPct - aPct;
              })[0];
              setFav(bestSpot);
            }
        });

        return () => unsubShots();
      } else {
        /* signed out */
        setNickname("Hoop Logger");
        setTimeout(() => {
          setNicknameLoading(false);
          setShowSplash(false);
        }, 600);
        setLatest(null); setBest(null); setWorst(null); setFav(null);
        setPlanData(null);
        setCompletedDates([]);
      }
    });

    return () => unsubAuth();
  }, []);

  /* rotate quotes */
  useEffect(() => {
    const w = setInterval(
      () => setWelcomeIdx(i => (i + 1) % welcomeQuotes.length),
      4000
    );
    const l = setInterval(
      () => setLegendIdx(i => (i + 1) % dashboardQuotes.length),
      6000
    );
    return () => { clearInterval(w); clearInterval(l); };
  }, []);

  /* load workout plan (user‑scoped) */
  useEffect(() => {
    if (user === null) {
      setPlanData(null);
      setCompletedDates([]);
      setPlanLoading(false);
      return;
    }
    if (!user) return;
    setPlanLoading(true);

    try {
      // migrate any legacy local keys to user‑scoped
      const legacyPlan = localStorage.getItem(LS_PLAN_KEY_BASE);
      const legacyDone = localStorage.getItem(LS_DONE_KEY_BASE);
      if (legacyPlan && !localStorage.getItem(planKey)) {
        localStorage.setItem(planKey, legacyPlan);
      }
      if (legacyDone && !localStorage.getItem(doneKey)) {
        localStorage.setItem(doneKey, legacyDone);
      }

      // seed with any local copy immediately (prevents flash)
      const rawPlan = localStorage.getItem(planKey);
      const rawDone = localStorage.getItem(doneKey);
      if (rawPlan) {
        try {
          const parsed = JSON.parse(rawPlan);
          if (parsed && parsed.plan) {
            setPlanData(parsed);
          }
        } catch {}
      }
      if (rawDone) {
        try { setCompletedDates(JSON.parse(rawDone)); } catch {}
      }
    } catch {
      // ignore
    }
  }, [user, planKey, doneKey]);
  /* live Firestore subscription for workout plan (keeps dashboard in sync with WorkoutTracker) */
  useEffect(() => {
    if (!user) return;

    const planRef = doc(db, "workoutPlans", user.uid);
    const unsubPlan = onSnapshot(
      planRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
            // shape: { focusKey, startDate, days, plan, completedDates, drillProgress,... }
            if (data.plan) {
              const remotePlan = {
                focusKey: data.focusKey,
                startDate: data.startDate,
                days: data.days,
                plan: data.plan
              };
              setPlanData(remotePlan);
              setCompletedDates(Array.isArray(data.completedDates) ? data.completedDates : []);
              // persist lightweight cache locally (optional)
              try {
                localStorage.setItem(planKey, JSON.stringify(remotePlan));
                localStorage.setItem(doneKey, JSON.stringify(data.completedDates || []));
              } catch {}
            } else {
              setPlanData(null);
              setCompletedDates([]);
            }
        } else {
          setPlanData(null);
          setCompletedDates([]);
        }
        setPlanLoading(false);
      },
      () => {
        // on error just stop loading to allow UI to show start card
        setPlanLoading(false);
      }
    );
    return () => unsubPlan();
  }, [user, planKey, doneKey]);

  /* helpers */
  const pct = s => (s ? Math.round((s.made / s.attempted) * 100) : 0);
  const sub = s =>
    s ? `${s.zoneLabel} • ${s.timestamp?.toDate?.().toLocaleString()}` : "—";

  const todayISO = () => new Date().toISOString().slice(0, 10);
  const todayWorkout = planData?.plan?.[todayISO()] || null;
  const isTodayComplete = completedDates.includes(todayISO());
  const planProgressPct = planData
    ? Math.round(
        (completedDates.filter(d => planData.plan[d]).length / planData.days) * 100
      )
    : 0;

  const handleTrackShotsClick = () => {
    if (!user) {
      sessionStorage.setItem("redirectMsg","You must be logged in to track your shots.");
      navigate("/login");
    } else {
      navigate("/shottracker");
    }
  };

  const handleOpenWorkout = () => {
    if (!user) {
      sessionStorage.setItem("redirectMsg","Log in to access your workout plan.");
      navigate("/login");
      return;
    }
    navigate("/workouttracker");
  };

  /* early splash */
  if (nicknameLoading || showSplash) {
    return <SplashScreen fadeOut={!nicknameLoading} />;
  }

  return (
    <>
      <SiteHeader />
      <main className="dashboard-content">
         {/* Profile completeness notice */}
         {user && profile && isProfileIncomplete && (
          <div className="profile-incomplete-banner">
            <span>
              Please complete your profile to unlock all features.
            </span>
            <Link to="/profile" className="profile-complete-btn">
              Go to Profile
            </Link>
          </div>
        )}
        <div className="welcome-box">
          <h1 className="fade-in-text">Welcome {nickname}!</h1>
          <p className="motivation-text fade-in-text delayed">
            {welcomeQuotes[welcomeIdx]}
          </p>
        </div>

        <section style={{ marginTop: "3rem" }}>
          <h2 style={{ textAlign: "center", color: "#384959", marginBottom: "1.5rem", textDecoration: "underline" }}>
            Your Shot Performance
          </h2>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"28px", justifyContent:"center" }}>
            <ShotProgressRing title="🕒 Latest Shot" pct={pct(latest)} subtitle={sub(latest)} />
            <ShotProgressRing title="🏆 Best Shot"   pct={pct(best)}   subtitle={sub(best)}   />
            <ShotProgressRing title="⚠️ Area to Improve" pct={pct(worst)} subtitle={sub(worst)} />
            <ShotProgressRing title="⭐ Favourite Spot"  pct={pct(fav)}  subtitle={sub(fav)}   />
          </div>
        </section>

        <section style={{ textAlign:"center", marginTop:"2rem" }}>
          <p style={{ fontStyle:"italic", color:"#6A89A7", maxWidth:600, margin:"0 auto 1.5rem" }}>
            {dashboardQuotes[legendIdx]}
          </p>
          <button
            onClick={handleTrackShotsClick}
            style={{
              display:"inline-flex", alignItems:"center", gap:"8px",
              background:"#6A89A7", color:"#fff", padding:"12px 24px",
              borderRadius:"30px", fontWeight:600, textDecoration:"none",
              boxShadow:"0 4px 10px rgba(0,0,0,0.1)", border:"none", cursor:"pointer"
            }}
          >
            Track your shots <span style={{ fontSize:"1.2rem" }}>➜</span>
          </button>
        </section>

  {/* ----------- WORKOUT + STATS (SIDE BY SIDE) ----------- */}
  <section className="ws-section">
          <div className="ws-two-col">
            {/* LEFT PANEL: DAILY WORKOUT SNAPSHOT */}
            <div className="ws-panel">
              <header className="ws-header">
                <div>
                  <h2 id="ws-heading" className="ws-title">Daily Workout Snapshot</h2>
                  <p className="ws-sub">Track today’s focus, progress, and momentum.</p>
                </div>
                {planData && planData.focusKey && (
                  <div className="ws-meta">
                    <span className="ws-meta-chip">
                      {planProgressPct}% Complete
                    </span>
                  </div>
                )}
              </header>

              <div className="ws-grid">
                {/* LOADING (suppress start card while checking Firestore) */}
                {user && planLoading && (
                  <div className="ws-card ws-card-placeholder">
                    <div className="ws-card-body ws-placeholder-body">
                      <h3 className="ws-placeholder-title">Loading Plan...</h3>
                      <p className="ws-placeholder-text">
                        Fetching your current 30‑day session.
                      </p>
                    </div>
                  </div>
                )}

                {/* NO PLAN (only when confirmed not loading & no focus plan) */}
                {user && !planLoading && (!planData || !planData.focusKey) && (
                  <div className="ws-card ws-card-accent">
                    <div className="ws-card-body">
                      <h3 className="ws-card-title gradient">Start A Session Now</h3>
                      <p className="ws-text">
                        Kick off a focused 30‑day progression: structured daily drills, repeatable focus cycles, visible momentum.
                      </p>
                      <ul className="ws-list">
                        <li>Auto‑scheduled categories</li>
                        <li>Primary focus surfaces more</li>
                        <li>Daily completion tracking</li>
                        <li>Momentum & consistency builder</li>
                      </ul>
                    </div>
                    <div className="ws-actions">
                      <button className="ws-btn ws-btn-primary" onClick={handleOpenWorkout}>
                        Start 30‑Day Plan
                      </button>
                    </div>
                  </div>
                )}

                {/* NOT LOGGED IN */}
                {!user && !planLoading && (
                  <div className="ws-card ws-card-accent">
                    <div className="ws-card-body">
                      <h3 className="ws-card-title gradient">Start A Session</h3>
                      <p className="ws-text">
                        Log in to launch a personalized 30‑day workout rotation and stack consistent daily reps.
                      </p>
                    </div>
                    <div className="ws-actions">
                      <button className="ws-btn ws-btn-primary" onClick={handleOpenWorkout}>
                        Log In To Begin
                      </button>
                    </div>
                  </div>
                )}

                {/* REST DAY (plan exists, no drills today) */}
                {user && !planLoading && planData?.focusKey && planData && !todayWorkout && (
                  <div className="ws-card">
                    <div className="ws-card-body">
                      <div className="ws-row">
                        <h3 className="ws-card-title">Rest / Recovery Day</h3>
                        <span className="ws-badge ws-badge-rest">Rest</span>
                      </div>
                      <p className="ws-text">No drills scheduled today. Stay loose or review earlier sessions.</p>
                    </div>
                    <div className="ws-actions">
                      <button className="ws-btn ws-btn-outline" onClick={handleOpenWorkout}>
                        View Plan
                      </button>
                    </div>
                  </div>
                )}

                {/* ACTIVE DAY (current day's drills) */}
                {user && !planLoading && planData?.focusKey && todayWorkout && (
                  <div className={`ws-card ${isTodayComplete ? "is-complete" : ""}`}>
                    <div className="ws-card-body">
                      <div className="ws-row">
                        <h3 className="ws-card-title">
                          Day {todayWorkout.day} • {todayWorkout.categoryTitle}
                        </h3>
                        <span
                          className={`ws-badge ${isTodayComplete ? "ws-badge-complete" : "ws-badge-progress"}`}
                        >
                          {isTodayComplete ? "Completed" : "In Progress"}
                        </span>
                      </div>

                      <ul className="ws-drill-tags">
                        {todayWorkout.drills.slice(0, 6).map((d, i) => {
                          const name = typeof d === "string" ? d : d.name;
                          return <li key={i}>{name}</li>;
                        })}
                      </ul>

                      <div className="ws-progress">
                        <div className="ws-progress-bar">
                          <div className="ws-progress-fill" style={{ width: `${planProgressPct}%` }} />
                        </div>
                        <span className="ws-progress-label">
                          {planProgressPct}% plan progress
                        </span>
                      </div>
                    </div>

                    <div className="ws-actions">
                      <button className="ws-btn ws-btn-primary" onClick={handleOpenWorkout}>
                        {isTodayComplete ? "View Session" : "Go To Workout"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL: SEASON STATS SNAPSHOT */}
            <div className="ws-panel">
              <header className="ws-header ws-header-min">
              <div>
                  <h2 id="ws-heading" className="ws-title">Stats Tracker</h2>
                  <p className="ws-sub">Note down your ppg, apg, blocks, steals and others <br /></p>
                </div>
              </header>

              {!user && (
                <div className="ws-card ws-card-placeholder">
                  <div className="ws-card-body ws-placeholder-body">
                    <h3 className="ws-placeholder-title">Log In To View</h3>
                    <p className="ws-placeholder-text">
                      Sign in to see your per–game averages and shooting percentages here.
                    </p>
                    <div className="ws-actions">
                      <button className="ws-btn ws-btn-primary" onClick={()=>navigate("/login")}>
                        Log In
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {user && miniGames.length === 0 && (
                <div className="ws-card ws-card-placeholder">
                  <div className="ws-card-body ws-placeholder-body">
                    <h3 className="ws-placeholder-title">No Games Logged</h3>
                    <p className="ws-placeholder-text">
                      Start building your performance record. Add a game in the Stats Tracker page.
                    </p>
                    <div className="ws-actions">
                      <button className="ws-btn ws-btn-primary" onClick={()=>navigate("/statstracker")}>
                        Open Stats Tracker
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {user && miniGames.length > 0 && (
                <div className="ws-card ws-card-accent">
                  <div className="ws-card-body">
                    <h3 className="ws-card-title gradient">Season Snapshot</h3>
                    <div className="mini-stats-grid">
                      <MiniStat label="GP"  value={miniStats.gp} />
                      <MiniStat label="PPG" value={miniStats.avg.ppg} />
                      <MiniStat label="RPG" value={miniStats.avg.rpg} />
                      <MiniStat label="APG" value={miniStats.avg.apg} />
                      <MiniStat label="SPG" value={miniStats.avg.spg} />
                      <MiniStat label="BPG" value={miniStats.avg.bpg} />
                      <MiniStat label="T/O" value={miniStats.avg.topg} />
                      <MiniStat label="FG%" value={miniStats.pct.fg} suffix="%" />
                      <MiniStat label="3P%" value={miniStats.pct.three} suffix="%" />
                      <MiniStat label="FT%" value={miniStats.pct.ft} suffix="%" />
                    </div>
                  </div>
                  <div className="ws-actions">
                    <button className="ws-btn ws-btn-outline" onClick={()=>navigate("/statstracker")}>
                      View / Log Games
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
        {/* ----------- END WORKOUT + STATS WRAPPER ----------- */}
      </main>
      <SiteFooter />
    </>
  );
};

export default Dashboard;

