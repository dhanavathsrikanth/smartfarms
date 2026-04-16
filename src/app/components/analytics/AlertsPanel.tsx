"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Bell, X, CheckCheck, TrendingDown, AlertTriangle, TrendingUp, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function alertIcon(title: string) {
  if (title.startsWith("⚠️ Loss")) return <TrendingDown className="h-4 w-4 text-red-500" />;
  if (title.startsWith("✅")) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (title.startsWith("📉")) return <TrendingDown className="h-4 w-4 text-amber-500" />;
  if (title.startsWith("⚠️ Pending")) return <Clock className="h-4 w-4 text-orange-500" />;
  if (title.startsWith("🎉")) return <Sparkles className="h-4 w-4 text-violet-500" />;
  return <AlertTriangle className="h-4 w-4 text-blue-500" />;
}

function alertBg(title: string): string {
  if (title.startsWith("⚠️ Loss")) return "border-l-red-400 bg-red-50 dark:bg-red-950/20";
  if (title.startsWith("✅")) return "border-l-emerald-400 bg-emerald-50 dark:bg-emerald-950/20";
  if (title.startsWith("📉")) return "border-l-amber-400 bg-amber-50 dark:bg-amber-950/20";
  if (title.startsWith("⚠️ Pending")) return "border-l-orange-400 bg-orange-50 dark:bg-orange-950/20";
  if (title.startsWith("🎉")) return "border-l-violet-400 bg-violet-50 dark:bg-violet-950/20";
  return "border-l-blue-400 bg-blue-50 dark:bg-blue-950/20";
}

// ─── AlertsPanel Component ────────────────────────────────────────────────────

export function AlertsPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useConvexAuth();

  const notifications = useQuery(
    api.notifications.listNotifications,
    isAuthenticated ? { onlyUnread: false } : "skip"
  );
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    isAuthenticated ? {} : "skip"
  ) ?? 0;

  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleDismiss = async (id: Id<"notifications">) => {
    await markAsRead({ notificationId: id });
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
  };

  return (
    <div ref={panelRef} className="relative">
      {/* ── Bell Button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
          open && "bg-muted/60 text-foreground"
        )}
      >
        <Bell className="h-4 w-4" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-white ring-2 ring-background",
              "animate-pulse"
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#1C4E35]" />
              <span className="font-semibold text-sm text-foreground">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-secondary/10 text-secondary text-[10px] font-bold px-1.5 h-4">
                    {unreadCount} new
                  </span>
                )}
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
            {!notifications || notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Profit alerts and insights will appear here automatically.
                </p>
              </div>
            ) : (
              notifications.map((n: Doc<"notifications">) => (
                <div
                  key={n._id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-l-4 transition-opacity",
                    alertBg(n.title),
                    n.isRead && "opacity-50"
                  )}
                >
                  {/* Icon */}
                  <div className="mt-0.5 shrink-0">{alertIcon(n.title)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-semibold text-foreground leading-tight", n.isRead && "font-normal")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* Dismiss */}
                  {!n.isRead && (
                    <button
                      onClick={() => handleDismiss(n._id)}
                      className="shrink-0 mt-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors rounded"
                      aria-label="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications && notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/10 text-center">
              <p className="text-[10px] text-muted-foreground">
                Alerts generated every Sunday · Powered by KhetSmart AI
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
