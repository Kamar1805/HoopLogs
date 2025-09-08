import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../Firebase";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import "./Hoopers.css";

// Simple spinning loader SVG
const Spinner = () => (
  <span className="hoopers-spinner" aria-label="Loading">
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle
        cx="18"
        cy="18"
        r="16"
        stroke="#6A89A7"
        strokeWidth="4"
        fill="none"
        strokeDasharray="80"
        strokeDashoffset="60"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 18 18"
          to="360 18 18"
          dur="0.9s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  </span>
);

const HooperCard = ({ hooper }) => {
  const {
    name,
    nickname,
    height,
    team,
    weight,
    photoURL,
    phonePublic,
    phoneNumber,
    position,
    experience,
  } = hooper;

  const whatsappLink =
    phonePublic && phoneNumber
      ? `https://wa.me/${phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
          `Hi ${name}, I saw your profile from HoopLogs and would love to connect!`
        )}`
      : null;

  return (
    <div className="hooper-card">
      <div className="hooper-img-wrap">
        {photoURL ? (
          <img src={photoURL} alt={name} className="hooper-img" />
        ) : (
          <div className="hooper-img-placeholder">
            <svg width="48" height="48" fill="none" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="24" fill="#e7ecef" />
              <path
                d="M24 26c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7 3.582 7 8 7zm0 2c-5.33 0-16 2.686-16 8v4h32v-4c0-5.314-10.67-8-16-8z"
                fill="#b0bfc9"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="hooper-info">
        <h3 className="hooper-name">{name}</h3>
        <div className="hooper-nickname">@{nickname || "—"}</div>
        <div className="hooper-meta">
          <span>Height: <b>{height || "—"}</b></span>
          <span>Weight: <b>{weight || "—"}</b></span>
          <span>Team: <b>{team || "—"}</b></span>
        </div>
        <div className="hooper-meta">
          <span>Position: <b>{position || "—"}</b></span>
          <span>Experience: <b>{experience || "—"}</b></span>
        </div>
        {whatsappLink ? (
          <a
            className="hooper-chat-btn"
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Chat with {name} on WhatsApp
          </a>
        ) : (
          <span className="hooper-chat-btn disabled" title="No public WhatsApp">
            WhatsApp not available
          </span>
        )}
      </div>
    </div>
  );
};

const Hoopers = () => {
  const [hoopers, setHoopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchHoopers = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "users"));
      const data = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((u) => u.name && u.nickname); // Only show users with basic info
      setHoopers(data);
      setLoading(false);
    };
    fetchHoopers();
  }, []);

  // Filter by name or nickname (case-insensitive)
  const filteredHoopers = hoopers.filter(
    (h) =>
      h.name?.toLowerCase().includes(search.toLowerCase()) ||
      h.nickname?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <SiteHeader />
      <main className="hoopers-main wide">
        <h1 className="hoopers-title">Meet the Hoopers</h1>
        <p className="hoopers-desc">
          Discover basketball players on HoopLogs. Connect, chat, and grow your network!
        </p>
        <div className="hoopers-search-panel">
          <input
            type="text"
            className="hoopers-search-input"
            placeholder="Search by name or nickname..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="hoopers-list">
          {loading ? (
            <div className="hoopers-loading"><Spinner /></div>
          ) : filteredHoopers.length === 0 ? (
            <div className="hoopers-empty">No hoopers found.</div>
          ) : (
            filteredHoopers.map((hooper) => (
              <HooperCard hooper={hooper} key={hooper.id} />
            ))
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
};

export default Hoopers;