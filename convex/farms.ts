import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(ctx: any): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated. Please sign in.");
  return identity.subject; // Clerk user ID
}

async function verifyFarmOwnership(ctx: any, farmId: any, userId: string) {
  const farm = await ctx.db.get(farmId);
  if (!farm) {
    console.error(`[FarmOwnership] Farm ${farmId} not found.`);
    throw new Error("Farm not found.");
  }
  if (farm.userId !== userId) {
    console.error(`[FarmOwnership] Access denied for user ${userId} on farm ${farmId}. Owner is ${farm.userId}`);
    throw new Error("Access denied: you do not own this farm.");
  }
  return farm;
}

// ─── MUTATIONS ─────────────────────────────────────────────────────────────

/**
 * 1. createFarm — Register a new geographic farm node.
 */
export const createFarm = mutation({
  args: {
    name: v.string(),
    location: v.string(),
    totalArea: v.number(),
    areaUnit: v.union(v.literal("acres"), v.literal("hectares"), v.literal("bigha")),
    gpsLat: v.optional(v.number()),
    gpsLng: v.optional(v.number()),
    soilType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    return await ctx.db.insert("farms", {
      ...args,
      userId,
      isArchived: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * 2. updateFarm — Patch only the provided fields after verifying ownership.
 */
export const updateFarm = mutation({
  args: {
    farmId: v.id("farms"),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    totalArea: v.optional(v.number()),
    areaUnit: v.optional(v.union(v.literal("acres"), v.literal("hectares"), v.literal("bigha"))),
    gpsLat: v.optional(v.number()),
    gpsLng: v.optional(v.number()),
    soilType: v.optional(v.string()),
  },
  handler: async (ctx, { farmId, ...fields }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyFarmOwnership(ctx, farmId, userId);
    // Build a patch object with only the defined fields
    const patch: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(farmId, patch);
  },
});

/**
 * 3. archiveFarm — Soft-delete by setting isArchived: true.
 */
export const archiveFarm = mutation({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyFarmOwnership(ctx, farmId, userId);
    await ctx.db.patch(farmId, { isArchived: true });
  },
});

/**
 * 4. deleteFarm — Hard delete farm and all child records.
 */
export const deleteFarm = mutation({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyFarmOwnership(ctx, farmId, userId);

    // Helper to delete all records in a table with a by_farm index
    const deleteByFarm = async (tableName: any) => {
      const records = await ctx.db
        .query(tableName)
        .withIndex("by_farm", (q: any) => q.eq("farmId", farmId))
        .collect();
      await Promise.all(records.map((r: any) => ctx.db.delete(r._id)));
    };

    await deleteByFarm("crops");
    await deleteByFarm("expenses");
    await deleteByFarm("sales");
    await deleteByFarm("yields");
    await deleteByFarm("soilTests");
    await deleteByFarm("pestLogs");
    await deleteByFarm("labourLogs");

    await ctx.db.delete(farmId);
  },
});

// ─── QUERIES ───────────────────────────────────────────────────────────────

/**
 * 5. listFarms — All active (non-archived) farms with computed crop stats.
 */
export const listFarms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    const farms = await ctx.db
      .query("farms")
      .withIndex("by_user_archived", (q) => q.eq("userId", userId).eq("isArchived", false))
      .collect();

    return await Promise.all(
      farms.map(async (farm) => {
        const allCrops = await ctx.db
          .query("crops")
          .withIndex("by_farm", (q) => q.eq("farmId", farm._id))
          .collect();
        const activeCrops = allCrops.filter((c) => c.status === "active");
        return {
          ...farm,
          totalCrops: allCrops.length,
          activeCrops: activeCrops.length,
        };
      })
    );
  },
});

/**
 * 6. getFarm — Single farm with ownership verification.
 */
export const getFarm = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null; // Unauthenticated — return null, not throw
    const farm = await ctx.db.get(farmId);
    if (!farm || farm.userId !== identity.subject) return null;
    return farm;
  },
});

/**
 * 7. getArchivedFarms — All archived farms for the current user.
 */
export const getArchivedFarms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);
    return await ctx.db
      .query("farms")
      .withIndex("by_user_archived", (q) => q.eq("userId", userId).eq("isArchived", true))
      .collect();
  },
});

/**
 * 8. getFarmStats — Financial and operational summary for one farm.
 */
export const getFarmStats = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const farm = await ctx.db.get(farmId);
    if (!farm || farm.userId !== identity.subject) return null;

    const [expenses, sales, allCrops] = await Promise.all([
      ctx.db.query("expenses").withIndex("by_farm", (q) => q.eq("farmId", farmId)).collect(),
      ctx.db.query("sales").withIndex("by_farm", (q) => q.eq("farmId", farmId)).collect(),
      ctx.db.query("crops").withIndex("by_farm", (q) => q.eq("farmId", farmId)).collect(),
    ]);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = totalSales - totalExpenses;
    const activeCropsCount = allCrops.filter((c) => c.status === "active").length;

    // Determine the last activity timestamp across all related records
    const allTimestamps = [
      ...expenses.map((e) => e.createdAt),
      ...sales.map((s) => s.createdAt),
      ...allCrops.map((c) => c.createdAt),
    ];
    const lastActivityDate = allTimestamps.length > 0 ? Math.max(...allTimestamps) : null;

    return {
      totalExpenses,
      totalSales,
      totalProfit,
      activeCropsCount,
      totalCropsCount: allCrops.length,
      lastActivityDate,
    };
  },
});

// Keep backward-compatible exports
export const list = listFarms;
export const create = createFarm;
export const getById = getFarm;
