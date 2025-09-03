import React, { useState, useEffect } from "react";
import "./WorkoutTracker.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { FaLock, FaPlay, FaCheck, FaRedo, FaTimes } from "react-icons/fa";
import PaystackUpgradeButton from "../components/PayStackUpgradeButton";
import { auth, db } from "../Firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

/* CONFIG ------------------------------------------------------------------ */
const workoutCategories = [
  {
    key: "conditioning",
    title: "Conditioning Drills",
    emoji: "🔥",
    blurb: "Cardio + movement endurance & repeat sprint capacity.",
    drills: [
      "Shuttle Sprints 10x",
      "Suicides x4",
      "Full Court Push Pace x8",
      "Lane Agility Repeat 6x",
      "Jump Rope 3x2min",
      "Defensive Slides Corners x6",
      "Jog to Sprint Change x10",
    ],
  },
  {
    key: "shooting",
    title: "Shooting Drills",
    emoji: "🎯",
    blurb: "Form, rhythm, range & pressure composure.",
    drills: [
      "Form Close‑Range (40 makes)",
      "1‑Dribble Pull-Ups (20 total)",
      "Catch & Shoot 5 Spots (25 makes)",
      "Free Throw Routine (30 makes)",
      "Game-Speed Transition 3s (20 reps)",
      "Corner to Wing Relocation (20 makes)",
      "Spin Out Midrange (20 makes)",
    ],
  },
  {
    key: "vertical",
    title: "Vertical / Dunk Training",
    emoji: "🦘",
    blurb: "Elasticity + approach mechanics for explosion.",
    drills: [
      "Approach Jump Technique (8 reps)",
      "Depth Jumps (3x6)",
      "Loaded Squat Jumps (3x6)",
      "Broad Jump to Sprint 4x",
      "Single Leg Bounds 3x10m",
      "Calf / Tibialis Raises 3x15",
      "Hip Extension Bridges 3x12",
    ],
  },
  {
    key: "ballhandling",
    title: "Ball Handling",
    emoji: "🤹‍♂️",
    blurb: "Control, pace & deception layers.",
    drills: [
      "Pound Series 3x30s",
      "In/Out Cross Series 3x20",
      "Cone Change of Direction 4x",
      "Retreat & Re-attack 3x10",
      "Weak-Hand Only Circuit 3x30s",
    ],
  },
  {
    key: "strength",
    title: "Strength & Mobility",
    emoji: "💪",
    blurb: "Movement quality & joint integrity foundation.",
    drills: [
      "Split Squats 3x10/leg",
      "Push / Pull Superset 3x10",
      "Pallof Press 3x12",
      "Glute Bridge / Ham Raise 3x12",
      "Ankle & Hip Mobility Flow 6min",
      "Plank Variations 3x40s",
    ],
  },
  {
    key: "recovery",
    title: "Recovery & Flexibility",
    emoji: "🧘‍♂️",
    blurb: "Restore tissues & reduce system load.",
    drills: [
      "Full Body Foam Roll 6min",
      "90/90 Hip Flow 3x",
      "Hamstring Floss 2x12/leg",
      "Thoracic Openers 2x10",
      "Guided Breath 5min",
    ],
  },
  {
    key: "mental",
    title: "Mental & Strategy",
    emoji: "🧠",
    blurb: "Game IQ, visualization & composure.",
    drills: [
      "Visualization Script 5min",
      "Film Breakdown 10min",
      "Set Play Recall 10 reps",
      "Shot Routine Mental Reps 15",
      "Gratitude + Focus Journal",
    ],
  },
];

// New distribution constants
const FIRST_WEEK_DAYS = 7;
const DRILLS_PER_DAY_MIN = 6;
const DRILLS_PER_DAY_MAX = 10;
const FOCUS_RATIO_AFTER_WEEK = 0.7; // 70% focus drills, 30% others


/* UNLOCK / PLAN SETTINGS -------------------------------------------------- */
const FREE_KEYS = ["conditioning", "shooting", "vertical"];
const PLAN_DAYS = 30;

/* LEGACY LOCAL STORAGE KEYS (for one-time migration) */
const LS_PLAN_KEY = "hl_schedule_v2";
const LS_DONE_KEY = "hl_completed_v2";
const LS_DRILL_PROGRESS = "hl_drill_progress_v1";

/* DRILL GUIDES ------------------------------------------------------------ */
const DRILL_GUIDES = {
  "Shuttle Sprints 10x": [
    "Markers at FT line, half, opposite baseline.",
    "Sprint to each marker & back (short->long).",
    "Relax shoulders on return jog.",
  ],
  "Suicides x4": [
    "Baseline to FT, back; half, back; opposite FT, back; full, back.",
    "pace 1-2 at 80%, 3-4 push 90%+.",
    "Deep nasal in / mouth out.",
  ],
  "Full Court Push Pace x8": [
    "Down & back continuous.",
    "Maintain upright posture.",
    "Target even splits.",
  ],
  "Jump Rope 3x2min": [
    "Light feet, neutral wrists.",
    "30s rest between rounds.",
    "Stay tall, no tucking.",
  ],
  "Form Close‑Range (40 makes)": [
    "One-hand form early reps.",
    "Hold follow-through 1s.",
    "Arc + soft rim touch.",
  ],
  "1‑Dribble Pull-Ups (20 total)": [
    "Alternate directions.",
    "Plant inside foot stable.",
    "Rise vertical, stay square.",
  ],
  "Catch & Shoot 5 Spots (25 makes)": [
    "5 spots baseline–baseline.",
    "Game-speed footwork.",
    "Track makes/attempts.",
  ],
  "Free Throw Routine (30 makes)": [
    "Rep exact routine.",
    "Deep breath before shot.",
    "Track streak best.",
  ],
  "Approach Jump Technique (8 reps)": [
    "Controlled 2–3 step build.",
    "Full extension upward.",
    "Stick landing softly.",
  ],
  "Depth Jumps (3x6)": [
    "Step off (don’t jump).",
    "Absorb then explode fast.",
    "60–90s rest sets.",
  ],
  "Loaded Squat Jumps (3x6)": [
    "Light load only.",
    "Explosive concentric.",
    "Reset stance each rep.",
  ],
  "Split Squats 3x10/leg": [
    "Front shin vertical.",
    "2s lower, drive up.",
    "No knee cave.",
  ],
  "Pallof Press 3x12": [
    "Band/cable chest height.",
    "Press, resist rotation.",
    "Exhale on press.",
  ],
  "Plank Variations 3x40s": [
    "Glutes + core braced.",
    "Neutral neck line.",
    "No hip sag/pike.",
  ],
};

/* HELPERS ----------------------------------------------------------------- */
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function buildInstruction(catKey, drill, emoji) {
  const hints = {
    shooting: "Track makes & attempts; balanced mechanics.",
    conditioning: "Control pacing early; smooth turns.",
    vertical: "Full recovery between power sets (60–90s).",
    ballhandling: "Eyes up; sharp rhythm + foot timing.",
    strength: "Quality movement over load.",
    recovery: "Breathe slow; ease into range.",
    mental: "Single-task attention; no distractions.",
  };
  return `${emoji} ${drill}\n${hints[catKey] || ""}`;
}
function guideSteps(drillName) {
  return DRILL_GUIDES[drillName] || [
    "Maintain quality form.",
    "Log honest effort.",
    "Hydrate and recover.",
  ];
}

/* PLAN GENERATION --------------------------------------------------------- */
/* PLAN GENERATION --------------------------------------------------------- */
// REPLACED generatePlan with 70/30 logic + first week pure focus + 6-10 drills/day
function generatePlan(focusKey){
  const focusCat = workoutCategories.find(c=>c.key===focusKey) || workoutCategories[0];
  const others   = workoutCategories.filter(c=>c.key!==focusKey);
  const start = todayISO();
  const plan = {};
  const rotations = {};
  workoutCategories.forEach(c => rotations[c.key]=0);

  for (let i=0;i<PLAN_DAYS;i++){
    const date = addDays(start,i);
    const drillCount = DRILLS_PER_DAY_MIN + Math.floor(Math.random() * (DRILLS_PER_DAY_MAX - DRILLS_PER_DAY_MIN + 1));
    let drills=[];

    if (i < FIRST_WEEK_DAYS){
      drills = pickFromCategory(focusCat, drillCount);
    } else {
      const focusNeeded = Math.max(1, Math.round(drillCount * FOCUS_RATIO_AFTER_WEEK));
      const otherNeeded = Math.max(0, drillCount - focusNeeded);
      drills = [
        ...pickFromCategory(focusCat, focusNeeded),
        ...pickFromOthers(others, otherNeeded)
      ];
    }
    plan[date] = {
      day: i+1,
      categoryKey: focusCat.key,
      categoryTitle: focusCat.title,
      drills: drills
    };
  }
  return { focusKey, startDate:start, days:PLAN_DAYS, plan };

  function pickFromCategory(cat, count){
    const out=[];
    for (let k=0;k<count;k++){
      const list = cat.drills;
      const idx = rotations[cat.key] % list.length;
      const name = list[idx];
      out.push({
        name,
        summary: buildInstruction(cat.key, name, cat.emoji),
        steps: guideSteps(name)
      });
      rotations[cat.key] = (rotations[cat.key] + 1) % list.length;
    }
    return out;
  }
  function pickFromOthers(cats, count){
    if (!count || !cats.length) return [];
    const out=[];
    for (let k=0;k<count;k++){
      const cat = cats[k % cats.length];
      out.push(...pickFromCategory(cat,1));
    }
    return out;
  }
}

/* COMPONENT ---------------------------------------------------------------- */
const WorkoutTracker = () => {
  const navigate = useNavigate();

  /* AUTH */
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  

  /* PREMIUM (placeholder) */
  const [hasPremium, setHasPremium] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  /* PLAN STATE (Firestore user-scoped) */
  const [planData, setPlanData] = useState(null);
  const [completedDates, setCompletedDates] = useState([]);
  const [drillProgress, setDrillProgress] = useState({});
  const [dataSaving, setDataSaving] = useState(false);

  /* UI STATE */
  const [focusModalOpen, setFocusModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [now, setNow] = useState(new Date());

   // NEW: focus change confirmation state
   const [focusChangeConfirm, setFocusChangeConfirm] = useState({
    open: false,
    newKey: null,
  });

  /* AUTH LISTENER */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, fbUser => {
      setUser(fbUser || null);
      setAuthChecking(false);
    });
    return () => unsub();
  }, []);

  /* MIGRATE LEGACY LOCAL STORAGE ON FIRST USER PLAN CREATION */
  const migrateLocalToFirestore = async uid => {
    try {
      const docRef = doc(db, "workoutPlans", uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) return; // already has plan
      const rawPlan = localStorage.getItem(LS_PLAN_KEY);
      if (!rawPlan) return;
      const parsedPlan = JSON.parse(rawPlan);
      // Normalize legacy drills
      const normalPlan = {};
      Object.entries(parsedPlan.plan || {}).forEach(([date, entry]) => {
        normalPlan[date] = {
          ...entry,
          drills: (entry.drills || []).map(dr =>
            typeof dr === "string"
              ? {
                  name: dr,
                  summary: buildInstruction(entry.categoryKey, dr, "🏀"),
                  steps: guideSteps(dr),
                }
              : {
                  ...dr,
                  summary:
                    dr.summary ||
                    buildInstruction(entry.categoryKey, dr.name, "🏀"),
                  steps: Array.isArray(dr.steps)
                    ? dr.steps
                    : guideSteps(dr.name),
                }
          ),
        };
      });
      const rawDone = localStorage.getItem(LS_DONE_KEY);
      const rawProg = localStorage.getItem(LS_DRILL_PROGRESS);
      await setDoc(docRef, {
        focusKey: parsedPlan.focusKey || null,
        startDate: parsedPlan.startDate || todayISO(),
        days: parsedPlan.days || PLAN_DAYS,
        plan: normalPlan,
        completedDates: rawDone ? JSON.parse(rawDone) : [],
        drillProgress: rawProg ? JSON.parse(rawProg) : {},
        updatedAt: serverTimestamp(),
      });
      // Clear legacy
      localStorage.removeItem(LS_PLAN_KEY);
      localStorage.removeItem(LS_DONE_KEY);
      localStorage.removeItem(LS_DRILL_PROGRESS);
    } catch (e) {
      console.warn("Migration failed", e);
    }
  };

  /* LOAD USER PLAN */
  useEffect(() => {
    if (!user) {
      setPlanData(null);
      setCompletedDates([]);
      setDrillProgress({});
      return;
    }
    (async () => {
      await migrateLocalToFirestore(user.uid);
      try {
        const snap = await getDoc(doc(db, "workoutPlans", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          // Normalize any legacy shapes
          const normPlan = {};
            Object.entries(data.plan || {}).forEach(([date, entry]) => {
              normPlan[date] = {
                ...entry,
                drills: (entry.drills || []).map(dr =>
                  typeof dr === "string"
                    ? {
                        name: dr,
                        summary: buildInstruction(entry.categoryKey, dr, "🏀"),
                        steps: guideSteps(dr),
                      }
                    : {
                        ...dr,
                        summary:
                          dr.summary ||
                          buildInstruction(entry.categoryKey, dr.name, "🏀"),
                        steps: Array.isArray(dr.steps)
                          ? dr.steps
                          : guideSteps(dr.name),
                      }
                ),
              };
            });
          setPlanData({
            focusKey: data.focusKey,
            startDate: data.startDate,
            days: data.days,
            plan: normPlan,
          });
          setCompletedDates(data.completedDates || []);
          setDrillProgress(data.drillProgress || {});
        } else {
          setPlanData(null);
        }
      } catch (e) {
        console.warn("Load plan failed", e);
      }
    })();
  }, [user]);

  /* PERSIST PARTIAL CHANGES */
  const persist = async partial => {
    if (!user) return;
    setDataSaving(true);
    const ref = doc(db, "workoutPlans", user.uid);
    try {
      await updateDoc(ref, { ...partial, updatedAt: serverTimestamp() });
    } catch (e) {
      // If document missing create it
      await setDoc(ref, {
        focusKey: planData?.focusKey || partial.focusKey || null,
        startDate: planData?.startDate || todayISO(),
        days: planData?.days || PLAN_DAYS,
        plan: planData?.plan || {},
        completedDates,
        drillProgress,
        ...partial,
        updatedAt: serverTimestamp(),
      });
    }
    setDataSaving(false);
  };

  /* CLOCK */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* EXTEND / ENSURE TODAY ENTRY (if plan created previously & missing day) */
  useEffect(() => {
    if (!planData || !planData.focusKey) return;
    const { plan, focusKey, startDate, days } = planData;
    const diff =
      Math.floor((new Date(todayISO()) - new Date(startDate)) / 86400000);
    if (diff >= days) return;
    if (!plan[todayISO()]) {
      // regenerate fresh and merge missing dates
      const extra = generatePlan(focusKey);
      const merged = { ...plan };
      Object.entries(extra.plan).forEach(([date, entry]) => {
        if (!merged[date]) merged[date] = entry;
      });
      const newPlanData = { ...planData, plan: merged };
      setPlanData(newPlanData);
      persist({ plan: merged });
    }
  }, [planData]);

  /* UI ACTIONS ----------------------------------------------------------- */
  const openFocusModal = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setFocusModalOpen(true);
  };

 // New wrapper to request focus selection with confirmation if progress exists
 const requestFocusSelection = (focusKey) => {
  if (
    planData?.focusKey &&
    planData.focusKey !== focusKey &&
    (completedDates.length > 0 ||
      Object.keys(drillProgress || {}).length > 0)
  ){
    setFocusChangeConfirm({ open:true, newKey:focusKey });
    return;
  }
  startFocusedPlan(focusKey);
};

const startFocusedPlan = async focusKey => {
  if (!user) {
    navigate("/login");
    return;
  }
  if (!hasPremium && !FREE_KEYS.includes(focusKey)) {
    setSelectedFeature(
      workoutCategories.find(c => c.key === focusKey)?.title || "Premium"
    );
    setPremiumOpen(true);
    return;
  }
  const newPlan = generatePlan(focusKey);
  setPlanData(newPlan);
  setCompletedDates([]);
  setDrillProgress({});
  await setDoc(doc(db, "workoutPlans", user.uid), {
    ...newPlan,
    completedDates: [],
    drillProgress: {},
    updatedAt: serverTimestamp(),
  });
  setFocusModalOpen(false);
  setFocusChangeConfirm({ open: false, newKey: null });
  showToast("Plan created. Day 1 ready.");
};
  const resetPlan = async () => {
    if (!user) return;
    setPlanData(null);
    setCompletedDates([]);
    setDrillProgress({});
    await setDoc(doc(db, "workoutPlans", user.uid), {
      focusKey: null,
      startDate: null,
      days: PLAN_DAYS,
      plan: {},
      completedDates: [],
      drillProgress: {},
      updatedAt: serverTimestamp(),
    });
  };

  const showToast = msg => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const markTodayComplete = async () => {
    if (!user || !planData) return;
    const t = todayISO();
    if (!completedDates.includes(t)) {
      const updated = [...completedDates, t];
      setCompletedDates(updated);
      showToast("CoachGPT: Strong finish. Stack another tomorrow.");
      await persist({ completedDates: updated });
    }
  };

  const handleLockedTrackClick = cat => {
    if (!user) {
      navigate("/login");
      return;
    }
    setSelectedFeature(cat.title);
    setPremiumOpen(true);
  };

  /* DERIVED -------------------------------------------------------------- */
  const todayWorkout = planData?.plan?.[todayISO()] || null;
  const isTodayComplete = completedDates.includes(todayISO());
  const planProgressPct = planData
    ? Math.round(
        (completedDates.filter(d => planData.plan[d]).length /
          (planData.days || PLAN_DAYS)) *
          100
      )
    : 0;

  const dayDrillProgress = drillProgress[todayISO()] || {};

  const handleDrillDoneToggle = async idx => {
    if (!user || !todayWorkout || isTodayComplete) return;
    const date = todayISO();
    const updatedProgress = {
      ...drillProgress,
      [date]: { ...dayDrillProgress, [idx]: !dayDrillProgress[idx] },
    };
    setDrillProgress(updatedProgress);
    const allDone = todayWorkout.drills.every(
      (_, i) => updatedProgress[date][i] === true
    );
    if (allDone && !isTodayComplete) {
      await markTodayComplete();
      showToast("CoachGPT: Quality reps — momentum locked in.");
    } else {
      await persist({ drillProgress: updatedProgress });
    }
  };

  const historyItems =
    planData && completedDates.length
      ? completedDates
          .filter(d => planData.plan[d])
          .sort()
          .map(d => ({
            date: d,
            category: planData.plan[d].categoryTitle,
            day: planData.plan[d].day,
          }))
      : [];

  /* RENDER ---------------------------------------------------------------- */
  if (authChecking) {
    return (
      <>
        <SiteHeader />
        <div className="wt-auth-loading">
          <div className="wt-loading-center">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="workout-page-wrapper">
        {/* HERO */}
        <section
          className="wt-hero pro with-image"
          style={{ "--hero-photo": "url(/grind.webp)" }}
        >
          <div className="wt-hero-datebox">
            <span className="d">{now.toLocaleDateString()}</span>
            <span className="t">{now.toLocaleTimeString()}</span>
          </div>
            <h1 className="wt-hero-title">
              Your <span className="accent">Progress</span> Starts Now
            </h1>
          <p className="wt-hero-tagline full">
            Build consistent basketball growth: structure smarter sessions,
            follow a focused 30‑day rotation and stack disciplined daily wins.
          </p>
          <p className="wt-hero-tagline short">
            Structured sessions. Focused 30‑day rotation. Daily wins.
          </p>
          <div className="wt-hero-cta-row">
            {!user && (
              <button
                className="wt-btn primary"
                onClick={() => navigate("/login")}
              >
                <FaPlay /> Log In To Start
              </button>
            )}
            {user && !planData?.focusKey && (
              <button className="wt-btn primary" onClick={openFocusModal}>
                <FaPlay /> Start Session
              </button>
            )}
            {user && planData?.focusKey && (
              <button
                className="wt-btn primary"
                onClick={markTodayComplete}
                disabled={isTodayComplete || !todayWorkout}
              >
                {isTodayComplete ? <FaCheck /> : <FaPlay />}{" "}
                {isTodayComplete
                  ? "Day Completed"
                  : todayWorkout
                  ? "Complete Day"
                  : "No Drills Today"}
              </button>
            )}
            <button
              className="wt-btn ghost"
              onClick={() =>
                !user
                  ? navigate("/login")
                  : planData
                  ? setHistoryOpen(true)
                  : openFocusModal()
              }
            >
              View History
            </button>
          </div>
          {dataSaving && (
            <div className="wt-saving-indicator" aria-live="polite">
              Saving…
            </div>
          )}
        </section>

        {/* FOCUS STATUS */}
        {user && planData?.focusKey && (
          <section className="wt-focus-status">
            <div className="wt-plan-pill big">
              Focus:&nbsp;
              {
                workoutCategories.find(c => c.key === planData.focusKey)
                  ?.title
              }
              <span className="pct">{planProgressPct}%</span>
              <button
                className="pill-reset"
                onClick={resetPlan}
                title="Reset Plan"
              >
                <FaRedo />
              </button>
            </div>
          </section>
        )}

        {/* TODAY'S WORKOUT */}
        {user && planData && todayWorkout && (
          <section className="wt-today-section">
            <h2 className="wt-section-heading">Today's Workout</h2>
            <div
              className={`wt-today-card ${
                isTodayComplete ? "done-outline" : ""
              }`}
            >
              <div className="wt-today-head">
                <span className="emoji">
                  {
                    workoutCategories.find(
                      c => c.key === todayWorkout.categoryKey
                    )?.emoji
                  }
                </span>
                <h3>
                  Day {todayWorkout.day} • {todayWorkout.categoryTitle}
                </h3>
              </div>
              <ul className="wt-drill-seq">
                {todayWorkout.drills.map((d, idx) => {
                  const drillObj =
                    typeof d === "string"
                      ? {
                          name: d,
                          summary: buildInstruction(
                            todayWorkout.categoryKey,
                            d,
                            workoutCategories.find(
                              c => c.key === todayWorkout.categoryKey
                            )?.emoji || "🏀"
                          ),
                          steps: guideSteps(d),
                        }
                      : d;
                  const stepsArray = Array.isArray(drillObj.steps)
                    ? drillObj.steps
                    : guideSteps(drillObj.name);
                  const done = dayDrillProgress[idx] || isTodayComplete;
                  return (
                    <li
                      key={idx}
                      className={`seq-item ${done ? "done" : ""}`}
                    >
                      <div className="seq-main">
                        <button
                          className={`seq-check ${
                            done ? "checked" : ""
                          }`}
                          onClick={() => handleDrillDoneToggle(idx)}
                          disabled={isTodayComplete}
                          aria-label={
                            done ? "Drill completed" : "Mark drill done"
                          }
                        >
                          {done ? <FaCheck /> : ""}
                        </button>
                        <span className="seq-label">{drillObj.name}</span>
                      </div>
                      <pre className="seq-summary">
                        {drillObj.summary}
                      </pre>
                      <ol className="seq-steps">
                        {stepsArray.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </li>
                  );
                })}
              </ul>
              <div className="wt-progress-track">
                <div
                  className="bar"
                  style={{ width: `${planProgressPct}%` }}
                />
              </div>
              {isTodayComplete && (
                <div className="wt-done-note">
                  All drills complete. Great work.
                </div>
              )}
            </div>
          </section>
        )}

        {/* TRACKS */}
        <section className="wt-grid-section">
          <h2 className="wt-section-heading">Focus Tracks</h2>
          {!user && (
            <p className="wt-small-note">
              Log in to start a personalized 30‑day plan.
            </p>
          )}
          {user && !planData?.focusKey && (
            <p className="wt-small-note">
              Pick a focus to generate your 30‑day rotation.
            </p>
          )}
          <div className="wt-category-grid">
            {workoutCategories.map(cat => {
              const locked = !hasPremium && !FREE_KEYS.includes(cat.key);
              const active = planData?.focusKey === cat.key;
              return (
                <div
                  key={cat.key}
                  className={`wt-card ${locked ? "locked" : ""} ${
                    active ? "active" : ""
                  }`}
                >
                  {locked && (
                    <button
                      className="wt-lock-tag"
                      onClick={() => handleLockedTrackClick(cat)}
                    >
                      <FaLock /> Locked
                    </button>
                  )}
                  <div className="wt-card-head">
                    <span className="wt-card-emoji">{cat.emoji}</span>
                    <h3 className="wt-card-title">{cat.title}</h3>
                  </div>
                  <p className="wt-card-blurb">{cat.blurb}</p>
                  {!locked && (
                    <ul className="wt-drill-list">
                      {cat.drills.slice(0, 4).map((d, i) => (
                        <li key={i} className="wt-drill-item">
                          <span className="dot" /> {d}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="wt-card-actions">
                    <button
                      className="wt-btn tiny"
                      onClick={() =>
                        !user
                          ? navigate("/login")
                          : locked
                          ? handleLockedTrackClick(cat)
                          : active
                          ? undefined
                          : startFocusedPlan(cat.key)
                      }
                      disabled={active}
                    >
                      {!user
                        ? "Log In"
                        : locked
                        ? "Upgrade"
                        : active
                        ? "In Use"
                        : "Use As Focus"}
                    </button>
                    {!locked && active && (
                      <button
                        className="wt-btn tiny ghost"
                        onClick={openFocusModal}
                      >
                        Change Focus
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* INSIGHT */}
        {user && planData?.focusKey && (
          <section className="wt-insight-section">
            <h2 className="wt-section-heading">Plan Insight</h2>
            <div className="wt-insight-grid">
              <div className="wt-insight">
                <h4>Days Completed</h4>
                <p>
                  <strong>
                    {
                      completedDates.filter(d => planData.plan[d])
                        .length
                    }
                  </strong>{" "}
                  / {planData.days}
                </p>
              </div>
              <div className="wt-insight">
                <h4>Focus Track</h4>
                <p>
                  {
                    workoutCategories.find(
                      c => c.key === planData.focusKey
                    )?.title
                  }
                </p>
              </div>
              <div className="wt-insight">
                <h4>Start Date</h4>
                <p>{planData.startDate}</p>
              </div>
            </div>
          </section>
        )}
      </div>

      <SiteFooter />

 {/* FOCUS MODAL */}
 {focusModalOpen && (
  <div className="wt-modal" role="dialog" aria-modal="true">
    <div className="wt-modal-panel">
      <h3>Select Your Main Focus</h3>
      <p className="wt-modal-blurb">
        A 30‑day schedule will be generated. Week 1 = 100% focus drills. After that ~70% focus / 30% cross‑training.
      </p>
      <div className="wt-focus-grid">
        {workoutCategories.map(cat=>{
          const locked = !hasPremium && !FREE_KEYS.includes(cat.key);
          return (
            <button
              key={cat.key}
              className={`wt-focus-option ${locked?"locked":""}`}
              disabled={locked}
              onClick={()=>{
                if (locked) { handleLockedTrackClick(cat); return; }
                requestFocusSelection(cat.key);
              }}
            >
              <span className="em">{cat.emoji}</span>
              <span className="ttl">{cat.title}</span>
              {locked && <span className="lock-label"><FaLock/> Locked</span>}
            </button>
          );
        })}
      </div>
      <div className="wt-modal-actions">
        <button className="wt-btn ghost small" onClick={()=>setFocusModalOpen(false)}>Close</button>
        {planData?.focusKey && (
          <button className="wt-btn danger small" onClick={resetPlan}>Reset Plan</button>
        )}
      </div>
    </div>
    <button className="wt-modal-backdrop" aria-label="Close" onClick={()=>setFocusModalOpen(false)} />
  </div>
)}

      {/* NEW: Focus Change Confirmation Modal */}
      {focusChangeConfirm.open && (
  <div className="wt-modal" role="dialog" aria-modal="true">
    <div className="wt-modal-panel">
      <h3>Change Focus?</h3>
      <p className="wt-modal-blurb">
        Switching focus will erase this plan’s progress:
      </p>
      <ul className="wt-confirm-points">
        <li>All completed day records removed</li>
        <li>Current drill completion & progress cleared</li>
        <li>New 30‑day plan generated (Week 1 pure focus, then 70/30 mix)</li>
      </ul>
      <p className="wt-modal-blurb">
        This cannot be undone. Continue?
      </p>
      <div className="wt-modal-actions">
        <button
          className="wt-btn ghost small"
          onClick={()=>setFocusChangeConfirm({open:false,newKey:null})}
        >
          Go Back
        </button>
        <button
          className="wt-btn danger small"
          onClick={()=>startFocusedPlan(focusChangeConfirm.newKey)}
        >
          Continue & Reset
        </button>
      </div>
    </div>
    <button
      className="wt-modal-backdrop"
      aria-label="Cancel"
      onClick={()=>setFocusChangeConfirm({open:false,newKey:null})}
    />
  </div>
)}

      {/* HISTORY MODAL */}
      {historyOpen && (
        <div className="wt-modal" role="dialog" aria-modal="true">
          <div className="wt-modal-panel">
            <h3>Completed Workouts</h3>
            {!historyItems.length && (
              <p className="wt-history-empty">No completed days yet.</p>
            )}
            {!!historyItems.length && (
              <ul className="wt-history-list">
                {historyItems.map(h => (
                  <li key={h.date}>
                    <span className="h-date">{h.date}</span>
                    <span className="h-cat">{h.category}</span>
                    <span className="h-day">Day {h.day}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="wt-modal-actions">
              <button
                className="wt-btn ghost small"
                onClick={() => setHistoryOpen(false)}
              >
                Close
              </button>
              {planData?.focusKey && (
                <button
                  className="wt-btn danger small"
                  onClick={resetPlan}
                >
                  Reset Plan
                </button>
              )}
            </div>
          </div>
          <button
            className="wt-modal-backdrop"
            aria-label="Close history"
            onClick={() => setHistoryOpen(false)}
          />
        </div>
      )}

      {/* PREMIUM MODAL */}
      {premiumOpen && (
        <div className="wt-premium-modal" role="dialog" aria-modal="true">
          <div className="wt-premium-panel">
            <button
              className="close-x"
              onClick={() => setPremiumOpen(false)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <h3>{selectedFeature}</h3>
            <p className="pitch">
              Unlock this track plus advanced programming & insights with
              HoopLogs Premium.
            </p>
            <ul className="benefits">
              <li>All locked workout tracks</li>
              <li>Expanded vertical & strength cycles</li>
              <li>Recovery & mental performance library</li>
              <li>Progress insights & streak analytics</li>
            </ul>
            <div className="modal-actions">
              <PaystackUpgradeButton
                email={user?.email || "guest@example.com"}
                amountKobo={500000}
                onSuccess={() => {
                  setHasPremium(true);
                  setPremiumOpen(false);
                  showToast("Premium unlocked.");
                }}
              />
              <button
                className="wt-btn ghost"
                onClick={() => setPremiumOpen(false)}
              >
                Maybe Later
              </button>
            </div>
          </div>
          <button
            className="wt-premium-backdrop"
            aria-label="Close premium"
            onClick={() => setPremiumOpen(false)}
          />
        </div>
      )}

      {toastMessage && (
        <div className="wt-toast" role="status">
          {toastMessage}
        </div>
      )}
    </>
  );
};

export default WorkoutTracker;