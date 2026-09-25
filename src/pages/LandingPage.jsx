import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LuCrosshair, LuTrophy, LuUsers, LuMessageSquare,
  LuActivity, LuClipboardList, LuArrowRight,
  LuShield, LuMenu, LuX
} from 'react-icons/lu';
import { IoBasketball } from 'react-icons/io5';
import './LandingPage.css';

const FEATURES = [
  {
    icon: LuCrosshair,
    colorClass: 'orange',
    title: '5-Zone Shot Tracker',
    desc: 'Log makes & attempts in Corner 3, Wing 3, Top Key, Elbow, and Paint. Auto-saves so you never lose a session.',
  },
  {
    icon: LuShield,
    colorClass: 'gold',
    title: 'Arena Practice Notice Board',
    desc: 'Receive coach updates, view real-time practice schedules, and RSVP your availability directly from your phone.',
  },
  {
    icon: LuUsers,
    colorClass: 'blue',
    title: 'Roster Management',
    desc: 'Admins and coaches can build full team rosters, search players globally, and export data to PDF or CSV.',
  },
  {
    icon: LuMessageSquare,
    colorClass: 'green',
    title: 'CourtSide Chat',
    desc: 'Real-time messaging with teammates and coaches. Stay connected before, during and after sessions.',
  },
  {
    icon: LuActivity,
    colorClass: 'orange',
    title: 'Athletic Conditioning Tracker',
    desc: 'Follow tailored Vertical Rim Elevation, First-Step Speed, and Contact Armor workouts with gym or home drills.',
  },
  {
    icon: LuClipboardList,
    colorClass: 'purple',
    title: 'Coach Feedback & Reviews',
    desc: 'Receive direct advice, custom shooting drills, and tactical skill evaluations from certified team staff.',
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
        }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.lp-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lp">

      {/* ── HEADER ────────────────────────────────────── */}
      <header className="lp-header">
        <Link to="/" className="lp-logo">
          <img src="/hooplogs-logo.png" alt="HoopLogs Logo" className="lp-logo-img" style={{ width: '28px', height: '28px', borderRadius: '7px', objectFit: 'cover' }} />
          <span className="lp-logo-text" style={{ fontSize: '1.15rem' }}>HOOP<span>LOGS</span></span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="lp-nav-desktop">
          <a href="#install">How to Download</a>
          <a href="#showcase">Arena App</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </nav>

        {/* Header Right Actions: Login + Hamburger on Mobile */}
        <div className="lp-header-cta">
          <Link to="/login" className="lp-btn-login">Log In</Link>
          <button
            type="button"
            className="lp-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <LuX size={19} /> : <LuMenu size={19} />}
          </button>
        </div>
      </header>

      {/* ── MOBILE DRAWER NAVIGATION MENU ─────────────────── */}
      {mobileMenuOpen && (
        <div className="lp-mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="lp-mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="lp-drawer-header">
              <span className="lp-drawer-title">MENU</span>
              <button type="button" className="lp-drawer-close" onClick={() => setMobileMenuOpen(false)}>
                <LuX size={18} />
              </button>
            </div>
            <nav className="lp-drawer-links">
              <a href="#install" onClick={() => setMobileMenuOpen(false)}>How to Download (PWA)</a>
              <a href="#showcase" onClick={() => setMobileMenuOpen(false)}>Arena Mobile App</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Training Features</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)}>About HoopLogs</a>
            </nav>
            <div className="lp-drawer-cta">
              <Link to="/signup" className="lp-drawer-btn-signup" onClick={() => setMobileMenuOpen(false)}>
                Get Started Free
              </Link>
              <Link to="/login" className="lp-drawer-btn-login" onClick={() => setMobileMenuOpen(false)}>
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="lp-hero" ref={heroRef}>
        <div className="lp-hero-bg" />
        <div className="lp-hero-content">
          <h1 className="lp-hero-h1">
            Track Your <span className="accent">Grind.</span><br />
            Level Up Your <span className="accent">Game.</span>
          </h1>
          <p className="lp-hero-sub">
            HoopLogs is the ultimate mobile-first basketball training operating system. Log set-based shots,
            receive coach feedback notes, RSVP to team practice, and follow explosive athletic programs.
          </p>
          <div className="lp-hero-actions">
            <Link to="/signup" className="lp-cta-primary">
              Start For Free
            </Link>
            <Link to="/login" className="lp-cta-secondary">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── MOBILE APP PREVIEW SHOWCASE ────────────────── */}
      <section id="showcase" className="lp-mobile-showcase-section">
        <div className="lp-showcase-inner">
          <div className="lp-showcase-header lp-reveal">
            <h2 className="lp-section-title">
              Designed For The <span className="accent">Court.</span><br />
              Everything In One Streamlined Hub.
            </h2>
            <p className="lp-section-sub">
              Check out how HoopLogs organizes your entire basketball career on any smartphone screen.
            </p>
          </div>

          <div className="lp-showcase-grid lp-reveal">
            {/* Phone Bezel Displaying the Real App Preview */}
            <div className="lp-phone-mockup-wrapper">
              <div className="lp-phone-frame">
                <div className="lp-phone-notch" />
                <img
                  src="/hooplogs-mobile-preview.png"
                  alt="HoopLogs Mobile Arena Dashboard Interface"
                  className="lp-phone-screen-img"
                />
              </div>
              <div className="lp-phone-glow" />
            </div>

            {/* Feature Breakdown Explaining the Image */}
            <div className="lp-showcase-breakdown">
              <div className="lp-breakdown-card">
                <div className="lp-breakdown-icon orange">
                  <LuClipboardList size={22} />
                </div>
                <div className="lp-breakdown-content">
                  <h4>Arena Notice Board & Practice RSVP</h4>
                  <p>
                    Coaches broadcast real-time practice schedules (e.g. <em>"Training for Amazon girls by 6pm today"</em>). Players instantly react with 🏀 Available or ❌ Not Available and post comments so coaches know who is showing up.
                  </p>
                </div>
              </div>

              <div className="lp-breakdown-card">
                <div className="lp-breakdown-icon green">
                  <LuActivity size={22} />
                </div>
                <div className="lp-breakdown-content">
                  <h4>Active Athletic Workout Conditioning</h4>
                  <p>
                    Targeted programs for Vertical Rim Elevation, First-Step Quickness, Contact Strength, and 4th-Quarter Endurance with custom gym equipment or bodyweight court drills.
                  </p>
                </div>
              </div>

              <div className="lp-breakdown-card">
                <div className="lp-breakdown-icon blue">
                  <LuCrosshair size={22} />
                </div>
                <div className="lp-breakdown-content">
                  <h4>Interactive 5-Zone Shot Tracker</h4>
                  <p>
                    Log makes and attempts zone-by-zone (Corner 3, Wing 3, Top Key, Mid-Range, Paint). Real-time accuracy percentages with upward (↑) and downward (↓) efficiency trends.
                  </p>
                </div>
              </div>

              <div className="lp-breakdown-card">
                <div className="lp-breakdown-icon gold">
                  <LuShield size={22} />
                </div>
                <div className="lp-breakdown-content">
                  <h4>Coach Improvement Scouting Badges</h4>
                  <p>
                    Staff coaches can deliver tactical improvement notes directly to athlete profiles, complete with notification badges so players never miss coaching feedback.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW TO DOWNLOAD / INSTALL AS MOBILE APP ─────── */}
      <section id="install" className="lp-section lp-install-guide-section">
        <div className="lp-section-header lp-reveal">
          <p className="lp-section-eyebrow">Instant Mobile Web App (PWA)</p>
          <h2 className="lp-section-title">
            How to Install <span className="accent">HoopLogs</span> on Your Phone
          </h2>
          <p className="lp-section-sub">
            No bulky app store downloads required. Add HoopLogs directly to your home screen in 10 seconds for a full-screen, native mobile experience.
          </p>
        </div>

        <div className="lp-install-cards-grid lp-reveal">
          {/* iOS Card */}
          <div className="lp-install-card ios-card">
            <div className="lp-install-card-head">
              <div className="install-os-icon apple"></div>
              <div>
                <h3>Apple iOS (Safari)</h3>
                <span>iPhone & iPad</span>
              </div>
            </div>
            <ol className="lp-install-steps">
              <li>
                <span className="step-num">1</span>
                <div>Open <strong>Safari</strong> on your iPhone and visit <strong>hooplogs.vercel.app</strong>.</div>
              </li>
              <li>
                <span className="step-num">2</span>
                <div>Tap the <strong>Share</strong> button (the square with an arrow pointing up at the bottom bar).</div>
              </li>
              <li>
                <span className="step-num">3</span>
                <div>Scroll down the share options and tap <strong>"Add to Home Screen"</strong>.</div>
              </li>
              <li>
                <span className="step-num">4</span>
                <div>Tap <strong>"Add"</strong> in the top right. HoopLogs is now installed on your home screen!</div>
              </li>
            </ol>
          </div>

          {/* Android Card */}
          <div className="lp-install-card android-card">
            <div className="lp-install-card-head">
              <div className="install-os-icon android">🤖</div>
              <div>
                <h3>Android (Google Chrome)</h3>
                <span>Samsung, Pixel & All Androids</span>
              </div>
            </div>
            <ol className="lp-install-steps">
              <li>
                <span className="step-num">1</span>
                <div>Open <strong>Google Chrome</strong> on your device and navigate to <strong>hooplogs.vercel.app</strong>.</div>
              </li>
              <li>
                <span className="step-num">2</span>
                <div>Tap the <strong>three vertical dots menu (⋮)</strong> in the top right corner.</div>
              </li>
              <li>
                <span className="step-num">3</span>
                <div>Select <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).</div>
              </li>
              <li>
                <span className="step-num">4</span>
                <div>Tap <strong>"Install"</strong> to confirm. HoopLogs launches instantly from your app drawer!</div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────── */}
      <section id="features" className="lp-section">
        <div className="lp-section-header lp-reveal">
          <p className="lp-section-eyebrow">What You Get</p>
          <h2 className="lp-section-title">
            Built For <span className="accent">Hoopers</span>
          </h2>
          <p className="lp-section-sub">
            Every tool you need to train smarter, compete harder, and grow consistently.
          </p>
        </div>

        <div className="lp-features-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="lp-feature-card lp-reveal"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className={`lp-feature-icon ${f.colorClass}`}>
                  <Icon size={22} />
                </div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── VISUAL / ABOUT ────────────────────────────── */}
      <section id="about" className="lp-visual-section">
        <div className="lp-visual-inner">
          <div className="lp-visual-text lp-reveal">
            <p className="lp-section-eyebrow">Why HoopLogs</p>
            <h2 className="lp-section-title">
              Stop Guessing.<br />
              Start <span className="accent">Measuring.</span>
            </h2>
            <p className="lp-section-sub" style={{ textAlign: 'left', marginLeft: 0 }}>
              Most players train hard but track nothing. HoopLogs gives you
              the data to see what's actually improving and what needs work.
            </p>
            <ul className="lp-bullet-list">
              <li>Interactive 5-zone court with real-time makes/attempts logging</li>
              <li>Auto-save sessions — pause and resume any time</li>
              <li>Admin roster builder with global player search</li>
              <li>Export full stats to PDF or CSV in one click</li>
              <li>Team and global leaderboards ranked by accuracy</li>
              <li>Coach scouting reviews and custom shooting workouts</li>
            </ul>
            <Link to="/signup" className="lp-cta-primary" style={{ maxWidth: 280 }}>
              Join HoopLogs Free
            </Link>
          </div>
          <div className="lp-visual-image lp-reveal">
            <img src="/court.jpg" alt="HoopLogs Court Tracker" />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────── */}
      <div className="lp-cta-banner lp-reveal">
        <h2 className="lp-cta-banner-title">
          Ready to Elevate Your <span className="accent">Game?</span>
        </h2>
        <p className="lp-cta-banner-sub">
          Join players who are tracking their shots, climbing leaderboards,
          and building real, measurable skills.
        </p>
        <div className="lp-cta-banner-actions">
          <Link to="/signup" className="lp-cta-primary">
            Create Free Account
          </Link>
          <Link to="/login" className="lp-cta-secondary">
            Sign In
          </Link>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-logo" style={{ marginBottom: 10 }}>
              <img src="/hooplogs-logo.png" alt="HoopLogs" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
              <span className="lp-logo-text" style={{ fontSize: '1.35rem' }}>HOOP<span>LOGS</span></span>
            </div>
            <p className="lp-footer-desc">
              Intentional basketball development — structure smarter sessions,
              track every rep, and grow consistently.
            </p>
          </div>
          <div className="lp-footer-col">
            <h5>Explore</h5>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#showcase">Mobile App</a>
          </div>
          <div className="lp-footer-col">
            <h5>Account</h5>
            <Link to="/login">Log In</Link>
            <Link to="/signup">Sign Up</Link>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2026 Sozidara. All rights reserved.</span>
          <span>Powered by Sozidara • Built for hoopers</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;