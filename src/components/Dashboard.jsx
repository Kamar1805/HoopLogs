import React, { useState, useEffect } from "react";
import "./Dashboard.css";

import { auth, db } from "../Firebase";
import {
  collection, doc, getDoc,
  query, where, onSnapshot
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import SiteHeader       from "./SIteHeader";
import SiteFooter       from "./SiteFooter";
import ShotProgressRing from "./ShotProgressRing";

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

  /* state */
  const [nickname, setNickname] = useState("Hoop Logger");
  const [user, setUser]         = useState(null);

  const [welcomeIdx, setWelcomeIdx] = useState(0);
  const [legendIdx,  setLegendIdx]  = useState(0);

  const [latest, setLatest] = useState(null);
  const [best,   setBest]   = useState(null);
  const [worst,  setWorst]  = useState(null);
  const [fav,    setFav]    = useState(null);

  /* ---------- auth listener ---------- */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          setNickname(
            snap.data().nickname || snap.data().name || "Hoop Logger"
          );
        }

        /* real‑time shots listener */
        const q = query(
          collection(db, "shots"),
          where("userId", "==", firebaseUser.uid)
        );
        const unsubShots = onSnapshot(q, (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((s) => s.attempted > 0);

          if (docs.length === 0) {
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
          setFav(
            [...docs].sort((a, b) => b.attempted - a.attempted)[0]
          );
        });

        /* clean‑up shots on sign‑out */
        return () => unsubShots();
      } else {
        /* signed out */
        setNickname("Hoop Logger");
        setLatest(null); setBest(null); setWorst(null); setFav(null);
      }
    });

    return () => unsubAuth();
  }, []);

  /* ---------- rotating quotes ---------- */
  useEffect(() => {
    const w = setInterval(
      () => setWelcomeIdx((i) => (i + 1) % welcomeQuotes.length),
      4000
    );
    const l = setInterval(
      () => setLegendIdx((i) => (i + 1) % dashboardQuotes.length),
      6000
    );
    return () => {
      clearInterval(w);
      clearInterval(l);
    };
  }, []);

  /* helpers */
  const pct = (s) => (s ? Math.round((s.made / s.attempted) * 100) : 0);
  const sub = (s) =>
    s ? `${s.zoneLabel} • ${s.timestamp?.toDate?.().toLocaleString()}` : "—";

  /* CTA click */
  const handleTrackShotsClick = () => {
    if (!user) {
      sessionStorage.setItem(
        "redirectMsg",
        "You must be logged in to track your shots."
      );
      navigate("/login");
    } else {
      navigate("/shottracker");
    }
  };

  return (
    <>
      <SiteHeader />

      <main className="dashboard-content">
        <div className="welcome-box">
          <h1>Welcome {nickname}!</h1>
          <p className="motivation-text">{welcomeQuotes[welcomeIdx]}</p>
        </div>

        <section style={{ marginTop: "3rem" }}>
          <h2 style={{ textAlign: "center", color: "#384959", marginBottom: "1.5rem" }}>
            Your Shot Performance
          </h2>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "28px",
              justifyContent: "center",
            }}
          >
            <ShotProgressRing title="🕒 Latest Shot" pct={pct(latest)} subtitle={sub(latest)} />
            <ShotProgressRing title="🏆 Best Shot"   pct={pct(best)}   subtitle={sub(best)}   />
            <ShotProgressRing title="⚠️ Area to Improve" pct={pct(worst)} subtitle={sub(worst)} />
            <ShotProgressRing title="⭐ Favourite Spot"  pct={pct(fav)}  subtitle={sub(fav)}   />
          </div>
        </section>

        <section style={{ textAlign: "center", marginTop: "2rem" }}>
          <p
            style={{
              fontStyle: "italic",
              color: "#6A89A7",
              maxWidth: 600,
              margin: "0 auto 1.5rem",
            }}
          >
            {dashboardQuotes[legendIdx]}
          </p>

          <button
            onClick={handleTrackShotsClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#6A89A7",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "30px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Track your shots <span style={{ fontSize: "1.2rem" }}>➜</span>
          </button>
        </section>
      </main>

      <SiteFooter />
    </>
  );
};

export default Dashboard;
