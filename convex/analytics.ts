import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

// ─── UTILS ───────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");
  return identity.subject;
}

function convertToKg(value: number, unit: string): number {
  if (unit === "quintal") return value * 100;
  if (unit === "ton") return value * 1000;
  return value;
}

// ─── 1. getCropProfitSummary ─────────────────────────────────────────────────

export const getCropProfitSummary = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);

    const crop = await ctx.db.get(cropId);
    if (!crop || crop.userId !== userId) throw new ConvexError("Unauthorized or not found");

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();

    const yields = await ctx.db
      .query("yields")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();

    let totalExpenses = 0;
    const expenseGroups: Record<string, number> = {};
    for (const exp of expenses) {
      totalExpenses += exp.amount;
      expenseGroups[exp.category] = (expenseGroups[exp.category] || 0) + exp.amount;
    }

    const expenseCategories = Object.entries(expenseGroups)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    let totalRevenue = 0;
    let totalWeightSoldKg = 0;
    let firstSaleDate: number | null = null;
    let lastSaleDate: number | null = null;

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      totalWeightSoldKg += convertToKg(sale.weight, sale.weightUnit);
      
      const sDate = new Date(sale.date).getTime();
      if (!firstSaleDate || sDate < firstSaleDate) firstSaleDate = sDate;
      if (!lastSaleDate || sDate > lastSaleDate) lastSaleDate = sDate;
    }

    let totalYieldKg = 0;
    for (const y of yields) {
      totalYieldKg += convertToKg(y.totalYield, y.yieldUnit);
    }

    const grossProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const roiPercent = totalExpenses > 0 ? (grossProfit / totalExpenses) * 100 : 0;
    const isProfit = grossProfit >= 0;

    const costPerKg = totalYieldKg > 0 ? totalExpenses / totalYieldKg : 0;
    const revenuePerKg = totalWeightSoldKg > 0 ? totalRevenue / totalWeightSoldKg : 0;
    const breakEvenRatePerKg = totalWeightSoldKg > 0 ? totalExpenses / totalWeightSoldKg : 0;

    let daysFromSowingToSale = null;
    if (crop.sowingDate && firstSaleDate) {
      const sowDate = new Date(crop.sowingDate).getTime();
      const diffTime = firstSaleDate - sowDate;
      if (diffTime > 0) {
        daysFromSowingToSale = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    return {
      totalExpenses,
      totalRevenue,
      grossProfit,
      profitMargin,
      costPerKg,
      revenuePerKg,
      breakEvenRatePerKg,
      roiPercent,
      isProfit,
      expenseCategories,
      daysFromSowingToSale,
      totalYieldKg,
      totalWeightSoldKg,
    };
  },
});

// ─── 2. getFarmProfitSummary ──────────────────────────────────────────────────

export const getFarmProfitSummary = query({
  args: { farmId: v.id("farms"), year: v.optional(v.number()) },
  handler: async (ctx, { farmId, year }) => {
    const userId = await getAuthenticatedUserId(ctx);

    const farm = await ctx.db.get(farmId);
    if (!farm || farm.userId !== userId) throw new ConvexError("Unauthorized");

    let allCrops = await ctx.db
      .query("crops")
      .withIndex("by_farm", (q) => q.eq("farmId", farmId))
      .collect();

    if (year) {
      allCrops = allCrops.filter(c => c.year === year);
    }

    let totalFarmExpenses = 0;
    let totalFarmRevenue = 0;

    const cropBreakdown = await Promise.all(
      allCrops.map(async (crop) => {
        const expenses = await ctx.db
          .query("expenses")
          .withIndex("by_crop", (q) => q.eq("cropId", crop._id))
          .collect();
        const sales = await ctx.db
          .query("sales")
          .withIndex("by_crop", (q) => q.eq("cropId", crop._id))
          .collect();

        const cropExp = expenses.reduce((s, e) => s + e.amount, 0);
        const cropRev = sales.reduce((s, e) => s + e.totalAmount, 0);
        const profit = cropRev - cropExp;
        
        totalFarmExpenses += cropExp;
        totalFarmRevenue += cropRev;

        return {
          cropName: crop.name,
          cropId: crop._id,
          profit,
          margin: cropRev > 0 ? (profit / cropRev) * 100 : 0,
          expenses: cropExp,
          revenue: cropRev,
          year: crop.year,
        };
      })
    );

    cropBreakdown.sort((a, b) => b.profit - a.profit);

    const bestCrop = cropBreakdown.length > 0 ? cropBreakdown[0] : null;
    const worstCrop = cropBreakdown.length > 0 ? cropBreakdown[cropBreakdown.length - 1] : null;

    const grossProfit = totalFarmRevenue - totalFarmExpenses;
    const totalFarmROI = totalFarmExpenses > 0 ? (grossProfit / totalFarmExpenses) * 100 : 0;
    const profitMargin = totalFarmRevenue > 0 ? (grossProfit / totalFarmRevenue) * 100 : 0;

    return {
      totalExpenses: totalFarmExpenses,
      totalRevenue: totalFarmRevenue,
      grossProfit,
      profitMargin,
      totalFarmROI,
      isProfit: grossProfit >= 0,
      cropBreakdown,
      bestCrop,
      worstCrop,
    };
  },
});

// ─── 3. getPortfolioProfitSummary ─────────────────────────────────────────────

export const getPortfolioProfitSummary = query({
  args: { year: v.optional(v.number()) },
  handler: async (ctx, { year }) => {
    const userId = await getAuthenticatedUserId(ctx);

    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const allSales = await ctx.db
      .query("sales")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Year filtering helper
    const isTargetYear = (dateStr: string, targetYear: number) => {
      return dateStr.startsWith(targetYear.toString());
    };

    let expenses = allExpenses;
    let sales = allSales;
    
    if (year) {
      expenses = allExpenses.filter(e => isTargetYear(e.date, year));
      sales = allSales.filter(s => isTargetYear(s.date, year));
    }

    let grandTotalExpenses = 0;
    let grandTotalRevenue = 0;
    const farmMap: Record<string, { farmName: string; expenses: number; revenue: number; profit: number }> = {};
    const monthMap: Record<string, { month: number; year: number; expenses: number; revenue: number; profit: number }> = {};
    const cropMap: Record<string, { cropName: string; expenses: number; revenue: number; profit: number }> = {};

    for (const exp of expenses) {
      grandTotalExpenses += exp.amount;
      
      const fId = exp.farmId as string;
      if (!farmMap[fId]) farmMap[fId] = { farmName: "Loading...", expenses: 0, revenue: 0, profit: 0 };
      farmMap[fId].expenses += exp.amount;

      const [y, m] = exp.date.split("-");
      const key = `${y}-${m}`;
      if (!monthMap[key]) monthMap[key] = { month: parseInt(m, 10), year: parseInt(y, 10), expenses: 0, revenue: 0, profit: 0 };
      monthMap[key].expenses += exp.amount;

      // Expense to crop logic: requires joining crops to get the name, but exp has cropId.
      const cId = exp.cropId as string;
      if (!cropMap[cId]) cropMap[cId] = { cropName: "Loading...", expenses: 0, revenue: 0, profit: 0 };
      cropMap[cId].expenses += exp.amount;
    }

    for (const sale of sales) {
      grandTotalRevenue += sale.totalAmount;

      const fId = sale.farmId as string;
      if (!farmMap[fId]) farmMap[fId] = { farmName: "Loading...", expenses: 0, revenue: 0, profit: 0 };
      farmMap[fId].revenue += sale.totalAmount;

      const [y, m] = sale.date.split("-");
      const key = `${y}-${m}`;
      if (!monthMap[key]) monthMap[key] = { month: parseInt(m, 10), year: parseInt(y, 10), expenses: 0, revenue: 0, profit: 0 };
      monthMap[key].revenue += sale.totalAmount;

      const cId = sale.cropId as string;
      if (!cropMap[cId]) cropMap[cId] = { cropName: "Loading...", expenses: 0, revenue: 0, profit: 0 };
      cropMap[cId].revenue += sale.totalAmount;
    }

    // Resolve Farm Names + Calculate Profit
    const farmBreakdown = await Promise.all(
      Object.entries(farmMap).map(async ([fId, stats]) => {
        const farm = await ctx.db.get(fId as Id<"farms">);
        const profit = stats.revenue - stats.expenses;
        const margin = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0;
        return {
          ...stats,
          farmId: fId,
          farmName: farm?.name || "Unknown",
          profit,
          margin,
        };
      })
    );

    // Resolve Crop Names + Group by name not ID (to merge same crops across farms)
    const normalizedCropMap: Record<string, any> = {};
    for (const [cId, stats] of Object.entries(cropMap)) {
      const crop = await ctx.db.get(cId as Id<"crops">);
      if (!crop) continue;
      
      const name = crop.name; // Use standard crop name (e.g. Cotton) to aggregate across farms
      if (!normalizedCropMap[name]) {
        normalizedCropMap[name] = { cropName: name, expenses: 0, revenue: 0, profit: 0 };
      }
      normalizedCropMap[name].expenses += stats.expenses;
      normalizedCropMap[name].revenue += stats.revenue;
    }

    const cropBreakdown = Object.values(normalizedCropMap).map(stats => {
      const profit = stats.revenue - stats.expenses;
      const margin = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0;
      return {
        ...stats,
        profit,
        margin
      };
    }).sort((a, b) => b.profit - a.profit);

    const monthlyProfitTrend = Object.values(monthMap).map(m => {
      m.profit = m.revenue - m.expenses;
      return m;
    }).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Populate missing months up to the current month in the target year to ensure the graph looks continuous
    // Omitting exhaustive month filling here to keep chart simple, Recharts handles sparse data generally okay
    // But ideally, mapping 1-12 would ensure fixed width bars. Let's do a basic fill if it's a specific year.
    let fullYearMonthlyTrend = monthlyProfitTrend;
    if (year) {
      fullYearMonthlyTrend = Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const existing = monthlyProfitTrend.find(m => m.month === monthNum);
        return existing || { month: monthNum, year, expenses: 0, revenue: 0, profit: 0 };
      });
    }

    const grandTotalProfit = grandTotalRevenue - grandTotalExpenses;
    const averageProfitMargin = grandTotalRevenue > 0 ? (grandTotalProfit / grandTotalRevenue) * 100 : 0;
    const roiPercent = grandTotalExpenses > 0 ? (grandTotalProfit / grandTotalExpenses) * 100 : 0;

    let yearOverYearGrowth = null;
    if (year) {
      // Calculate previous year totals
      const lastYearExps = allExpenses.filter(e => isTargetYear(e.date, year - 1));
      const lastYearSales = allSales.filter(s => isTargetYear(s.date, year - 1));
      
      const lastYearRev = lastYearSales.reduce((s, x) => s + x.totalAmount, 0);
      const lastYearExp = lastYearExps.reduce((s, x) => s + x.amount, 0);
      const lastYearProfit = lastYearRev - lastYearExp;

      if (lastYearRev > 0 || lastYearExp > 0) {
        let growthPercent = 0;
        if (lastYearProfit !== 0) {
           growthPercent = ((grandTotalProfit - lastYearProfit) / Math.abs(lastYearProfit)) * 100;
        } else if (grandTotalProfit > 0) {
           growthPercent = 100; // Infinity edge case
        }
        
        yearOverYearGrowth = {
          thisYear: grandTotalProfit,
          lastYear: lastYearProfit,
          growthPercent,
        };
      }
    }

    return {
      grandTotalExpenses,
      grandTotalRevenue,
      grandTotalProfit,
      averageProfitMargin,
      roiPercent,
      farmBreakdown: farmBreakdown.sort((a, b) => b.profit - a.profit),
      cropBreakdown,
      monthlyProfitTrend: fullYearMonthlyTrend,
      yearOverYearGrowth,
    };
  },
});

// ─── 4. getSeasonComparison ───────────────────────────────────────────────────

export const getSeasonComparison = query({
  args: { cropName: v.string(), farmId: v.optional(v.id("farms")) },
  handler: async (ctx, { cropName, farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);

    // Make crop name matching case-insensitive
    const crops = await ctx.db
      .query("crops")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const matchedCrops = crops.filter(c => 
      c.name.toLowerCase().trim() === cropName.toLowerCase().trim() &&
      (!farmId || c.farmId === farmId)
    );

    const comparison = await Promise.all(
      matchedCrops.map(async (crop) => {
        const expenses = await ctx.db
          .query("expenses")
          .withIndex("by_crop", (q) => q.eq("cropId", crop._id))
          .collect();
        const sales = await ctx.db
          .query("sales")
          .withIndex("by_crop", (q) => q.eq("cropId", crop._id))
          .collect();
        const yields = await ctx.db
          .query("yields")
          .withIndex("by_crop", (q) => q.eq("cropId", crop._id))
          .collect();

        const cropExp = expenses.reduce((s, e) => s + e.amount, 0);
        const cropRev = sales.reduce((s, e) => s + e.totalAmount, 0);
        
        let totalYieldKg = 0;
        for (const y of yields) {
          totalYieldKg += convertToKg(y.totalYield, y.yieldUnit);
        }

        let totalWeightSoldKg = 0;
        for (const s of sales) {
          totalWeightSoldKg += convertToKg(s.weight, s.weightUnit);
        }

        return {
          season: crop.season,
          year: crop.year,
          label: `${crop.season.charAt(0).toUpperCase() + crop.season.slice(1)} ${crop.year}`,
          expenses: cropExp,
          revenue: cropRev,
          profit: cropRev - cropExp,
          yieldKg: totalYieldKg,
          rateAchieved: totalWeightSoldKg > 0 ? cropRev / totalWeightSoldKg : 0,
          weatherNote: crop.notes || "No notes",
          cropId: crop._id,
        };
      })
    );

    // Sort descending by year
    return comparison.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      // Secondary sort logic if same year, arbitrary based on season order generally
      return a.season.localeCompare(b.season); 
    });
  },
});
