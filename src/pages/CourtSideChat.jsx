// src/pages/CourtSideChat.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import MobileBottomNav from "../components/MobileBottomNav";
import { IoBasketball, IoLogoWhatsapp } from "react-icons/io5";
import "./CourtSideChat.css";

function formatTimestamp(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CourtSideChat() {
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [hoopMates, setHoopMates] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef(null);

  // Responsive view
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. Fetch registered hoopers for chat contacts
  const fetchContacts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, nickname, position, height, avatar_url")
        .neq("id", user.id)
        .limit(25);

      if (!error && data) {
        setHoopMates(data);
        if (data.length > 0 && !selectedUser) {
          setSelectedUser(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedUser]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // 2. Search contacts
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchContacts();
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, nickname, position, height, avatar_url")
        .neq("id", user.id)
        .or(`full_name.ilike.%${searchTerm.trim()}%,nickname.ilike.%${searchTerm.trim()}%`)
        .limit(15);

      if (!error && data) {
        setHoopMates(data);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Load messages for selected user and subscribe to real-time updates
  useEffect(() => {
    if (!user || !selectedUser) return;

    let isMounted = true;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (!error && data && isMounted) {
        setMessages(data);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    };

    loadMessages();

    // Subscribe to new real-time messages
    const channel = supabase
      .channel(`chat_${user.id}_${selectedUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const msg = payload.new;
          if (
            (msg.sender_id === selectedUser.id && msg.receiver_id === user.id) ||
            (msg.sender_id === user.id && msg.receiver_id === selectedUser.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, selectedUser]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUser) return;

    const text = newMessage.trim();
    setNewMessage("");

    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: user.id,
          receiver_id: selectedUser.id,
          message: text,
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="courtside-chat-page">
      <SiteHeader />

      <main className="chat-container">
        <div className="chat-wrapper">
          {/* Contacts Sidebar */}
          <aside className={`contacts-sidebar ${isMobileView && selectedUser ? "hidden-mobile" : ""}`}>
            <div className="contacts-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <Link to="/dashboard" className="chat-back-home-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--orange, #ff5500)', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>
                  ← Dashboard
                </Link>
                <h2>CourtSide Chat</h2>
              </div>
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder="Search hoopers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </form>
            </div>

            <div className="contacts-list">
              {loading ? (
                <p style={{ padding: "1rem", color: "#94a3b8" }}>Loading hoopers…</p>
              ) : hoopMates.length === 0 ? (
                <p style={{ padding: "1rem", color: "#94a3b8" }}>No hoopers found.</p>
              ) : (
                hoopMates.map((contact) => (
                  <div
                    key={contact.id}
                    className={`contact-item ${selectedUser?.id === contact.id ? "active" : ""}`}
                    onClick={() => setSelectedUser(contact)}
                  >
                    <div className="contact-avatar">
                      {contact.full_name?.charAt(0) || "P"}
                    </div>
                    <div className="contact-info">
                      <div className="contact-name">{contact.full_name || "Hooper"}</div>
                      <div className="contact-sub">
                        @{contact.nickname || "hooper"} • {contact.position || "G"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Active Conversation Area */}
          <section className={`chat-conversation-area ${isMobileView && !selectedUser ? "hidden-mobile" : ""}`}>
            {selectedUser ? (
              <>
                <div className="chat-conv-header">
                  {isMobileView && (
                    <button
                      className="back-to-contacts-btn"
                      onClick={() => setSelectedUser(null)}
                    >
                      ←
                    </button>
                  )}
                  <div className="active-contact-avatar">
                    {selectedUser.full_name?.charAt(0) || "P"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedUser.full_name}
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      @{selectedUser.nickname || "hooper"} • {selectedUser.position || "Player"}
                    </span>
                  </div>

                  {selectedUser.whatsapp && (
                    <a
                      href={`https://wa.me/${selectedUser.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hey ${selectedUser.full_name}! Connecting with you on WhatsApp from HoopLogs.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chat-wa-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        color: '#4ade80',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        flexShrink: 0
                      }}
                      title="Continue on WhatsApp"
                    >
                      <IoLogoWhatsapp size={14} color="#22c55e" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>

                <div className="messages-stream">
                  {messages.length === 0 ? (
                    <div style={{ textAlign: "center", margin: "auto", color: "#94a3b8" }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                        <IoBasketball size={28} color="#ff5500" />
                      </div>
                      <p>Start a conversation with {selectedUser.full_name}!</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === user?.id;
                      return (
                        <div
                          key={m.id}
                          className={`message-bubble-wrapper ${isMe ? "me" : "other"}`}
                        >
                          <div className={`message-bubble ${isMe ? "outgoing" : "incoming"}`}>
                            <p style={{ margin: 0 }}>{m.message}</p>
                            <span className="msg-timestamp">
                              {formatTimestamp(m.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="chat-input-bar">
                  <input
                    type="text"
                    placeholder={`Message ${selectedUser.full_name}…`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="chat-text-input"
                  />
                  <button type="submit" className="chat-send-btn">
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center", margin: "auto", color: "#94a3b8" }}>
                <p>Select a hooper from the list to start messaging.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
      <MobileBottomNav />
    </div>
  );
}