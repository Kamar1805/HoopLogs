import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LandingPage.css";

/*
  Replace these public image paths with your own files if needed:
    /logo.png
    /hero.jpg
    /about.jpg
    /coachgpt.jpg

  Request: remove any borders / background colors from image areas.
  -> All image containers now have no inline background, no borders.
  -> Images themselves only keep size & object-fit (no borders/background).
*/

const IMG = {
  logo: "/logo.png",
  hero: "/hero.png",
  about: "/about.jpg",
  coachgpt: "/coachgpt.jpg",
};

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const io = new IntersectionObserver(
      entries =>
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.16 }
    );
    document
      .querySelectorAll(
        ".landing-page .reveal, .landing-page .f-card, .landing-page .comm-card, .landing-page .contact-form"
      )
      .forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollTo = id =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const fallbackImg = (src, alt, label, eager = false) => (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      onError={e => {
        e.currentTarget.replaceWith(
          Object.assign(document.createElement("div"), {
            className: "img-placeholder",
            textContent: label + " IMAGE",
          })
        );
      }}
    />
  );

  return (
    <div className="landing-page">
      {/* NAVBAR */}
      <header className="lp-header">
        <div className="lp-brand" onClick={() => scrollTo("hero")}>
          <img
            src={IMG.logo}
            alt="HoopLogs Logo"
            style={{ height: 34, width: "auto", display: "block" }}
            onError={e => (e.currentTarget.style.display = "none")}
          />
          <span>HoopLogs</span>
        </div>
        <nav className="lp-nav">
          <button onClick={() => scrollTo("hero")}>Home</button>
            <button onClick={() => scrollTo("about")}>About</button>
          <button onClick={() => scrollTo("features")}>Features</button>
          <button onClick={() => scrollTo("coachgpt")}>CoachGPT</button>
          <button onClick={() => scrollTo("coachgpt")}>DASHBOARD</button>
          <button onClick={() => scrollTo("community")}>Community</button>
          <button onClick={() => scrollTo("contact")}>Contact</button>
          
        </nav>
        <button
          className="lp-burger"
          aria-label="Menu"
          onClick={() =>
            document.querySelector(".lp-header")?.classList.toggle("nav-open")
          }
        >
          <span />
        </button>
      </header>

      {/* HERO */}
      <section
        id="hero"
        className="lp-hero"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px,1fr) minmax(300px,540px)",
          gap: "3.2rem",
          alignItems: "center",
          paddingBottom: "3rem",
        }}
      >
        <div className="lp-hero-bg" />
        <div className="lp-hero-inner reveal" style={{ textAlign: "left", maxWidth: 760 }}>
          <h1 style={{ lineHeight: 1.05 }}>
            Your <span className="accent">Progress</span> Starts Now
          </h1>
          <p className="lead" style={{ marginBottom: "1.8rem" }}>
            Build consistent basketball growth: structure smarter sessions, log shots fast,
            follow guided skill tracks and tap into CoachGPT—your always‑on basketball
            Q&A for drills, strategy, mindset, conditioning, recovery and more.
          </p>
          <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
            <button className="btn solid large" onClick={() => navigate("/dashboard")}>
              Launch Dashboard
            </button>
            <button className="btn outline large" onClick={() => scrollTo("about")}>
              How It Works
            </button>
            <button className="btn ghost large" onClick={() => scrollTo("coachgpt")}>
              Ask CoachGPT
            </button>
          </div>
          <div className="hero-stats" style={{ justifyContent: "flex-start", marginTop: "1.3rem" }}>
            {[
              ["Instant", "Shot Logging"],
              ["CoachGPT", "24/7 Q&A"],
              ["Skill", "Pathways"],
              ["Community", "Accountability"],
            ].map(([a, b]) => (
              <div key={a}>
                <strong>{a}</strong>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
        <div
          className="reveal hero-image-slot"
          style={{
            position: "relative",
            borderRadius: 22,
            overflow: "hidden"
          }}
        >
          {fallbackImg(IMG.hero, "Focused player training", "HERO", true)}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="lp-section lp-about" style={{ paddingTop: "2.2rem" }}>
        <div className="about-grid">
          <div className="about-text reveal">
            <h2>
              What Is <span className="accent">HoopLogs</span>?
            </h2>
            <p>
              A focused basketball improvement workspace. Replace guesswork:
              structure sessions, log every rep, follow guided skill pathways,
              measure trends and ask an always‑on basketball knowledge coach
              whenever you need ideas or clarity.
            </p>
            <ul className="bullet-list">
              <li>Fast shot logging & efficiency awareness</li>
              <li>Handles, shooting, vertical & conditioning tracks</li>
              <li>CoachGPT answers: drills, tactics, mindset, recovery</li>
              <li>Progress & consistency insights (streaks / volume)</li>
              <li>Community accountability & coach discovery</li>
            </ul>
            <div className="mini-actions" style={{ display: "flex", gap: ".6rem" }}>
              <button className="btn ghost tiny" onClick={() => scrollTo("features")}>
                View Features
              </button>
              <button className="btn tiny" onClick={() => navigate("/dashboard")}>
                Get Started
              </button>
            </div>
          </div>
          <div
            className="media-slot about-image-slot reveal"
            style={{
              position: "relative",
              borderRadius: 24,
              overflow: "hidden",
              /* No background / border */
            }}
          >
            {fallbackImg(IMG.about, "HoopLogs feature preview", "ABOUT")}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="lp-section lp-features" style={{ paddingTop: "3rem" }}>
        <h2 className="section-title reveal">
          Core <span className="accent">Features</span>
        </h2>
        <div className="feature-grid fixed-3">
          {[
            { t: "Shot Tracking", d: "Rapid makes / attempts entry with percentage & volume awareness.", i: "🎯" },
            { t: "CoachGPT", d: "Ask anything: drills, tactics, recovery, mindset, conditioning & more.", i: "🤖" },
            { t: "Skill Tracks", d: "Structured pathways: shooting, handles, vertical & conditioning.", i: "🛠️" },
            { t: "Progress Insights", d: "See streaks, workload distribution & improvement momentum.", i: "📊" },
            { t: "Coach Access", d: "Find or request coaching support for deeper feedback.", i: "🧑‍🏫" },
            { t: "Community", d: "Share milestones & stay accountable with focused hoopers.", i: "💬" },
          ].map(f => (
            <div key={f.t} className="f-card reveal">
              <div className="f-ico">{f.i}</div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COACHGPT */}
      <section id="coachgpt" className="lp-section lp-coachgpt" style={{ paddingTop: "3rem" }}>
        <div className="coach-grid">
          <div className="coach-left reveal">
            <h2>
              Meet <span className="accent">CoachGPT</span>
            </h2>
            <p>
              Your always‑on basketball Q&A. Ask for drill progressions, strategic concepts,
              defensive footwork cues, conditioning ideas, mental reset tips, recovery guidance
              or seasonal planning suggestions—instant, actionable responses anytime.
            </p>
            <ul className="bullet-list small">
              <li>Drill ideas & progressions</li>
              <li>Strategy / spacing / decision concepts</li>
              <li>Mindset, confidence & focus routines</li>
              <li>Recovery, mobility & workload guidance</li>
              <li>Conditioning & seasonal planning</li>
            </ul>
            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              <button className="btn solid small" onClick={() => navigate("/dashboard")}>
                Try CoachGPT
              </button>
              <button className="btn ghost small" onClick={() => scrollTo("contact")}>
                Ask a Question
              </button>
            </div>
          </div>
          <div
            className="media-slot coach-image-slot reveal"
            style={{
              position: "relative",
              borderRadius: 24,
              overflow: "hidden",
              /* No background / border */
            }}
          >
            {fallbackImg(
              IMG.coachgpt,
              "CoachGPT answering a basketball question",
              "COACHGPT"
            )}
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section id="community" className="lp-section lp-community" style={{ paddingTop: "3rem" }}>
        <h2 className="section-title reveal">
          Community & <span className="accent">Support</span>
        </h2>
        <p className="center-blurb reveal">
          Progress sticks when you stay visible & accountable. Share wins, compare streaks,
          request feedback and keep your competitive edge sharp together.
        </p>
        <div className="community-grid">
          {[
            { t: "Focused Channels", d: "Spaces for shooting form, mindset, recovery, conditioning & more." },
            { t: "Coach Requests", d: "Reach out for personal feedback when you need a sharper lens." },
            { t: "Milestone Posts", d: "Document efficiency jumps, vertical gains & consistency streaks." },
            { t: "Leaderboards", d: "Friendly weekly shot volume & accuracy comparisons." },
          ].map(c => (
            <div key={c.t} className="comm-card reveal">
              <h4>{c.t}</h4>
              <p>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="lp-section lp-contact" style={{ paddingTop: "3rem" }}>
        <h2 className="section-title reveal">
          Stay <span className="accent">Connected</span>
        </h2>
        <p className="center-blurb reveal">
          Feature ideas, partnership opportunities or feedback—drop a quick note and we&apos;ll get back to you.
        </p>
        <form
          className="contact-form reveal"
          onSubmit={e => {
            e.preventDefault();
            alert("Submitted (stub)");
          }}
        >
          <div className="row">
            <input placeholder="Name" required />
            <input type="email" placeholder="Email" required />
          </div>
          <textarea rows={4} placeholder="Message" required />
          <button className="btn solid wide" type="submit">
            Send Message
          </button>
        </form>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="footer-grid">
          <div>
            <div className="lp-brand small" style={{ cursor: "default" }}>
              <div className="lp-logo-dot" />
              HoopLogs
            </div>
            <p className="f-desc">
              Intentional basketball development—structure, tracking & an always‑on knowledge coach.
            </p>
          </div>
          <div>
            <h5>Explore</h5>
            <a onClick={() => scrollTo("about")}>About</a>
            <a onClick={() => scrollTo("features")}>Our Features</a>
            <a onClick={() => scrollTo("coachgpt")}>Chat with CoachGPT</a>
            <a onClick={() => scrollTo("community")}>Our Community</a>
          </div>
          <div>
            <h5>App</h5>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/workouttracker">Workouts</Link>
          </div>
          <div>
            <h5>Contact</h5>
            <a href="mailto:team@hooplogs.app">Email</a>
            <a href="#" onClick={e => e.preventDefault()}>
              Twitter
            </a>
            <a href="#" onClick={e => e.preventDefault()}>
              Instagram
            </a>
          </div>
        </div>
        <div className="f-bottom">
          <span>© {new Date().getFullYear()} HoopLogs</span>
          <span>Focused Player Progress</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;