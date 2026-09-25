// src/components/AthleticWorkoutView.jsx
import React, { useState, useEffect } from 'react';
import {
  LuZap,
  LuTarget,
  LuDumbbell,
  LuCheck,
  LuRotateCcw,
  LuSlidersHorizontal,
  LuPlay,
  LuClock,
  LuFlame,
  LuActivity
} from 'react-icons/lu';
import { IoBasketball, IoHome } from 'react-icons/io5';
import './AthleticWorkoutView.css';

// ── COMPREHENSIVE BASKETBALL WORKOUT DATABASE ──────────────────────────────
export const WORKOUT_DATABASE = {
  vertical: {
    gym: {
      name: 'Vertical & Explosiveness (Gym)',
      tagline: 'Legs Loading • Maximum Rim Elevation',
      days: [
        {
          day: 1,
          focus: 'Elastic Jump & Ankle Stiffness',
          drills: [
            { name: 'Depth Jumps (18" Box)', sets: '4 sets', reps: '4 reps', rest: '75s', cue: 'Step off box, absorb and immediately rebound upward. Minimize ground time.' },
            { name: 'Trap Bar / Dumbbell Jump Squats', sets: '3 sets', reps: '5 reps (25% bodyweight)', rest: '90s', cue: 'Violent triple extension at ankles, knees, and hips.' },
            { name: 'Bulgarian Split Squats (Dumbbells)', sets: '3 sets', reps: '8 reps / leg', rest: '60s', cue: 'Keep torso upright, drive through front midfoot to target glute & quad.' },
            { name: 'Tibialis Raises & Seated Calf Raises', sets: '3 sets', reps: '15 reps', rest: '45s', cue: 'Strengthen deceleration armor to protect knees on hard landings.' }
          ]
        },
        {
          day: 2,
          focus: 'Posterior Chain & Force Absorption',
          drills: [
            { name: 'Barbell Romanian Deadlift (RDL)', sets: '4 sets', reps: '6 reps', rest: '90s', cue: 'Push hips back, feel intense hamstring stretch, snap hips forward.' },
            { name: 'Box Drop to Broad Jump', sets: '4 sets', reps: '3 reps', rest: '75s', cue: 'Stick landing from 12" box, immediately launch horizontally.' },
            { name: 'Single-Leg Hip Thrusts', sets: '3 sets', reps: '10 reps / leg', rest: '60s', cue: 'Squeeze glute at top for 2 seconds to reinforce single-leg takeoff power.' },
            { name: 'Medicine Ball Rotational Slams', sets: '3 sets', reps: '10 reps / side', rest: '45s', cue: 'Rotational core power for gathering rebounds in mid-air.' }
          ]
        }
      ]
    },
    home: {
      name: 'Vertical & Explosiveness (Bodyweight / Court)',
      tagline: 'Legs Loading • Kinetic Jump Springs',
      days: [
        {
          day: 1,
          focus: 'Plyometric Ground Reaction',
          drills: [
            { name: 'Continuous Pogo Hops', sets: '4 sets', reps: '20 reps', rest: '45s', cue: 'Bounce like a spring off balls of feet. Zero heel collapse.' },
            { name: 'Penultimate Approach Jumps (Court)', sets: '5 sets', reps: '3 reps', rest: '90s', cue: 'Sprint approach, plant hard with penultimate step, full arm swing takeoff.' },
            { name: 'Lateral Speed Skater Bounds', sets: '4 sets', reps: '6 reps / leg', rest: '60s', cue: 'Explode sideways, absorb impact on one foot, hold for 1s before bounding.' },
            { name: 'Isometric Wall Sit (Single Leg option)', sets: '3 sets', reps: '45s hold', rest: '60s', cue: 'Build tendon stiffness and quad endurance for repeated jumping.' }
          ]
        },
        {
          day: 2,
          focus: 'Deceleration & Elastic Power',
          drills: [
            { name: 'Broad Jump with Soft Absorption', sets: '4 sets', reps: '4 reps', rest: '60s', cue: 'Land like a ninja: knees bent, chest up, zero loud stomping.' },
            { name: 'Elevated Split Squat Pulses', sets: '3 sets', reps: '12 reps / leg', rest: '45s', cue: 'Use court bench or chair. Stay in lower half of rep for muscle hypertrophy.' },
            { name: 'Reverse Lunges to Explosive Knee Drive', sets: '3 sets', reps: '10 reps / leg', rest: '60s', cue: 'Drop back, drive through front leg and explosively lift rear knee.' },
            { name: 'Tuck Jumps', sets: '3 sets', reps: '6 reps', rest: '60s', cue: 'Rapid pull of knees to chest at apex of jump.' }
          ]
        }
      ]
    }
  },
  speed: {
    gym: {
      name: 'Speed, Agility & First Step (Gym)',
      tagline: 'Lightning Deceleration & Blow-By Speed',
      days: [
        {
          day: 1,
          focus: 'First-Step Acceleration Mechanics',
          drills: [
            { name: 'Heavy Sled / Plate Push Sprints', sets: '5 sets', reps: '15 meters', rest: '90s', cue: 'Low forward shin angle (45 degrees), violent leg drive.' },
            { name: 'Half-Kneeling Landmine Press to Sprint', sets: '3 sets', reps: '6 reps / side', rest: '60s', cue: 'Link core rotation to upper body pushing for separation on drives.' },
            { name: 'Hex Bar Deadlift (Speed Focus)', sets: '4 sets', reps: '4 reps (65% 1RM)', rest: '90s', cue: 'Focus on pure bar speed and acceleration off the floor.' },
            { name: 'Hanging Knee-to-Elbow Tuck', sets: '3 sets', reps: '10 reps', rest: '45s', cue: 'Prevent hyperextension during high-speed sprint mechanics.' }
          ]
        }
      ]
    },
    home: {
      name: 'Speed, Agility & First Step (Court / Home)',
      tagline: 'Ankle Breaker Shuffles & Deceleration',
      days: [
        {
          day: 1,
          focus: 'Lane Agility & Change of Direction',
          drills: [
            { name: 'Pro Agility 5-10-5 Shuttle', sets: '4 sets', reps: '2 reps', rest: '75s', cue: 'Sprint 5 yards, touch line, sprint 10 yards, touch line, sprint through.' },
            { name: 'Defensive Slide to Open-Hips Sprint', sets: '4 sets', reps: '4 reps / side', rest: '60s', cue: 'Stay low in defensive stance for 3 slides, drop step, burst into sprint.' },
            { name: 'Half-Court Deceleration Stops', sets: '5 sets', reps: 'Full Court', rest: '60s', cue: 'Sprint at 100%, screech to a dead stop within 2 feet on whistle.' },
            { name: 'Single-Leg Line Hops (Front & Lateral)', sets: '3 sets', reps: '20s / leg', rest: '30s', cue: 'Fast twitch foot speed on court sideline.' }
          ]
        }
      ]
    }
  },
  strength: {
    gym: {
      name: 'Basketball Strength & Contact Armor (Gym)',
      tagline: 'Contact Finisher & Post Defense Shield',
      days: [
        {
          day: 1,
          focus: 'Total Body Contact Force',
          drills: [
            { name: 'Front Squat or Goblet Squat', sets: '4 sets', reps: '6 reps', rest: '90s', cue: 'Upright torso builds the core stability required to take charges and finish through fouls.' },
            { name: 'Neutral Grip Dumbbell Bench Press', sets: '4 sets', reps: '8 reps', rest: '75s', cue: 'Shoulder-friendly pressing power to ward off defenders on drives.' },
            { name: 'Chest-Supported Row', sets: '3 sets', reps: '10 reps', rest: '60s', cue: 'Upper back strength for high-impact rebounding battles.' },
            { name: 'Farmer’s Carries (Heavy Dumbbells)', sets: '3 sets', reps: '40 meters', rest: '60s', cue: 'Grip strength and core rigidity against physical body checks.' }
          ]
        }
      ]
    },
    home: {
      name: 'Basketball Strength & Contact Armor (Home)',
      tagline: 'Bodyweight Isometric Stability',
      days: [
        {
          day: 1,
          focus: 'Tension & Core Bracing',
          drills: [
            { name: 'Archer Push-Ups / Close-Grip Push-Ups', sets: '4 sets', reps: '8-10 reps', rest: '60s', cue: 'Tricep and chest push power for physical defense.' },
            { name: 'Walking Lunges with 2s Pause', sets: '3 sets', reps: '12 reps / leg', rest: '60s', cue: 'Thigh and hip control when driving baseline in traffic.' },
            { name: 'Bear Crawl to Lateral Plank Hold', sets: '3 sets', reps: '30s hold', rest: '45s', cue: 'Shoulder stability and rotational resist for finishing through contact.' },
            { name: 'Doorway Row or Inverted Table Row', sets: '3 sets', reps: '10 reps', rest: '60s', cue: 'Posterior upper body tone for athletic posture.' }
          ]
        }
      ]
    }
  },
  endurance: {
    gym: {
      name: 'Endurance & 4th Quarter Stamina (Gym)',
      tagline: 'High-Volume Conditioning Circuit',
      days: [
        {
          day: 1,
          focus: 'Repeat High-Intensity Engine',
          drills: [
            { name: 'Assault Bike / Rowing Intervals', sets: '6 sets', reps: '20s MAX / 40s REST', rest: '40s', cue: 'Push heart rate to anaerobic ceiling to simulate fastbreak overtime.' },
            { name: 'Kettlebell Swings', sets: '4 sets', reps: '15 reps', rest: '45s', cue: 'Powerful hip snaps under fatigue.' },
            { name: 'Box Jump Burpees', sets: '3 sets', reps: '10 reps', rest: '60s', cue: 'Full body metabolic furnace.' }
          ]
        }
      ]
    },
    home: {
      name: 'Endurance & 4th Quarter Stamina (Court)',
      tagline: 'Full-Court 17s & Sprint Capacity',
      days: [
        {
          day: 1,
          focus: 'Game-Speed Court Running',
          drills: [
            { name: 'The 17s Drill (Sideline to Sideline)', sets: '3 sets', reps: '17 touches in 65s', rest: '90s', cue: 'The legendary basketball conditioning test. Touch sidelines with foot.' },
            { name: 'Full Court Suicides', sets: '3 sets', reps: 'Baseline, FT, Half, Opp FT, Full', rest: '90s', cue: 'Sprint down and back to each line. Drop hips on touches.' },
            { name: 'Defensive Slide Circuit (Zig-Zag)', sets: '4 sets', reps: 'Full Court', rest: '60s', cue: 'Stay in low slide stance zig-zagging between sidelines without crossing feet.' }
          ]
        }
      ]
    }
  }
};

export default function AthleticWorkoutView() {
  const [goal, setGoal] = useState(() => {
    try {
      return localStorage.getItem('hooplogs_workout_goal') || 'vertical';
    } catch {
      return 'vertical';
    }
  });

  const [equipment, setEquipment] = useState(() => {
    try {
      return localStorage.getItem('hooplogs_workout_equip') || 'home';
    } catch {
      return 'home';
    }
  });

  const [currentDayIndex, setCurrentDayIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('hooplogs_workout_day');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [completedDrills, setCompletedDrills] = useState(() => {
    try {
      const saved = localStorage.getItem('hooplogs_workout_completed_drills');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showFinishedBanner, setShowFinishedBanner] = useState(false);

  // Active workout program based on goal and equipment
  const activeProgram = WORKOUT_DATABASE[goal]?.[equipment] || WORKOUT_DATABASE.vertical.home;
  const currentDay = activeProgram.days[currentDayIndex % activeProgram.days.length];
  const drillsList = currentDay.drills;

  // Track completed drills for today
  const todayKey = `${goal}_${equipment}_day${currentDay.day}`;
  const dayDoneSet = completedDrills[todayKey] || [];
  const percentDone = Math.round((dayDoneSet.length / drillsList.length) * 100);

  // Sync program to localStorage for Dashboard "Continue Workouts" widget
  useEffect(() => {
    try {
      localStorage.setItem('hooplogs_workout_goal', goal);
      localStorage.setItem('hooplogs_workout_equip', equipment);
      localStorage.setItem('hooplogs_workout_day', currentDayIndex.toString());
      localStorage.setItem('hooplogs_workout_completed_drills', JSON.stringify(completedDrills));
      
      // Save summary object for dashboard
      const dashboardState = {
        name: activeProgram.name,
        tagline: activeProgram.tagline,
        dayNumber: currentDay.day,
        focus: currentDay.focus,
        percentDone,
        drillsCount: drillsList.length,
        doneCount: dayDoneSet.length
      };
      localStorage.setItem('hooplogs_active_workout', JSON.stringify(dashboardState));
    } catch (e) {
      console.warn('Could not save workout progress:', e);
    }
  }, [goal, equipment, currentDayIndex, completedDrills, percentDone, activeProgram, currentDay, drillsList.length, dayDoneSet.length]);

  const toggleDrill = (drillName) => {
    const isDone = dayDoneSet.includes(drillName);
    const updatedDayDone = isDone
      ? dayDoneSet.filter((d) => d !== drillName)
      : [...dayDoneSet, drillName];

    setCompletedDrills((prev) => ({
      ...prev,
      [todayKey]: updatedDayDone
    }));

    if (!isDone && updatedDayDone.length === drillsList.length) {
      setShowFinishedBanner(true);
    }
  };

  const advanceToNextDay = () => {
    setCurrentDayIndex((prev) => prev + 1);
    setShowFinishedBanner(false);
  };

  const resetTodayDrills = () => {
    setCompletedDrills((prev) => ({
      ...prev,
      [todayKey]: []
    }));
    setShowFinishedBanner(false);
  };

  return (
    <div className="athletic-workout-wrapper">
      {/* PROGRAM HEADER CARD */}
      <div className="athletic-program-hero">
        <div className="program-hero-top">
          <div className="program-badge-strip">
            <span className="goal-badge">
              <LuZap size={12} /> {goal.toUpperCase()}
            </span>
            <span className="equip-badge">
              {equipment === 'gym' ? <LuDumbbell size={12} /> : <IoHome size={12} />}
              {equipment === 'gym' ? 'GYM ACCESS' : 'BODYWEIGHT / COURT'}
            </span>
          </div>

          <button
            type="button"
            className="btn-open-config"
            onClick={() => setShowConfigModal(true)}
            title="Adjust Goals & Equipment"
          >
            <LuSlidersHorizontal size={14} /> Adjust Plan
          </button>
        </div>

        <h1 className="program-main-title">{activeProgram.name}</h1>
        <p className="program-tagline">{activeProgram.tagline}</p>

        {/* DAY & PROGRESS METER */}
        <div className="program-session-bar">
          <div className="session-day-info">
            <span className="session-day-num">DAY {currentDay.day}</span>
            <span className="session-day-focus">{currentDay.focus}</span>
          </div>
          <span className="session-pct-pill">{percentDone}% COMPLETE</span>
        </div>

        <div className="program-progress-meter">
          <div className="progress-fill" style={{ width: `${percentDone}%` }} />
        </div>
      </div>

      {/* FINISHED CELEBRATION BANNER */}
      {showFinishedBanner && (
        <div className="finished-celebration-banner">
          <IoBasketball size={24} color="#ff5500" />
          <div className="finished-banner-text">
            <h4>Day {currentDay.day} Complete! Massive Work.</h4>
            <p>Your momentum is locked in. Ready for the next phase?</p>
          </div>
          <button type="button" className="btn-next-day" onClick={advanceToNextDay}>
            Next Day <LuPlay size={12} />
          </button>
        </div>
      )}

      {/* DRILLS CHECKLIST */}
      <div className="drills-section-header">
        <div className="drills-title-wrap">
          <LuActivity size={15} color="#ff5500" />
          <h3>TODAY'S DRILL PRESCRIPTION ({dayDoneSet.length}/{drillsList.length})</h3>
        </div>
        {dayDoneSet.length > 0 && (
          <button type="button" className="btn-reset-drills" onClick={resetTodayDrills}>
            <LuRotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      <div className="drills-stack">
        {drillsList.map((drill, idx) => {
          const isDone = dayDoneSet.includes(drill.name);
          return (
            <div
              key={drill.name}
              className={`drill-card ${isDone ? 'completed' : ''}`}
              onClick={() => toggleDrill(drill.name)}
            >
              <div className="drill-checkbox">
                {isDone ? <LuCheck size={16} /> : <span>{idx + 1}</span>}
              </div>

              <div className="drill-content-col">
                <div className="drill-header-row">
                  <h4 className="drill-name">{drill.name}</h4>
                  <div className="drill-parameters">
                    <span className="drill-param sets">{drill.sets}</span>
                    <span className="drill-param reps">{drill.reps}</span>
                  </div>
                </div>

                <p className="drill-coaching-cue">
                  <strong>Coach Cue:</strong> {drill.cue}
                </p>

                <div className="drill-meta-strip">
                  <span className="rest-timer-badge">
                    <LuClock size={11} /> Rest: {drill.rest}
                  </span>
                  <span className="tap-status-hint">
                    {isDone ? 'Completed ✓' : 'Tap to mark done'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* GOAL & EQUIPMENT ADJUSTMENT MODAL */}
      {showConfigModal && (
        <div className="config-modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="config-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="config-sheet-header">
              <div className="config-header-title">
                <LuTarget size={18} color="#ff5500" />
                <h3>Set Athletic Goal & Equipment</h3>
              </div>
              <button
                type="button"
                className="config-close-btn"
                onClick={() => setShowConfigModal(false)}
              >
                ✕
              </button>
            </div>

            <p className="config-sheet-sub">
              Choose your athletic focus and available training gear. HoopLogs dynamically generates your customized program.
            </p>

            {/* ATHLETIC GOAL SELECTION */}
            <div className="config-group">
              <label>PRIMARY ATHLETIC GOAL</label>
              <div className="config-chips-grid">
                <button
                  type="button"
                  className={`config-chip ${goal === 'vertical' ? 'active' : ''}`}
                  onClick={() => setGoal('vertical')}
                >
                  🚀 Vertical & Explosiveness
                </button>
                <button
                  type="button"
                  className={`config-chip ${goal === 'speed' ? 'active' : ''}`}
                  onClick={() => setGoal('speed')}
                >
                  ⚡ Speed & Agility (First Step)
                </button>
                <button
                  type="button"
                  className={`config-chip ${goal === 'strength' ? 'active' : ''}`}
                  onClick={() => setGoal('strength')}
                >
                  🛡️ Basketball Strength & Contact
                </button>
                <button
                  type="button"
                  className={`config-chip ${goal === 'endurance' ? 'active' : ''}`}
                  onClick={() => setGoal('endurance')}
                >
                  🫁 4th Quarter Conditioning
                </button>
              </div>
            </div>

            {/* EQUIPMENT SELECTION */}
            <div className="config-group">
              <label>EQUIPMENT ACCESS</label>
              <div className="config-chips-row">
                <button
                  type="button"
                  className={`config-chip equip ${equipment === 'gym' ? 'active' : ''}`}
                  onClick={() => setEquipment('gym')}
                >
                  🏋️ Gym Equipment (Barbell / Dumbbell)
                </button>
                <button
                  type="button"
                  className={`config-chip equip ${equipment === 'home' ? 'active' : ''}`}
                  onClick={() => setEquipment('home')}
                >
                  🏠 Home / Court Lines / Bodyweight
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn-apply-config"
              onClick={() => {
                setShowConfigModal(false);
                setCurrentDayIndex(0);
              }}
            >
              Apply Program & Load Drills
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
