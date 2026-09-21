"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Modal, Button, Input, Select, Textarea } from "@/components/ui";
import { useMessages } from "./useMessages";
import { Message, formatMessageDateDivider } from "./MessagesHelpers";
import { formatCurrency, formatDateTime } from "@/lib/utils-client";
import { formatUserError, USER_SUCCESS_MESSAGES } from "@/lib/user-messages";
import { DealContextMiniCard } from "./DealContextMiniCard";
import { ContactLeakWarningBanner } from "./ContactLeakWarningBanner";
import {
  ChevronLeft,
  Shield,
  ShieldAlert,
  Flag,
  Ban,
  Unlock,
  Paperclip,
  Handshake,
  Send,
  Download,
  FileText,
  AlertTriangle,
  Check,
  CheckCheck,
} from "lucide-react";

interface ChatPanelProps {
  readonly state: ReturnType<typeof useMessages>;
}

function ChatHeader({ state }: Readonly<ChatPanelProps>) {
  const {
    setSelectedConversation,
    isPeerTyping,
    isChatUserBlocked,
    setIsReportModalOpen,
    handleBlockUser,
    handleUnblockUser,
    selectedChat,
  } = state;

  if (!selectedChat) return null;

  const isBrand = selectedChat.userType?.toUpperCase() === "BRAND";

  return (
    <div className="border-b border-border flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-card shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Back Button */}
        <button
          type="button"
          onClick={() => setSelectedConversation(null)}
          aria-label="Back to conversations list"
          className="sm:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* User Avatar with status */}
        <div className="relative shrink-0">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center text-foreground font-bold text-sm">
            {selectedChat.avatar ? (
              <Image
                src={selectedChat.avatar}
                alt={selectedChat.name || "User avatar"}
                fill
                unoptimized
                className="object-cover rounded-full"
              />
            ) : (
              (selectedChat.name || "U").charAt(0).toUpperCase()
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-verified rounded-full border-2 border-card" />
        </div>

        {/* User Info & Role */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-foreground truncate max-w-[160px] sm:max-w-xs">
              {selectedChat.name}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                isBrand ? "bg-primary/10 text-primary" : "bg-verified-muted text-verified"
              }`}
            >
              {isBrand ? "Brand" : "Creator"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            {isPeerTyping ? (
              <span className="text-primary font-semibold italic flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                <span>Typing...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-verified" /> Verified Workspace Member
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex gap-1.5 items-center shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsReportModalOpen(true)}
          aria-label={`Report ${selectedChat?.name ?? "this user"}`}
          className="text-xs px-2.5 py-1.5 flex items-center gap-1 border border-border"
        >
          <Flag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Report</span>
        </Button>

        <Button
          variant={isChatUserBlocked ? "secondary" : "ghost"}
          size="sm"
          onClick={isChatUserBlocked ? handleUnblockUser : handleBlockUser}
          aria-label={
            isChatUserBlocked
              ? `Unblock ${selectedChat?.name ?? "user"}`
              : `Block ${selectedChat?.name ?? "user"}`
          }
          className={`text-xs px-2.5 py-1.5 flex items-center gap-1 ${
            isChatUserBlocked
              ? "text-verified border border-verified-border bg-verified-muted"
              : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          }`}
        >
          {isChatUserBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isChatUserBlocked ? "Unblock" : "Block"}</span>
        </Button>
      </div>
    </div>
  );
}

function MessageList({ state }: Readonly<ChatPanelProps>) {
  const { messages, isPeerTyping, loadingMessages, messagesEndRef, scrollContainerRef } = state;

  const renderBlockedMessage = () => (
    <div className="flex flex-col gap-1.5 p-3 bg-disputed-muted border border-disputed-border text-disputed rounded-2xl max-w-sm">
      <div className="flex items-center gap-1.5 text-xs font-bold text-disputed">
        <ShieldAlert className="w-4 h-4" />
        Message Content Filtered
      </div>
      <p className="text-xs text-foreground/80 italic">
        Sharing personal contact details (phone, email, WhatsApp, UPI) prior to deal signing is blocked for escrow safety.
      </p>
    </div>
  );

  const renderFileMessage = (msg: Message) => {
    const fileName = String(msg.metadata?.fileName || "Shared File");
    const fileType = String(msg.metadata?.fileType || "");
    const isImg =
      fileType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl || "");

    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <FileText className="w-4 h-4" />
          Attachment
        </div>

        {isImg && msg.fileUrl && (
          <div className="relative w-full max-w-[280px] h-44 rounded-xl overflow-hidden bg-muted border border-border shadow-sm group">
            <Image
              src={msg.fileUrl}
              alt={fileName}
              fill
              sizes="(max-width: 768px) 100vw, 280px"
              className="object-cover transition-transform group-hover:scale-105"
              unoptimized={!/\.(jpg|jpeg|png|webp|gif)$/i.test(msg.fileUrl)}
            />
          </div>
        )}

        {msg.fileUrl && (
          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="w-full block">
            <Button
              variant="secondary"
              size="sm"
              className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Download {fileName.slice(0, 16)}
              {fileName.length > 16 ? "..." : ""}
            </Button>
          </a>
        )}
      </div>
    );
  };

  const renderOfferMessage = (msg: Message) => {
    const offer = msg.metadata || {};
    const amount = Number(offer.amount || 0);
    const isPending = offer.status === "PENDING";
    const isAccepted = offer.status === "ACCEPTED";
    const isDeclined = offer.status === "DECLINED";

    let statusBadge = (
      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-pending-muted text-pending border border-pending-border">
        Pending
      </span>
    );
    if (isAccepted) {
      statusBadge = (
        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-verified-muted text-verified border border-verified-border">
          Accepted
        </span>
      );
    } else if (isDeclined) {
      statusBadge = (
        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-disputed-muted text-disputed border border-disputed-border">
          Declined
        </span>
      );
    }

    return (
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border text-left max-w-sm shadow-md">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-1.5">
            <Handshake className="w-4 h-4 text-primary" />
            <span className="font-extrabold text-sm text-foreground">Custom Proposal</span>
          </div>
          {statusBadge}
        </div>

        <div>
          <div className="text-sm font-bold text-foreground mb-1">
            {offer.title || "Custom Deal Offer"}
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {offer.description || "Direct collaboration proposal with platform escrow protection."}
          </div>
        </div>

        {offer.deliverables && (
          <div className="text-xs bg-muted/60 p-2.5 rounded-xl border border-border/50">
            <span className="text-muted-foreground font-bold block mb-0.5">Deliverables:</span>
            <span className="text-foreground">{String(offer.deliverables)}</span>
          </div>
        )}

        <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-xl border border-border/50">
          <span className="text-xs text-muted-foreground">Proposed Rate:</span>
          <strong className="text-base font-extrabold font-mono tabular-nums text-foreground">
            {formatCurrency(amount)}
          </strong>
        </div>

        {isPending && !msg.isMe && (
          <div className="flex gap-2 mt-1 w-full">
            <Button
              variant="primary"
              size="sm"
              onClick={() => state.handleUpdateOfferStatus?.(msg.id, "ACCEPTED")}
              className="flex-1 text-xs py-2 font-bold"
            >
              ✓ Accept Offer
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => state.handleUpdateOfferStatus?.(msg.id, "DECLINED")}
              className="flex-1 text-xs py-2 text-destructive hover:bg-destructive/10"
            >
              ✕ Decline
            </Button>
          </div>
        )}

        {isAccepted && (offer.dealId || msg.metadata?.dealId) && (
          <Link
            href={`/dashboard/deals/${String(offer.dealId || msg.metadata?.dealId)}`}
            className="w-full block mt-1"
          >
            <Button
              variant="secondary"
              size="sm"
              className="w-full flex items-center justify-center gap-1.5 text-xs py-2 bg-verified-muted text-verified border border-verified-border font-bold"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>View Deal Room</span>
            </Button>
          </Link>
        )}
      </div>
    );
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.isBlocked) {
      return renderBlockedMessage();
    }

    if (msg.messageType === "FILE" && msg.fileUrl) {
      return renderFileMessage(msg);
    }

    if (msg.messageType === "OFFER") {
      return renderOfferMessage(msg);
    }

    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
  };

  return (
    <div
      ref={scrollContainerRef}
      aria-label="Chat messages"
      aria-live="polite"
      aria-relevant="additions"
      className="flex-1 p-4 sm:p-6 flex flex-col gap-3 bg-muted/20 overflow-y-auto"
    >
      {/* Pinned Deal Context Mini Card if active */}
      {state.dealDetails && <DealContextMiniCard deal={state.dealDetails} />}

      {loadingMessages && (
        <div className="text-center p-8 flex flex-col items-center gap-2 my-auto">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">Loading messages...</span>
        </div>
      )}

      {!loadingMessages && messages.length === 0 && (
        <div className="my-auto text-center text-muted-foreground p-8 flex flex-col items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-2xl shadow-sm">
            💬
          </div>
          <div className="font-bold text-sm text-foreground">No messages in this chat yet</div>
          <p className="text-xs text-muted-foreground max-w-xs">
            Start the conversation, discuss campaign deliverables, or propose custom milestone terms.
          </p>
        </div>
      )}

      {!loadingMessages &&
        messages.length > 0 &&
        messages.map((msg: Message, index: number) => {
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const currDate = msg.rawCreatedAt ? new Date(msg.rawCreatedAt).toDateString() : "";
          const prevDate = prevMsg?.rawCreatedAt ? new Date(prevMsg.rawCreatedAt).toDateString() : "";
          const showDateDivider = !prevMsg || (currDate && prevDate && currDate !== prevDate);
          const dateLabel = formatMessageDateDivider(msg.rawCreatedAt || msg.createdAt);

          return (
            <React.Fragment key={msg.id}>
              {showDateDivider && dateLabel && (
                <div className="flex items-center justify-center my-3 select-none">
                  <span className="px-3 py-1 text-[10px] font-bold rounded-full bg-card border border-border text-muted-foreground shadow-sm">
                    {dateLabel}
                  </span>
                </div>
              )}
              <div className={`flex ${msg.isMe ? "justify-end" : "justify-start"} animate-fadeIn`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 max-w-[85%] sm:max-w-[75%] shadow-sm transition-all ${
                    msg.isMe
                      ? "bg-primary text-primary-foreground rounded-br-xs"
                      : "bg-card text-foreground border border-border rounded-bl-xs"
                  }`}
                  data-me={msg.isMe}
                  data-blocked={msg.isBlocked}
                >
                  {renderMessageContent(msg)}
                  <div
                    className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] font-medium ${
                      msg.isMe ? "text-primary-foreground/75" : "text-muted-foreground"
                    }`}
                    title={
                      msg.rawCreatedAt ? formatDateTime(msg.rawCreatedAt) : msg.createdAt
                    }
                  >
                    {msg.status === "sending" && <span className="italic mr-1">Sending...</span>}
                    <span>{msg.createdAt}</span>
                    {msg.isMe && msg.status !== "failed" && (
                      <span aria-hidden="true" className="font-bold">
                        {msg.isRead ? (
                          <CheckCheck className="w-3 h-3 text-cyan-200 inline" />
                        ) : (
                          <Check className="w-3 h-3 inline" />
                        )}
                      </span>
                    )}
                  </div>
                  {msg.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => state.handleRetryMessage(msg.id)}
                      className="block w-full text-right text-[10px] text-destructive hover:underline cursor-pointer mt-1 font-semibold"
                    >
                      ⚠️ Failed to send. Tap to retry
                    </button>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}

      {/* Typing indicator bubble */}
      {isPeerTyping && (
        <div className="flex justify-start">
          <div className="flex items-center gap-1.5 bg-card text-muted-foreground text-xs rounded-2xl border border-border px-3.5 py-2.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

function ChatInputArea({ state }: Readonly<ChatPanelProps>) {
  const {
    newMessage,
    isChatUserBlocked,
    handleInputChange,
    handleSend,
    showToast,
    handleSendFile,
    handleSendOffer,
    hasActiveDeal,
  } = state;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  // Offer modal fields
  const [offerTitle, setOfferTitle] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerDeliverables, setOfferDeliverables] = useState("");
  const [offerContentDeadline, setOfferContentDeadline] = useState("");
  const [offerPostingDeadline, setOfferPostingDeadline] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; //  5 MB
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      showToast(
        "error",
        `File too large. Maximum size is ${isVideo ? "50 MB" : "5 MB"} for ${isVideo ? "videos" : "images"}.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const fileUrl = await state.uploadFileWithProgress(file);
      await handleSendFile?.(fileUrl, file.name, file.type);
      showToast("success", "File shared successfully!");
    } catch (err) {
      showToast("error", formatUserError(err, "File sharing failed. Please try again."));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) {
      showToast("error", "Offer title is required");
      return;
    }
    const amountVal = Number(offerAmount);
    if (Number.isNaN(amountVal) || amountVal <= 0) {
      showToast("error", "Please enter a valid amount");
      return;
    }

    try {
      await handleSendOffer?.({
        title: offerTitle,
        amount: Math.round(amountVal * 100),
        description: offerDescription,
        deliverables: offerDeliverables,
        contentDeadline: offerContentDeadline,
        postingDeadline: offerPostingDeadline,
      });
      showToast("success", USER_SUCCESS_MESSAGES.OFFER_SENT);
      setIsOfferModalOpen(false);
      setOfferTitle("");
      setOfferAmount("");
      setOfferDescription("");
      setOfferDeliverables("");
      setOfferContentDeadline("");
      setOfferPostingDeadline("");
    } catch (err) {
      showToast("error", formatUserError(err, "Failed to send offer. Please try again."));
    }
  };

  if (isChatUserBlocked) {
    return (
      <div className="p-4 border-t border-border bg-card">
        <div className="font-bold text-xs text-destructive px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-center">
          🚫 Messaging is disabled because a block relationship exists with this account.
        </div>
      </div>
    );
  }

  if (!hasActiveDeal) {
    return (
      <div className="p-4 border-t border-border bg-card">
        <div className="font-semibold text-xs text-pending px-4 py-3 bg-pending-muted border border-pending-border rounded-xl text-center flex items-center justify-center gap-2">
          <span>🔒 Messaging is enabled once an application or campaign deal is initiated.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border p-3.5 sm:p-4 bg-card shrink-0">
      {/* Contact Leak Detection Real-Time Warning */}
      <ContactLeakWarningBanner leakResult={state.contactLeakResult} />

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          id="chat-file-upload"
          disabled={isUploading}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Attach file or image"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsOfferModalOpen(true)}
          className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
          aria-label="Create Custom Offer"
          title="Create Custom Offer"
        >
          <Handshake className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={newMessage}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Type a message... (Enter to send)"
          className="flex-1 py-2.5 px-4 rounded-xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          aria-label="Type message"
        />

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!newMessage.trim()}
          className="p-2.5 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {/* Custom Offer Creation Modal */}
      {isOfferModalOpen && (
        <Modal
          isOpen={isOfferModalOpen}
          onClose={() => setIsOfferModalOpen(false)}
          title="Create Custom Collaboration Proposal"
        >
          <form onSubmit={handleCreateOfferSubmit} className="space-y-4 pt-2">
            <Input
              id="offer-title"
              label="Proposal Title"
              value={offerTitle}
              onChange={(e) => setOfferTitle(e.target.value)}
              placeholder="e.g. Festive Campaign Reel + 2 Stories"
              required
              fullWidth
            />

            <Input
              id="offer-amount"
              label="Proposed Amount (₹ INR)"
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="e.g. 25000"
              required
              fullWidth
            />

            <Textarea
              id="offer-description"
              label="Scope & Details"
              value={offerDescription}
              onChange={(e) => setOfferDescription(e.target.value)}
              placeholder="Detail the scope of work, content tone, and requirements..."
              fullWidth
            />

            <Input
              id="offer-deliverables"
              label="Deliverables Summary"
              value={offerDeliverables}
              onChange={(e) => setOfferDeliverables(e.target.value)}
              placeholder="e.g. 1 Reel (60s), 2 Stories with link stickers"
              fullWidth
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="offer-draft-deadline"
                label="Draft Submission Due"
                type="date"
                value={offerContentDeadline}
                onChange={(e) => setOfferContentDeadline(e.target.value)}
                fullWidth
              />
              <Input
                id="offer-post-deadline"
                label="Live Posting Due"
                type="date"
                value={offerPostingDeadline}
                onChange={(e) => setOfferPostingDeadline(e.target.value)}
                fullWidth
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsOfferModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="font-bold">
                Send Proposal
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function ReportUserModal({ state }: Readonly<ChatPanelProps>) {
  const {
    isReportModalOpen,
    setIsReportModalOpen,
    reportReason,
    setReportReason,
    reportDescription,
    setReportDescription,
    handleReportSubmit,
    selectedChat,
  } = state;

  return (
    <Modal
      isOpen={isReportModalOpen}
      onClose={() => setIsReportModalOpen(false)}
      title={`Report ${selectedChat?.name || "User"}`}
    >
      <form onSubmit={handleReportSubmit} className="space-y-4 pt-2">
        <Select
          id="report-reason"
          label="Reason for Report"
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          required
          fullWidth
        >
          <option value="SPAM">Spam or Unsolicited Commercial Messaging</option>
          <option value="CONTACT_LEAK">Attempting Off-Platform Payment or Contact Leak</option>
          <option value="HARASSMENT">Harassment or Inappropriate Behavior</option>
          <option value="FRAUD">Fraudulent Offer or Fake Deliverables</option>
          <option value="OTHER">Other Terms Violation</option>
        </Select>

        <Textarea
          id="report-details"
          label="Additional Details (Optional)"
          value={reportDescription}
          onChange={(e) => setReportDescription(e.target.value)}
          placeholder="Please provide specific context to help our Trust & Safety team investigate..."
          fullWidth
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsReportModalOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" className="font-bold">
            Submit Report
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ChatPanel({ state }: Readonly<ChatPanelProps>) {
  const { selectedConversation } = state;

  if (!selectedConversation) {
    return (
      <main
        aria-label="Select a conversation"
        className="hidden sm:flex flex-1 flex-col items-center justify-center p-8 bg-card text-center text-muted-foreground"
      >
        <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center text-3xl mb-3 shadow-sm">
          💬
        </div>
        <h3 className="text-base font-bold text-foreground">Your Messages & Proposals</h3>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">
          Select a chat from the sidebar to discuss campaign deliverables, review draft content, and track escrow-backed proposals.
        </p>
      </main>
    );
  }

  return (
    <main
      aria-label="Active conversation"
      className="flex flex-1 flex-col h-full bg-card min-w-0 overflow-hidden"
    >
      <ChatHeader state={state} />
      <MessageList state={state} />
      <ChatInputArea state={state} />
    </main>
  );
}
