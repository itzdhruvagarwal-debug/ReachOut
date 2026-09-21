"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import EmptyState from "@/components/ui/EmptyState";
import { useMessages } from "./useMessages";
import { Conversation } from "./MessagesHelpers";
import { formatDate, formatTime } from "@/lib/utils-client";
import { Search, X, MessageSquare } from "lucide-react";

interface ConversationsSidebarProps {
  readonly state: ReturnType<typeof useMessages>;
}

function formatConversationTime(timestamp?: string): string {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return formatTime(date);
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return formatDate(date, "", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function ConversationsSidebar({ state }: Readonly<ConversationsSidebarProps>) {
  const {
    selectedConversation,
    setSelectedConversation,
    conversations,
    loadingConversations,
  } = state;

  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter(
      (conv) =>
        conv.name.toLowerCase().includes(q) ||
        conv.userType?.toLowerCase().includes(q) ||
        conv.lastMessage?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const totalUnread = useMemo(
    () => conversations.reduce((acc, conv) => acc + (conv.unread || 0), 0),
    [conversations]
  );

  return (
    <aside
      aria-label="Chat conversations"
      className={`w-full sm:w-80 sm:flex flex-col border-r border-border shrink-0 bg-card h-full ${
        selectedConversation ? "hidden sm:flex" : "flex"
      }`}
    >
      {/* Sidebar Header */}
      <div className="border-b border-border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground">Messages</h2>
            {totalUnread > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground font-mono tabular-nums">
                {totalUnread} new
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {conversations.length} {conversations.length === 1 ? "chat" : "chats"}
          </span>
        </div>

        {/* Search input (Instagram DM style) */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-input bg-muted/40 text-foreground placeholder:text-muted-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            aria-label="Search conversations"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {(() => {
          if (loadingConversations) {
            return (
              <div className="text-center p-8 flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Loading chats...</span>
              </div>
            );
          }

          if (conversations.length === 0) {
            return (
              <EmptyState
                emoji="💬"
                title="No Conversations Yet"
                description="Your workspace chat will appear here as soon as you apply, create campaigns, or initiate deals."
                compact
              />
            );
          }

          if (filteredConversations.length === 0) {
            return (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No conversations matching &quot;{searchQuery}&quot;
              </div>
            );
          }

          return filteredConversations.map((conv: Conversation) => {
            const isSelected = selectedConversation === conv.userId;
            const isBrand = conv.userType?.toUpperCase() === "BRAND";

            return (
              <button
                key={conv.userId}
                onClick={() => setSelectedConversation(conv.userId)}
                type="button"
                aria-label={(() => {
                  let unreadText = "";
                  if (conv.unread > 0) {
                    const pluralSuffix = conv.unread === 1 ? "" : "s";
                    unreadText = `, ${conv.unread} unread message${pluralSuffix}`;
                  }
                  return `Chat with ${conv.name}${unreadText}`;
                })()}
                {...(isSelected ? { "aria-current": "true" as const } : {})}
                className={`w-full p-3.5 sm:p-4 text-left transition-colors flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? "bg-muted/90 border-l-4 border-primary"
                    : "hover:bg-muted/40"
                }`}
              >
                {/* Circular Avatar with online/unread status */}
                <div className="relative shrink-0">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center text-foreground font-bold text-sm">
                    {conv.avatar ? (
                      <Image
                        src={conv.avatar}
                        alt={conv.name || "User avatar"}
                        fill
                        unoptimized
                        className="object-cover rounded-full"
                      />
                    ) : (
                      (conv.name || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  {conv.unread > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                  ) : (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-verified rounded-full border border-card" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="font-bold text-sm text-foreground truncate max-w-[130px]">
                        {conv.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                          isBrand
                            ? "bg-primary/10 text-primary"
                            : "bg-verified-muted text-verified"
                        }`}
                      >
                        {isBrand ? "Brand" : "Creator"}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[10px] font-medium whitespace-nowrap font-mono">
                      {formatConversationTime(conv.lastMessageTime)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs truncate max-w-[170px] ${
                        conv.unread > 0
                          ? "text-foreground font-bold"
                          : "text-muted-foreground font-normal"
                      }`}
                    >
                      {conv.isTyping ? (
                        <span className="text-primary font-semibold italic flex items-center gap-1">
                          <span className="animate-pulse">●</span>
                          <span>Typing...</span>
                        </span>
                      ) : (
                        conv.lastMessage || "Start a conversation"
                      )}
                    </span>
                    {conv.unread > 0 && (
                      <span className="font-extrabold text-primary-foreground text-[10px] rounded-full px-1.5 py-0.2 bg-primary shadow-sm font-mono tabular-nums">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          });
        })()}
      </div>
    </aside>
  );
}
