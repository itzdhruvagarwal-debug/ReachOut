"use client";

import { Suspense } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useMessages } from "@/components/dashboard/messages/useMessages";
import { ConversationsSidebar } from "@/components/dashboard/messages/ConversationsSidebar";
import { ChatPanel, ReportUserModal } from "@/components/dashboard/messages/ChatPanel";
import { Skeleton, ToastContainer } from "@/components/ui";

function MessagesSkeleton() {
  return (
    <div className="card flex overflow-hidden p-0 bg-card border border-border rounded-xl h-[78vh] min-h-[500px]">
      {/* Sidebar Skeleton */}
      <div className="w-full sm:w-80 border-r border-border p-4 space-y-4 shrink-0">
        <Skeleton height={38} borderRadius={8} className="w-full" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton circle width={42} height={42} />
              <div className="flex-1 space-y-2">
                <Skeleton height={14} width="60%" borderRadius={4} />
                <Skeleton height={11} width="85%" borderRadius={4} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Chat Area Skeleton */}
      <div className="hidden sm:flex flex-1 flex-col p-4 justify-between bg-card/40">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <Skeleton circle width={40} height={40} />
          <div className="space-y-1.5">
            <Skeleton height={15} width={140} borderRadius={4} />
            <Skeleton height={11} width={80} borderRadius={4} />
          </div>
        </div>
        <div className="space-y-4 py-6 px-2">
          <div className="flex gap-2.5 max-w-sm">
            <Skeleton circle width={32} height={32} className="shrink-0" />
            <Skeleton height={48} width={240} borderRadius={12} />
          </div>
          <div className="flex justify-end">
            <Skeleton height={42} width={200} borderRadius={12} />
          </div>
          <div className="flex gap-2.5 max-w-sm">
            <Skeleton circle width={32} height={32} className="shrink-0" />
            <Skeleton height={60} width={280} borderRadius={12} />
          </div>
        </div>
        <div className="pt-3 border-t border-border">
          <Skeleton height={44} borderRadius={10} className="w-full" />
        </div>
      </div>
    </div>
  );
}

function MessagesContent() {
  const state = useMessages();
  const { status, session, toasts, removeToast } = state;

  if (status === "loading" || !session) {
    return (
      <DashboardShell user={session?.user}>
        <MessagesSkeleton />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell user={session.user}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div
        className="card flex overflow-hidden p-0 bg-primary messages-container"
      >
        <ConversationsSidebar state={state} />
        <ChatPanel state={state} />
      </div>
      <ReportUserModal state={state} />
    </DashboardShell>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <MessagesSkeleton />
        </DashboardShell>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
