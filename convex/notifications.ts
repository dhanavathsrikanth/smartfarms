import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";

async function getAuthenticatedUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");
  return identity.subject;
}

/**
 * List notifications for the current user, most recent first.
 */
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

/**
 * Count of unread notifications for the current user (for badge).
 */
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

/**
 * Mark a single notification as read.
 */
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const notif = await ctx.db.get(notificationId);
    if (!notif || notif.userId !== userId) throw new ConvexError("Not found");
    await ctx.db.patch(notificationId, { isRead: true });
  },
});

/**
 * Mark all notifications as read for the current user.
 */
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

/**
 * Send a welcome notification to a newly registered user.
 * Called from users.store on first insert.
 */
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

/**
 * Broadcast a platform update notification to all users.
 * Run via: npx convex run notifications:broadcastPlatformUpdate --title "..." --message "..."
 */
export const broadcastPlatformUpdate = internalMutation({
  args: {
    title: v.string(),
    message: v.string(),
  },
  handler: async (ctx, { title, message }) => {
    const users = await ctx.db.query("users").collect();
    await Promise.all(
      users.map((u) =>
        ctx.db.insert("notifications", {
          userId: u.externalId,
          type: "platform_update",
          title,
          message,
          isRead: false,
          createdAt: Date.now(),
        })
      )
    );
    return { sent: users.length };
  },
});
