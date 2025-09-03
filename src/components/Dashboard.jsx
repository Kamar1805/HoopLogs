import SplashScreen from "./SplashScreen";
import React, { useState, useEffect } from "react";
import "./Dashboard.css";

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

/* BASE (legacy) LOCAL STORAGE KEYS (were GLOBAL before) */
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

  /* shot stats */
  const [latest, setLatest] = useState(null);
  const [best,   setBest]   = useState(null);
  const [worst,  setWorst]  = useState(null);
  const [fav,    setFav]    = useState(null);

  /* workout snapshot (now user‑scoped) */
  const [planData, setPlanData] = useState(null);
  const [completedDates, setCompletedDates] = useState([]);

  /* derive user‑scoped keys */
  const planKey = user ? `${LS_PLAN_KEY_BASE}_${user.uid}` : null;
  const doneKey = user ? `${LS_DONE_KEY_BASE}_${user.uid}` : null;

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
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((s) => s.attempted > 0);

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

  /* load workout plan AFTER user known (user‑scoped) */
  useEffect(() => {
    if (user === null) {
      // not logged in: show no plan
      setPlanData(null);
      setCompletedDates([]);
      return;
    }
    if (!user) return; // still determining

    try {
      // migration: if legacy global keys exist & user‑scoped missing, migrate.
      const legacyPlan = localStorage.getItem(LS_PLAN_KEY_BASE);
      const legacyDone = localStorage.getItem(LS_DONE_KEY_BASE);
      if (legacyPlan && !localStorage.getItem(planKey)) {
        localStorage.setItem(planKey, legacyPlan);
      }
      if (legacyDone && !localStorage.getItem(doneKey)) {
        localStorage.setItem(doneKey, legacyDone);
      }

      const rawPlan = localStorage.getItem(planKey);
      const rawDone = localStorage.getItem(doneKey);

      setPlanData(rawPlan ? JSON.parse(rawPlan) : null);
      setCompletedDates(rawDone ? JSON.parse(rawDone) : []);
    } catch {
      setPlanData(null);
      setCompletedDates([]);
    }
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

  if (nicknameLoading || showSplash) {
    return <SplashScreen fadeOut={!nicknameLoading} />;
  }

  return (
    <>
      <SiteHeader />
      <main className="dashboard-content">
        <div className="welcome-box">
          <h1 className="fade-in-text">Welcome {nickname}!</h1>
          <p className="motivation-text fade-in-text delayed">
            {welcomeQuotes[welcomeIdx]}
          </p>
        </div>

        <section style={{ marginTop: "3rem" }}>
          <h2 style={{ textAlign: "center", color: "#384959", marginBottom: "1.5rem" }}>
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

        {/* ----------- WORKOUT SNAPSHOT SECTION ----------- */}
        <section className="dash-workout-section">
          <h2 className="dash-workout-heading">Daily Workout Snapshot</h2>

          {/* NO PLAN (user has not started) */}
          {user && !planData && (
            <div className="dash-workout-card no-plan">
              <h3 className="dw-start-title">Start A Session Now</h3>
              <p className="dw-line dw-intro">
                Kick off a focused 30‑day progression: structured daily drills,
                repeatable focus cycles, visible momentum.
              </p>
              <ul className="dw-benefits">
                <li>Auto‑scheduled categories</li>
                <li>Primary focus appears more</li>
                <li>Daily completion tracking</li>
                <li>Momentum & consistency builder</li>
              </ul>
              <button className="dw-btn" onClick={handleOpenWorkout}>
                Start 30‑Day Plan
              </button>
            </div>
          )}

          {/* NOT LOGGED IN (prompt) */}
          {!user && (
            <div className="dash-workout-card no-plan">
              <h3 className="dw-start-title">Start A Session</h3>
              <p className="dw-line dw-intro">
                Log in to launch a personalized 30‑day workout rotation and
                stack consistent daily reps.
              </p>
              <button className="dw-btn" onClick={handleOpenWorkout}>
                Log In To Begin
              </button>
            </div>
          )}

          {/* REST DAY (plan exists but no drills today) */}
          {user && planData && !todayWorkout && (
            <div className="dash-workout-card">
              <div className="dw-top">
                <h3 className="dw-title">Rest / Recovery Day</h3>
                <span className="dw-status rest">REST</span>
              </div>
              <p className="dw-line">No drills scheduled today.</p>
              <div className="dw-actions">
                <button className="dw-btn ghost" onClick={handleOpenWorkout}>
                  View Plan
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE DAY */}
          {user && planData && todayWorkout && (
            <div className={`dash-workout-card ${isTodayComplete ? "done" : ""}`}>
              <div className="dw-top">
                <h3 className="dw-title">
                  Day {todayWorkout.day} • {todayWorkout.categoryTitle}
                </h3>
                <span className={`dw-status ${isTodayComplete ? "complete" : "in-progress"}`}>
                  {isTodayComplete ? "Completed" : "In Progress"}
                </span>
              </div>

              <ul className="dw-drills">
                {todayWorkout.drills.slice(0,4).map((d,i) => {
                  const name = typeof d === "string" ? d : d.name;
                  return <li key={i}>{name}</li>;
                })}
              </ul>

              <div className="dw-progress-wrap">
                <div className="dw-progress-bar">
                  <div className="fill" style={{ width: `${planProgressPct}%` }} />
                </div>
                <span className="dw-progress-label">
                  {planProgressPct}% plan progress
                </span>
              </div>

              <div className="dw-actions">
                <button className="dw-btn" onClick={handleOpenWorkout}>
                  {isTodayComplete ? "View Session" : "Continue Session"}
                </button>
              </div>
            </div>
          )}
        </section>
        {/* ----------- END WORKOUT SNAPSHOT ----------- */}
      </main>
      <SiteFooter />
    </>
  );
};

export default Dashboard;