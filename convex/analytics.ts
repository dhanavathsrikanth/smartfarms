import { v, ConvexError } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation, internalAction, QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ─── UTILS ───────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<string> {
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

// ─── 5. getDetailedCropProfitReport ──────────────────────────────────────────

export const getDetailedCropProfitReport = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);

    const crop = await ctx.db.get(cropId);
    if (!crop || crop.userId !== userId) throw new ConvexError("Crop not found");
    
    const farm = await ctx.db.get(crop.farmId);
    if (!farm) throw new ConvexError("Farm not found");

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

    // ─── DAYS ACTIVE ───
    const sowDate = Math.floor(new Date(crop.sowingDate).getTime() / (1000 * 60 * 60 * 24));
    let endEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    if (crop.actualHarvestDate) {
      endEpoch = Math.floor(new Date(crop.actualHarvestDate).getTime() / (1000 * 60 * 60 * 24));
    }
    const daysActive = Math.max(1, endEpoch - sowDate);

    // ─── EXPENSES ───
    let totalExpenses = 0;
    const catMap: Record<string, { amount: number; count: number }> = {};
    let largestSingleExpense = { category: "", amount: 0, date: "", supplier: "" };

    for (const exp of expenses) {
      totalExpenses += exp.amount;
      if (!catMap[exp.category]) catMap[exp.category] = { amount: 0, count: 0 };
      catMap[exp.category].amount += exp.amount;
      catMap[exp.category].count += 1;

      if (exp.amount > largestSingleExpense.amount) {
        largestSingleExpense = {
          category: exp.category,
          amount: exp.amount,
          date: exp.date,
          supplier: exp.supplier || "Unknown"
        };
      }
    }
    const byCategory = Object.entries(catMap).map(([category, stats]) => ({
      category,
      amount: stats.amount,
      percentage: totalExpenses > 0 ? (stats.amount / totalExpenses) * 100 : 0,
      count: stats.count
    })).sort((a, b) => b.amount - a.amount);

    // ─── SALES ───
    let totalRevenue = 0;
    let totalWeightSoldKg = 0;
    let pendingAmount = 0;
    let bestRateAchieved = { rate: 0, date: "", buyerName: "" };
    const buyerMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      totalWeightSoldKg += convertToKg(sale.weight, sale.weightUnit);
      if (sale.paymentStatus !== "paid") pendingAmount += sale.totalAmount;
      
      const buyerLower = sale.buyerName.toLowerCase().trim();
      if (!buyerMap[buyerLower]) buyerMap[buyerLower] = 0;
      buyerMap[buyerLower] += sale.totalAmount;

      if (!typeMap[sale.saleType]) typeMap[sale.saleType] = 0;
      typeMap[sale.saleType] += sale.totalAmount;

      const rateKg = sale.weightUnit === "quintal" ? sale.ratePerUnit / 100 : 
                     sale.weightUnit === "ton" ? sale.ratePerUnit / 1000 : 
                     sale.ratePerUnit;
      
      if (rateKg > bestRateAchieved.rate) {
        bestRateAchieved = { rate: rateKg, date: sale.date, buyerName: sale.buyerName };
      }
    }

    const byBuyer = Object.entries(buyerMap).map(([name, amount]) => ({
      buyerName: name,
      amount,
      percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    const bySaleType = Object.entries(typeMap).map(([type, amount]) => ({
      type,
      amount,
      percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    // ─── YIELDS ───
    let totalYieldKg = 0;
    let expectedYieldKg = 0;
    for (const y of yields) {
      totalYieldKg += convertToKg(y.totalYield, y.yieldUnit);
      if (y.expectedYield) expectedYieldKg += convertToKg(y.expectedYield, y.yieldUnit);
    }
    const yieldGapPercent = expectedYieldKg > 0 ? ((expectedYieldKg - totalYieldKg) / expectedYieldKg) * 100 : 0;
    
    // ─── FINANCIAL ───
    const grossProfit = totalRevenue - totalExpenses;
    const netProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const roiPercent = totalExpenses > 0 ? (grossProfit / totalExpenses) * 100 : 0;
    const breakEvenRatePerKg = totalYieldKg > 0 ? totalExpenses / totalYieldKg : 0;
    const actualRateAchievedPerKg = totalWeightSoldKg > 0 ? totalRevenue / totalWeightSoldKg : 0;

    // ─── COMPARISON ───
    const allCrops = await ctx.db
      .query("crops")
      .withIndex("by_farm", (q) => q.eq("farmId", crop.farmId))
      .collect();
    
    const sameCropsPrior = allCrops.filter(c => 
      c.name.toLowerCase().trim() === crop.name.toLowerCase().trim() && c.year < crop.year
    ).sort((a, b) => b.year - a.year);

    let comparisonData = null;
    if (sameCropsPrior.length > 0) {
      const prior = sameCropsPrior[0];
      const priorExps = await ctx.db.query("expenses").withIndex("by_crop", (q) => q.eq("cropId", prior._id)).collect();
      const priorSales = await ctx.db.query("sales").withIndex("by_crop", (q) => q.eq("cropId", prior._id)).collect();
      const prExp = priorExps.reduce((s, e) => s + e.amount, 0);
      const prRev = priorSales.reduce((s, e) => s + e.totalAmount, 0);
      const prProfit = prRev - prExp;
      
      let growthPercent = 0;
      if (prProfit !== 0) {
        growthPercent = ((grossProfit - prProfit) / Math.abs(prProfit)) * 100;
      } else if (grossProfit > 0) {
        growthPercent = 100;
      }
      
      comparisonData = {
        lastSeasonProfit: prProfit,
        thisSeasonProfit: grossProfit,
        growthPercent
      };
    }

    return {
      crop: { 
        name: crop.name, variety: crop.variety, season: crop.season, year: crop.year, 
        area: crop.area, areaUnit: crop.areaUnit, sowingDate: crop.sowingDate, 
        harvestDate: crop.actualHarvestDate || crop.expectedHarvestDate || undefined, 
        daysActive 
      },
      farm: { name: farm.name, location: farm.location },
      financial: {
        totalExpenses,
        totalRevenue,
        grossProfit,
        netProfitMargin,
        roiPercent,
        breakEvenRatePerKg,
        actualRateAchievedPerKg,
        rateAboveBreakEven: actualRateAchievedPerKg - breakEvenRatePerKg
      },
      expenses: {
        total: totalExpenses,
        byCategory,
        largestSingleExpense: largestSingleExpense.amount > 0 ? largestSingleExpense : null,
        dailyAverageCost: totalExpenses / daysActive
      },
      sales: {
        totalRevenue,
        totalWeightSoldKg,
        salesCount: sales.length,
        averageRatePerKg: actualRateAchievedPerKg,
        bestRateAchieved: bestRateAchieved.rate > 0 ? bestRateAchieved : null,
        byBuyer,
        bySaleType,
        pendingAmount
      },
      yield: {
        totalYieldKg,
        yieldPerAcre: crop.area > 0 ? totalYieldKg / crop.area : 0,
        expectedYieldKg,
        yieldGapPercent,
        exists: yields.length > 0
      },
      comparison: { vsLastSameCrop: comparisonData }
    };
  }
});

// ─── 6. getMultiCropComparison ───────────────────────────────────────────────

export const getMultiCropComparison = query({
  args: { cropIds: v.array(v.id("crops")) },
  handler: async (ctx, { cropIds }) => {
    const userId = await getAuthenticatedUserId(ctx);
    
    // limit to 6 crops safely
    const idsToFetch = cropIds.slice(0, 6);
    
    const results = await Promise.all(idsToFetch.map(async (cId) => {
      const crop = await ctx.db.get(cId);
      if (!crop || crop.userId !== userId) return null;
      
      const farm = await ctx.db.get(crop.farmId);
      
      const expenses = await ctx.db.query("expenses").withIndex("by_crop", (q) => q.eq("cropId", cId)).collect();
      const sales = await ctx.db.query("sales").withIndex("by_crop", (q) => q.eq("cropId", cId)).collect();
      const yields = await ctx.db.query("yields").withIndex("by_crop", (q) => q.eq("cropId", cId)).collect();

      const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
      const totalRev = sales.reduce((s, e) => s + e.totalAmount, 0);
      let yieldKg = 0;
      for (const y of yields) yieldKg += convertToKg(y.totalYield, y.yieldUnit);
      let weightSoldKg = 0;
      for (const s of sales) weightSoldKg += convertToKg(s.weight, s.weightUnit);

      const profit = totalRev - totalExp;
      
      return {
        cropId: cId,
        cropName: crop.name,
        farmName: farm?.name || "Unknown",
        season: crop.season,
        year: crop.year,
        expenses: totalExp,
        revenue: totalRev,
        profit,
        margin: totalRev > 0 ? (profit / totalRev) * 100 : 0,
        yieldKg,
        ratePerKg: weightSoldKg > 0 ? totalRev / weightSoldKg : 0,
        area: crop.area,
        profitPerAcre: crop.area > 0 ? profit / crop.area : 0
      };
    }));

    // Non-null assertion is safe due to filter
    return results.filter(r => r !== null).sort((a, b) => b!.profitPerAcre - a!.profitPerAcre) as Array<NonNullable<typeof results[0]>>;
  }
});

// ─── 7. getCropRanking ───────────────────────────────────────────────────────

export const getCropRanking = query({
  args: { year: v.optional(v.number()), farmId: v.optional(v.id("farms")) },
  handler: async (ctx, { year, farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    
    let allCrops = await ctx.db.query("crops").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    if (farmId) allCrops = allCrops.filter(c => c.farmId === farmId);
    if (year !== undefined) allCrops = allCrops.filter(c => c.year === year);

    const cropsWithStats = await Promise.all(allCrops.map(async (crop) => {
      const expenses = await ctx.db.query("expenses").withIndex("by_crop", (q) => q.eq("cropId", crop._id)).collect();
      const sales = await ctx.db.query("sales").withIndex("by_crop", (q) => q.eq("cropId", crop._id)).collect();
      const farm = await ctx.db.get(crop.farmId);
      
      const exp = expenses.reduce((s, e) => s + e.amount, 0);
      const rev = sales.reduce((s, e) => s + e.totalAmount, 0);
      const profit = rev - exp;
      
      return {
        cropId: crop._id,
        cropName: crop.name,
        farmName: farm?.name || "Unknown",
        season: crop.season,
        year: crop.year,
        profitPerAcre: crop.area > 0 ? profit / crop.area : 0,
        totalProfit: profit,
        margin: rev > 0 ? (profit / rev) * 100 : 0,
        expenses: exp,
        revenue: rev,
        area: crop.area
      };
    }));

    cropsWithStats.sort((a, b) => b.profitPerAcre - a.profitPerAcre);

    return cropsWithStats.map((c, idx) => {
      let medal: "gold" | "silver" | "bronze" | undefined;
      // Only award available medals if there are < 3 crops
      if (idx === 0) medal = "gold";
      else if (idx === 1) medal = "silver";
      else if (idx === 2) medal = "bronze";
      
      return {
        ...c,
        rank: idx + 1,
        medal,
        isLoss: c.totalProfit < 0
      };
    });
  }
});

// ─── 8. getExpenseEfficiencyAnalysis ─────────────────────────────────────────

export const getExpenseEfficiencyAnalysis = query({
  args: { year: v.optional(v.number()), farmId: v.optional(v.id("farms")) },
  handler: async (ctx, { year, farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);

    let expenses = await ctx.db.query("expenses").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    let sales = await ctx.db.query("sales").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    if (farmId) {
      expenses = expenses.filter(e => e.farmId === farmId);
      sales = sales.filter(s => s.farmId === farmId);
    }
    if (year !== undefined) {
      expenses = expenses.filter(e => e.date.startsWith(String(year)));
      sales = sales.filter(s => s.date.startsWith(String(year)));
    }

    const totalRev = sales.reduce((s, x) => s + x.totalAmount, 0);
    const totalExp = expenses.reduce((s, x) => s + x.amount, 0);

    if (totalExp === 0) return [];

    const catMap: Record<string, number> = {};
    for (const e of expenses) {
      if (!catMap[e.category]) catMap[e.category] = 0;
      catMap[e.category] += e.amount;
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const results = Object.entries(catMap).map(([category, spent]) => {
      const percentOfTotalExpenses = (spent / totalExp) * 100;
      const revenueGenerated = totalRev > 0 ? (spent / totalExp) * totalRev : 0;
      const efficiencyScore = spent > 0 ? (revenueGenerated / spent) * 100 : 0;
      
      const monthlySpend = Array(12).fill(0);
      expenses.filter(e => e.category === category).forEach(e => {
        const m = parseInt(e.date.substring(5, 7), 10) - 1;
        if (m >= 0 && m < 12) monthlySpend[m] += e.amount;
      });

      let vsIndustryAverage: "above" | "below" | "average" = "average";
      let recommendation = "";

      if (category === "fertilizer") {
        if (percentOfTotalExpenses > 30) { vsIndustryAverage = "above"; recommendation = "Fertilizer spend is high (>30%). Consider soil testing to optimize application."; }
        else if (percentOfTotalExpenses < 10) { vsIndustryAverage = "below"; recommendation = "Fertilizer spend is low. Ensure crops are receiving adequate nutrients for optimal yield."; }
        else { recommendation = "Fertilizer spend is balanced within industry averages."; }
      } else if (category === "labour") {
         if (percentOfTotalExpenses > 40) { vsIndustryAverage = "above"; recommendation = "Labour costs are high (>40%). Explore mechanization."; }
         else { recommendation = "Labour costs are within range."; }
      }

      return {
        category,
        totalSpent: spent,
        percentOfTotalExpenses,
        revenueGenerated,
        efficiencyScore,
        monthlySpend,
        vsIndustryAverage,
        recommendation: recommendation || `Review ${category} spend periodically.`
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    return results;
  }
});

// ─── 9. getProfitTrendAnalysis ───────────────────────────────────────────────

export const getProfitTrendAnalysis = query({
  args: { months: v.optional(v.number()), farmId: v.optional(v.id("farms")) },
  handler: async (ctx, { months = 12, farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    let buckets: { year: number; month: number; label: string; expenses: number; revenue: number; profit: number; cumulativeProfit: number; activeCropsCount: number; isPositive: boolean }[] = [];
    
    // YYYY-MM-DD
    const dateNowStr = new Date().toISOString().substring(0, 10);
    const currDbYear = parseInt(dateNowStr.substring(0, 4), 10);
    const currDbMonth = parseInt(dateNowStr.substring(5, 7), 10);
    
    for (let i = months - 1; i >= 0; i--) {
      let m = currDbMonth - i;
      let y = currDbYear;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      buckets.push({
        year: y, month: m, label: `${monthNames[m - 1]} ${y}`,
        expenses: 0, revenue: 0, profit: 0, cumulativeProfit: 0, activeCropsCount: 0, isPositive: false
      });
    }

    let expenses = await ctx.db.query("expenses").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    let sales = await ctx.db.query("sales").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    
    if (farmId) {
      expenses = expenses.filter(e => e.farmId === farmId);
      sales = sales.filter(s => s.farmId === farmId);
    }
    
    for (const exp of expenses) {
      const ey = parseInt(exp.date.substring(0, 4), 10);
      const em = parseInt(exp.date.substring(5, 7), 10);
      const b = buckets.find(b => b.year === ey && b.month === em);
      if (b) b.expenses += exp.amount;
    }
    
    for (const s of sales) {
      const sy = parseInt(s.date.substring(0, 4), 10);
      const sm = parseInt(s.date.substring(5, 7), 10);
      const b = buckets.find(b => b.year === sy && b.month === sm);
      if (b) b.revenue += s.totalAmount;
    }
    
    const crops = await ctx.db.query("crops").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    
    let cumulative = 0;
    for (const b of buckets) {
      b.profit = b.revenue - b.expenses;
      cumulative += b.profit;
      b.cumulativeProfit = cumulative;
      b.isPositive = b.profit >= 0;
      
      const monthStartStr = `${b.year}-${String(b.month).padStart(2, '0')}-01`;
      const monthEndStr = `${b.year}-${String(b.month).padStart(2, '0')}-31`; 
      
      b.activeCropsCount = crops.filter(c => {
        if (!c.sowingDate || c.sowingDate > monthEndStr) return false;
        const endD = c.actualHarvestDate || c.expectedHarvestDate || "9999-12-31";
        if (endD < monthStartStr) return false;
        return true;
      }).length;
    }
    
    let bestMonth = { label: "", profit: -Infinity };
    let worstMonth = { label: "", profit: Infinity };
    let sumProfit = 0;
    let anyActivity = false;
    
    for (const b of buckets) {
      if (b.profit > bestMonth.profit && (b.revenue > 0 || b.expenses > 0)) {
        bestMonth = { label: b.label, profit: b.profit };
        anyActivity = true;
      }
      if (b.profit < worstMonth.profit && (b.revenue > 0 || b.expenses > 0)) {
        worstMonth = { label: b.label, profit: b.profit };
      }
      sumProfit += b.profit;
    }
    
    const averageMonthlyProfit = months > 0 ? sumProfit / months : 0;
    
    let profitGrowthTrend: "improving" | "declining" | "stable" = "stable";
    if (months >= 2 && anyActivity) {
      const half = Math.floor(months / 2);
      const firstHalf = buckets.slice(0, half).reduce((s, b) => s + b.profit, 0);
      const secondHalf = buckets.slice(months - half).reduce((s, b) => s + b.profit, 0);
      if (secondHalf > firstHalf * 1.1) profitGrowthTrend = "improving";
      else if (secondHalf < firstHalf * 0.9) profitGrowthTrend = "declining";
    }

    return {
      trend: buckets,
      bestMonth: bestMonth.label ? bestMonth : null,
      worstMonth: worstMonth.label ? worstMonth : null,
      averageMonthlyProfit,
      profitGrowthTrend
    };
  }
});

// ─── 10. getBreakEvenAnalysis ────────────────────────────────────────────────

export const getBreakEvenAnalysis = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const crop = await ctx.db.get(cropId);
    if (!crop || crop.userId !== userId) throw new ConvexError("Unauthorized");
    
    const expenses = await ctx.db.query("expenses").withIndex("by_crop", (q) => q.eq("cropId", cropId)).collect();
    const sales = await ctx.db.query("sales").withIndex("by_crop", (q) => q.eq("cropId", cropId)).collect();
    const yields = await ctx.db.query("yields").withIndex("by_crop", (q) => q.eq("cropId", cropId)).collect();

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const revenueSoFar = sales.reduce((s, e) => s + e.totalAmount, 0);
    
    let totalYieldKg = 0;
    for (const y of yields) totalYieldKg += convertToKg(y.totalYield, y.yieldUnit);
    
    let weightSoldSoFar = 0;
    for (const s of sales) weightSoldSoFar += convertToKg(s.weight, s.weightUnit);

    const actualRatePerKg = weightSoldSoFar > 0 ? revenueSoFar / weightSoldSoFar : 0;
    
    const breakEvenWeightKg = actualRatePerKg > 0 ? totalExpenses / actualRatePerKg : (totalExpenses > 0 ? Infinity : 0);
    const breakEvenRatePerKg = totalYieldKg > 0 ? totalExpenses / totalYieldKg : 0;
    const breakEvenAchieved = revenueSoFar >= totalExpenses;
    const breakEvenProgressPercent = totalExpenses > 0 ? (revenueSoFar / totalExpenses) * 100 : (revenueSoFar > 0 ? 100 : 0);
    const remainingWeightToBreakEven = breakEvenAchieved ? 0 : Math.max(0, breakEvenWeightKg - weightSoldSoFar);
    const profitAfterBreakEven = revenueSoFar - totalExpenses;

    return {
      breakEvenWeightKg,
      breakEvenRatePerKg,
      weightSoldSoFar,
      revenueSoFar,
      breakEvenAchieved,
      breakEvenProgressPercent: Math.min(100, breakEvenProgressPercent),
      remainingWeightToBreakEven,
      profitAfterBreakEven
    };
  }
});

// ─── 11. getInputOutputRatioAnalysis ─────────────────────────────────────────

export const getInputOutputRatioAnalysis = query({
  args: { farmId: v.optional(v.id("farms")), year: v.optional(v.number()) },
  handler: async (ctx, { farmId, year }) => {
    const userId = await getAuthenticatedUserId(ctx);

    let crops = await ctx.db.query("crops").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    if (farmId) crops = crops.filter(c => c.farmId === farmId);
    if (year !== undefined) crops = crops.filter(c => c.year === year);

    const results = await Promise.all(crops.map(async (crop) => {
      const expenses = await ctx.db.query("expenses").withIndex("by_crop", (q) => q.eq("cropId", crop._id)).collect();
      const sales = await ctx.db.query("sales").withIndex("by_crop", (q) => q.eq("cropId", crop._id)).collect();
      const yields = await ctx.db.query("yields").withIndex("by_crop", (q) => q.eq("cropId", crop._id)).collect();
      const farm = await ctx.db.get(crop.farmId);
      
      const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
      const totalRev = sales.reduce((s, e) => s + e.totalAmount, 0);
      let yieldKg = 0;
      for (const y of yields) yieldKg += convertToKg(y.totalYield, y.yieldUnit);

      const inputOutputRatio = totalRev > 0 ? totalExp / totalRev : (totalExp > 0 ? Infinity : 0);
      
      let grade: "A" | "B" | "C" | "D" = "C";
      if (totalRev === 0 && totalExp === 0) {
         grade = "C"; 
      } else if (inputOutputRatio < 0.5) {
         grade = "A";
      } else if (inputOutputRatio <= 0.7) {
         grade = "B";
      } else if (inputOutputRatio <= 1.0) {
         grade = "C";
      } else {
         grade = "D";
      }

      return {
        cropName: crop.name,
        cropId: crop._id,
        farmName: farm?.name || "Unknown",
        inputOutputRatio,
        expensesPerKgYield: yieldKg > 0 ? totalExp / yieldKg : 0,
        revenuePerKgYield: yieldKg > 0 ? totalRev / yieldKg : 0,
        netPerKg: yieldKg > 0 ? (totalRev - totalExp) / yieldKg : 0,
        grade
      };
    }));

    return results.sort((a, b) => a.inputOutputRatio - b.inputOutputRatio);
  }
});

// ─── 12. getYearOverYearComparison ──────────────────────────────────────────

export const getYearOverYearComparison = query({
  args: { currentYear: v.number(), previousYear: v.number() },
  handler: async (ctx, { currentYear, previousYear }) => {
    const userId = await getAuthenticatedUserId(ctx);

    const crops = await ctx.db.query("crops").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const expenses = await ctx.db.query("expenses").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const sales = await ctx.db.query("sales").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    const currCrops = crops.filter(c => c.year === currentYear);
    const prevCrops = crops.filter(c => c.year === previousYear);

    const currExp = expenses.filter(e => e.date.startsWith(String(currentYear))).reduce((s, e) => s + e.amount, 0);
    const currRev = sales.filter(s => s.date.startsWith(String(currentYear))).reduce((s, e) => s + e.totalAmount, 0);
    const prevExp = expenses.filter(e => e.date.startsWith(String(previousYear))).reduce((s, e) => s + e.amount, 0);
    const prevRev = sales.filter(s => s.date.startsWith(String(previousYear))).reduce((s, e) => s + e.totalAmount, 0);
    
    if (prevCrops.length === 0 && prevExp === 0 && prevRev === 0) {
      return {
        currentYear: {
          totalExpenses: currExp, totalRevenue: currRev, totalProfit: currRev - currExp,
          activeFarms: new Set(currCrops.map(c => c.farmId)).size,
          totalCrops: currCrops.length, totalAreaFarmed: currCrops.reduce((s, c) => s + c.area, 0)
        },
        previousYear: {
          totalExpenses: prevExp, totalRevenue: prevRev, totalProfit: prevRev - prevExp,
          activeFarms: new Set(prevCrops.map(c => c.farmId)).size,
          totalCrops: prevCrops.length, totalAreaFarmed: prevCrops.reduce((s, c) => s + c.area, 0)
        },
        changes: { expensesChange: null, revenueChange: null, profitChange: null, cropsChange: null, areaChange: null },
        cropComparison: []
      };
    }

    const currProfit = currRev - currExp;
    const prevProfit = prevRev - prevExp;
    
    const currArea = currCrops.reduce((s, c) => s + c.area, 0);
    const prevArea = prevCrops.reduce((s, c) => s + c.area, 0);

    const calcChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : (curr < 0 ? -100 : 0);
      return ((curr - prev) / Math.abs(prev)) * 100;
    };

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyComparison = months.map((m, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      const cExp = expenses.filter(e => e.date.startsWith(`${currentYear}-${monthStr}`)).reduce((s, e) => s + e.amount, 0);
      const cRev = sales.filter(s => s.date.startsWith(`${currentYear}-${monthStr}`)).reduce((s, e) => s + e.totalAmount, 0);
      const pExp = expenses.filter(e => e.date.startsWith(`${previousYear}-${monthStr}`)).reduce((s, e) => s + e.amount, 0);
      const pRev = sales.filter(s => s.date.startsWith(`${previousYear}-${monthStr}`)).reduce((s, e) => s + e.totalAmount, 0);
      
      return {
        month: m,
        currRevenue: cRev,
        prevRevenue: pRev,
        currExpenses: cExp,
        prevExpenses: pExp,
        currProfit: cRev - cExp,
        prevProfit: pRev - pExp
      };
    });

    const cropComparison = [];
    const currNames = new Set(currCrops.map(c => c.name.toLowerCase().trim()));
    const prevNames = new Set(prevCrops.map(c => c.name.toLowerCase().trim()));
    const commonNames = [...currNames].filter(x => prevNames.has(x));

    for (const name of commonNames) {
      const matchingCurrExp = expenses.filter(e => e.date.startsWith(String(currentYear)) && currCrops.find(c => c._id === e.cropId && c.name.toLowerCase().trim() === name)).reduce((s, e) => s + e.amount, 0);
      const matchingCurrRev = sales.filter(s => s.date.startsWith(String(currentYear)) && currCrops.find(c => c._id === s.cropId && c.name.toLowerCase().trim() === name)).reduce((s, e) => s + e.totalAmount, 0);
      const cProf = matchingCurrRev - matchingCurrExp;
      
      const matchingPrevExp = expenses.filter(e => e.date.startsWith(String(previousYear)) && prevCrops.find(c => c._id === e.cropId && c.name.toLowerCase().trim() === name)).reduce((s, e) => s + e.amount, 0);
      const matchingPrevRev = sales.filter(s => s.date.startsWith(String(previousYear)) && prevCrops.find(c => c._id === s.cropId && c.name.toLowerCase().trim() === name)).reduce((s, e) => s + e.totalAmount, 0);
      const pProf = matchingPrevRev - matchingPrevExp;

      cropComparison.push({
        cropName: currCrops.find(c => c.name.toLowerCase().trim() === name)?.name || name,
        currentYearProfit: cProf,
        previousYearProfit: pProf,
        change: calcChange(cProf, pProf)
      });
    }

    return {
      currentYear: {
        totalExpenses: currExp, totalRevenue: currRev, totalProfit: currProfit,
        activeFarms: new Set(currCrops.map(c => c.farmId)).size,
        totalCrops: currCrops.length, totalAreaFarmed: currArea
      },
      previousYear: {
        totalExpenses: prevExp, totalRevenue: prevRev, totalProfit: prevProfit,
        activeFarms: new Set(prevCrops.map(c => c.farmId)).size,
        totalCrops: prevCrops.length, totalAreaFarmed: prevArea
      },
      changes: {
        expensesChange: calcChange(currExp, prevExp),
        revenueChange: calcChange(currRev, prevRev),
        profitChange: calcChange(currProfit, prevProfit),
        cropsChange: currCrops.length - prevCrops.length,
        areaChange: calcChange(currArea, prevArea)
      },
      monthlyComparison,
      cropComparison
    };
  }
});

// ─── 13. saveCropPlan ───────────────────────────────────────────────────────

export const saveCropPlan = mutation({
  args: {
    cropName: v.string(),
    area: v.number(),
    areaUnit: v.union(v.literal("acres"), v.literal("hectares"), v.literal("bigha")),
    inputCosts: v.object({
      seed: v.number(),
      fertilizer: v.number(),
      pesticide: v.number(),
      labour: v.number(),
      irrigation: v.number(),
      other: v.number(),
    }),
    expectedYieldPerAcre: v.number(),
    expectedRate: v.number(),
    calculatedProfit: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    
    return await ctx.db.insert("cropPlans", {
      ...args,
      userId,
      createdAt: Date.now(),
    });
  },
});

// ─── 14. listCropPlans ──────────────────────────────────────────────────────

export const listCropPlans = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);
    
    const plans = await ctx.db
      .query("cropPlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
      
    return plans.map(plan => {
      const totalInputPerAcre = 
        plan.inputCosts.seed + 
        plan.inputCosts.fertilizer + 
        plan.inputCosts.pesticide + 
        plan.inputCosts.labour + 
        plan.inputCosts.irrigation + 
        plan.inputCosts.other;
        
      const totalInvestment = totalInputPerAcre * plan.area;
      const totalExpectedYield = plan.expectedYieldPerAcre * plan.area;
      const expectedRevenue = totalExpectedYield * plan.expectedRate;
      const expectedProfit = expectedRevenue - totalInvestment;
      const margin = expectedRevenue > 0 ? (expectedProfit / expectedRevenue) * 100 : 0;
      const breakEvenRate = totalExpectedYield > 0 ? totalInvestment / totalExpectedYield : 0;
      const roi = totalInvestment > 0 ? (expectedProfit / totalInvestment) * 100 : 0;
      
      return {
        ...plan,
        totalInvestment,
        expectedRevenue,
        expectedProfit,
        margin,
        breakEvenRate,
        roi
      };
    });
  },
});

// ─── 15. deleteCropPlan ──────────────────────────────────────────────────────

export const deleteCropPlan = mutation({
  args: { planId: v.id("cropPlans") },
  handler: async (ctx, { planId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const plan = await ctx.db.get(planId);
    
    if (!plan || plan.userId !== userId) {
      throw new ConvexError("Unauthorized or plan not found");
    }
    
    await ctx.db.delete(planId);
    return planId;
  },
});

// ─── 16. generateFullFinancialReport ──────────────────────────────────────────

/**
 * Internal query to fetch all raw data required for the report.
 * Separating data fetching into a query keeps the action thin and 
 * ensures consistent data retrieval within a single database snapshot.
 */

// Explicit return type to break the circular-reference `any` cascade in the action
interface RawReportData {
  user: Doc<"users"> | null;
  farm: Doc<"farms"> | null;
  expenses: Doc<"expenses">[];
  sales: Doc<"sales">[];
  crops: Doc<"crops">[];
  yields: Doc<"yields">[];
  comparison: {
    prevExpenses: Doc<"expenses">[];
    prevSales: Doc<"sales">[];
    prevCrops: Doc<"crops">[];
  } | null;
}

export const getRawReportData = internalQuery({
  args: { 
    userId: v.string(), 
    year: v.optional(v.number()), 
    farmId: v.optional(v.id("farms")) 
  },
  handler: async (ctx, { userId, year, farmId }): Promise<RawReportData> => {
    // 1. Fetch User Profile
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", userId))
      .unique();

    // 2. Fetch Farm Details if specific farm requested
    const farm = farmId ? await ctx.db.get(farmId) : null;

    // 3. Fetch Expenses
    let expenses: Doc<"expenses">[] = farmId
      ? await ctx.db.query("expenses").withIndex("by_farm", (q) => q.eq("farmId", farmId)).collect()
      : await ctx.db.query("expenses").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    // 4. Fetch Sales
    let sales: Doc<"sales">[] = farmId
      ? await ctx.db.query("sales").withIndex("by_farm", (q) => q.eq("farmId", farmId)).collect()
      : await ctx.db.query("sales").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    // 5. Fetch Crops
    let crops: Doc<"crops">[] = farmId
      ? await ctx.db.query("crops").withIndex("by_farm", (q) => q.eq("farmId", farmId)).collect()
      : await ctx.db.query("crops").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    // 6. Fetch Yields — only by_crop and by_farm indexes exist, no by_user
    //    Collect per-crop yields based on the crops we already fetched
    let yields: Doc<"yields">[] = [];
    if (farmId) {
      yields = await ctx.db.query("yields").withIndex("by_farm", (q) => q.eq("farmId", farmId)).collect();
    } else {
      // Collect yields for every crop the user owns (batch by crop)
      const yieldArrays = await Promise.all(
        crops.map((c) => ctx.db.query("yields").withIndex("by_crop", (q) => q.eq("cropId", c._id)).collect())
      );
      yields = yieldArrays.flat();
    }

    // Year filtering
    if (year) {
      const yearStr = year.toString();
      expenses = expenses.filter((e) => e.date.startsWith(yearStr));
      sales = sales.filter((s) => s.date.startsWith(yearStr));
      crops = crops.filter((c) => c.year === year);
      yields = yields.filter((y) => y.harvestDate.startsWith(yearStr));
    }

    // Previous year data for year-over-year comparison
    let prevExpenses: Doc<"expenses">[] = [];
    let prevSales: Doc<"sales">[] = [];
    let prevCrops: Doc<"crops">[] = [];

    if (year) {
      const prevYearStr = (year - 1).toString();
      // Re-fetch all (unfiltered) and filter to previous year
      const allExpenses: Doc<"expenses">[] = farmId
        ? await ctx.db.query("expenses").withIndex("by_farm", (q) => q.eq("farmId", farmId)).collect()
        : await ctx.db.query("expenses").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
      const allSales: Doc<"sales">[] = farmId
        ? await ctx.db.query("sales").withIndex("by_farm", (q) => q.eq("farmId", farmId)).collect()
        : await ctx.db.query("sales").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
      const allCrops: Doc<"crops">[] = farmId
        ? await ctx.db.query("crops").withIndex("by_farm", (q) => q.eq("farmId", farmId)).collect()
        : await ctx.db.query("crops").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

      prevExpenses = allExpenses.filter((e) => e.date.startsWith(prevYearStr));
      prevSales = allSales.filter((s) => s.date.startsWith(prevYearStr));
      prevCrops = allCrops.filter((c) => c.year === (year - 1));
    }

    return {
      user,
      farm,
      expenses,
      sales,
      crops,
      yields,
      comparison: year ? { prevExpenses, prevSales, prevCrops } : null
    };
  }
});

/**
 * Public action to generate the comprehensive financial report payload.
 */
export const generateFullFinancialReport = action({
  args: { 
    year: v.optional(v.number()), 
    farmId: v.optional(v.id("farms")) 
  },
  handler: async (ctx, { year, farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    
    // Fetch raw data using internal query — cast breaks the circular type inference
    const data = await ctx.runQuery(internal.analytics.getRawReportData, { 
      userId, year, farmId 
    }) as RawReportData;

    const { expenses, sales, crops, yields, user, farm, comparison } = data;


    // --- 1. Report Meta ---
    const period = year ? `CY ${year}` : "All Time";
    const reportMeta = {
      title: farm ? `${farm.name} - Annual Report` : "Consolidated Annual Report",
      generatedAt: Date.now(),
      period,
      farmerName: user?.name || "Farmer",
      farmName: farm?.name || "All Farms"
    };

    // --- Helpers for aggregation ---
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalRevenue = sales.reduce((s, e) => s + e.totalAmount, 0);
    const totalProfit = totalRevenue - totalExpenses;
    const profitMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const roiPercent = totalExpenses > 0 ? (totalProfit / totalExpenses) * 100 : 0;

    // Monthly aggregation
    const revenueByMonth: Record<string, number> = {};
    const expensesByMonth: Record<string, number> = {};
    const profitByMonth: Record<string, number> = {};

    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    months.forEach(m => {
       revenueByMonth[m] = 0;
       expensesByMonth[m] = 0;
       profitByMonth[m] = 0;
    });

    sales.forEach(s => {
       const m = s.date.split("-")[1];
       if (revenueByMonth[m] !== undefined) revenueByMonth[m] += s.totalAmount;
    });
    expenses.forEach(e => {
       const m = e.date.split("-")[1];
       if (expensesByMonth[m] !== undefined) expensesByMonth[m] += e.amount;
    });
    months.forEach(m => {
       profitByMonth[m] = revenueByMonth[m] - expensesByMonth[m];
    });

    // Breakdown by Category/SaleType
    const expenseByCat: Record<string, { total: number, count: number }> = {};
    expenses.forEach(e => {
       if (!expenseByCat[e.category]) expenseByCat[e.category] = { total: 0, count: 0 };
       expenseByCat[e.category].total += e.amount;
       expenseByCat[e.category].count += 1;
    });

    const salesByBuyer: Record<string, { total: number, count: number, status: string }> = {};
    sales.forEach(s => {
       if (!salesByBuyer[s.buyerName]) salesByBuyer[s.buyerName] = { total: 0, count: 0, status: s.paymentStatus };
       salesByBuyer[s.buyerName].total += s.totalAmount;
       salesByBuyer[s.buyerName].count += 1;
    });

    const salesByType: Record<string, number> = {};
    sales.forEach(s => {
       salesByType[s.saleType] = (salesByType[s.saleType] || 0) + s.totalAmount;
    });

    // --- Crop Performance ---
    const cropPerformance = await Promise.all(crops.map(async (c) => {
       const cropExp = expenses.filter(e => e.cropId === c._id).reduce((s, e) => s + e.amount, 0);
       const cropRev = sales.filter(s => s.cropId === c._id).reduce((s, e) => s + e.totalAmount, 0);
       const cropYield = yields.find(y => y.cropId === c._id);
       const profit = cropRev - cropExp;
       
       // Calculate an internal "Grade" based on margin
       const margin = cropRev > 0 ? (profit / cropRev) * 100 : 0;
       let grade = "C";
       if (margin > 30) grade = "A";
       else if (margin > 15) grade = "B";
       else if (margin < 0) grade = "D";

       return {
          cropName: c.name,
          farmName: farm?.name || "Standard", 
          season: c.season,
          year: c.year,
          area: c.area,
          expenses: cropExp,
          revenue: cropRev,
          profit,
          margin,
          yieldKg: cropYield ? convertToKg(cropYield.totalYield, cropYield.yieldUnit) : 0,
          rateAchieved: cropRev > 0 && cropYield ? cropRev / convertToKg(cropYield.totalYield, cropYield.yieldUnit) : 0,
          grade
       };
    }));

    cropPerformance.sort((a, b) => b.profit - a.profit);

    // --- Executive Summary ---
    const executive_summary = {
       totalExpenses,
       totalRevenue,
       totalProfit,
       profitMarginPercent,
       roiPercent,
       totalCrops: crops.length,
       profitableCrops: cropPerformance.filter(p => p.profit > 0).length,
       lossCrops: cropPerformance.filter(p => p.profit < 0).length,
       totalAreaFarmed: crops.reduce((s, c) => s + c.area, 0),
       bestCrop: cropPerformance[0]?.cropName || "N/A",
       worstCrop: cropPerformance[cropPerformance.length - 1]?.cropName || "N/A"
    };

    // --- Pending Collections ---
    const pendingCollections = sales
       .filter(s => s.paymentStatus !== "paid")
       .map(s => {
          const crop = crops.find(c => c._id === s.cropId);
          return {
             buyerName: s.buyerName,
             amount: s.totalAmount, // Note: Simplified as total. Real partial tracking would need payment logs.
             crop: crop?.name || "Unknown",
             date: s.date
          }
       });

    // --- Year over Year ---
    let yoyData = null;
    if (comparison && year) {
       const prevExpTotal = comparison.prevExpenses.reduce((s, e) => s + e.amount, 0);
       const prevRevTotal = comparison.prevSales.reduce((s, e) => s + e.totalAmount, 0);
       const prevProfit = prevRevTotal - prevExpTotal;

       const calcChange = (curr: number, prev: number) => prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;

       yoyData = {
          currentYear: { totalExpenses, totalRevenue, totalProfit },
          previousYear: { totalExpenses: prevExpTotal, totalRevenue: prevRevTotal, totalProfit: prevProfit },
          changes: {
             revenueChange: calcChange(totalRevenue, prevRevTotal),
             expenseChange: calcChange(totalExpenses, prevExpTotal),
             profitChange: calcChange(totalProfit, prevProfit)
          }
       };
    }

    return {
       reportMeta,
       executive_summary,
       income_statement: {
          revenue: { 
             total: totalRevenue, 
             byMonth: revenueByMonth, 
             byCrop: cropPerformance.reduce((acc: any, p) => { acc[p.cropName] = p.revenue; return acc; }, {}),
             bySaleType: salesByType
          },
          expenses: { 
             total: totalExpenses, 
             byMonth: expensesByMonth, 
             byCrop: cropPerformance.reduce((acc: any, p) => { acc[p.cropName] = p.expenses; return acc; }, {}),
             byCategory: expenseByCat
          },
          grossProfit: {
             total: totalProfit,
             byMonth: profitByMonth,
             byCrop: cropPerformance.reduce((acc: any, p) => { acc[p.cropName] = p.profit; return acc; }, {}),
          },
          netProfit: totalProfit
       },
       crop_performance: cropPerformance,
       expense_breakdown: Object.entries(expenseByCat).map(([cat, stats]) => ({
          category: cat,
          total: stats.total,
          count: stats.count,
          percentage: (stats.total / totalExpenses) * 100
       })).sort((a, b) => b.total - a.total),
       sales_breakdown: {
          byBuyer: Object.entries(salesByBuyer).map(([name, stats]) => ({
             buyerName: name, ...stats
          })).sort((a, b) => b.total - a.total),
          bySaleType: Object.entries(salesByType).map(([type, total]) => ({
             type, total, percentage: (total / totalRevenue) * 100
          })),
          pendingCollections
       },
       year_over_year: yoyData,
       farm_breakdown: await (async () => {
          if (farm) {
             // Single farm: return just that one row
             return [{ farmName: farm.name, expenses: totalExpenses, revenue: totalRevenue, profit: totalProfit, margin: profitMarginPercent }];
          }
          // All Farms: group expenses and sales by farmId, then resolve names
          const farmMap: Record<string, { expenses: number; revenue: number }> = {};
          expenses.forEach(e => {
             const fid = e.farmId as string;
             if (!farmMap[fid]) farmMap[fid] = { expenses: 0, revenue: 0 };
             farmMap[fid].expenses += e.amount;
          });
          sales.forEach(s => {
             const fid = s.farmId as string;
             if (!farmMap[fid]) farmMap[fid] = { expenses: 0, revenue: 0 };
             farmMap[fid].revenue += s.totalAmount;
          });
          return Object.entries(farmMap).map(([fid, f]) => {
             const profit = f.revenue - f.expenses;
             const margin = f.revenue > 0 ? (profit / f.revenue) * 100 : 0;
             // farmId is used as fallback name; a real lookup costs extra DB reads and is skipped for performance
             return { farmName: fid, expenses: f.expenses, revenue: f.revenue, profit, margin };
          }).sort((a, b) => b.profit - a.profit);
       })()
    };
  }
});


// ─── 17. checkProfitAlerts (internalMutation — weekly cron) ───────────────────

export const checkProfitAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const weekAgo = now - ONE_WEEK_MS;
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      const userId = user.externalId;

      const createAlert = async (title: string, message: string) => {
        const recent = await ctx.db
          .query("notifications")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("title"), title))
          .first();
        if (recent && recent.createdAt > weekAgo) return;
        await ctx.db.insert("notifications", {
          userId,
          type: "ai_insight" as const,
          title,
          message,
          isRead: false,
          createdAt: now,
        });
      };

      // a+c. Loss Alert & Low Margin per crop
      const allCrops = await ctx.db.query("crops").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
      const allSales = await ctx.db.query("sales").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

      for (const crop of allCrops) {
        const cropExp = (await ctx.db.query("expenses").withIndex("by_crop", (q) => q.eq("cropId", crop._id)).collect())
          .reduce((s, e) => s + e.amount, 0);
        const cropSales = allSales.filter((s) => s.cropId === crop._id);
        const cropRev = cropSales.reduce((s, e) => s + e.totalAmount, 0);
        const profit = cropRev - cropExp;
        const margin = cropRev > 0 ? (profit / cropRev) * 100 : 0;

        if (cropExp > 0 && cropRev < cropExp * 0.8)
          await createAlert(`⚠️ Loss Alert: ${crop.name}`, `${crop.name} is currently at a ₹${Math.abs(profit).toLocaleString("en-IN")} loss. Review expenses or adjust selling price.`);

        const recentRev = cropSales.filter((s) => s.createdAt >= weekAgo).reduce((s, e) => s + e.totalAmount, 0);
        if (cropExp > 0 && cropRev >= cropExp && cropRev - recentRev < cropExp)
          await createAlert(`✅ Break-even Crossed: ${crop.name}`, `${crop.name} has crossed break-even! Every sale from now is pure profit.`);

        if (cropRev > 0 && margin > 0 && margin < 15)
          await createAlert(`📉 Low Margin: ${crop.name}`, `${crop.name} profit margin is only ${margin.toFixed(1)}%. Consider reducing costs or finding better buyers.`);
      }

      // d. Pending Payment Risk 45+ days
      for (const sale of allSales) {
        if (sale.paymentStatus === "paid") continue;
        const ageDays = Math.floor((now - new Date(sale.date).getTime()) / (24 * 60 * 60 * 1000));
        if (ageDays >= 45)
          await createAlert(`⚠️ Pending Payment Risk`, `₹${sale.totalAmount.toLocaleString("en-IN")} from ${sale.buyerName} has been pending for ${ageDays} days. Follow up immediately.`);
      }

      // e. Year-End Summary (Dec 31)
      const d = new Date();
      if (d.getMonth() === 11 && d.getDate() === 31) {
        const yr = d.getFullYear();
        const yrStr = yr.toString();
        const yrSales = allSales.filter((s) => s.date.startsWith(yrStr));
        const yrRev = yrSales.reduce((s, e) => s + e.totalAmount, 0);
        const yrExp = (await ctx.db.query("expenses").withIndex("by_user", (q) => q.eq("userId", userId)).collect())
          .filter((e) => e.date.startsWith(yrStr)).reduce((s, e) => s + e.amount, 0);
        const yrCrops = allCrops.filter((c) => c.year === yr);
        let bestCrop = "N/A"; let best = -Infinity;
        for (const c of yrCrops) {
          const p = yrSales.filter((s) => s.cropId === c._id).reduce((s, e) => s + e.totalAmount, 0) -
            (await ctx.db.query("expenses").withIndex("by_crop", (q) => q.eq("cropId", c._id)).collect())
              .filter((e) => e.date.startsWith(yrStr)).reduce((s, e) => s + e.amount, 0);
          if (p > best) { best = p; bestCrop = c.name; }
        }
        await createAlert(`🎉 Your ${yr} Farm Summary`, `Your ${yr} farming summary: ₹${(yrRev - yrExp).toLocaleString("en-IN")} total profit from ${yrCrops.length} crops. Your best crop was ${bestCrop}.`);
      }
    }
  },
});

// ─── 18. getAllUsersForDigest (internal query) ────────────────────────────────

export const getAllUsersForDigest = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return await Promise.all(users.map(async (user) => {
      const uid = user.externalId;
      const expenses = await ctx.db.query("expenses").withIndex("by_user", (q) => q.eq("userId", uid)).collect();
      const sales = await ctx.db.query("sales").withIndex("by_user", (q) => q.eq("userId", uid)).collect();
      const crops = await ctx.db.query("crops").withIndex("by_user", (q) => q.eq("userId", uid)).collect();
      const alerts = await ctx.db
        .query("notifications")
        .withIndex("by_user_unread", (q) => q.eq("userId", uid).eq("isRead", false))
        .order("desc").take(5);
      return { name: user.name, email: user.email, expenses, sales, crops, alerts };
    }));
  },
});

// ─── 19. sendWeeklyDigestEmail (internalAction) ───────────────────────────────

export const sendWeeklyDigestEmail = internalAction({
  args: {},
  handler: async (ctx) => {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const users = await ctx.runQuery(internal.analytics.getAllUsersForDigest, {}) as any[];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://khetsmart.app";
    const dateLabel = new Date().toLocaleDateString("en-IN", { day: "numeric" as const, month: "long" as const, year: "numeric" as const });
    const weekAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    for (const user of users) {
      if (!user.email) continue;
      const weekRev = (user.sales as any[]).filter((s: any) => s.date >= weekAgoStr).reduce((t: number, s: any) => t + s.totalAmount, 0);
      const weekExp = (user.expenses as any[]).filter((e: any) => e.date >= weekAgoStr).reduce((t: number, e: any) => t + e.amount, 0);
      const weekProfit = weekRev - weekExp;
      const pendingTotal = (user.sales as any[]).filter((s: any) => s.paymentStatus !== "paid").reduce((t: number, s: any) => t + s.totalAmount, 0);
      const alertRows = (user.alerts as any[]).slice(0, 3).map((a: any) => `<p style="font-size:13px;color:#374151;margin:0 0 8px;padding-left:12px;border-left:3px solid #f59e0b;">• ${a.message}</p>`).join("");
      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f0e3;font-family:sans-serif;"><div style="max-width:600px;margin:0 auto;padding:20px;"><div style="background:#1C4E35;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;"><h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">🌾 KhetSmart</h1><p style="color:#a7d9b5;font-size:11px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">Weekly Farm Summary</p></div><div style="background:#fff;padding:28px;border:1px solid #e5dfd4;border-top:none;"><p style="font-size:15px;color:#374151;margin:0 0 20px;">Hello <strong>${user.name}</strong> 👋</p><table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:20px;"><tr><td style="background:#f0fdf4;border-radius:8px;text-align:center;border:1px solid #d1fae5;"><p style="color:#6B7280;font-size:10px;margin:0;text-transform:uppercase;">Revenue</p><p style="color:#065f46;font-size:16px;font-weight:800;margin:4px 0 0;">₹${weekRev.toLocaleString("en-IN")}</p></td><td width="8"></td><td style="background:#fef2f2;border-radius:8px;text-align:center;border:1px solid #fecaca;"><p style="color:#6B7280;font-size:10px;margin:0;text-transform:uppercase;">Expenses</p><p style="color:#991b1b;font-size:16px;font-weight:800;margin:4px 0 0;">₹${weekExp.toLocaleString("en-IN")}</p></td><td width="8"></td><td style="background:#f0fdf4;border-radius:8px;text-align:center;border:1px solid #d1fae5;"><p style="color:#6B7280;font-size:10px;margin:0;text-transform:uppercase;">Net Profit</p><p style="color:${weekProfit>=0?"#065f46":"#991b1b"};font-size:16px;font-weight:800;margin:4px 0 0;">₹${weekProfit.toLocaleString("en-IN")}</p></td></tr></table>${user.alerts.length > 0 ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:16px;"><p style="font-size:12px;font-weight:700;color:#92400e;margin:0 0 8px;">⚠️ ${user.alerts.length} Alert(s)</p>${alertRows}</div>` : ""}${pendingTotal > 0 ? `<div style="background:#fef9f0;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin-bottom:16px;"><p style="font-size:12px;font-weight:700;color:#78350f;margin:0 0 4px;">💰 Pending: ₹${pendingTotal.toLocaleString("en-IN")}</p></div>` : ""}<div style="text-align:center;margin-top:20px;"><a href="https://khetsmart.app/dashboard/analytics" style="background:#1C4E35;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;display:inline-block;">View Dashboard →</a></div></div><div style="background:#f7f0e3;border-radius:0 0 12px 12px;padding:12px;text-align:center;border:1px solid #e5dfd4;border-top:none;"><p style="color:#9CA3AF;font-size:11px;margin:0;">KhetSmart Farm OS</p></div></div></body></html>\`;

      await resend.emails.send({
        from: "KhetSmart <digest@khetsmart.app>",
        to: user.email,
        subject: `Your KhetSmart Weekly Farm Summary — ${dateLabel}`,
        html,
      });
    }
  },
});

// ─── 9. getMainDashboardData (Aggregated for Performance) ───────────────────

function calculateDaysToHarvest(expectedDate: string | undefined, status: string): number | null {
  if (status !== "active" || !expectedDate) return null;
  const expected = new Date(expectedDate);
  const now = new Date();
  expected.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = expected.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}

async function getSimpleCropStats(ctx: QueryCtx, cropId: Id<"crops">) {
  const [expenses, sales] = await Promise.all([
    ctx.db.query("expenses").withIndex("by_crop", (q) => q.eq("cropId", cropId)).collect(),
    ctx.db.query("sales").withIndex("by_crop", (q) => q.eq("cropId", cropId)).collect(),
  ]);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  return { totalExpenses, totalSales, profit: totalSales - totalExpenses };
}

export const getMainDashboardData = query({
  args: { year: v.number() },
  handler: async (ctx, { year }) => {
    const userId = await getAuthenticatedUserId(ctx);

    // 1. Fetch Core Collections
    const [farms, allCrops, allExpensesThisYear, allExpensesLastYear, allSalesThisYear, allSalesLastYear, allYields] = await Promise.all([
      ctx.db.query("farms").withIndex("by_user_archived", (q) => q.eq("userId", userId).eq("isArchived", false)).collect(),
      ctx.db.query("crops").withIndex("by_user", (q) => q.eq("userId", userId)).filter((q) => q.neq(q.field("status"), "archived")).collect(),
      ctx.db.query("expenses").withIndex("by_user", (q) => q.eq("userId", userId)).collect().then(exps => exps.filter(e => e.date.startsWith(String(year)))),
      ctx.db.query("expenses").withIndex("by_user", (q) => q.eq("userId", userId)).collect().then(exps => exps.filter(e => e.date.startsWith(String(year - 1)))),
      ctx.db.query("sales").withIndex("by_user", (q) => q.eq("userId", userId)).collect().then(sales => sales.filter(s => s.date.startsWith(String(year)))),
      ctx.db.query("sales").withIndex("by_user", (q) => q.eq("userId", userId)).collect().then(sales => sales.filter(s => s.date.startsWith(String(year - 1)))),
      ctx.db.query("yields").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

    // 2. Process Farms with Stats
    const processedFarms = farms.map((farm) => {
      const farmCrops = allCrops.filter(c => c.farmId === farm._id);
      return {
        ...farm,
        totalCrops: farmCrops.length,
        activeCrops: farmCrops.filter(c => c.status === "active").length,
      };
    });

    // 3. Process Crops with Stats (Using simple mapping to avoid heavy DB hits inside loop)
    const cropStatsMap: Record<string, { totalExpenses: number; totalSales: number; profit: number }> = {};
    for (const crop of allCrops) {
       const cropExps = allExpensesThisYear.filter(e => e.cropId === crop._id);
       const cropSales = allSalesThisYear.filter(s => s.cropId === crop._id);
       const totalExpenses = cropExps.reduce((acc, e) => acc + e.amount, 0);
       const totalSales = cropSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
       cropStatsMap[crop._id] = { totalExpenses, totalSales, profit: totalSales - totalExpenses };
    }

    const processedCrops = allCrops.map((crop) => {
      const stats = cropStatsMap[crop._id] || { totalExpenses: 0, totalSales: 0, profit: 0 };
      const farm = farms.find(f => f._id === crop.farmId);
      return {
        ...crop,
        ...stats,
        farmName: farm?.name || "Unknown Farm",
        daysToHarvest: calculateDaysToHarvest(crop.expectedHarvestDate, crop.status),
      };
    });
    processedCrops.sort((a, b) => b._creationTime - a._creationTime);

    // 4. Financial Summaries
    const currentYearExpensesTotal = allExpensesThisYear.reduce((s, e) => s + e.amount, 0);
    const lastYearExpensesTotal = allExpensesLastYear.reduce((s, e) => s + e.amount, 0);
    const currentYearRevenue = allSalesThisYear.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const lastYearRevenue = allSalesLastYear.reduce((acc, sale) => acc + sale.totalAmount, 0);

    const yearProfit = currentYearRevenue - currentYearExpensesTotal;
    const yearMargin = currentYearRevenue > 0 ? (yearProfit / currentYearRevenue) * 100 : 0;
    const lastYearProfit = lastYearRevenue - lastYearExpensesTotal;
    const profitTrendValue = lastYearProfit !== 0 ? ((yearProfit - lastYearProfit) / Math.abs(lastYearProfit)) * 100 : 0;

    const currentMonth = new Date().getMonth() + 1;
    const monthPrefix = `${year}-${String(currentMonth).padStart(2, "0")}`;
    const monthTotalExpenses = allExpensesThisYear.filter(e => e.date.startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0);

    // 5. Crop Ranking (Top 3)
    const cropRanking = processedCrops
      .filter(c => c.year === year)
      .map(c => ({
        cropId: c._id,
        cropName: c.name,
        farmName: c.farmName,
        totalProfit: c.profit,
        margin: c.totalSales > 0 ? (c.profit / c.totalSales) * 100 : 0,
        expenses: c.totalExpenses,
        revenue: c.totalSales,
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 3);

    // 6. Yield Integrity check
    const yieldedCropIds = new Set(allYields.map(y => y.cropId));
    const cropsMissingYield = processedCrops
      .filter(c => c.status === "harvested" && !yieldedCropIds.has(c._id))
      .map(c => ({ _id: c._id, name: c.name, farmName: c.farmName }));

    // 7. Profit Trend Analysis (Sparkline data for last 12 months)
    const monthMap: Record<string, { expenses: number; revenue: number }> = {};
    for (const e of allExpensesThisYear) {
      const m = e.date.substring(0, 7);
      if (!monthMap[m]) monthMap[m] = { expenses: 0, revenue: 0 };
      monthMap[m].expenses += e.amount;
    }
    for (const s of allSalesThisYear) {
      const m = s.date.substring(0, 7);
      if (!monthMap[m]) monthMap[m] = { expenses: 0, revenue: 0 };
      monthMap[m].revenue += s.totalAmount;
    }
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trend = Object.entries(monthMap)
      .map(([month, data]) => {
         const mIdx = parseInt(month.split("-")[1], 10) - 1;
         return {
           month,
           label: monthNames[mIdx] || month,
           profit: data.revenue - data.expenses,
           revenue: data.revenue,
           expenses: data.expenses
         };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      farms: processedFarms,
      crops: processedCrops,
      stats: {
        totalActiveCrops: processedCrops.filter(c => c.status === "active").length,
        totalRevenue: currentYearRevenue,
        totalExpenses: currentYearExpensesTotal,
        monthTotalExpenses,
        yearProfit,
        yearMargin,
        profitTrend: profitTrendValue,
      },
      recentSales: allSalesThisYear
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3)
        .map(s => {
          const crop = allCrops.find(c => c._id === s.cropId);
          return { ...s, cropName: crop?.name || "Unknown Crop" };
        }),
      recentExpenses: allExpensesThisYear
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5)
        .map(e => {
          const crop = allCrops.find(c => c._id === e.cropId);
          const farm = farms.find(f => f._id === e.farmId);
          return { ...e, cropName: crop?.name || "Unknown Crop", farmName: farm?.name || "Unknown Farm" };
        }),
      cropsMissingYield,
      cropRanking,
      profitTrend: { trend },
      yields: allYields.slice(0, 3).map(y => {
        const crop = allCrops.find(c => c._id === y.cropId);
        return { ...y, cropName: crop?.name || "Unknown Crop" };
      }),
    };
  },
});
