import { v, ConvexError } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");
  return identity.subject;
}

// ─── Unit conversion helpers ──────────────────────────────────────────────────

function toKg(amount: number, unit: string): number {
  if (unit === "quintal") return amount * 100;
  if (unit === "ton") return amount * 1000;
  return amount; // kg
}

function areaToAcres(area: number, areaUnit: string): number {
  if (areaUnit === "hectares") return area * 2.47105;
  if (areaUnit === "bigha") return area / 1.6;
  return area; // acres
}

// ─── Benchmark data ───────────────────────────────────────────────────────────

/** National average yield in kg/acre (quintal/hectare ÷ 2.471 × 100) */
const YIELD_BENCHMARKS: Record<string, number> = {
  wheat:     1420,  // 35 q/ha
  rice:      1090,  // 27 q/ha
  paddy:     1090,
  cotton:     200,  // 5 q/ha lint
  maize:     1250,  // 31 q/ha
  sugarcane: 31140, // 770 q/ha
  soybean:    445,  // 11 q/ha
  groundnut:  770,  // 19 q/ha
  onion:     7280,  // 180 q/ha
  tomato:   10120,  // 250 q/ha
  potato:    9305,  // 230 q/ha
  bajra:      490,  // 12 q/ha
  jowar:      405,  // 10 q/ha
  mustard:    530,  // 13 q/ha
};

/** Benchmark expense per acre in ₹ */
const EXPENSE_BENCHMARKS: Record<string, number> = {
  wheat:    18000,
  rice:     22000,
  paddy:    22000,
  cotton:   25000,
  maize:    15000,
  onion:    35000,
  tomato:   40000,
};
const DEFAULT_EXPENSE_BENCHMARK = 20000;

function getBenchmarkYield(cropName: string): number | null {
  const key = cropName.toLowerCase().trim();
  return YIELD_BENCHMARKS[key] ?? null;
}

function getBenchmarkExpense(cropName: string): number {
  const key = cropName.toLowerCase().trim();
  return EXPENSE_BENCHMARKS[key] ?? DEFAULT_EXPENSE_BENCHMARK;
}

// ─── MUTATION 1: recordYield ──────────────────────────────────────────────────

export const recordYield = mutation({
  args: {
    cropId:        v.id("crops"),
    totalYield:    v.number(),
    yieldUnit:     v.union(v.literal("kg"), v.literal("quintal"), v.literal("ton")),
    expectedYield: v.optional(v.number()),
    harvestDate:   v.string(),
    notes:         v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Verify crop ownership
    const crop = await ctx.db.get(args.cropId);
    if (!crop) throw new ConvexError("Crop not found");
    if (crop.userId !== userId) throw new ConvexError("Unauthorized");

    // Check for existing yield
    const existing = await ctx.db
      .query("yields")
      .withIndex("by_crop", (q) => q.eq("cropId", args.cropId))
      .first();
    if (existing) {
      throw new ConvexError("Yield already recorded. Use updateYield to modify it.");
    }

    // Compute KG and per-acre
    const totalYieldKg   = toKg(args.totalYield, args.yieldUnit);
    const areaInAcres    = areaToAcres(crop.area, crop.areaUnit);
    const yieldPerAcre   = areaInAcres > 0 ? totalYieldKg / areaInAcres : 0;

    const yieldId = await ctx.db.insert("yields", {
      cropId:        args.cropId,
      farmId:        crop.farmId,
      userId,
      totalYield:    args.totalYield,
      yieldUnit:     args.yieldUnit,
      yieldPerAcre,
      expectedYield: args.expectedYield,
      harvestDate:   args.harvestDate,
      notes:         args.notes,
      createdAt:     Date.now(),
    });

    // Mark crop as harvested
    await ctx.db.patch(args.cropId, {
      status:            "harvested",
      actualHarvestDate: args.harvestDate,
    });

    return yieldId;
  },
});

// ─── MUTATION 2: updateYield ──────────────────────────────────────────────────

export const updateYield = mutation({
  args: {
    yieldId:       v.id("yields"),
    totalYield:    v.optional(v.number()),
    yieldUnit:     v.optional(v.union(v.literal("kg"), v.literal("quintal"), v.literal("ton"))),
    expectedYield: v.optional(v.number()),
    harvestDate:   v.optional(v.string()),
    notes:         v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const record = await ctx.db.get(args.yieldId);
    if (!record) throw new ConvexError("Yield record not found");
    if (record.userId !== userId) throw new ConvexError("Unauthorized");

    const patch: Record<string, any> = {};

    // Recalculate if totalYield or yieldUnit changes
    const newTotal = args.totalYield ?? record.totalYield;
    const newUnit  = args.yieldUnit  ?? record.yieldUnit;
    if (args.totalYield !== undefined || args.yieldUnit !== undefined) {
      const crop = await ctx.db.get(record.cropId);
      if (crop) {
        const totalYieldKg = toKg(newTotal, newUnit);
        const areaInAcres  = areaToAcres(crop.area, crop.areaUnit);
        patch.yieldPerAcre = areaInAcres > 0 ? totalYieldKg / areaInAcres : 0;
      }
      patch.totalYield = newTotal;
      patch.yieldUnit  = newUnit;
    }
    if (args.expectedYield !== undefined) patch.expectedYield = args.expectedYield;
    if (args.harvestDate   !== undefined) patch.harvestDate   = args.harvestDate;
    if (args.notes         !== undefined) patch.notes         = args.notes;

    await ctx.db.patch(args.yieldId, patch);
    return await ctx.db.get(args.yieldId);
  },
});

// ─── MUTATION 3: deleteYield ──────────────────────────────────────────────────

export const deleteYield = mutation({
  args: { yieldId: v.id("yields") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const record = await ctx.db.get(args.yieldId);
    if (!record) throw new ConvexError("Yield record not found");
    if (record.userId !== userId) throw new ConvexError("Unauthorized");

    await ctx.db.delete(args.yieldId);

    // Revert crop to "active" if no sales exist
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_crop", (q) => q.eq("cropId", record.cropId))
      .first();
    if (!sales) {
      await ctx.db.patch(record.cropId, { status: "active", actualHarvestDate: undefined });
    }

    return { success: true };
  },
});

// ─── Shared computed fields helper ────────────────────────────────────────────

function computeYieldFields(record: any) {
  const totalYieldKg       = toKg(record.totalYield, record.yieldUnit);
  const yieldPerAcreKg     = record.yieldPerAcre; // already in kg/acre
  const yieldPerAcreQuintal = yieldPerAcreKg / 100;

  let yieldGapKg: number | null        = null;
  let yieldGapPercent: number | null   = null;
  let achievedExpectedPercent: number | null = null;

  if (record.expectedYield != null && record.expectedYield > 0) {
    const expectedKg      = toKg(record.expectedYield, record.yieldUnit);
    yieldGapKg            = expectedKg - totalYieldKg;
    yieldGapPercent       = (yieldGapKg / expectedKg) * 100;
    achievedExpectedPercent = (totalYieldKg / expectedKg) * 100;
  }

  return { totalYieldKg, yieldPerAcreKg, yieldPerAcreQuintal, yieldGapKg, yieldGapPercent, achievedExpectedPercent };
}

// ─── QUERY 4: getYieldByCrop ──────────────────────────────────────────────────

export const getYieldByCrop = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await requireUserId(ctx);

    const crop = await ctx.db.get(cropId);
    if (!crop) throw new ConvexError("Crop not found");
    if (crop.userId !== userId) throw new ConvexError("Unauthorized");

    const record = await ctx.db
      .query("yields")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .first();

    if (!record) return null;

    return { ...record, ...computeYieldFields(record) };
  },
});

// ─── QUERY 5: listYieldsByFarm ────────────────────────────────────────────────

export const listYieldsByFarm = query({
  args: {
    farmId: v.id("farms"),
    year:   v.optional(v.number()),
    season: v.optional(v.string()),
  },
  handler: async (ctx, { farmId, year, season }) => {
    const userId = await requireUserId(ctx);

    const farm = await ctx.db.get(farmId);
    if (!farm) throw new ConvexError("Farm not found");
    if (farm.userId !== userId) throw new ConvexError("Unauthorized");

    let records = await ctx.db
      .query("yields")
      .withIndex("by_farm", (q) => q.eq("farmId", farmId))
      .collect();

    // Build enriched results
    const enriched = await Promise.all(records.map(async (r) => {
      const crop = await ctx.db.get(r.cropId);
      const harvestYear = new Date(r.harvestDate).getFullYear();
      return {
        ...r,
        ...computeYieldFields(r),
        cropName:    crop?.name ?? "Unknown",
        cropVariety: crop?.variety,
        season:      crop?.season,
        year:        crop?.year ?? harvestYear,
        area:        crop?.area,
        areaUnit:    crop?.areaUnit,
      };
    }));

    // Filters
    let filtered = enriched;
    if (year) filtered = filtered.filter((r) => r.year === year);
    if (season) filtered = filtered.filter((r) => r.season === season);

    // Sort by harvestDate desc
    return filtered.sort((a, b) => b.harvestDate.localeCompare(a.harvestDate));
  },
});

// ─── QUERY 6: listAllYields ───────────────────────────────────────────────────

export const listAllYields = query({
  args: {
    year:     v.optional(v.number()),
    season:   v.optional(v.string()),
    cropName: v.optional(v.string()),
  },
  handler: async (ctx, { year, season, cropName }) => {
    const userId = await requireUserId(ctx);

    const records = await ctx.db
      .query("yields")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const enriched = await Promise.all(records.map(async (r) => {
      const crop = await ctx.db.get(r.cropId);
      const farm = r.farmId ? await ctx.db.get(r.farmId) : null;
      const harvestYear = new Date(r.harvestDate).getFullYear();
      return {
        ...r,
        ...computeYieldFields(r),
        cropName:  crop?.name ?? "Unknown",
        farmName:  farm?.name ?? "Unknown",
        season:    crop?.season,
        year:      crop?.year ?? harvestYear,
        area:      crop?.area,
        areaUnit:  crop?.areaUnit,
      };
    }));

    let filtered = enriched;
    if (year)     filtered = filtered.filter((r) => r.year === year);
    if (season)   filtered = filtered.filter((r) => r.season === season);
    if (cropName) filtered = filtered.filter((r) =>
      r.cropName.toLowerCase().includes(cropName.toLowerCase())
    );

    return filtered.sort((a, b) => b.harvestDate.localeCompare(a.harvestDate));
  },
});

// ─── QUERY 7: getYieldSummaryByFarm ──────────────────────────────────────────

export const getYieldSummaryByFarm = query({
  args: {
    farmId: v.id("farms"),
    year:   v.optional(v.number()),
  },
  handler: async (ctx, { farmId, year }) => {
    const userId = await requireUserId(ctx);

    const farm = await ctx.db.get(farmId);
    if (!farm) throw new ConvexError("Farm not found");
    if (farm.userId !== userId) throw new ConvexError("Unauthorized");

    let yields = await ctx.db
      .query("yields")
      .withIndex("by_farm", (q) => q.eq("farmId", farmId))
      .collect();

    // Enrich each yield
    const enriched = await Promise.all(yields.map(async (r) => {
      const crop = await ctx.db.get(r.cropId);
      return { ...r, crop };
    }));

    // Filter by year if supplied
    const filtered = year
      ? enriched.filter((e) => {
          const y = e.crop?.year ?? new Date(e.harvestDate).getFullYear();
          return y === year;
        })
      : enriched;

    const totalYieldKg        = filtered.reduce((s, e) => s + toKg(e.totalYield, e.yieldUnit), 0);
    const totalAreaAcres      = filtered.reduce((s, e) => s + areaToAcres(e.crop?.area ?? 0, e.crop?.areaUnit ?? "acres"), 0);
    const averageYieldPerAcre = totalAreaAcres > 0 ? totalYieldKg / totalAreaAcres : 0;

    // Best / worst crop
    const sorted = [...filtered].sort((a, b) => b.yieldPerAcre - a.yieldPerAcre);
    const bestCrop   = sorted[0]  ? { cropName: sorted[0].crop?.name  ?? "?", yieldPerAcre: sorted[0].yieldPerAcre  } : null;
    const worstCrop  = sorted.at(-1) ? { cropName: sorted.at(-1)!.crop?.name ?? "?", yieldPerAcre: sorted.at(-1)!.yieldPerAcre } : null;

    // Crops without yield (harvested status but no yield doc)
    const allCrops = await ctx.db
      .query("crops")
      .withIndex("by_farm", (q) => q.eq("farmId", farmId))
      .filter((q) => q.eq(q.field("status"), "harvested"))
      .collect();
    const harvestedIds = new Set(filtered.map((e) => e.cropId.toString()));
    const cropsWithoutYield = allCrops.filter((c) => !harvestedIds.has(c._id.toString())).length;

    // Yield by month
    const byMonthMap: Record<string, number> = {};
    for (const e of filtered) {
      const d    = new Date(e.harvestDate);
      const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonthMap[key] = (byMonthMap[key] ?? 0) + toKg(e.totalYield, e.yieldUnit);
    }
    const yieldByMonth = Object.entries(byMonthMap)
      .map(([k, v]) => {
        const [yr, mo] = k.split("-");
        return { month: Number(mo), year: Number(yr), totalYieldKg: v };
      })
      .sort((a, b) => a.year - b.year || a.month - b.month);

    return {
      totalYieldKg,
      totalAreaHarvested: totalAreaAcres,
      averageYieldPerAcre,
      bestCrop,
      worstCrop,
      cropsWithYield:    filtered.length,
      cropsWithoutYield,
      yieldByMonth,
    };
  },
});

// ─── QUERY 8: getYieldTrendByCropName ────────────────────────────────────────

export const getYieldTrendByCropName = query({
  args: {
    cropName: v.string(),
    farmId:   v.optional(v.id("farms")),
  },
  handler: async (ctx, { cropName, farmId }) => {
    const userId = await requireUserId(ctx);

    // Find all crops with the given name
    const allCrops = await ctx.db
      .query("crops")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), cropName))
      .collect();

    const filtered = farmId
      ? allCrops.filter((c) => c.farmId === farmId)
      : allCrops;

    const trendRows: any[] = [];

    for (const crop of filtered) {
      const yieldDoc = await ctx.db
        .query("yields")
        .withIndex("by_crop", (q) => q.eq("cropId", crop._id))
        .first();
      if (!yieldDoc) continue;

      const expenses = (await ctx.db
        .query("expenses")
        .withIndex("by_crop", (q) => q.eq("cropId", crop._id))
        .collect())
        .reduce((s, e) => s + e.amount, 0);

      const revenue = (await ctx.db
        .query("sales")
        .withIndex("by_crop", (q) => q.eq("cropId", crop._id))
        .collect())
        .reduce((s, e) => s + e.totalAmount, 0);

      const totalYieldKg = toKg(yieldDoc.totalYield, yieldDoc.yieldUnit);
      const profitPerKg  = totalYieldKg > 0 ? (revenue - expenses) / totalYieldKg : 0;

      trendRows.push({
        season:         crop.season,
        year:           crop.year,
        yieldPerAcreKg: yieldDoc.yieldPerAcre,
        totalYieldKg,
        area:           crop.area,
        expenses,
        revenue,
        profitPerKg,
      });
    }

    // Sort by year asc, then season
    const seasonOrder: Record<string, number> = { kharif: 1, rabi: 2, zaid: 3, annual: 4 };
    trendRows.sort((a, b) => a.year - b.year || (seasonOrder[a.season] ?? 999) - (seasonOrder[b.season] ?? 999));

    // Trend direction
    let trendDirection: "improving" | "declining" | "stable" = "stable";
    if (trendRows.length >= 2) {
      const first = trendRows[0].yieldPerAcreKg;
      const last  = trendRows.at(-1)!.yieldPerAcreKg;
      const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
      if (changePct > 10)       trendDirection = "improving";
      else if (changePct < -10) trendDirection = "declining";
    }

    return { cropName, trend: trendRows, trendDirection };
  },
});

// ─── QUERY 9: getYieldBenchmarkComparison ────────────────────────────────────

export const getYieldBenchmarkComparison = query({
  args: {
    cropName: v.string(),
    state:    v.string(), // reserved for future state-level benchmarks
  },
  handler: async (ctx, { cropName }) => {
    const userId = await requireUserId(ctx);

    const benchmark = getBenchmarkYield(cropName);

    // Latest yield for this crop name
    const crops = await ctx.db
      .query("crops")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), cropName))
      .collect();

    if (crops.length === 0) {
      return { farmerYieldPerAcre: null, nationalAvgPerAcre: benchmark, message: "No crops found with this name." };
    }

    // Find the most recent yield
    let latestYield: any = null;
    let latestCrop: any  = null;
    for (const crop of crops) {
      const y = await ctx.db
        .query("yields")
        .withIndex("by_crop", (q) => q.eq("cropId", crop._id))
        .first();
      if (y && (!latestYield || y.harvestDate > latestYield.harvestDate)) {
        latestYield = y;
        latestCrop  = crop;
      }
    }

    if (!latestYield) {
      return { farmerYieldPerAcre: null, nationalAvgPerAcre: benchmark, message: "No yield recorded for this crop yet." };
    }

    const farmerYieldPerAcre = latestYield.yieldPerAcre; // kg/acre

    if (!benchmark) {
      return { farmerYieldPerAcre, nationalAvgPerAcre: null, message: "No benchmark data available for this crop." };
    }

    const differencePercent = ((farmerYieldPerAcre - benchmark) / benchmark) * 100;
    let performanceLabel: "Above Average" | "At Average" | "Below Average";
    if (farmerYieldPerAcre > benchmark * 1.1)      performanceLabel = "Above Average";
    else if (farmerYieldPerAcre < benchmark * 0.9) performanceLabel = "Below Average";
    else                                            performanceLabel = "At Average";

    const gapToClose = Math.max(0, benchmark - farmerYieldPerAcre);
    const areaAcres  = areaToAcres(latestCrop?.area ?? 1, latestCrop?.areaUnit ?? "acres");

    // Latest sale rate per kg
    const latestSale = await ctx.db
      .query("sales")
      .withIndex("by_crop", (q) => q.eq("cropId", latestYield.cropId))
      .order("desc")
      .first();
    const marketRatePerKg = latestSale && latestSale.weight > 0
      ? latestSale.totalAmount / (latestSale.weight * (latestSale.weightUnit === "quintal" ? 100 : latestSale.weightUnit === "ton" ? 1000 : 1))
      : 0;

    const potentialExtraRevenue = gapToClose * areaAcres * marketRatePerKg;

    return {
      farmerYieldPerAcre,
      nationalAvgPerAcre:  benchmark,
      differencePercent,
      performanceLabel,
      gapToClose,
      potentialExtraRevenue,
    };
  },
});

// ─── QUERY 10: getYieldEfficiencyMatrix ──────────────────────────────────────

export const getYieldEfficiencyMatrix = query({
  args: { year: v.optional(v.number()) },
  handler: async (ctx, { year }) => {
    const userId = await requireUserId(ctx);

    const yieldDocs = await ctx.db
      .query("yields")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const rows: any[] = [];

    for (const y of yieldDocs) {
      const crop = await ctx.db.get(y.cropId);
      if (!crop) continue;

      const cropYear = crop.year ?? new Date(y.harvestDate).getFullYear();
      if (year && cropYear !== year) continue;

      const farm = await ctx.db.get(y.farmId);

      const expenses = (await ctx.db
        .query("expenses")
        .withIndex("by_crop", (q) => q.eq("cropId", crop._id))
        .collect())
        .reduce((s, e) => s + e.amount, 0);

      const revenue = (await ctx.db
        .query("sales")
        .withIndex("by_crop", (q) => q.eq("cropId", crop._id))
        .collect())
        .reduce((s, e) => s + e.totalAmount, 0);

      const areaAcres      = areaToAcres(crop.area, crop.areaUnit);
      const yieldPerAcre   = y.yieldPerAcre;
      const expPerAcre     = areaAcres > 0 ? expenses / areaAcres : 0;
      const revPerAcre     = areaAcres > 0 ? revenue / areaAcres : 0;
      const profitPerAcre  = revPerAcre - expPerAcre;

      // Yield efficiency score (capped at 150)
      const benchYield = getBenchmarkYield(crop.name);
      const yieldEfficiencyScore = benchYield
        ? Math.min(150, (yieldPerAcre / benchYield) * 100)
        : 100; // neutral if no benchmark

      // Cost efficiency score
      const benchExpense = getBenchmarkExpense(crop.name);
      const costEfficiencyScore  = expPerAcre > 0
        ? Math.min(150, (benchExpense / expPerAcre) * 100)
        : 100;

      const overallScore = (yieldEfficiencyScore + costEfficiencyScore) / 2;

      rows.push({
        cropName:            crop.name,
        farmName:            farm?.name ?? "Unknown",
        season:              crop.season,
        year:                cropYear,
        yieldPerAcre,
        expensesPerAcre:     expPerAcre,
        revenuePerAcre:      revPerAcre,
        profitPerAcre,
        yieldEfficiencyScore,
        costEfficiencyScore,
        overallScore,
      });
    }

    return rows.sort((a, b) => b.overallScore - a.overallScore);
  },
});
