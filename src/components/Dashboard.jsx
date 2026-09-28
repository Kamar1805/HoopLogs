import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import SiteHeader from './SiteHeader';
import MobileBottomNav from './MobileBottomNav';
import AppGuideModal from './AppGuideModal';
import OnboardingPromptModal from './OnboardingPromptModal';
import ArenaSplashLoader from './ArenaSplashLoader';
import { IoBasketball, IoLogoWhatsapp } from 'react-icons/io5';
import {
  LuCrosshair,
  LuTrophy,
  LuUsers,
  LuChevronRight,
  LuZap,
  LuTrendingUp,
  LuCompass,
  LuActivity,
  LuMegaphone,
  LuPlus,
  LuX,
  LuShieldCheck,
  LuCalendar,
  LuClock,
  LuPlay,
  LuTrash2
} from 'react-icons/lu';
import './Dashboard.css';


const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isCoach = profile?.role === 'admin' || (typeof window !== 'undefined' && localStorage.getItem('hooplogs_admin_elevated') === 'true');

  const [careerStats, setCareerStats] = useState({
    attempted: 0,
    made: 0,
    accuracy: 0,
    sessionsCount: 0,
  });
  const [topShooters, setTopShooters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entranceLoading, setEntranceLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEntranceLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Guide prompt & modal visibility (opens immediately on signup or first login)
  const [showTour, setShowTour] = useState(() => {
    try {
      if (location.state?.openTour) return true;
      const completed = localStorage.getItem('hooplogs_tour_completed');
      return !completed;
    } catch {
      return false;
    }
  });

  // Post-tour / First-time onboarding prompt (Photo + optional WhatsApp)
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);

  useEffect(() => {
    try {
      const needsPrompt = localStorage.getItem('hooplogs_needs_onboarding_prompt') === 'true';
      const uId = user?.id;
      const alreadyOnboarded = uId ? localStorage.getItem(`hooplogs_onboarded_${uId}`) === 'true' : false;
      if (!showTour && (needsPrompt || (!alreadyOnboarded && !profile?.avatar_url))) {
        setShowOnboardingPrompt(true);
      }
    } catch (e) {}
  }, [showTour, user, profile]);

  useEffect(() => {
    if (location.state?.openTour) {
      setShowTour(true);
    }
  }, [location.state]);

  const [showGuideBanner, setShowGuideBanner] = useState(() => {
    try {
      const dismissed = localStorage.getItem('hooplogs_guide_dismissed');
      const completed = localStorage.getItem('hooplogs_tour_completed');
      return !dismissed && !completed;
    } catch {
      return false;
    }
  });

  // Announcements state - Real-time from Supabase with localStorage fallback (ZERO dummy posts)
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const saved = localStorage.getItem('hooplogs_arena_announcements');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (p) =>
            p &&
            !p.authorName?.includes('Coach AK') &&
            !p.authorName?.includes('Test User') &&
            !p.text?.includes('Practice scheduled at 5 PM') &&
            !p.text?.includes('Shooting session tomorrow')
        );
      }
      return [];
    } catch {
      return [];
    }
  });
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostTeam, setNewPostTeam] = useState('All Teams');
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentInput, setCommentInput] = useState('');

  // Active workout program state - Unique per user (No fake 35% hardcode for first-timers)
  const loadUserWorkout = () => {
    try {
      const uKey = user?.id ? `hooplogs_active_workout_${user.id}` : 'hooplogs_active_workout';
      const saved = localStorage.getItem(uKey) || localStorage.getItem('hooplogs_active_workout');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed || !parsed.name) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const [activeWorkout, setActiveWorkout] = useState(loadUserWorkout);

  useEffect(() => {
    setActiveWorkout(loadUserWorkout());
  }, [user]);

  // Real-time Announcements from Supabase with Local Fallback (ZERO dummy posts)
  useEffect(() => {
    let channel = null;

    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from('arena_announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const fetched = data
            .filter(
              (p) =>
                !p.author_name?.includes('Coach AK') &&
                !p.author_name?.includes('Test User') &&
                !p.authorName?.includes('Coach AK') &&
                !p.authorName?.includes('Test User') &&
                !p.text?.includes('Practice scheduled at 5 PM') &&
                !p.text?.includes('Shooting session tomorrow')
            )
            .map((p) => ({
              id: p.id,
              authorName: p.author_name || p.authorName || 'Hooper',
              authorId: p.author_id || p.authorId || null,
              team: p.team || 'All Teams',
              text: p.text || '',
              time: p.time || 'Today',
              date: p.date || '',
              createdAt: p.created_at || p.createdAt,
              attendance: p.attendance || {},
              comments: p.comments || [],
              cheers: p.cheers || []
            }));

          setAnnouncements(fetched);
          try {
            localStorage.setItem('hooplogs_arena_announcements', JSON.stringify(fetched));
          } catch (_) {}
        }
      } catch (err) {
        console.warn('Supabase announcements query notice, loading local:', err);
      }
    };

    fetchAnnouncements();

    try {
      channel = supabase
        .channel('arena_announcements_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'arena_announcements' },
          () => {
            fetchAnnouncements();
          }
        )
        .subscribe();
    } catch (realtimeErr) {
      console.warn('Supabase announcements realtime notice:', realtimeErr);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, profile]);

  const handleDismissGuide = (e) => {
    e.stopPropagation();
    setShowGuideBanner(false);
    try {
      localStorage.setItem('hooplogs_guide_dismissed', 'true');
    } catch (err) {
      console.warn('Could not store guide dismissal:', err);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    setPostingAnnouncement(true);
    const postData = {
      authorName: profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Coach',
      authorId: user?.id || null,
      team: newPostTeam.trim() || 'All Teams',
      text: newPostText.trim(),
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      attendance: {},
      comments: []
    };

    // Optimistic local update
    const tempId = `post-${Date.now()}`;
    const tempPost = { id: tempId, ...postData };
    const updated = [tempPost, ...announcements];
    setAnnouncements(updated);
    try {
      localStorage.setItem('hooplogs_arena_announcements', JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not save announcement locally:', err);
    }

    // Persist to Supabase arena_announcements table
    try {
      const { data, error } = await supabase.from('arena_announcements').insert({
        author_name: postData.authorName,
        author_id: postData.authorId,
        team: postData.team,
        text: postData.text,
        time: postData.time,
        date: postData.date,
        attendance: postData.attendance,
        comments: postData.comments,
        cheers: postData.cheers
      }).select().single();

      if (!error && data) {
        const actualPost = {
          ...postData,
          id: data.id,
          authorName: data.author_name || postData.authorName,
          authorId: data.author_id || postData.authorId,
        };
        setAnnouncements((prev) => [actualPost, ...prev.filter((p) => p.id !== tempId)]);
        try {
          const currentSaved = JSON.parse(localStorage.getItem('hooplogs_arena_announcements') || '[]');
          const replaced = [actualPost, ...currentSaved.filter((p) => p.id !== tempId)];
          localStorage.setItem('hooplogs_arena_announcements', JSON.stringify(replaced));
        } catch (_) {}
      }
      setAnnouncementMsg('Post published to arena feed! 📢');
    } catch (err) {
      console.warn('Notice posting announcement to Supabase:', err);
      setAnnouncementMsg('Post published to feed! 📢');
    } finally {
      setNewPostText('');
      setPostingAnnouncement(false);
      setShowNewPostModal(false);
      setTimeout(() => setAnnouncementMsg(''), 3500);
    }
  };

  const handleToggleAttendance = async (postId, status) => {
    const userId = user?.id || 'guest-user';
    const userName = profile?.full_name || user?.user_metadata?.full_name || 'Hooper';
    let targetAttendance = {};

    setAnnouncements((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          const attendance = { ...(p.attendance || {}) };
          if (attendance[userId]?.status === status) {
            delete attendance[userId];
          } else {
            attendance[userId] = {
              status,
              name: userName,
              time: 'Just now'
            };
          }
          targetAttendance = attendance;
          return { ...p, attendance };
        }
        return p;
      });
      try {
        localStorage.setItem('hooplogs_arena_announcements', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // Update in Supabase
    try {
      await supabase
        .from('arena_announcements')
        .update({ attendance: targetAttendance })
        .eq('id', postId);
    } catch (err) {
      console.warn('Could not sync attendance to Supabase:', err);
    }
  };

  const handleToggleCheer = async (postId) => {
    const userId = user?.id || 'hooper-user';
    let targetCheers = [];
    setAnnouncements((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          const current = p.cheers || [];
          const cheers = current.includes(userId)
            ? current.filter((id) => id !== userId)
            : [...current, userId];
          targetCheers = cheers;
          return { ...p, cheers };
        }
        return p;
      });
      try {
        localStorage.setItem('hooplogs_arena_announcements', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // Update in Supabase
    try {
      await supabase
        .from('arena_announcements')
        .update({ cheers: targetCheers })
        .eq('id', postId);
    } catch (err) {
      console.warn('Could not sync cheer to Supabase:', err);
    }
  };

  const handleAddComment = async (postId) => {
    if (!commentInput.trim()) return;
    const text = commentInput.trim();
    const userName = profile?.full_name || user?.user_metadata?.full_name || 'Hooper';
    const newComment = {
      id: `c-${Date.now()}`,
      author: userName,
      authorId: user?.id || null,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    let targetComments = [];
    setAnnouncements((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          const comments = [...(p.comments || []), newComment];
          targetComments = comments;
          return { ...p, comments };
        }
        return p;
      });
      try {
        localStorage.setItem('hooplogs_arena_announcements', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setCommentInput('');
    setActiveCommentPostId(postId); // Keep tray open!

    // Update in Supabase
    try {
      await supabase
        .from('arena_announcements')
        .update({ comments: targetComments })
        .eq('id', postId);
    } catch (err) {
      console.warn('Could not sync comment to Supabase:', err);
    }
  };

  const handleDeleteAnnouncement = async (postId) => {
    if (!window.confirm('Delete this post from the arena feed?')) return;

    setAnnouncements((prev) => {
      const updated = prev.filter((p) => p.id !== postId);
      try {
        localStorage.setItem('hooplogs_arena_announcements', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // Delete in Supabase
    try {
      await supabase
        .from('arena_announcements')
        .delete()
        .eq('id', postId);
      setAnnouncementMsg('Post deleted.');
      setTimeout(() => setAnnouncementMsg(''), 3000);
    } catch (err) {
      console.warn('Error deleting post from Supabase:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setLoading(true);

        // 1. Fetch user cumulative career shooting stats
        if (user) {
          const { data: userLogs, error: logsErr } = await supabase
            .from('shot_zone_logs')
            .select('attempted, made')
            .eq('user_id', user.id);

          if (!logsErr && userLogs && isMounted) {
            let totalAtt = 0;
            let totalMade = 0;
            userLogs.forEach((row) => {
              totalAtt += Number(row.attempted) || 0;
              totalMade += Number(row.made) || 0;
            });
            const acc = totalAtt > 0 ? Math.round((totalMade / totalAtt) * 100) : 0;
            setCareerStats((prev) => ({
              ...prev,
              attempted: totalAtt,
              made: totalMade,
              accuracy: acc,
            }));
          }

          // Count completed sessions
          const { count, error: countErr } = await supabase
            .from('shooting_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          if (!countErr && isMounted) {
            setCareerStats((prev) => ({
              ...prev,
              sessionsCount: count || 0,
            }));
          }
        }

        // 2. Fetch top 3 shooters for leaderboard spotlight
        const { data: topData, error: topErr } = await supabase
          .from('leaderboard_global')
          .select('*')
          .order('accuracy_percentage', { ascending: false })
          .limit(3);

        if (!topErr && topData && isMounted) {
          setTopShooters(topData);
        }
      } catch (err) {
        console.error('Dashboard load catch:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const athleteName = profile?.full_name || user?.user_metadata?.full_name || 'Hooper';
  const athleteHandle = profile?.nickname ? `@${profile.nickname}` : '@hooper';
  const position = profile?.position || 'GUARD';
  const cleanWhatsapp = profile?.whatsapp ? profile.whatsapp.replace(/\D/g, '') : null;
  const athleteAvatar =
    profile?.avatar_url ||
    profile?.photo_url ||
    profile?.photoURL ||
    user?.user_metadata?.avatar_url ||
    user?.photoURL ||
    (user?.id ? localStorage.getItem(`hooplogs_avatar_${user.id}`) : null);

  if (loading || entranceLoading) {
    return <ArenaSplashLoader subtitle="ENTERING ARENA…" />;
  }

  return (
    <div className="home-arena-page">
      <SiteHeader />

      <main className="home-arena-container">
        {/* ATHLETE GREETING CARD */}
        <section className="athlete-greeting-card">
          <div className="athlete-profile-row">
            <div className="athlete-avatar-wrap">
              <div className="athlete-avatar">
                {athleteAvatar ? (
                  <img
                    src={athleteAvatar}
                    alt={athleteName}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ff5500', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
                    {athleteName?.charAt(0)?.toUpperCase() || 'H'}
                  </div>
                )}
              </div>
              <span className="online-indicator-dot" title="Active on Court" />
            </div>

            <div className="athlete-meta-col">
              <span className="athlete-greeting-sub">Welcome back</span>
              <h1 className="athlete-display-name">{athleteName}</h1>
              <div className="athlete-chips-row">
                {position && <span className="athlete-chip pos">{position}</span>}
                {isCoach && <span className="athlete-chip coach">COACH / ADMIN</span>}
                {athleteHandle && <span className="athlete-chip handle">{athleteHandle}</span>}

                {cleanWhatsapp && (
                  <a
                    href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent("Hey! Saw you on HoopLogs, let's connect on the court!")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="athlete-chip whatsapp"
                    title="Connect on WhatsApp"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IoLogoWhatsapp size={11} color="#22c55e" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* GUIDED APP TOUR PROMPT (Only appears on first login until dismissed) */}
        {showGuideBanner && (
          <div className="guided-tour-strip" onClick={() => setShowTour(true)}>
            <div className="tour-strip-left">
              <LuCompass size={15} color="#ff7a2e" />
              <span>New here? Tap to view the App Guide & Tour</span>
            </div>
            <div className="tour-strip-right">
              <span className="tour-strip-btn">View Guide</span>
              <button
                type="button"
                className="tour-strip-close"
                onClick={handleDismissGuide}
                title="Dismiss Guide"
                aria-label="Dismiss Guide"
              >
                <LuX size={14} />
              </button>
            </div>
          </div>
        )}

        {announcementMsg && (
          <div className="dashboard-toast-alert">
            {announcementMsg}
          </div>
        )}

        {/* ARENA ANNOUNCEMENTS / TEAM NOTICE BOARD */}
        <section className="arena-announcements-card">
          <div className="announcements-card-header">
            <div className="announcements-header-title">
              <h2>Arena Notice Board</h2>
            </div>
            {isCoach && (
              <button
                type="button"
                className="btn-create-post"
                onClick={() => setShowNewPostModal(true)}
              >
                <LuPlus size={13} /> Post Update
              </button>
            )}
          </div>

          <div className="announcements-stream">
            {announcements.length === 0 ? (
              <div className="empty-announcements-state">
                <LuMegaphone size={28} color="#64748b" />
                <p>No squad announcements posted yet.</p>
                {isCoach && (
                  <button
                    type="button"
                    className="btn-create-post-empty"
                    onClick={() => setShowNewPostModal(true)}
                  >
                    + Publish First Announcement
                  </button>
                )}
              </div>
            ) : (
              announcements.map((post) => {
                const attendance = post.attendance || {};
                const attendees = Object.values(attendance);
                const attending = attendees.filter((a) => a.status === 'available');
                const absent = attendees.filter((a) => a.status === 'unavailable');
                const myStatus = attendance[user?.id || 'guest-user']?.status;
                const comments = post.comments || [];
                const cheers = post.cheers || [];
                const hasCheered = cheers.includes(user?.id);
                const isAuthor = (post.authorId && post.authorId === user?.id) ||
                  (post.authorName && (post.authorName === profile?.full_name || post.authorName === user?.user_metadata?.full_name));
                const authorInitial = (post.authorName || 'H').charAt(0).toUpperCase();

                return (
                  <div key={post.id} className="announcement-item social-feed-card">
                    {/* Header Row: Author Avatar + Name + Team + Timestamp + Delete */}
                    <div className="announcement-top-bar">
                      <div className="social-author-left">
                        <div className="social-author-avatar">
                          {authorInitial}
                        </div>
                        <div className="announcement-author-info">
                          <div className="social-author-name-row">
                            <span className="announcement-author">
                              {post.authorName}
                            </span>
                            {isAuthor && <span className="social-author-you-badge">YOU</span>}
                            {post.team && (
                              <span className="announcement-team-tag">{post.team}</span>
                            )}
                          </div>
                          <span className="announcement-time-stamp">
                            <LuClock size={11} /> {post.time || post.date || 'Today'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(isAuthor || isCoach) && (
                          <button
                            type="button"
                            className="btn-delete-announcement"
                            onClick={() => handleDeleteAnnouncement(post.id)}
                            title="Delete this post"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.8
                            }}
                          >
                            <LuTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="announcement-body-text">{post.text}</p>

                    {/* Attendance summary if anyone responded */}
                    {attendees.length > 0 && (
                      <div className="attendance-attendees-strip">
                        {attending.length > 0 && (
                          <span className="attending-names">
                            🏀 {attending.length} Attending: {attending.map((a) => a.name).join(', ')}
                          </span>
                        )}
                        {absent.length > 0 && (
                          <span className="absent-names">
                            ❌ {absent.length} Absent: {absent.map((a) => a.name).join(', ')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Social Feed Action Bar */}
                    <div className="announcement-reactions-row social-action-bar">
                      {/* Cheer / Hype Reaction */}
                      <button
                        type="button"
                        className={`reaction-pill-btn cheer ${hasCheered ? 'active' : ''}`}
                        onClick={() => handleToggleCheer(post.id)}
                        title="Cheer / Hype this post"
                      >
                        🔥 {cheers.length > 0 ? `${cheers.length} ` : ''}Hype
                      </button>

                      {/* Comments Toggle */}
                      <button
                        type="button"
                        className={`comment-toggle-btn ${activeCommentPostId === post.id ? 'active' : ''}`}
                        onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                      >
                        💬 {comments.length > 0 ? `${comments.length} ` : ''}Comments
                      </button>

                      {/* RSVP Buttons: ONLY FOR NON-AUTHORS */}
                      {!isAuthor && (
                        <>
                          <button
                            type="button"
                            className={`reaction-pill-btn available ${myStatus === 'available' ? 'active' : ''}`}
                            onClick={() => handleToggleAttendance(post.id, 'available')}
                            title="Confirm you will attend"
                          >
                            🏀 Available ({attending.length})
                          </button>
                          <button
                            type="button"
                            className={`reaction-pill-btn unavailable ${myStatus === 'unavailable' ? 'active' : ''}`}
                            onClick={() => handleToggleAttendance(post.id, 'unavailable')}
                            title="Mark yourself not available"
                          >
                            ❌ Out ({absent.length})
                          </button>
                        </>
                      )}
                    </div>

                    {/* Social Comments Tray */}
                    {activeCommentPostId === post.id && (
                      <div className="post-comments-tray">
                        {comments.length > 0 ? (
                          <div className="comments-list">
                            {comments.map((c) => (
                              <div key={c.id} className="comment-bubble social-comment-item">
                                <div className="comment-author-avatar">
                                  {(c.author || 'H').charAt(0).toUpperCase()}
                                </div>
                                <div className="comment-body-col">
                                  <div className="comment-author-line">
                                    <span className="comment-author">{c.author}</span>
                                    {c.time && <span className="comment-time">{c.time}</span>}
                                  </div>
                                  <span className="comment-text">{c.text}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-comments-hint">
                            <span>No comments yet. Start the conversation! 💬</span>
                          </div>
                        )}

                        <div className="comment-input-row">
                          <input
                            type="text"
                            placeholder="Add a comment or reply..."
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                            className="social-comment-input"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddComment(post.id)}
                            className="btn-send-comment"
                            disabled={!commentInput.trim()}
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ATHLETIC WORKOUT PROGRAM CARD (START OR CONTINUE) */}
        {activeWorkout ? (
          <Link to="/workouttracker" className="continue-workout-card" title="Continue Active Workout">
            <div className="continue-workout-top">
              <div className="continue-workout-title-col">
                <div className="continue-badge-row">
                  <span className="workout-pulse-dot" />
                  <span className="continue-workout-label">CONTINUE YOUR WORKOUT</span>
                </div>
                <h3 className="continue-workout-headline">
                  {activeWorkout.name} — <span className="legs-loading-highlight">Legs Loading...</span>
                </h3>
                <p className="continue-workout-focus">
                  Focus: {activeWorkout.focus || 'Kinetic Jump & Conditioning'}
                </p>
              </div>

              <div className="btn-resume-cta" title="Continue Workout">
                <IoBasketball size={18} />
              </div>
            </div>

            <div className="continue-workout-meter-wrap">
              <div
                className="continue-workout-meter-fill"
                style={{ width: `${activeWorkout.percentDone || 0}%` }}
              />
            </div>
            <div className="continue-workout-meta-row">
              <span>Day {activeWorkout.dayNumber || 1} Prescription</span>
              <span>{activeWorkout.percentDone || 0}% Completed</span>
            </div>
          </Link>
        ) : (
          <Link to="/workouttracker" className="continue-workout-card start-plan-card" title="Start Athletic Workout Plan">
            <div className="continue-workout-top">
              <div className="continue-workout-title-col">
                <div className="continue-badge-row">
                  <span className="workout-pulse-dot" />
                  <span className="continue-workout-label">START YOUR ATHLETIC WORKOUT</span>
                </div>
                <h3 className="continue-workout-headline">
                  Choose Your Plan — <span className="legs-loading-highlight">Legs Loading</span>
                </h3>
                <p className="continue-workout-focus">
                  Select your program: Rim Elevation, First-Step Speed, Armor or Stamina
                </p>
              </div>

              <div className="btn-resume-cta" title="Start Workout">
                <LuPlay size={18} />
              </div>
            </div>

            <div className="continue-workout-meta-row" style={{ marginTop: '8px' }}>
              <span>Day 1 • Not Started Yet</span>
              <span style={{ color: 'var(--orange, #ff5500)', fontWeight: 700 }}>TAP TO BEGIN →</span>
            </div>
          </Link>
        )}

        {/* PRIMARY WORKOUT LAUNCH BANNER */}
        <Link to="/shottracker" className="workout-launch-banner">
          <div className="launch-banner-left">
            <div className="launch-icon-badge">
              <IoBasketball size={22} color="#ffffff" />
            </div>
            <div className="launch-text-col">
              <div className="launch-main-title">Start 5-Zone Workout</div>
              <div className="launch-sub-label">
                Tap court zones • Log makes & misses • Track trend
              </div>
            </div>
          </div>
          <div className="launch-chevron-wrap">
            <LuChevronRight size={18} />
          </div>
        </Link>

        {/* METRICS QUICK STRIP */}
        <section className="stats-metric-strip">
          <div className="stat-metric-card">
            <span className="stat-card-label">Shots Made</span>
            <div className="stat-card-value highlight">
              {careerStats.made}
              <span className="stat-card-unit">/{careerStats.attempted}</span>
            </div>
            <span className="stat-card-foot">Total Volume</span>
          </div>

          <div className="stat-metric-card">
            <span className="stat-card-label">Accuracy</span>
            <div className="stat-card-value">
              {careerStats.accuracy}
              <span className="stat-card-unit">%</span>
            </div>
            <span className="stat-card-foot">Career Avg</span>
          </div>

          <div className="stat-metric-card">
            <span className="stat-card-label">Workouts</span>
            <div className="stat-card-value">
              {careerStats.sessionsCount}
            </div>
            <span className="stat-card-foot">Completed</span>
          </div>
        </section>

        {/* PRIMARY MODULES LIST */}
        <div className="section-title-bar">
          <div className="section-title-wrap">
            <h2>Training Modules</h2>
          </div>
        </div>

        <section className="modules-stack">
          {/* Module 1: 5-Zone Shot Tracker */}
          <Link to="/shottracker" className="module-item-card">
            <div className="module-item-left">
              <div className="module-icon-box orange">
                <LuCrosshair size={18} />
              </div>
              <div className="module-text-wrap">
                <div className="module-name">5-Zone Shot Tracker</div>
                <div className="module-desc">
                  Interactive court: Log sets with automatic improvement tracking.
                </div>
              </div>
            </div>
            <LuChevronRight size={16} className="module-chevron" />
          </Link>

          {/* Module 2: Team Rosters */}
          <Link to="/rosters" className="module-item-card">
            <div className="module-item-left">
              <div className="module-icon-box blue">
                <LuUsers size={18} />
              </div>
              <div className="module-text-wrap">
                <div className="module-name">Team Roster & Coaching</div>
                <div className="module-desc">
                  Assemble rosters, review athlete profiles, and export CSV/PDF.
                </div>
              </div>
            </div>
            <LuChevronRight size={16} className="module-chevron" />
          </Link>

          {/* Module 3: Shooting Leaderboards */}
          <Link to="/leaderboards" className="module-item-card">
            <div className="module-item-left">
              <div className="module-icon-box yellow">
                <LuTrophy size={18} />
              </div>
              <div className="module-text-wrap">
                <div className="module-name">Shooting Leaderboards</div>
                <div className="module-desc">
                  Global and team sharpshooters ranked with direct WhatsApp connect.
                </div>
              </div>
            </div>
            <LuChevronRight size={16} className="module-chevron" />
          </Link>

          {/* Module 4: Athletic Conditioning & Verticals */}
          <Link to="/shottracker" className="module-item-card">
            <div className="module-item-left">
              <div className="module-icon-box green">
                <LuActivity size={18} />
              </div>
              <div className="module-text-wrap">
                <div className="module-name">Athletic Conditioning & Verticals</div>
                <div className="module-desc">
                  Prescribed gym & bodyweight workouts for speed, jumping & strength.
                </div>
              </div>
            </div>
            <LuChevronRight size={16} className="module-chevron" />
          </Link>
        </section>

        {/* LEADERBOARD SPOTLIGHT */}
        {topShooters.length > 0 && (
          <>
            <div className="section-title-bar" style={{ marginTop: '1.25rem' }}>
              <div className="section-title-wrap">
                <h2>Top Sharpshooters</h2>
              </div>
              <Link to="/leaderboards" className="section-title-link">
                View All <LuChevronRight size={13} />
              </Link>
            </div>

            <section className="spotlight-card">
              {topShooters.map((shooter, idx) => (
                <div key={shooter.user_id} className="spotlight-player-row">
                  <div className="spotlight-left">
                    <span className={`spotlight-rank-badge rank-${idx + 1}`}>
                      {idx + 1}
                    </span>
                    <div className="spotlight-info">
                      <div className="spotlight-name">{shooter.full_name}</div>
                      <div className="spotlight-sub">@{shooter.nickname || 'hooper'}</div>
                    </div>
                  </div>

                  <div className="spotlight-stat-box">
                    <div className="spotlight-accuracy">{shooter.accuracy_percentage}%</div>
                    <div className="spotlight-shots">
                      {shooter.total_made}/{shooter.total_attempted} made
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </main>

      {/* NEW ANNOUNCEMENT MODAL (Coach / Admin Only) */}
      {showNewPostModal && (
        <div className="announcement-modal-backdrop" onClick={() => setShowNewPostModal(false)}>
          <div className="announcement-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="announcement-modal-header">
              <div className="announcement-modal-title">
                <LuMegaphone size={18} color="#ff5500" />
                <h3>Post Arena Announcement</h3>
              </div>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setShowNewPostModal(false)}
              >
                <LuX size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="new-post-form">
              <div className="post-input-group">
                <label>Target Squad / Team</label>
                <input
                  type="text"
                  placeholder="e.g. Amazon Girls or All Players"
                  value={newPostTeam}
                  onChange={(e) => setNewPostTeam(e.target.value)}
                />
              </div>

              <div className="post-input-group">
                <label>Announcement Details</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Training for Amazon Girls by 6:00 PM today at Court 2. Focus on fastbreak drills."
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-publish-post">
                Publish Announcement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Guided Tour Modal */}
      <AppGuideModal isOpen={showTour} onClose={() => setShowTour(false)} />

      {/* First-Time Onboarding Prompt Modal (Photo + WhatsApp) */}
      <OnboardingPromptModal
        isOpen={showOnboardingPrompt}
        onClose={() => setShowOnboardingPrompt(false)}
      />

      <MobileBottomNav />
    </div>
  );
};

export default Dashboard;
