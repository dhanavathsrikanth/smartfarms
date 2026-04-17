import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");
  return identity.subject;
}

async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<string> {
  const userId = await getAuthenticatedUserId(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", userId))
    .unique();
  if (!user || user.role !== "admin") throw new ConvexError("Unauthorized: admin only");
  return userId;
}

// ─── User queries ─────────────────────────────────────────────────────────────

/** List notifications for the current user, most recent first. */
export const listNotifications = query({
  args: { onlyUnread: v.optional(v.boolean()) },
  handler: async (ctx, { onlyUnread }) => {
    const userId = await getAuthenticatedUserId(ctx);
    if (onlyUnread) {
      return await ctx.db
        .query("notifications")
        .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

/** Unread count for bell badge. */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();
    return unread.length;
  },
});

/** Mark a single notification as read. */
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const notif = await ctx.db.get(notificationId);
    if (!notif || notif.userId !== userId) throw new ConvexError("Not found");
    await ctx.db.patch(notificationId, { isRead: true });
  },
});

/** Mark all notifications as read. */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));
    return unread.length;
  },
});

// ─── Admin queries ────────────────────────────────────────────────────────────

/** Admin: list all users (for targeting). */
export const adminListUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").collect();
  },
});

/** Admin: get broadcast history (platform_update notifications, deduplicated by title+createdAt). */
export const adminGetBroadcastHistory = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // Get all platform_update notifications, pick unique broadcasts by grouping on createdAt+title
    const all = await ctx.db.query("notifications").collect();
    const updates = all.filter((n) => n.type === "platform_update" || n.type === "welcome");
    // Deduplicate: group by title + approximate time bucket (same second)
    const seen = new Map<string, { title: string; message: string; createdAt: number; sentTo: number }>();
    for (const n of updates) {
      const key = `${n.title}__${Math.floor(n.createdAt / 1000)}`;
      if (!seen.has(key)) {
        seen.set(key, { title: n.title, message: n.message, createdAt: n.createdAt, sentTo: 1 });
      } else {
        seen.get(key)!.sentTo++;
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
  },
});

/** Admin: total user count. */
export const adminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    const allNotifs = await ctx.db.query("notifications").collect();
    const unread = allNotifs.filter((n) => !n.isRead).length;
    return { totalUsers: users.length, totalNotifications: allNotifs.length, totalUnread: unread };
  },
});

// ─── Admin mutations ──────────────────────────────────────────────────────────

/** Admin: broadcast a platform update to ALL users. */
export const adminBroadcast = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("platform_update"), v.literal("welcome")),
  },
  handler: async (ctx, { title, message, type }) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    await Promise.all(
      users.map((u) =>
        ctx.db.insert("notifications", {
          userId: u.externalId,
          type,
          title,
          message,
          isRead: false,
          createdAt: now,
        })
      )
    );
    return { sent: users.length };
  },
});

/** Admin: send a notification to a specific user. */
export const adminSendToUser = mutation({
  args: {
    targetUserId: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("platform_update"), v.literal("ai_insight"), v.literal("welcome")),
  },
  handler: async (ctx, { targetUserId, title, message, type }) => {
    await requireAdmin(ctx);
    await ctx.db.insert("notifications", {
      userId: targetUserId,
      type,
      title,
      message,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

// ─── Internal mutations (called from other convex functions) ──────────────────

/** Auto welcome on first sign-up. */
export const sendWelcome = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await ctx.db.insert("notifications", {
      userId,
      type: "welcome",
      title: "👋 Welcome to KhetSmart!",
      message: "Your farm management dashboard is ready. Start by adding your first farm, then track crops, expenses, sales and yields — all in one place.",
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

/** Internal broadcast — used by crons or other server functions. */
export const broadcastPlatformUpdate = internalMutation({
  args: { title: v.string(), message: v.string() },
  handler: async (ctx, { title, message }) => {
    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    await Promise.all(
      users.map((u) =>
        ctx.db.insert("notifications", {
          userId: u.externalId,
          type: "platform_update",
          title,
          message,
          isRead: false,
          createdAt: now,
        })
      )
    );
    return { sent: users.length };
  },
});
