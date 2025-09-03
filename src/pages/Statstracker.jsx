import React, { useState, useMemo, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { auth, db } from '../Firebase'; // Adjust path if different
import "./Statstracker.css";

const fallbackProfile = {
  name: "Player",
  height: "-",
  weight: "-",
  team: "",
  position: "-"
};

const Statstracker = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(fallbackProfile);
  const [showForm, setShowForm] = useState(false);
  const [warn, setWarn] = useState(null);
  const [recentAddedId, setRecentAddedId] = useState(null);

  // Form state
  const emptyForm = {
    opponent: "", date: "",
    pts: "", reb: "", ast: "", blk: "", stl: "", tov: "",
    fgM: "", fgA: "", threeM: "", threeA: "", ftM: "", ftA: ""
  };
  const [form, setForm] = useState(emptyForm);

  // Games (namespaced per user)
  const storageKey = user ? `hl_stats_games_${user.uid}` : null;
  const [games, setGames] = useState([]);

  // Auth + profile fetch
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setAuthLoading(false);
        // Gate access: redirect
        navigate("/login", { replace: true });
        return;
      }
      setUser(fbUser);
      try {
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            name: data.name || data.displayName || data.nickname || fallbackProfile.name,
            height: data.height || fallbackProfile.height,
            weight: data.weight || fallbackProfile.weight,
            team: data.teamName || data.team || data.inTeam || "",
            position: data.position || fallbackProfile.position
          });
        } else {
          setProfile(fallbackProfile);
        }
      } catch (e) {
        console.warn("Profile fetch failed:", e);
        setProfile(fallbackProfile);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  // Load games when user ready
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(storageKey);
      setGames(raw ? JSON.parse(raw) : []);
    } catch {
      setGames([]);
    }
  }, [user, storageKey]);

  // Persist games
  useEffect(() => {
    if (user && storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(games));
    }
  }, [games, user, storageKey]);

  // Derived stats
  const stats = useMemo(() => {
    if (!games.length) {
      return {
        gp: 0,
        totals: { pts:0, reb:0, ast:0, blk:0, stl:0, tov:0, fgM:0, fgA:0, threeM:0, threeA:0, ftM:0, ftA:0 },
        avg: { ppg:0, rpg:0, apg:0, bpg:0, spg:0, topg:0 },
        pct: { fg:0, three:0, ft:0 }
      };
    }
    const totals = games.reduce((acc,g)=>{
      acc.pts+=g.pts; acc.reb+=g.reb; acc.ast+=g.ast; acc.blk+=g.blk; acc.stl+=g.stl; acc.tov+=g.tov;
      acc.fgM+=g.fgM; acc.fgA+=g.fgA; acc.threeM+=g.threeM; acc.threeA+=g.threeA; acc.ftM+=g.ftM; acc.ftA+=g.ftA;
      return acc;
    }, { pts:0, reb:0, ast:0, blk:0, stl:0, tov:0, fgM:0, fgA:0, threeM:0, threeA:0, ftM:0, ftA:0 });
    const gp = games.length;
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
    return { gp, totals, avg, pct };
  }, [games]);

  // Handlers
  const handleChange = e => {
    const { name, value } = e.target;
    if (["pts","reb","ast","blk","stl","tov","fgM","fgA","threeM","threeA","ftM","ftA"].includes(name)) {
      if (value !== "" && !/^\d{0,3}$/.test(value)) return;
    }
    setForm(f => ({ ...f, [name]: value }));
  };

  const validate = () => {
    if (!form.opponent.trim() || !form.date) return "Opponent & Date required.";
    const numKeys = ["pts","reb","ast","blk","stl","tov","fgM","fgA","threeM","threeA","ftM","ftA"];
    for (let k of numKeys) if (form[k] === "") return "All stat fields required (use 0 if none).";
    const n = k => Number(form[k]);
    if (n("fgM") > n("fgA") || n("threeM") > n("threeA") || n("ftM") > n("ftA")) return "Makes cannot exceed attempts.";
    if (n("pts") < (n("fgM")*2 + n("threeM") + n("ftM"))) return "Points lower than plausible baseline.";
    return null;
  };

  const handleAdd = e => {
    e.preventDefault();
    const err = validate();
    if (err) { setWarn(err); return; }
    setWarn(null);
    const game = {
      id: Date.now(),
      opponent: form.opponent.trim(),
      date: form.date,
      pts:+form.pts, reb:+form.reb, ast:+form.ast, blk:+form.blk, stl:+form.stl, tov:+form.tov,
      fgM:+form.fgM, fgA:+form.fgA, threeM:+form.threeM, threeA:+form.threeA, ftM:+form.ftM, ftA:+form.ftA
    };
    setGames(g => [game, ...g]);
    setRecentAddedId(game.id);
    setForm(emptyForm);
    setShowForm(false);
    setTimeout(()=>setRecentAddedId(null), 2500);
  };

  // Loading spinner while auth/profile resolving
  if (authLoading) {
    return (
      <>
        <SiteHeader />
        <main className="stats-main" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"70vh"}}>
          <div style={{textAlign:"center"}}>
            <div style={{
              width:80,height:80,margin:"0 auto 1rem",
              border:"6px solid #d4e1ea",
              borderTop:"6px solid #6A89A7",
              borderRadius:"50%",
              animation:"stSpin 1s linear infinite"
            }} />
            <p style={{fontSize:".85rem",letterSpacing:".5px",color:"#476274",fontWeight:600}}>
              Loading your stats...
            </p>
          </div>
          <style>
            {`@keyframes stSpin {from{transform:rotate(0)}to{transform:rotate(360deg)}}`}
          </style>
        </main>
        <SiteFooter />
      </>
    );
  }

  // If somehow no user (e.g. redirect blocked)
  if (!user) {
    return (
      <>
        <SiteHeader />
        <main className="stats-main" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"70vh"}}>
          <div style={{
            background:"rgba(255,255,255,0.6)",
            padding:"2rem 2.4rem",
            borderRadius:24,
            backdropFilter:"blur(18px)",
            border:"1px solid #cfdde7",
            maxWidth:420,
            textAlign:"center",
            boxShadow:"0 8px 28px -10px rgba(40,65,82,.25)"
          }}>
            <h1 style={{margin:0, fontSize:"1.55rem", color:"#6A89A7", fontWeight:700}}>Stats Locked</h1>
            <p style={{fontSize:".9rem", lineHeight:1.45, color:"#4b626f", margin:"1rem 0 1.4rem"}}>
              You must be logged in to view and log your performance stats.
            </p>
            <button
              onClick={()=>navigate("/login")}
              style={{
                background:"linear-gradient(120deg,#6A89A7,#56748F)",
                color:"#fff",border:"1px solid #5a7e98",
                padding:"0.85rem 1.6rem",
                borderRadius:50,
                fontWeight:600,
                cursor:"pointer",
                boxShadow:"0 10px 24px -10px rgba(90,125,150,.55)"
              }}
            >Go To Login</button>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const displayTeam = profile.team && profile.team.trim().length
    ? profile.team
    : <span style={{color:"#b6592d", fontWeight:600}}>No team yet – go to My Profile to add your team.</span>;

  return (
    <>
      <SiteHeader />
      <main className="stats-main">
        {/* HERO */}
        <section className="stats-hero glass-fade-in">
          <div className="hero-left">
            <div className="player-avatar" aria-label="Player avatar">
              <span className="avatar-initial">🏀</span>
            </div>
            <div className="player-meta">
              <h1 className="player-name">{profile.name}</h1>
              <p className="player-line"><strong>Position:</strong> {profile.position}</p>
              <p className="player-line"><strong>Height:</strong> {profile.height}</p>
              <p className="player-line"><strong>Weight:</strong> {profile.weight}</p>
              <p className="player-line"><strong>Team:</strong> {displayTeam}</p>
              <p className="player-line small-warn">
                Warning: Enter only accurate stats. Incorrect entries may lead to penalties.
              </p>
            </div>
          </div>

            <div className="hero-right">
              <div className="hero-grid">
                <StatBadge label="GP" value={stats.gp} />
                <StatBadge label="PPG" value={stats.avg.ppg} />
                <StatBadge label="RPG" value={stats.avg.rpg} />
                <StatBadge label="APG" value={stats.avg.apg} />
                <StatBadge label="BPG" value={stats.avg.bpg} />
                <StatBadge label="SPG" value={stats.avg.spg} />
                <StatBadge label="T/O" value={stats.avg.topg} />
                <StatBadge label="FG%" value={stats.pct.fg} suffix="%" />
                <StatBadge label="3P%" value={stats.pct.three} suffix="%" />
                <StatBadge label="FT%" value={stats.pct.ft} suffix="%" />
              </div>
              <div className="hero-actions">
                <button className="hero-btn" onClick={()=>setShowForm(s=>!s)}>
                  {showForm ? "Cancel" : "Add Game Stat"}
                </button>
              </div>
            </div>
        </section>

        {/* FORM */}
        {showForm && (
          <section className="stat-form-wrap fade-slide">
            <form className="stat-form" onSubmit={handleAdd}>
              <h2 className="form-title">Log Game</h2>
              {warn && <div className="form-warn">{warn}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Opponent (vs)</label>
                  <input name="opponent" value={form.opponent} onChange={handleChange} placeholder="Team Name" />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" name="date" value={form.date} onChange={handleChange} />
                </div>
                <Field name="pts" label="PTS" value={form.pts} onChange={handleChange} />
                <Field name="reb" label="REB" value={form.reb} onChange={handleChange} />
                <Field name="ast" label="AST" value={form.ast} onChange={handleChange} />
                <Field name="blk" label="BLK" value={form.blk} onChange={handleChange} />
                <Field name="stl" label="STL" value={form.stl} onChange={handleChange} />
                <Field name="tov" label="T/O" value={form.tov} onChange={handleChange} />
                <Field name="fgM" label="FGM" value={form.fgM} onChange={handleChange} />
                <Field name="fgA" label="FGA" value={form.fgA} onChange={handleChange} />
                <Field name="threeM" label="3PM" value={form.threeM} onChange={handleChange} />
                <Field name="threeA" label="3PA" value={form.threeA} onChange={handleChange} />
                <Field name="ftM" label="FTM" value={form.ftM} onChange={handleChange} />
                <Field name="ftA" label="FTA" value={form.ftA} onChange={handleChange} />
              </div>
              <div className="form-actions">
                <button className="hero-btn" type="submit">Save Game</button>
              </div>
              <p className="disclaimer">Reminder: Don’t inflate numbers. Integrity drives improvement.</p>
            </form>
          </section>
        )}

        {/* GAME LOG */}
        <section className="games-section">
          <header className="games-header">
            <h2 className="games-title">Game Log</h2>
            {games.length > 0 && <span className="games-sub">{games.length} game{games.length>1?"s":""}</span>}
          </header>

          {games.length === 0 && (
            <div className="empty-log">
              <p>No games logged yet. Add your first performance.</p>
            </div>
          )}

          <div className="games-table-wrapper">
            {games.length > 0 && (
              <table className="games-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Opponent</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>T/O</th><th>FG</th><th>3P</th><th>FT</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map(g => {
                    const fg = g.fgA ? `${g.fgM}/${g.fgA}` : "-";
                    const th = g.threeA ? `${g.threeM}/${g.threeA}` : "-";
                    const ft = g.ftA ? `${g.ftM}/${g.ftA}` : "-";
                    return (
                      <tr key={g.id} className={recentAddedId === g.id ? "row-flash" : ""}>
                        <td>{g.date}</td>
                        <td>{g.opponent}</td>
                        <td>{g.pts}</td>
                        <td>{g.reb}</td>
                        <td>{g.ast}</td>
                        <td>{g.stl}</td>
                        <td>{g.blk}</td>
                        <td>{g.tov}</td>
                        <td>{fg}</td>
                        <td>{th}</td>
                        <td>{ft}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Coach Widget */}
        <div className="coach-widget bump-in" aria-live="polite">
          <div className="coach-bubble">
            <strong>CoachGPT:</strong>
            <span> Don’t deceive yourself, put in the right numbers.</span>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
};

const StatBadge = ({ label, value, suffix="" }) => (
  <div className="stat-badge">
    <span className="stat-label">{label}</span>
    <span className="stat-value">{value}{suffix}</span>
  </div>
);

const Field = ({ name, label, value, onChange }) => (
  <div className="form-group">
    <label>{label}</label>
    <input name={name} value={value} onChange={onChange} inputMode="numeric" />
  </div>
);

export default Statstracker;