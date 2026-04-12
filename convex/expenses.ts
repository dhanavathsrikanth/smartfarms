import { v, ConvexError } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Throws if the caller is not authenticated and returns the Clerk userId. */
async function getAuthenticatedUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated. Please sign in.");
  return identity.subject;
}

/** Loads a crop and asserts the caller owns it. Returns the crop document. */
async function verifyCropOwnership(
  ctx: QueryCtx | MutationCtx,
  cropId: Id<"crops">,
  userId: string
) {
  const crop = await ctx.db.get(cropId);
  if (!crop) throw new ConvexError("Crop not found");
  if (crop.userId !== userId) throw new ConvexError("Unauthorized");
  return crop;
}

/** Loads an expense and asserts the caller owns it. Returns the expense document. */
async function verifyExpenseOwnership(
  ctx: QueryCtx | MutationCtx,
  expenseId: Id<"expenses">,
  userId: string
) {
  const expense = await ctx.db.get(expenseId);
  if (!expense) throw new ConvexError("Expense not found");
  if (expense.userId !== userId) throw new ConvexError("Unauthorized");
  return expense;
}

/** Verifies farm ownership. */
async function verifyFarmOwnership(
  ctx: QueryCtx | MutationCtx,
  farmId: Id<"farms">,
  userId: string
) {
  const farm = await ctx.db.get(farmId);
  if (!farm) throw new ConvexError("Farm not found");
  if (farm.userId !== userId) throw new ConvexError("Unauthorized");
  return farm;
}

// ─── EXPENSE CATEGORY LITERAL TYPE ───────────────────────────────────────────

const EXPENSE_CATEGORY = v.union(
  v.literal("seed"),
  v.literal("fertilizer"),
  v.literal("pesticide"),
  v.literal("labour"),
  v.literal("irrigation"),
  v.literal("equipment"),
  v.literal("transport"),
  v.literal("other")
);

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

/**
 * 1. createExpense — Log a new expense against a crop cycle.
 *    Resolves farmId automatically from the crop record.
 */
export const createExpense = mutation({
  args: {
    cropId: v.id("crops"),
    category: EXPENSE_CATEGORY,
    amount: v.number(),
    date: v.string(),
    notes: v.optional(v.string()),
    supplier: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    inventoryItemId: v.optional(v.id("inventory")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const crop = await verifyCropOwnership(ctx, args.cropId, userId);

    return await ctx.db.insert("expenses", {
      ...args,
      farmId: crop.farmId,
      userId,
      createdAt: Date.now(),
    });
  },
});

/**
 * 2. updateExpense — Patch only the supplied fields on an expense record.
 */
export const updateExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
    category: v.optional(EXPENSE_CATEGORY),
    amount: v.optional(v.number()),
    date: v.optional(v.string()),
    notes: v.optional(v.string()),
    supplier: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { expenseId, ...fields }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyExpenseOwnership(ctx, expenseId, userId);

    // Only patch fields that were explicitly supplied
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }

    await ctx.db.patch(expenseId, patch);
    return ctx.db.get(expenseId);
  },
});

/**
 * 3. deleteExpense — Remove an expense record and clean up any attached photo.
 */
export const deleteExpense = mutation({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, { expenseId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const expense = await verifyExpenseOwnership(ctx, expenseId, userId);

    // If a Convex-hosted photo is attached, remove it from storage too.
    // We detect Convex storage URLs by the presence of a storageId embedded
    // in the URL – but since we store the URL (not the storageId) on expenses,
    // we only delete if the URL looks like a Convex storage URL (contains
    // the Convex storage hostname). The cropPhotos module always stores the
    // storageId separately; here we do a best-effort cleanup.
    if (expense.photoUrl) {
      try {
        // Extract storageId if URL is from Convex storage:
        // Convex storage URLs look like: https://<deployment>.convex.cloud/api/storage/<storageId>
        const match = expense.photoUrl.match(/\/api\/storage\/([^?]+)/);
        if (match) {
          const storageId = match[1] as Id<"_storage">;
          await ctx.storage.delete(storageId);
        }
      } catch {
        // Ignore – photo may have already been deleted, don't block expense deletion
      }
    }

    await ctx.db.delete(expenseId);
    return { success: true };
  },
});

/**
 * 4. bulkCreateExpenses — Insert multiple expenses for a crop in one call.
 *    Verifies crop ownership once and derives farmId from the crop.
 */
export const bulkCreateExpenses = mutation({
  args: {
    cropId: v.id("crops"),
    expenses: v.array(
      v.object({
        category: EXPENSE_CATEGORY,
        amount: v.number(),
        date: v.string(),
        notes: v.optional(v.string()),
        supplier: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { cropId, expenses }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const crop = await verifyCropOwnership(ctx, cropId, userId);

    const ids: Id<"expenses">[] = [];
    for (const exp of expenses) {
      const id = await ctx.db.insert("expenses", {
        ...exp,
        cropId,
        farmId: crop.farmId,
        userId,
        createdAt: Date.now(),
      });
      ids.push(id);
    }

    return ids;
  },
});

/**
 * 5. generateExpensePhotoUploadUrl — Returns a one-time Convex storage upload URL.
 */
export const generateExpensePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * 6. attachExpensePhoto — Links a freshly uploaded photo to an expense record.
 */
export const attachExpensePhoto = mutation({
  args: {
    expenseId: v.id("expenses"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { expenseId, storageId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyExpenseOwnership(ctx, expenseId, userId);

    const photoUrl = await ctx.storage.getUrl(storageId);
    if (!photoUrl) throw new ConvexError("Failed to retrieve URL for uploaded photo.");

    await ctx.db.patch(expenseId, { photoUrl });
    return { photoUrl };
  },
});

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * 7. listExpensesByCrop — All expenses for a single crop, newest first.
 */
export const listExpensesByCrop = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();

    // Sort newest first by date string (ISO format sorts lexicographically)
    return expenses.sort((a, b) => b.date.localeCompare(a.date));
  },
});

/**
 * 8. listExpensesByFarm — All expenses for a farm, with optional year filter.
 *    Each expense is decorated with the crop name.
 */
export const listExpensesByFarm = query({
  args: {
    farmId: v.id("farms"),
    year: v.optional(v.number()),
    season: v.optional(v.string()),
  },
  handler: async (ctx, { farmId, year, season }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyFarmOwnership(ctx, farmId, userId);

    let expenses = await ctx.db
      .query("expenses")
      .withIndex("by_farm", (q) => q.eq("farmId", farmId))
      .collect();

    // Filter by year extracted from the YYYY-MM-DD date string
    if (year !== undefined) {
      expenses = expenses.filter((e) => e.date.startsWith(String(year)));
    }

    // Attach crop names
    const result = await Promise.all(
      expenses.map(async (expense) => {
        const crop = await ctx.db.get(expense.cropId);
        return {
          ...expense,
          cropName: crop?.name ?? "Unknown Crop",
          cropSeason: crop?.season,
        };
      })
    );

    // Optional season filter (applied after joining crop data)
    const filtered = season
      ? result.filter((e) => e.cropSeason === season)
      : result;

    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  },
});

/**
 * 9. listAllExpenses — All expenses across all farms for the current user.
 *    Supports date range, category, and year filters.
 *    Each expense includes cropName and farmName.
 */
export const listAllExpenses = query({
  args: {
    year: v.optional(v.number()),
    category: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { year, category, startDate, endDate }) => {
    const userId = await getAuthenticatedUserId(ctx);

    let expenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Apply filters
    if (year !== undefined) {
      expenses = expenses.filter((e) => e.date.startsWith(String(year)));
    }
    if (category) {
      expenses = expenses.filter((e) => e.category === category);
    }
    if (startDate) {
      expenses = expenses.filter((e) => e.date >= startDate);
    }
    if (endDate) {
      expenses = expenses.filter((e) => e.date <= endDate);
    }

    // Join crop and farm names
    const result = await Promise.all(
      expenses.map(async (expense) => {
        const [crop, farm] = await Promise.all([
          ctx.db.get(expense.cropId),
          ctx.db.get(expense.farmId),
        ]);
        return {
          ...expense,
          cropName: crop?.name ?? "Unknown Crop",
          farmName: farm?.name ?? "Unknown Farm",
        };
      })
    );

    return result.sort((a, b) => b.date.localeCompare(a.date));
  },
});

/**
 * 10. getExpenseSummaryByCrop — Aggregate stats for one crop's expenses.
 */
export const getExpenseSummaryByCrop = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();

    if (expenses.length === 0) {
      return {
        totalAmount: 0,
        byCategory: {} as Record<string, number>,
        expenseCount: 0,
        largestExpense: null,
        averageExpenseAmount: 0,
        mostExpensiveCategory: null,
      };
    }

    const byCategory: Record<string, number> = {};
    let totalAmount = 0;
    let largestExpense = expenses[0];

    for (const exp of expenses) {
      totalAmount += exp.amount;
      byCategory[exp.category] = (byCategory[exp.category] ?? 0) + exp.amount;
      if (exp.amount > largestExpense.amount) largestExpense = exp;
    }

    const mostExpensiveCategory = Object.entries(byCategory).sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    return {
      totalAmount,
      byCategory,
      expenseCount: expenses.length,
      largestExpense: {
        category: largestExpense.category,
        amount: largestExpense.amount,
        date: largestExpense.date,
      },
      averageExpenseAmount: totalAmount / expenses.length,
      mostExpensiveCategory,
    };
  },
});

/**
 * 11. getExpenseSummaryByFarm — Aggregate stats for all crops on a farm.
 *    Includes a per-crop breakdown sorted by total expenses descending.
 */
export const getExpenseSummaryByFarm = query({
  args: {
    farmId: v.id("farms"),
    year: v.optional(v.number()),
  },
  handler: async (ctx, { farmId, year }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyFarmOwnership(ctx, farmId, userId);

    let expenses = await ctx.db
      .query("expenses")
      .withIndex("by_farm", (q) => q.eq("farmId", farmId))
      .collect();

    if (year !== undefined) {
      expenses = expenses.filter((e) => e.date.startsWith(String(year)));
    }

    if (expenses.length === 0) {
      return {
        totalAmount: 0,
        byCategory: {} as Record<string, number>,
        expenseCount: 0,
        largestExpense: null,
        averageExpenseAmount: 0,
        mostExpensiveCategory: null,
        cropBreakdown: [] as Array<{
          cropId: Id<"crops">;
          cropName: string;
          totalExpenses: number;
        }>,
      };
    }

    const byCategory: Record<string, number> = {};
    const byCrop: Record<string, { cropId: Id<"crops">; total: number }> = {};
    let totalAmount = 0;
    let largestExpense = expenses[0];

    for (const exp of expenses) {
      totalAmount += exp.amount;
      byCategory[exp.category] = (byCategory[exp.category] ?? 0) + exp.amount;
      if (!byCrop[exp.cropId]) {
        byCrop[exp.cropId] = { cropId: exp.cropId, total: 0 };
      }
      byCrop[exp.cropId].total += exp.amount;
      if (exp.amount > largestExpense.amount) largestExpense = exp;
    }

    const mostExpensiveCategory = Object.entries(byCategory).sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    // Resolve crop names
    const cropBreakdown = await Promise.all(
      Object.values(byCrop).map(async ({ cropId, total }) => {
        const crop = await ctx.db.get(cropId);
        return {
          cropId,
          cropName: crop?.name ?? "Unknown Crop",
          totalExpenses: total,
        };
      })
    );

    return {
      totalAmount,
      byCategory,
      expenseCount: expenses.length,
      largestExpense: {
        category: largestExpense.category,
        amount: largestExpense.amount,
        date: largestExpense.date,
      },
      averageExpenseAmount: totalAmount / expenses.length,
      mostExpensiveCategory,
      cropBreakdown: cropBreakdown.sort((a, b) => b.totalExpenses - a.totalExpenses),
    };
  },
});

/**
 * 12. getExpenseSummaryAllFarms — Grand total across all farms with monthly trend data.
 */
export const getExpenseSummaryAllFarms = query({
  args: { year: v.optional(v.number()) },
  handler: async (ctx, { year }) => {
    const userId = await getAuthenticatedUserId(ctx);

    let expenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (year !== undefined) {
      expenses = expenses.filter((e) => e.date.startsWith(String(year)));
    }

    if (expenses.length === 0) {
      return {
        totalExpenses: 0,
        byCategory: {} as Record<string, number>,
        byFarm: [] as Array<{ farmId: Id<"farms">; farmName: string; totalExpenses: number }>,
        byMonth: [] as Array<{ month: number; year: number; totalAmount: number }>,
        monthlyAverage: 0,
      };
    }

    const byCategory: Record<string, number> = {};
    const byFarmMap: Record<string, { farmId: Id<"farms">; total: number }> = {};
    const byMonthMap: Record<string, { month: number; year: number; totalAmount: number }> = {};
    let totalExpenses = 0;

    for (const exp of expenses) {
      totalExpenses += exp.amount;
      byCategory[exp.category] = (byCategory[exp.category] ?? 0) + exp.amount;

      // By farm aggregation
      const fk = exp.farmId as string;
      if (!byFarmMap[fk]) byFarmMap[fk] = { farmId: exp.farmId, total: 0 };
      byFarmMap[fk].total += exp.amount;

      // By month aggregation — parse YYYY-MM-DD
      const [yr, mo] = exp.date.split("-").map(Number);
      const monthKey = `${yr}-${String(mo).padStart(2, "0")}`;
      if (!byMonthMap[monthKey]) {
        byMonthMap[monthKey] = { month: mo, year: yr, totalAmount: 0 };
      }
      byMonthMap[monthKey].totalAmount += exp.amount;
    }

    // Resolve farm names
    const byFarm = await Promise.all(
      Object.values(byFarmMap).map(async ({ farmId, total }) => {
        const farm = await ctx.db.get(farmId);
        return {
          farmId,
          farmName: farm?.name ?? "Unknown Farm",
          totalExpenses: total,
        };
      })
    );

    const byMonth = Object.values(byMonthMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const monthlyAverage =
      byMonth.length > 0 ? totalExpenses / byMonth.length : 0;

    return {
      totalExpenses,
      byCategory,
      byFarm: byFarm.sort((a, b) => b.totalExpenses - a.totalExpenses),
      byMonth,
      monthlyAverage,
    };
  },
});

/**
 * 13. getExpensesByDateRange — All expenses within a date window, optionally
 *     filtered by farm. Sorted oldest → newest for displaying on charts.
 */
export const getExpensesByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    farmId: v.optional(v.id("farms")),
  },
  handler: async (ctx, { startDate, endDate, farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);

    let expenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Date range filter
    expenses = expenses.filter(
      (e) => e.date >= startDate && e.date <= endDate
    );

    // Optional farm filter
    if (farmId) {
      // Verify caller owns the farm
      await verifyFarmOwnership(ctx, farmId, userId);
      expenses = expenses.filter((e) => e.farmId === farmId);
    }

    // Join crop and farm names
    const result = await Promise.all(
      expenses.map(async (expense) => {
        const [crop, farm] = await Promise.all([
          ctx.db.get(expense.cropId),
          ctx.db.get(expense.farmId),
        ]);
        return {
          ...expense,
          cropName: crop?.name ?? "Unknown Crop",
          farmName: farm?.name ?? "Unknown Farm",
        };
      })
    );

    // Sort ascending for timeline / chart use
    return result.sort((a, b) => a.date.localeCompare(b.date));
  },
});

/**
 * 14. searchExpenses — Full-text search on supplier and notes fields.
 *     Case-insensitive, limited to 50 results, includes crop and farm names.
 */
export const searchExpenses = query({
  args: {
    query: v.string(),
    farmId: v.optional(v.id("farms")),
  },
  handler: async (ctx, { query: searchQuery, farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);

    if (!searchQuery.trim()) return [];

    let expenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const lower = searchQuery.toLowerCase();

    // Case-insensitive match on supplier or notes
    expenses = expenses.filter(
      (e) =>
        e.supplier?.toLowerCase().includes(lower) ||
        e.notes?.toLowerCase().includes(lower)
    );

    // Optional farm scope
    if (farmId) {
      await verifyFarmOwnership(ctx, farmId, userId);
      expenses = expenses.filter((e) => e.farmId === farmId);
    }

    // Limit before the expensive join
    const limited = expenses.slice(0, 50);

    // Join crop and farm names
    const result = await Promise.all(
      limited.map(async (expense) => {
        const [crop, farm] = await Promise.all([
          ctx.db.get(expense.cropId),
          ctx.db.get(expense.farmId),
        ]);
        return {
          ...expense,
          cropName: crop?.name ?? "Unknown Crop",
          farmName: farm?.name ?? "Unknown Farm",
        };
      })
    );

    return result.sort((a, b) => b.date.localeCompare(a.date));
  },
});

/**
 * 15. generateExpenseReport — Aggregates all expense data for PDF/report generation.
 */
export const generateExpenseReport = query({
  args: {
    farmId: v.optional(v.id("farms")),
    cropId: v.optional(v.id("crops")),
    year: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { farmId, cropId, year, startDate, endDate }) => {
    const userId = await getAuthenticatedUserId(ctx);

    let expenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (farmId) {
      await verifyFarmOwnership(ctx, farmId, userId);
      expenses = expenses.filter((e) => e.farmId === farmId);
    }
    if (cropId) {
      await verifyCropOwnership(ctx, cropId, userId);
      expenses = expenses.filter((e) => e.cropId === cropId);
    }
    if (year !== undefined) expenses = expenses.filter((e) => e.date.startsWith(String(year)));
    if (startDate) expenses = expenses.filter((e) => e.date >= startDate);
    if (endDate) expenses = expenses.filter((e) => e.date <= endDate);

    expenses = expenses.sort((a, b) => a.date.localeCompare(b.date));

    const withNames = await Promise.all(
      expenses.map(async (expense) => {
        const [crop, farm] = await Promise.all([ctx.db.get(expense.cropId), ctx.db.get(expense.farmId)]);
        return { ...expense, cropName: crop?.name ?? "Unknown Crop", farmName: farm?.name ?? "Unknown Farm" };
      })
    );

    const byCategory: Record<string, { total: number; count: number }> = {};
    for (const e of expenses) {
      if (!byCategory[e.category]) byCategory[e.category] = { total: 0, count: 0 };
      byCategory[e.category].total += e.amount;
      byCategory[e.category].count += 1;
    }

    const byMonth: Record<string, number> = {};
    for (const e of expenses) {
      const key = e.date.slice(0, 7);
      byMonth[key] = (byMonth[key] ?? 0) + e.amount;
    }
    const monthlyTrend = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }));

    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

    let period = "All Time";
    if (year) period = String(year);
    else if (startDate && endDate) period = `${startDate} to ${endDate}`;

    let title = "Expense Report";
    if (farmId) { const farm = await ctx.db.get(farmId); title = `Expense Report — ${farm?.name ?? "Farm"}`; }
    if (cropId) { const crop = await ctx.db.get(cropId); title = `Expense Report — ${crop?.name ?? "Crop"}`; }

    return {
      title,
      generatedAt: new Date().toISOString(),
      period,
      summary: { totalAmount, count: expenses.length, byCategory },
      expenses: withNames,
      charts: {
        categoryBreakdown: Object.entries(byCategory).map(([cat, { total, count }]) => ({
          category: cat, total, count, pct: totalAmount > 0 ? ((total / totalAmount) * 100).toFixed(1) : "0",
        })),
        monthlyTrend,
      },
    };
  },
});

/**
 * 16. getExpenseCalendarData — Returns daily expense totals for the heatmap calendar.
 */
export const getExpenseCalendarData = query({
  args: { year: v.number(), farmId: v.optional(v.id("farms")) },
  handler: async (ctx, { year, farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    let expenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    expenses = expenses.filter((e) => e.date.startsWith(String(year)));
    if (farmId) expenses = expenses.filter((e) => e.farmId === farmId);
    const byDay: Record<string, { total: number; count: number }> = {};
    for (const e of expenses) {
      const day = e.date.slice(0, 10);
      if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
      byDay[day].total += e.amount;
      byDay[day].count += 1;
    }
    return byDay;
  },
});

// ─── SMART INSIGHTS ────────────────────────────────────────────────────────────

/**
 * 17. getExpenseInsights — Analyse expense patterns and return actionable insights.
 */
export const getExpenseInsights = query({
  args: { farmId: v.optional(v.id("farms")) },
  handler: async (ctx, { farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;

    // Load all expenses for the user (optionally scoped to one farm)
    let all = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (farmId) all = all.filter((e) => e.farmId === farmId);

    const thisYear = all.filter((e) => e.date.startsWith(String(currentYear)));
    const lastYear = all.filter((e) => e.date.startsWith(String(prevYear)));

    // ── a) categorySpike ────────────────────────────────────────────────────
    const thisYearByCategory: Record<string, number> = {};
    const lastYearByCategory: Record<string, number> = {};
    for (const e of thisYear) thisYearByCategory[e.category] = (thisYearByCategory[e.category] ?? 0) + e.amount;
    for (const e of lastYear) lastYearByCategory[e.category] = (lastYearByCategory[e.category] ?? 0) + e.amount;

    let categorySpike: { category: string; thisYear: number; lastYear: number; percentIncrease: number } | null = null;
    for (const [cat, thisAmt] of Object.entries(thisYearByCategory)) {
      const lastAmt = lastYearByCategory[cat] ?? 0;
      if (lastAmt > 0) {
        const pct = ((thisAmt - lastAmt) / lastAmt) * 100;
        if (pct >= 30 && (categorySpike === null || pct > categorySpike.percentIncrease)) {
          categorySpike = { category: cat, thisYear: thisAmt, lastYear: lastAmt, percentIncrease: Math.round(pct) };
        }
      }
    }

    // ── b) unusualExpense ────────────────────────────────────────────────────
    const avgByCategory: Record<string, number> = {};
    const countByCategory: Record<string, number> = {};
    for (const e of all) {
      avgByCategory[e.category] = (avgByCategory[e.category] ?? 0) + e.amount;
      countByCategory[e.category] = (countByCategory[e.category] ?? 0) + 1;
    }
    for (const cat of Object.keys(avgByCategory)) {
      avgByCategory[cat] = avgByCategory[cat] / countByCategory[cat];
    }

    let unusualExpense: { expenseId: Id<"expenses">; category: string; amount: number; average: number; date: string } | null = null;
    for (const e of thisYear) {
      const avg = avgByCategory[e.category] ?? 0;
      if (avg > 0 && e.amount > avg * 2) {
        if (!unusualExpense || e.amount > unusualExpense.amount) {
          unusualExpense = { expenseId: e._id, category: e.category, amount: e.amount, average: Math.round(avg), date: e.date };
        }
      }
    }

    // ── c) missingCategories ─────────────────────────────────────────────────
    const activeCrops = await ctx.db
      .query("crops")
      .withIndex("by_status", (q) => q.eq("userId", userId).eq("status", "active"))
      .collect();

    const essentialCategories = ["seed", "fertilizer"] as const;
    const missingCategories: Array<{ cropName: string; missingCategory: string }> = [];

    for (const crop of activeCrops.slice(0, 10)) {
      if (farmId && crop.farmId !== farmId) continue;
      const cropExpenses = all.filter((e) => e.cropId === crop._id);
      const recordedCats = new Set(cropExpenses.map((e) => e.category));
      for (const essential of essentialCategories) {
        if (!recordedCats.has(essential)) {
          missingCategories.push({ cropName: crop.name, missingCategory: essential });
        }
      }
    }

    // ── d) topSupplier ───────────────────────────────────────────────────────
    const supplierMap: Record<string, { total: number; count: number }> = {};
    for (const e of all) {
      if (!e.supplier) continue;
      if (!supplierMap[e.supplier]) supplierMap[e.supplier] = { total: 0, count: 0 };
      supplierMap[e.supplier].total += e.amount;
      supplierMap[e.supplier].count += 1;
    }
    const topSupplierEntry = Object.entries(supplierMap).sort((a, b) => b[1].total - a[1].total)[0];
    const topSupplier = topSupplierEntry
      ? { supplierName: topSupplierEntry[0], totalAmount: topSupplierEntry[1].total, transactionCount: topSupplierEntry[1].count }
      : null;

    // ── e) expenseForecast ───────────────────────────────────────────────────
    const currentMonth = new Date().getMonth() + 1; // 1-indexed
    const currentYearToDate = thisYear.reduce((s, e) => s + e.amount, 0);
    const lastYearTotal = lastYear.reduce((s, e) => s + e.amount, 0);

    // Last year's spending from month currentMonth+1 onwards = estimated remaining
    const lastYearRemaining = lastYear
      .filter((e) => {
        const m = parseInt(e.date.slice(5, 7), 10);
        return m > currentMonth;
      })
      .reduce((s, e) => s + e.amount, 0);

    const expenseForecast = {
      estimatedRemainingAmount: Math.round(lastYearRemaining),
      currentYearToDate: Math.round(currentYearToDate),
      lastYearTotal: Math.round(lastYearTotal),
    };

    return { categorySpike, unusualExpense, missingCategories, topSupplier, expenseForecast };
  },
});

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────────

/**
 * 18. checkInventoryOnExpense — Create a low-stock notification when a
 *     seed/fertilizer/pesticide expense references an inventory item below threshold.
 *     Called internally after createExpense succeeds.
 */
export const checkInventoryOnExpense = mutation({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, { expenseId }) => {
    const expense = await ctx.db.get(expenseId);
    if (!expense) return;
    if (!["seed", "fertilizer", "pesticide"].includes(expense.category)) return;
    if (!expense.inventoryItemId) return;

    const item = await ctx.db.get(expense.inventoryItemId);
    if (!item) return;

    if (item.quantity <= item.lowStockThreshold) {
      // Avoid duplicate notifications — check if one already exists in last 24h
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", expense.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("type"), "low_stock"),
            q.eq(q.field("relatedId"), expense.inventoryItemId as string),
            q.gte(q.field("createdAt"), oneDayAgo)
          )
        )
        .first();

      if (!existing) {
        await ctx.db.insert("notifications", {
          userId: expense.userId,
          type: "low_stock",
          title: `Low Stock: ${item.itemName}`,
          message: `Only ${item.quantity} ${item.unit} of ${item.itemName} remaining (threshold: ${item.lowStockThreshold} ${item.unit}). Consider restocking soon.`,
          relatedId: expense.inventoryItemId as string,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }
  },
});

/**
 * 19. getNotifications — Fetch all notifications for the current user.
 */
export const getNotifications = query({
  args: { unreadOnly: v.optional(v.boolean()) },
  handler: async (ctx, { unreadOnly }) => {
    const userId = await getAuthenticatedUserId(ctx);
    let notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (unreadOnly) notifications = notifications.filter((n) => !n.isRead);
    return notifications.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * 20. markNotificationRead — Mark a notification as read.
 */
export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const notif = await ctx.db.get(notificationId);
    if (!notif || notif.userId !== userId) throw new ConvexError("Not found");
    await ctx.db.patch(notificationId, { isRead: true });
  },
});
