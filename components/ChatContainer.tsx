"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppSelector } from "@/lib/hooks";
import { FiSend, FiSearch, FiMessageSquare, FiUser, FiArrowLeft, FiClock, FiCheck } from "react-icons/fi";
import { format, isToday, isYesterday } from "date-fns";

interface UserRecord {
  uid: string;
  email: string;
  name: string;
  role: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: any;
  isRead?: boolean;
}

export default function ChatContainer() {
  const { uid: currentUid, userName: currentName, userRole } = useAppSelector((s) => s.auth);
  
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [chatsLastMsg, setChatsLastMsg] = useState<{ [key: string]: { text: string; sender: string; unread: boolean } }>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Users Directory
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const allUsers = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      })) as UserRecord[];
      // Filter out self
      setUsers(allUsers.filter((u) => u.uid !== currentUid));
    });

    return () => unsub();
  }, [currentUid]);

  // 2. Determine unique chat channel ID
  const getChatId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join("_");
  };

  // 3. Listen to last messages and unread counts for all chats
  useEffect(() => {
    if (!currentUid) return;

    // Listen to changes in the "chats" collections where the user is a participant
    const unsub = onSnapshot(collection(db, "chats"), (snapshot) => {
      const lastMsgs: typeof chatsLastMsg = {};
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.participants?.includes(currentUid)) {
          lastMsgs[docSnap.id] = {
            text: data.lastMessage || "",
            sender: data.lastMessageSender || "",
            unread: data.unreadFor === currentUid,
          };
        }
      });
      setChatsLastMsg(lastMsgs);
    });

    return () => unsub();
  }, [currentUid]);

  // 4. Fetch / Listen to active Chat Messages
  useEffect(() => {
    if (!currentUid || !selectedUser) {
      setMessages([]);
      return;
    }

    const chatId = getChatId(currentUid, selectedUser.uid);
    const msgsQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(msgsQuery, (snapshot) => {
      const loadedMsgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(loadedMsgs);

      // Auto scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    // Mark active chat as read
    const chatDocRef = doc(db, "chats", chatId);
    updateDoc(chatDocRef, {
      unreadFor: null,
    }).catch(() => {});

    return () => unsub();
  }, [currentUid, selectedUser]);

  // 5. Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !currentUid || !selectedUser) return;

    const messageText = inputText.trim();
    setInputText("");

    const chatId = getChatId(currentUid, selectedUser.uid);
    const chatDocRef = doc(db, "chats", chatId);

    // Create the message object
    const newMsg = {
      senderId: currentUid,
      receiverId: selectedUser.uid,
      text: messageText,
      createdAt: serverTimestamp(),
    };

    try {
      // 1. Write the message inside the chat channel's messages sub-collection
      await addDoc(collection(db, "chats", chatId, "messages"), newMsg);

      // 2. Update/Create chat channel metadata
      await setDoc(chatDocRef, {
        participants: [currentUid, selectedUser.uid],
        lastMessage: messageText,
        lastMessageSender: currentUid,
        unreadFor: selectedUser.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });

    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // 6. Formatting utilities
  const formatTime = (firebaseTimestamp: any) => {
    if (!firebaseTimestamp) return "";
    const date = firebaseTimestamp.toDate ? firebaseTimestamp.toDate() : new Date(firebaseTimestamp);
    return format(date, "hh:mm a");
  };

  const getDayLabel = (dateStr: any) => {
    if (!dateStr) return "";
    const date = dateStr.toDate ? dateStr.toDate() : new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd MMM yyyy");
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
      case "payroll_admin":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "manager":
        return "bg-purple-500/10 text-purple-500 border border-purple-500/20";
      case "hr":
        return "bg-teal-500/10 text-teal-500 border border-teal-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "payroll_admin": return "Payroll";
      case "manager": return "Manager";
      case "hr": return "HR";
      case "employee": return "Employee";
      default: return "Staff";
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden font-dm-sans shadow-sm transition-colors duration-200">
      
      {/* SIDEBAR: Contacts list */}
      <div className={`w-full md:w-80 flex flex-col border-r border-[var(--border)] shrink-0 ${selectedUser ? "hidden md:flex" : "flex"}`}>
        {/* Sidebar Search */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
            <input
              type="text"
              placeholder="Search coworkers…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:border-blue-500 transition-all placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>

        {/* Contacts directory list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] font-medium">
              No coworkers found.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const activeChatId = getChatId(currentUid || "", user.uid);
              const lastMsgData = chatsLastMsg[activeChatId];
              const isSelected = selectedUser?.uid === user.uid;

              return (
                <button
                  key={user.uid}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left cursor-pointer ${
                    isSelected
                      ? "bg-[#1d4ed8]/10 border-blue-500/20 text-[var(--text-primary)]"
                      : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  {/* Initial avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                    {user.name ? user.name.slice(0, 2) : "U"}
                  </div>

                  {/* Contact Summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-black truncate">{user.name || user.email}</p>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${getRoleBadgeColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                    
                    <p className={`text-[10px] truncate mt-0.5 ${lastMsgData?.unread ? "font-black text-blue-600 dark:text-blue-400" : "text-[var(--text-muted)]"}`}>
                      {lastMsgData?.text || "Start a conversation"}
                    </p>
                  </div>

                  {/* Unread Alert Dot */}
                  {lastMsgData?.unread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 shadow-sm animate-pulse" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className={`flex-1 flex flex-col bg-[var(--bg-card)] ${!selectedUser ? "hidden md:flex" : "flex"}`}>
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/30">
              <button
                onClick={() => setSelectedUser(null)}
                className="md:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                <FiArrowLeft size={16} />
              </button>

              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                {selectedUser.name ? selectedUser.name.slice(0, 2) : "U"}
              </div>

              <div>
                <p className="text-sm font-black text-[var(--text-primary)] leading-tight">{selectedUser.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[var(--text-muted)] truncate">{selectedUser.email}</span>
                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${getRoleBadgeColor(selectedUser.role)}`}>
                    {getRoleLabel(selectedUser.role)}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[var(--bg-base)]/5 mt-0.5">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] gap-2">
                  <FiMessageSquare size={24} className="text-gray-300" />
                  <p className="font-medium">No messages yet. Say hi to {selectedUser.name}!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.senderId === currentUid;
                  const showDay = index === 0 || getDayLabel(msg.createdAt) !== getDayLabel(messages[index - 1].createdAt);

                  return (
                    <div key={msg.id} className="space-y-2">
                      {showDay && (
                        <div className="flex justify-center my-4 select-none">
                          <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1 bg-[var(--bg-hover)] border border-[var(--border)] rounded-full text-[var(--text-muted)] shadow-sm">
                            {getDayLabel(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm flex flex-col ${
                          isMe
                            ? "bg-[#1d4ed8] text-white rounded-tr-none"
                            : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-tl-none"
                        }`}>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          
                          <div className={`flex items-center justify-end gap-1.5 mt-1 text-[8px] select-none ${
                            isMe ? "text-blue-100" : "text-[var(--text-muted)]"
                          }`}>
                            <FiClock size={8} />
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMe && <FiCheck size={8} className="text-blue-200" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat footer input bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--border)] bg-[var(--bg-sidebar)]/30 flex items-center gap-3">
              <input
                type="text"
                placeholder="Type your message…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs border border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)] transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-9 h-9 bg-[#1d4ed8] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
              >
                <FiSend size={14} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-base)]/5">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[#1d4ed8] flex items-center justify-center mb-4 shrink-0 shadow-sm animate-pulse">
              <FiMessageSquare size={28} />
            </div>
            <h3 className="text-base font-black text-[var(--text-primary)] mb-1">Direct Messaging Portal</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm font-medium">
              Choose a coworker from the directory sidebar to start a real-time secure conversation!
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
