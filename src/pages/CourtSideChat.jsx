import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  addDoc,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import SiteHeader from "../components/SIteHeader";
import SiteFooter from "../components/SiteFooter";
import "./CourtSideChat.css";

function formatTimestamp(ts) {
  if (!ts) return "";
  const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

// ADD: helper to compare timestamps safely
function tsToMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  if (typeof ts === "number") return ts;
  return 0;
}


function makeChatId(a, b) {
  return [a, b].sort().join("_");
}

export default function CourtSideChat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoopMates, setHoopMates] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimerRef = useRef(null);
  const amTypingRef = useRef(false);
  const [bootLoading, setBootLoading] = useState(true); // ADD

  // total unread for header badge
  const totalUnread = recentChats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  // Track auth state + wait for initial data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      (async () => {
        if (user) {
          setCurrentUser(user);
          try {
            await Promise.all([
              fetchHoopMates(user.uid),
              fetchRecentChats(user.uid),
            ]);
          } catch (err) {
            console.error("Initial load error:", err);
          } finally {
            setBootLoading(false);
          }
        } else {
          setCurrentUser(null);
          setBootLoading(false);
        }
      })();
    });
    return () => unsubscribe();
  }, []);
  // Detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch HoopMates or all public profiles
  async function fetchHoopMates(uid) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userHoopMates = userDoc.data().hoopMates || [];
        const filteredHoopMates = userHoopMates.filter(
          (mate) => mate.uid !== uid // Exclude the logged-in user
        );
        setHoopMates(filteredHoopMates);

        if (filteredHoopMates.length === 0) {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("publicProfile", "==", true));
          const snap = await getDocs(q);
          const publicProfiles = snap.docs
            .map((doc) => ({ uid: doc.id, ...doc.data() }))
            .filter((user) => user.uid !== uid); // Exclude the logged-in user
          setHoopMates(publicProfiles);
        }
      }
    } catch (error) {
      console.error("Error fetching HoopMates:", error);
    }
  }

  // Fetch Recent Chats
  async function fetchRecentChats(uid) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) {
        setRecentChats([]);
        return;
      }

      // de-dupe and exclude self
      const raw = (userDoc.data().recentChats || []).filter(c => c?.uid && c.uid !== uid);
      const unique = raw.reduce((acc, c) => (acc.find(x => x.uid === c.uid) ? acc : [...acc, c]), []);

      const hydrated = await Promise.all(
        unique.map(async (chatUser) => {
          const id = makeChatId(uid, chatUser.uid);
          const chatRef = doc(db, "chats", id);
          const snap = await getDoc(chatRef);
          if (!snap.exists()) {
            return { ...chatUser, lastMessage: null, hasUnread: false, unreadCount: 0 };
          }
          const data = snap.data() || {};
          const lastMessage = data.lastMessage || null; // { text, createdAt, senderId }
          const lastReadMap = data.lastRead || {};
          const myLastRead = lastReadMap[uid];

          const hasUnread = lastMessage
            ? tsToMillis(lastMessage.createdAt) > tsToMillis(myLastRead)
            : false;

          // You can compute a real count with a query if needed; for now show 1 when there’s any unread
          const unreadCount = hasUnread ? 1 : 0;

          return { ...chatUser, lastMessage, hasUnread, unreadCount };
        })
      );

      // sort by latest message desc
      hydrated.sort((a, b) => tsToMillis(b.lastMessage?.createdAt) - tsToMillis(a.lastMessage?.createdAt));

      setRecentChats(hydrated);
    } catch (error) {
      console.error("Error fetching Recent Chats:", error);
    }
  }

  // Search all public users
  async function handleSearch(e) {
    e.preventDefault();
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;

    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("publicProfile", "==", true));
      const snap = await getDocs(q);

      const matches = snap.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter((user) => {
          const name = (user.name || "").toLowerCase();
          const nickname = (user.nickname || "").toLowerCase();
          return (
            user.uid !== currentUser.uid &&
            (name.includes(term) || nickname.includes(term))
          );
        });

      setHoopMates(matches);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }

  // Open or create chat
  async function openChatWith(user) {
    try {
      setSelectedUser(user);
      const id = makeChatId(currentUser.uid, user.uid);
      setChatId(id);

      const currentUserRef = doc(db, "users", currentUser.uid);
      const recipientRef = doc(db, "users", user.uid);

      await updateDoc(currentUserRef, {
        recentChats: Array.from(new Set([...(recentChats || []), user])),
      });

      await updateDoc(recipientRef, {
        recentChats: Array.from(new Set([...(recentChats || []), currentUser])),
      });

      const chatDocRef = doc(db, "chats", id);
      const chatDoc = await getDoc(chatDocRef);
      if (!chatDoc.exists()) {
        await setDoc(chatDocRef, {
          participants: [currentUser.uid, user.uid],
          createdAt: serverTimestamp(),
        });
      }

      await updateDoc(chatDocRef, {
        [`lastRead.${currentUser.uid}`]: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error opening chat:", error);
    }
  }

  // Listen for typing state from the other user
  useEffect(() => {
    if (!chatId || !selectedUser) return;
    const chatDocRef = doc(db, "chats", chatId);
    const unsub = onSnapshot(chatDocRef, (snap) => {
      const data = snap.data() || {};
      const typing = data.typing || {};
      setOtherTyping(Boolean(typing?.[selectedUser.uid]));
    });
    return () => unsub();
  }, [chatId, selectedUser?.uid]);

  // Announce typing to Firestore (debounced)
  const pulseTyping = async () => {
    if (!chatId || !currentUser) return;
    try {
      if (!amTypingRef.current) {
        amTypingRef.current = true;
        await updateDoc(doc(db, "chats", chatId), {
          [`typing.${currentUser.uid}`]: true,
        });
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(async () => {
        if (!amTypingRef.current) return;
        amTypingRef.current = false;
        await updateDoc(doc(db, "chats", chatId), {
          [`typing.${currentUser.uid}`]: false,
        });
      }, 1500);
    } catch (_) {}
  };

  const stopTyping = async () => {
    if (!chatId || !currentUser) return;
    if (!amTypingRef.current) return;
    amTypingRef.current = false;
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    try {
      await updateDoc(doc(db, "chats", chatId), {
        [`typing.${currentUser.uid}`]: false,
      });
    } catch (_) {}
  };

  useEffect(() => {
    // cleanup when leaving chat
    return () => {
      stopTyping();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Listen for messages
  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      // Scroll to the bottom of the chat
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => unsubscribe();
  }, [chatId]);

  
  // REPLACE your handleSend with this version
  async function handleSend(e) {
    e.preventDefault();
    if (!chatId || !currentUser) return;
    const text = newMessage.trim();
    if (!text) return;

    setNewMessage("");
    requestAnimationFrame(() => inputRef.current?.focus());
    await stopTyping();

    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const newMsg = {
        text,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      };
      await addDoc(messagesRef, newMsg);

      const chatDocRef = doc(db, "chats", chatId);
      await updateDoc(chatDocRef, {
        lastMessage: { text, createdAt: serverTimestamp(), senderId: currentUser.uid },
        [`lastRead.${currentUser.uid}`]: serverTimestamp(),
      });

      setRecentChats((prev) => {
        let found = false;
        const updated = (prev || []).map((c) => {
          if (c.uid === selectedUser?.uid) {
            found = true;
            return {
              ...c,
              lastMessage: { text, createdAt: Date.now(), senderId: currentUser.uid },
              hasUnread: false,
              unreadCount: 0,
            };
          }
          return c;
        });
        if (!found && selectedUser) {
          updated.unshift({
            uid: selectedUser.uid,
            name: selectedUser.name,
            lastMessage: { text, createdAt: Date.now(), senderId: currentUser.uid },
            hasUnread: false,
            unreadCount: 0,
          });
        }
        return updated;
      });

      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  return (
    <div className="page-shell">  {/* ADD this wrapper */}
      {/* Pass total unread to header for navbar badge */}
      <SiteHeader unreadCount={totalUnread} />
      {bootLoading && (
        <div className="page-loader">
          <div className="page-spinner" />
          <div className="loader-text">Loading…</div>
        </div>
      )}

      <div className={`court-container ${selectedUser ? "chat-active" : ""}`}>
        {/* LEFT: Mobile list page (Header + Search + Recent + HoopMates) */}
        {!selectedUser || !isMobileView ? (
          <aside className="left-panel">
            <div className="brand">Locker Room</div>

            <form onSubmit={handleSearch} className="search-form">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for HoopLoggers"
              />
              <button type="submit">Search</button>
            </form>

            {loading && <div className="loading-spinner">Loading...</div>}

            {/* ORDER: Recent Chats first */}
            <div className="recent-chats">
              <h3>Recent Chats</h3>
              {recentChats.map((chat, idx) => {
                const isYou = chat?.lastMessage?.senderId === currentUser?.uid;
                const preview = chat?.lastMessage?.text || "No messages yet";
                return (
                  <div
                    key={chat?.uid || `recent-${idx}`}
                    className="recent-chat-item"
                    onClick={() => openChatWith(chat)}
                  >
                    <div className="chat-info">
                      <p className="chat-name">{chat?.name || "Unnamed Player"}</p>
                      <p className="chat-preview">{isYou ? "You: " : ""}{preview}</p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="unread-badge">{chat.unreadCount}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Then HoopMates */}
            <div className="hoopmates">
              <h3>HoopMates</h3>
              {hoopMates.map((mate, idx) => (
                <div key={mate?.uid || `mate-${idx}`} className="hoopmate-item">
                  <p>{mate?.name || "Unnamed Player"}</p>
                  <button onClick={() => openChatWith(mate)}>Chat</button>
                </div>
              ))}
            </div>
          </aside>
        ) : null}

        {/* RIGHT: Chat panel; full-screen on mobile when a chat is open */}
        {(!isMobileView || selectedUser) && (
        <main className={`chat-panel ${isMobileView && selectedUser ? "mobile-full" : ""}`}>
          {selectedUser && (
            <button
              type="button"
              className="back-button"
              onClick={() => setSelectedUser(null)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M14 7l-5 5 5 5V7z"></path>
              </svg>
              Back
            </button>
          )}

          {!selectedUser ? (
            <div className="welcome-message">Welcome to Locker Room! Search your fellow HoopLoggers and start the trash talk!</div>
          ) : (
            <>
              <header className="chat-header">
                <h2>Chat with {selectedUser.name}</h2>
              </header>

              <div className="messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={msg.senderId === currentUser.uid ? "message sent" : "message received"}
                  >
                    <p>{msg.text}</p>
                    <span>{formatTimestamp(msg.createdAt)}</span>
                  </div>
                ))}
                {otherTyping && (
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                )}
                <div ref={messagesEndRef}></div>
              </div>

              <form onSubmit={handleSend} className="message-input">
                <input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    pulseTyping();
                  }}
                  onBlur={stopTyping}
                  placeholder="Type a message..."
                />
                <button type="submit" className="send-button">Send</button>
              </form>
            </>
          )}
        </main>
      )}
      </div>

      <SiteFooter />
      </div>
  );
}