"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Users, Bell, History, ShieldAlert, Megaphone, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── Emoji presets ────────────────────────────────────────────────────────────
const EMOJI_PRESETS = ["🚀", "📢", "🔔", "🎉", "⚠️", "✅", "📌", "💡"];

export default function AdminPage() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();

  const stats        = useQuery(api.notifications.adminStats,            isAuthenticated ? {} : "skip");
  const allUsers     = useQuery(api.notifications.adminListUsers,        isAuthenticated ? {} : "skip");
  const history      = useQuery(api.notifications.adminGetBroadcastHistory, isAuthenticated ? {} : "skip");

  const broadcast    = useMutation(api.notifications.adminBroadcast);
  const sendToUser   = useMutation(api.notifications.adminSendToUser);

  // Broadcast form state
  const [bTitle,   setBTitle]   = useState("");
  const [bMsg,     setBMsg]     = useState("");
  const [bEmoji,   setBEmoji]   = useState("🚀");
  const [bSending, setBSending] = useState(false);

  // Single-user form state
  const [sTarget,   setSTarget]   = useState("");
  const [sTitle,    setSTitle]    = useState("");
  const [sMsg,      setSMsg]      = useState("");
  const [sEmoji,    setSEmoji]    = useState("📌");
  const [sSending,  setSSending]  = useState(false);

  // Guard: if not admin, show access denied
  const convexUser = allUsers !== undefined ? true : null; // allUsers throws if not admin
  const isLoading  = stats === undefined || allUsers === undefined;

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!bTitle.trim() || !bMsg.trim()) return;
    setBSending(true);
    try {
      const result = await broadcast({
        title: `${bEmoji} ${bTitle.trim()}`,
        message: bMsg.trim(),
        type: "platform_update",
      });
      toast.success(`Sent to ${result.sent} users`);
      setBTitle(""); setBMsg("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send");
    } finally {
      setBSending(false);
    }
  }

  async function handleSendToUser(e: React.FormEvent) {
    e.preventDefault();
    if (!sTarget || !sTitle.trim() || !sMsg.trim()) return;
    setSSending(true);
    try {
      await sendToUser({
        targetUserId: sTarget,
        title: `${sEmoji} ${sTitle.trim()}`,
        message: sMsg.trim(),
        type: "platform_update",
      });
      toast.success("Notification sent");
      setSTitle(""); setSMsg(""); setSTarget("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send");
    } finally {
      setSSending(false);
    }
  }

  if (!isAuthenticated) return null;

  // If query throws (non-admin), show access denied
  if (allUsers === null || (allUsers !== undefined && !Array.isArray(allUsers))) {
    return <AccessDenied />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/30">
          <ShieldAlert className="h-5 w-5 text-rose-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">Notification management &amp; platform broadcasts</p>
        </div>
        <Badge className="ml-auto bg-rose-100 text-rose-700 border-rose-200 text-xs font-semibold">
          Admin Only
        </Badge>
      </div>

      {/* Stats row */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<Users className="h-4 w-4 text-blue-500" />}  label="Total Users"         value={stats?.totalUsers ?? 0}         color="blue" />
          <StatCard icon={<Bell className="h-4 w-4 text-amber-500" />}  label="Total Notifications"  value={stats?.totalNotifications ?? 0}  color="amber" />
          <StatCard icon={<Bell className="h-4 w-4 text-rose-500" />}   label="Unread"               value={stats?.totalUnread ?? 0}         color="rose" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Broadcast to all ── */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-secondary" />
              Broadcast to All Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBroadcast} className="space-y-3">
              {/* Emoji picker */}
              <div className="flex gap-1.5 flex-wrap">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e} type="button"
                    onClick={() => setBEmoji(e)}
                    className={cn(
                      "h-8 w-8 rounded-lg text-base transition-all border",
                      bEmoji === e ? "border-secondary bg-secondary/10 scale-110" : "border-border hover:border-secondary/50"
                    )}
                  >{e}</button>
                ))}
              </div>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
                placeholder="Title (e.g. New Feature Released)"
                value={bTitle} onChange={(e) => setBTitle(e.target.value)}
                maxLength={80} required
              />
              <textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-none"
                placeholder="Message body..."
                rows={3} value={bMsg} onChange={(e) => setBMsg(e.target.value)}
                maxLength={300} required
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Preview: <span className="font-medium text-foreground">{bEmoji} {bTitle || "Title"}</span>
                </span>
                <button
                  type="submit" disabled={bSending || !bTitle.trim() || !bMsg.trim()}
                  className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-secondary/90 transition-colors"
                >
                  {bSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send to {stats?.totalUsers ?? "all"} users
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── Send to specific user ── */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-secondary" />
              Send to Specific User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendToUser} className="space-y-3">
              {/* Emoji picker */}
              <div className="flex gap-1.5 flex-wrap">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e} type="button"
                    onClick={() => setSEmoji(e)}
                    className={cn(
                      "h-8 w-8 rounded-lg text-base transition-all border",
                      sEmoji === e ? "border-secondary bg-secondary/10 scale-110" : "border-border hover:border-secondary/50"
                    )}
                  >{e}</button>
                ))}
              </div>
              {/* User selector */}
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
                value={sTarget} onChange={(e) => setSTarget(e.target.value)} required
              >
                <option value="">Select a user...</option>
                {(allUsers ?? []).map((u) => (
                  <option key={u._id} value={u.externalId}>
                    {u.name} {u.email ? `(${u.email})` : ""}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
                placeholder="Title"
                value={sTitle} onChange={(e) => setSTitle(e.target.value)}
                maxLength={80} required
              />
              <textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-none"
                placeholder="Message body..."
                rows={2} value={sMsg} onChange={(e) => setSMsg(e.target.value)}
                maxLength={300} required
              />
              <div className="flex justify-end">
                <button
                  type="submit" disabled={sSending || !sTarget || !sTitle.trim() || !sMsg.trim()}
                  className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-secondary/90 transition-colors"
                >
                  {sSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ── Broadcast history ── */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Broadcast History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No broadcasts sent yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{h.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{h.message}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5">{h.sentTo} users</Badge>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(h.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="border-border">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-muted-foreground font-medium">{label}</span></div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center">
      <ShieldAlert className="h-12 w-12 text-rose-400" />
      <p className="text-lg font-semibold text-foreground">Access Denied</p>
      <p className="text-sm text-muted-foreground">This page is restricted to admins only.</p>
    </div>
  );
}
