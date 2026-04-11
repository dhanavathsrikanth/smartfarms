import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated. Please sign in.");
  return identity.subject; // Clerk user ID
}

async function verifyCropOwnership(ctx: QueryCtx | MutationCtx, cropId: Id<"crops">, userId: string) {
  const crop = await ctx.db.get(cropId);
  if (!crop) throw new ConvexError("Crop record not found.");
  if (crop.userId !== userId) throw new ConvexError("Access denied: You do not own this crop record.");
  return crop;
}

// ─── MUTATIONS ─────────────────────────────────────────────────────────────

/**
 * 1. generateUploadUrl — Returns a single-use URL for Convex storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * 2. savePhoto — Links an uploaded photo to a crop lifecycle.
 */
export const savePhoto = mutation({
  args: {
    cropId: v.id("crops"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    cropStage: v.optional(
      v.union(
        v.literal("sowing"),
        v.literal("germination"),
        v.literal("vegetative"),
        v.literal("flowering"),
        v.literal("fruiting"),
        v.literal("harvesting"),
        v.literal("post-harvest")
      )
    ),
    takenAt: v.string(), // ISO date string
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const crop = await verifyCropOwnership(ctx, args.cropId, userId);

    // Get the photo URL from storage
    const photoUrl = await ctx.storage.getUrl(args.storageId);
    if (!photoUrl) throw new ConvexError("Failed to retrieve public URL for uploaded photo.");

    return await ctx.db.insert("cropPhotos", {
      ...args,
      userId,
      farmId: crop.farmId,
      photoUrl,
      createdAt: Date.now(),
    });
  },
});

/**
 * 3. deletePhoto — Cleans up metadata and physical storage.
 */
export const deletePhoto = mutation({
  args: { photoId: v.id("cropPhotos") },
  handler: async (ctx, { photoId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    
    const photo = await ctx.db.get(photoId);
    if (!photo) throw new ConvexError("Photo record not found.");
    if (photo.userId !== userId) throw new ConvexError("Access denied: You do not own this photo.");

    // Delete from both: DB and Storage
    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(photoId);

    return { success: true };
  },
});

// ─── QUERIES ─────────────────────────────────────────────────────────────

/**
 * 4. getPhotosByCrop — Returns chronological photo diary.
 */
export const getPhotosByCrop = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    return await ctx.db
      .query("cropPhotos")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .order("asc") // Older photos first for timeline
      .collect();
  },
});

/**
 * 5. getLatestPhotoByCrop — Returns the single most recent photo.
 */
export const getLatestPhotoByCrop = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    const latest = await ctx.db
      .query("cropPhotos")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .order("desc") // Newest first
      .first();

    return latest;
  },
});
