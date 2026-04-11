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
  if (!crop) throw new ConvexError("Crop entry not found.");
  if (crop.userId !== userId) throw new ConvexError("Access denied: You do not own this crop record.");
  return crop;
}

async function verifyFarmOwnership(ctx: QueryCtx | MutationCtx, farmId: Id<"farms">, userId: string) {
  const farm = await ctx.db.get(farmId);
  if (!farm) throw new ConvexError("Farm not found.");
  if (farm.userId !== userId) throw new ConvexError("Access denied: You do not own this farm.");
  return farm;
}

/**
 * Calculates days remaining until expected harvest.
 * Returns null if dates are invalid or crop is already harvested.
 */
function calculateDaysToHarvest(expectedDate: string | undefined, status: string): number | null {
  if (status !== "active" || !expectedDate) return null;
  
  const expected = new Date(expectedDate);
  const now = new Date();
  
  // Reset time to midnight for simple day calculation
  expected.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  const diffTime = expected.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 ? diffDays : 0;
}

/**
 * Aggregates expenses and sales for a specific crop.
 */
async function getCropStats(ctx: QueryCtx | MutationCtx, cropId: Id<"crops">) {
  const expenses = await ctx.db
    .query("expenses")
    .withIndex("by_crop", (q) => q.eq("cropId", cropId))
    .collect();

  const sales = await ctx.db
    .query("sales")
    .withIndex("by_crop", (q) => q.eq("cropId", cropId))
    .collect();

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  return {
    totalExpenses,
    totalSales,
    profit: totalSales - totalExpenses,
  };
}

// ─── MUTATIONS ─────────────────────────────────────────────────────────────

/**
 * 1. createCrop — Start a new crop cycle on a specific farm.
 */
export const createCrop = mutation({
  args: {
    farmId: v.id("farms"),
    name: v.string(),
    variety: v.optional(v.string()),
    sowingDate: v.string(),
    expectedHarvestDate: v.optional(v.string()),
    area: v.number(),
    areaUnit: v.union(v.literal("acres"), v.literal("hectares"), v.literal("bigha")),
    season: v.union(v.literal("kharif"), v.literal("rabi"), v.literal("zaid"), v.literal("annual")),
    year: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyFarmOwnership(ctx, args.farmId, userId);

    return await ctx.db.insert("crops", {
      ...args,
      userId,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

/**
 * 2. updateCrop — Modify crop details.
 */
export const updateCrop = mutation({
  args: {
    cropId: v.id("crops"),
    name: v.optional(v.string()),
    variety: v.optional(v.string()),
    sowingDate: v.optional(v.string()),
    expectedHarvestDate: v.optional(v.string()),
    actualHarvestDate: v.optional(v.string()),
    area: v.optional(v.number()),
    areaUnit: v.optional(v.union(v.literal("acres"), v.literal("hectares"), v.literal("bigha"))),
    season: v.optional(v.union(v.literal("kharif"), v.literal("rabi"), v.literal("zaid"), v.literal("annual"))),
    status: v.optional(v.union(v.literal("active"), v.literal("harvested"), v.literal("failed"), v.literal("archived"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { cropId, ...fields }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    const patch: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }

    await ctx.db.patch(cropId, patch);
  },
});

/**
 * 3. markAsHarvested — Mark cycle as complete.
 */
export const markAsHarvested = mutation({
  args: {
    cropId: v.id("crops"),
    actualHarvestDate: v.string(),
  },
  handler: async (ctx, { cropId, actualHarvestDate }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    await ctx.db.patch(cropId, {
      status: "harvested",
      actualHarvestDate,
    });
  },
});

/**
 * 4. markAsFailed — Record crop failure.
 */
export const markAsFailed = mutation({
  args: {
    cropId: v.id("crops"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { cropId, notes }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    const patch: any = { status: "failed" };
    if (notes) patch.notes = notes;

    await ctx.db.patch(cropId, patch);
  },
});

/**
 * 5. archiveCrop — Soft-delete by setting status to archived.
 */
export const archiveCrop = mutation({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);
    await ctx.db.patch(cropId, { status: "archived" });
  },
});

/**
 * 6. deleteCrop — Permanent deletion with cascade.
 */
export const deleteCrop = mutation({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    // 1. Cascade Deletes: Expenses
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();
    for (const exp of expenses) await ctx.db.delete(exp._id);

    // 2. Cascade Deletes: Sales
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();
    for (const sale of sales) await ctx.db.delete(sale._id);

    // 3. Cascade Deletes: Yields
    const yields = await ctx.db
      .query("yields")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();
    for (const yie of yields) await ctx.db.delete(yie._id);

    // 4. Cascade Deletes: Pest Logs
    const pestLogs = await ctx.db
      .query("pestLogs")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();
    for (const log of pestLogs) await ctx.db.delete(log._id);

    // 5. Cascade Deletes: Labour Logs
    const labourLogs = await ctx.db
      .query("labourLogs")
      .filter((q) => q.eq(q.field("cropId"), cropId))
      .collect();
    for (const log of labourLogs) await ctx.db.delete(log._id);

    await ctx.db.delete(cropId);
    
    return { success: true };
  },
});

// ─── QUERIES ─────────────────────────────────────────────────────────────

/**
 * 7. listCropsByFarm — Active/Historical crops for one farm.
 */
export const listCropsByFarm = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyFarmOwnership(ctx, farmId, userId);

    const crops = await ctx.db
      .query("crops")
      .withIndex("by_farm", (q) => q.eq("farmId", farmId))
      .filter((q) => q.neq(q.field("status"), "archived"))
      .order("desc")
      .collect();

    return await Promise.all(
      crops.map(async (crop) => {
        const stats = await getCropStats(ctx, crop._id);
        return {
          ...crop,
          ...stats,
          daysToHarvest: calculateDaysToHarvest(crop.expectedHarvestDate, crop.status),
        };
      })
    );
  },
});

/**
 * 8. listAllCrops — Dashboard view across all farms.
 */
export const listAllCrops = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    const crops = await ctx.db
      .query("crops")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("status"), "archived"))
      .order("desc")
      .collect();

    return await Promise.all(
      crops.map(async (crop) => {
        const stats = await getCropStats(ctx, crop._id);
        const farm = await ctx.db.get(crop.farmId);
        return {
          ...crop,
          ...stats,
          farmName: farm?.name ?? "Unknown Farm",
          daysToHarvest: calculateDaysToHarvest(crop.expectedHarvestDate, crop.status),
        };
      })
    );
  },
});

/**
 * 9. getCrop — Detailed view data for one crop.
 */
export const getCrop = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const crop = await verifyCropOwnership(ctx, cropId, userId);
    
    const stats = await getCropStats(ctx, cropId);
    const farm = await ctx.db.get(crop.farmId);

    return {
      ...crop,
      ...stats,
      farmName: farm?.name ?? "Unknown Farm",
      farmLocation: farm?.location ?? "Unknown Location",
      daysToHarvest: calculateDaysToHarvest(crop.expectedHarvestDate, crop.status),
    };
  },
});

/**
 * 10. getCropsByStatus — Filtered global list.
 */
export const getCropsByStatus = query({
  args: { 
    status: v.union(v.literal("active"), v.literal("harvested"), v.literal("failed"), v.literal("archived")) 
  },
  handler: async (ctx, { status }) => {
    const userId = await getAuthenticatedUserId(ctx);

    const crops = await ctx.db
      .query("crops")
      .withIndex("by_status", (q) => q.eq("userId", userId).eq("status", status))
      .order("desc")
      .collect();

    return await Promise.all(
      crops.map(async (crop) => {
        const farm = await ctx.db.get(crop.farmId);
        return {
          ...crop,
          farmName: farm?.name ?? "Unknown Farm",
        };
      })
    );
  },
});

/**
 * 11. getCropTimeline — Activity log for a specific cycle.
 */
export const getCropTimeline = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    const [expenses, sales, pests, yields] = await Promise.all([
      ctx.db.query("expenses").withIndex("by_crop", (q) => q.eq("cropId", cropId)).collect(),
      ctx.db.query("sales").withIndex("by_crop", (q) => q.eq("cropId", cropId)).collect(),
      ctx.db.query("pestLogs").withIndex("by_crop", (q) => q.eq("cropId", cropId)).collect(),
      ctx.db.query("yields").withIndex("by_crop", (q) => q.eq("cropId", cropId)).collect(),
    ]);

    const timeline = [
      ...expenses.map(e => ({
        type: "expense" as const,
        date: e.date,
        description: `Spent on ${e.category}${e.notes ? `: ${e.notes}` : ""}`,
        amount: e.amount,
      })),
      ...sales.map(s => ({
        type: "sale" as const,
        date: s.date,
        description: `Sold to ${s.buyerName} (${s.weight} ${s.weightUnit})`,
        amount: s.totalAmount,
      })),
      ...pests.map(p => ({
        type: "pest" as const,
        date: p.date,
        description: `Pest Update: ${p.pestType} (${p.severity} risk)`,
      })),
      ...yields.map(y => ({
        type: "yield" as const,
        date: y.harvestDate,
        description: `Harvest Recorded: ${y.totalYield} ${y.yieldUnit}`,
        amount: y.totalYield,
      })),
    ];

    return timeline.sort((a, b) => a.date.localeCompare(b.date));
  },
});

/**
 * 12. getCropSummaryStats — Global performance dashboard.
 */
export const getCropSummaryStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    const crops = await ctx.db
      .query("crops")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const active = crops.filter(c => c.status === "active").length;
    const harvested = crops.filter(c => c.status === "harvested").length;
    const failed = crops.filter(c => c.status === "failed").length;

    let totalProfitAllTime = 0;
    let best = { name: "N/A", profit: -Infinity };
    let expensive = { name: "N/A", cost: -Infinity };

    for (const crop of crops) {
      const stats = await getCropStats(ctx, crop._id);
      totalProfitAllTime += stats.profit;

      if (stats.profit > best.profit) {
        best = { name: crop.name, profit: stats.profit };
      }
      if (stats.totalExpenses > expensive.cost) {
        expensive = { name: crop.name, cost: stats.totalExpenses };
      }
    }

    return {
      totalActiveCrops: active,
      totalHarvestedCrops: harvested,
      totalFailedCrops: failed,
      totalProfitAllTime,
      bestPerformingCrop: best.profit === -Infinity ? "N/A" : `${best.name} (₹${best.profit.toLocaleString()})`,
      mostExpensiveCrop: expensive.cost === -Infinity ? "N/A" : `${expensive.name} (₹${expensive.cost.toLocaleString()})`,
    };
  },
});
