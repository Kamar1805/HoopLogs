import React, { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../Firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import SIteHeader from "../components/SIteHeader";
import SiteFooter from "../components/SiteFooter";
import HalfCourtSVG from "../components/HalfCourtSVG";
import ShotFormModal from "../components/ShotFormModal";
import "../components/Dashboard.css";

const ShotTracker = () => {
  const [selectedZone, setSelectedZone] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [shots, setShots] = useState([]);
  const navigate = useNavigate();

  // 🔐 Redirect unauthenticated users
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        sessionStorage.setItem(
          "redirectMsg",
          "You must be logged in to log your shots."
        );
        navigate("/login");
        return;
      }

      // 🔄 Real-time listener for this user’s shots
      const q = query(
        collection(db, "shots"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc")
      );

      const unsubShots = onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setShots(data);
      });

      return () => unsubShots(); // cleanup
    });

    return () => unsubAuth();
  }, [navigate]);

  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
    setShowModal(true);
  };

  const handleSaveLog = async ({ zoneId, zoneLabel, attempts, made }) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await addDoc(collection(db, "shots"), {
        userId: user.uid,
        zoneId,
        zoneLabel,
        attempted: attempts,
        made,
        timestamp: serverTimestamp(),
      });

      setShowModal(false);
    } catch (err) {
      console.error("Error saving shot:", err);
      alert("Failed to save. Please try again.");
    }
  };

  return (
    <div className="dashboard-wrapper">
      <SIteHeader />

      <main className="dashboard-content">
        <h2 className="welcome-text text-center mb-4">Shot Tracker</h2>

        {/* 🏀 Interactive Court */}
        <HalfCourtSVG onZoneClick={handleZoneClick} />

        {/* 📋 Log Modal */}
        {showModal && (
          <ShotFormModal
            zone={selectedZone}
            onClose={() => setShowModal(false)}
            onSave={handleSaveLog}
          />
        )}

        {/* 📊 Recent Logs */}
        <section style={{ marginTop: "2rem" }}>
          <h3 style={{ marginBottom: "1rem", color: "#384959" }}>
            Recent Shot Logs
          </h3>

          {shots.length === 0 ? (
            <p>No shots logged yet.</p>
          ) : (
            <div className="shot-logs-table-wrapper">
              <table className="shot-logs-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Zone</th>
                    <th>Shooting %</th>
                  </tr>
                </thead>
                <tbody>
                  {shots.map((s) => {
                    const dateStr = s.timestamp?.toDate
                      ? s.timestamp.toDate().toLocaleString()
                      : "(saving...)";
                    const percent = ((s.made / s.attempted) * 100).toFixed(0);
                    return (
                      <tr key={s.id}>
                        <td>{dateStr}</td>
                        <td>{s.zoneLabel}</td>
                        <td>{`${percent}% (${s.made}/${s.attempted})`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ShotTracker;
