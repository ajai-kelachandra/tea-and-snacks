"use client";

import ChatContainer from "@/components/ChatContainer";

export default function UserChatPage() {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Direct Messaging</h1>
        <p className="text-[var(--text-muted)] text-sm">Secure and instant 1-to-1 coworker chats.</p>
      </div>

      <ChatContainer />
    </div>
  );
}
