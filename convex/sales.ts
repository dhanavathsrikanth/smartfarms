import { v, ConvexError } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated. Please sign in.");
  return identity.subject;
}

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

async function verifySaleOwnership(
  ctx: QueryCtx | MutationCtx,
  saleId: Id<"sales">,
  userId: string
) {
  const sale = await ctx.db.get(saleId);
  if (!sale) throw new ConvexError("Sale not found");
  if (sale.userId !== userId) throw new ConvexError("Unauthorized");
  return sale;
}

async function verifyBuyerOwnership(
  ctx: QueryCtx | MutationCtx,
  buyerId: Id<"buyers">,
  userId: string
) {
  const buyer = await ctx.db.get(buyerId);
  if (!buyer) throw new ConvexError("Buyer not found");
  if (buyer.userId !== userId) throw new ConvexError("Unauthorized");
  return buyer;
}

function getWeightInKg(weight: number, unit: string): number {
  if (unit === "quintal") return weight * 100;
  if (unit === "ton") return weight * 1000;
  return weight;
}

const SALE_TYPE = v.union(
  v.literal("mandi"),
  v.literal("direct"),
  v.literal("contract"),
  v.literal("other")
);

const PAYMENT_STATUS = v.union(
  v.literal("paid"),
  v.literal("pending"),
  v.literal("partial")
);

const WEIGHT_UNIT = v.union(
  v.literal("kg"),
  v.literal("quintal"),
  v.literal("ton")
);

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

// 1. createSale
export const createSale = mutation({
  args: {
    cropId: v.id("crops"),
    weight: v.number(),
    weightUnit: WEIGHT_UNIT,
    ratePerUnit: v.number(),
    buyerName: v.string(),
    buyerContact: v.optional(v.string()),
    saleType: SALE_TYPE,
    paymentStatus: PAYMENT_STATUS,
    date: v.string(),
    notes: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const crop = await verifyCropOwnership(ctx, args.cropId, userId);

    const weightInKg = getWeightInKg(args.weight, args.weightUnit);
    const totalAmount = weightInKg * args.ratePerUnit;

    return await ctx.db.insert("sales", {
      ...args,
      farmId: crop.farmId,
      userId,
      totalAmount,
      createdAt: Date.now(),
    });
  },
});

// 2. updateSale
export const updateSale = mutation({
  args: {
    saleId: v.id("sales"),
    weight: v.optional(v.number()),
    weightUnit: v.optional(WEIGHT_UNIT),
    ratePerUnit: v.optional(v.number()),
    buyerName: v.optional(v.string()),
    buyerContact: v.optional(v.string()),
    saleType: v.optional(SALE_TYPE),
    paymentStatus: v.optional(PAYMENT_STATUS),
    date: v.optional(v.string()),
    notes: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { saleId, ...fields }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const sale = await verifySaleOwnership(ctx, saleId, userId);

    const patch: Record<string, any> = { ...fields };

    if (
      fields.weight !== undefined ||
      fields.ratePerUnit !== undefined ||
      fields.weightUnit !== undefined
    ) {
      const newWeight = fields.weight ?? sale.weight;
      const newUnit = fields.weightUnit ?? sale.weightUnit;
      const newRate = fields.ratePerUnit ?? sale.ratePerUnit;
      const weightInKg = getWeightInKg(newWeight, newUnit);
      patch.totalAmount = weightInKg * newRate;
    }

    await ctx.db.patch(saleId, patch);
    return await ctx.db.get(saleId);
  },
});

// 3. updatePaymentStatus
export const updatePaymentStatus = mutation({
  args: {
    saleId: v.id("sales"),
    paymentStatus: PAYMENT_STATUS,
    partialAmountReceived: v.optional(v.number()),
  },
  handler: async (ctx, { saleId, paymentStatus, partialAmountReceived }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const sale = await verifySaleOwnership(ctx, saleId, userId);

    const patch: any = { paymentStatus };
    if (paymentStatus === "partial" && partialAmountReceived !== undefined) {
      const noteAppend = `Partial payment received: ₹${partialAmountReceived}`;
      patch.notes = sale.notes ? `${sale.notes}\n${noteAppend}` : noteAppend;
    }

    await ctx.db.patch(saleId, patch);
    return { success: true };
  },
});

// 4. deleteSale
export const deleteSale = mutation({
  args: { saleId: v.id("sales") },
  handler: async (ctx, { saleId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const sale = await verifySaleOwnership(ctx, saleId, userId);

    if (sale.photoUrl) {
      try {
        const match = sale.photoUrl.match(/\/api\/storage\/([^?]+)/);
        if (match) {
          const storageId = match[1] as Id<"_storage">;
          await ctx.storage.delete(storageId);
        }
      } catch {
        // Ignore errors to ensure sale is still deleted even if photo cleanup fails
      }
    }

    await ctx.db.delete(saleId);
    return { success: true };
  },
});

// 5. generateSalePhotoUploadUrl
export const generateSalePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// 6. attachSalePhoto
export const attachSalePhoto = mutation({
  args: {
    saleId: v.id("sales"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { saleId, storageId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifySaleOwnership(ctx, saleId, userId);

    const photoUrl = await ctx.storage.getUrl(storageId);
    if (!photoUrl)
      throw new ConvexError("Failed to retrieve URL for uploaded photo.");

    await ctx.db.patch(saleId, { photoUrl });
    return { photoUrl };
  },
});

// ─── QUERIES ─────────────────────────────────────────────────────────────────

// 7. listSalesByCrop
export const listSalesByCrop = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();

    return sales
      .map((sale) => ({
        ...sale,
        amountInKg: getWeightInKg(sale.weight, sale.weightUnit),
        isPending: sale.paymentStatus !== "paid",
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  },
});

// 8. listSalesByFarm
export const listSalesByFarm = query({
  args: {
    farmId: v.id("farms"),
    year: v.optional(v.number()),
  },
  handler: async (ctx, { farmId, year }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyFarmOwnership(ctx, farmId, userId);

    let sales = await ctx.db
      .query("sales")
      .withIndex("by_farm", (q) => q.eq("farmId", farmId))
      .collect();

    if (year !== undefined) {
      sales = sales.filter((s) => s.date.startsWith(String(year)));
    }

    const result = await Promise.all(
      sales.map(async (sale) => {
        const crop = await ctx.db.get(sale.cropId);
        return {
          ...sale,
          cropName: crop?.name ?? "Unknown Crop",
        };
      })
    );

    return result.sort((a, b) => b.date.localeCompare(a.date));
  },
});

// 9. listAllSales
export const listAllSales = query({
  args: {
    year: v.optional(v.number()),
    saleType: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { year, saleType, paymentStatus, startDate, endDate }) => {
    const userId = await getAuthenticatedUserId(ctx);

    let sales = await ctx.db
      .query("sales")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (year !== undefined) {
      sales = sales.filter((s) => s.date.startsWith(String(year)));
    }
    if (saleType) {
      sales = sales.filter((s) => s.saleType === saleType);
    }
    if (paymentStatus) {
      sales = sales.filter((s) => s.paymentStatus === paymentStatus);
    }
    if (startDate) {
      sales = sales.filter((s) => s.date >= startDate);
    }
    if (endDate) {
      sales = sales.filter((s) => s.date <= endDate);
    }

    const result = await Promise.all(
      sales.map(async (sale) => {
        const [crop, farm] = await Promise.all([
          ctx.db.get(sale.cropId),
          ctx.db.get(sale.farmId),
        ]);
        return {
          ...sale,
          cropName: crop?.name ?? "Unknown Crop",
          farmName: farm?.name ?? "Unknown Farm",
        };
      })
    );

    return result.sort((a, b) => b.date.localeCompare(a.date));
  },
});

// 10. getSaleSummaryByCrop
export const getSaleSummaryByCrop = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();

    let totalRevenue = 0;
    let totalWeightSold = 0;
    let pendingAmount = 0;
    let paidAmount = 0;
    const bySaleType: Record<string, number> = {};
    const buyerSet = new Set<string>();

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      totalWeightSold += getWeightInKg(sale.weight, sale.weightUnit);
      if (sale.paymentStatus === "paid") {
        paidAmount += sale.totalAmount;
      } else {
        pendingAmount += sale.totalAmount;
      }
      bySaleType[sale.saleType] =
        (bySaleType[sale.saleType] ?? 0) + sale.totalAmount;
      buyerSet.add(sale.buyerName.toLowerCase().trim());
    }

    return {
      totalRevenue,
      totalWeightSold,
      averageRatePerKg:
        totalWeightSold > 0 ? totalRevenue / totalWeightSold : 0,
      saleCount: sales.length,
      pendingAmount,
      paidAmount,
      bySaleType,
      buyerCount: buyerSet.size,
    };
  },
});

// 11. getSaleSummaryByFarm
export const getSaleSummaryByFarm = query({
  args: {
    farmId: v.id("farms"),
    year: v.optional(v.number()),
  },
  handler: async (ctx, { farmId, year }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyFarmOwnership(ctx, farmId, userId);

    let sales = await ctx.db
      .query("sales")
      .withIndex("by_farm", (q) => q.eq("farmId", farmId))
      .collect();

    if (year !== undefined) {
      sales = sales.filter((s) => s.date.startsWith(String(year)));
    }

    let totalRevenue = 0;
    let totalWeightSold = 0;
    let pendingAmount = 0;
    let paidAmount = 0;
    const bySaleType: Record<string, number> = {};
    const buyerSet = new Set<string>();

    const cropStats: Record<string, { cropId: Id<"crops">; totalRevenue: number; totalWeightKg: number }> = {};
    const monthlyMap: Record<string, { month: number; year: number; totalAmount: number }> = {};

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      const weightKg = getWeightInKg(sale.weight, sale.weightUnit);
      totalWeightSold += weightKg;

      if (sale.paymentStatus === "paid") paidAmount += sale.totalAmount;
      else pendingAmount += sale.totalAmount;

      bySaleType[sale.saleType] =
        (bySaleType[sale.saleType] ?? 0) + sale.totalAmount;
      buyerSet.add(sale.buyerName.toLowerCase().trim());

      const cId = sale.cropId as string;
      if (!cropStats[cId]) {
        cropStats[cId] = {
          cropId: sale.cropId,
          totalRevenue: 0,
          totalWeightKg: 0,
        };
      }
      cropStats[cId].totalRevenue += sale.totalAmount;
      cropStats[cId].totalWeightKg += weightKg;

      const [yStr, mStr] = sale.date.split("-");
      const key = `${yStr}-${mStr}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          month: parseInt(mStr, 10),
          year: parseInt(yStr, 10),
          totalAmount: 0,
        };
      }
      monthlyMap[key].totalAmount += sale.totalAmount;
    }

    const cropBreakdown = await Promise.all(
      Object.values(cropStats).map(async (stat) => {
        const crop = await ctx.db.get(stat.cropId);
        return {
          cropName: crop?.name ?? "Unknown Crop",
          cropId: stat.cropId,
          totalRevenue: stat.totalRevenue,
          totalWeightKg: stat.totalWeightKg,
          averageRate:
            stat.totalWeightKg > 0
              ? stat.totalRevenue / stat.totalWeightKg
              : 0,
        };
      })
    );

    const monthlyRevenue = Object.values(monthlyMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    return {
      totalRevenue,
      totalWeightSold,
      averageRatePerKg:
        totalWeightSold > 0 ? totalRevenue / totalWeightSold : 0,
      saleCount: sales.length,
      pendingAmount,
      paidAmount,
      bySaleType,
      buyerCount: buyerSet.size,
      cropBreakdown: cropBreakdown.sort((a, b) => b.totalRevenue - a.totalRevenue),
      monthlyRevenue,
    };
  },
});

// 12. getSaleSummaryAllFarms
export const getSaleSummaryAllFarms = query({
  args: { year: v.optional(v.number()) },
  handler: async (ctx, { year }) => {
    const userId = await getAuthenticatedUserId(ctx);

    let sales = await ctx.db
      .query("sales")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (year !== undefined) {
      sales = sales.filter((s) => s.date.startsWith(String(year)));
    }

    let totalRevenue = 0;
    let totalPendingAmount = 0;
    const bySaleType: Record<string, number> = {};
    const farmStats: Record<string, { farmId: Id<"farms">; totalRevenue: number }> = {};
    const monthlyMap: Record<string, { month: number; year: number; totalAmount: number }> = {};
    const cropStats: Record<string, { cropId: Id<"crops">; totalRevenue: number }> = {};
    const buyerStats: Record<string, { buyerName: string; totalAmount: number; transactionCount: number }> = {};

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      if (sale.paymentStatus !== "paid") totalPendingAmount += sale.totalAmount;

      bySaleType[sale.saleType] =
        (bySaleType[sale.saleType] ?? 0) + sale.totalAmount;

      const fId = sale.farmId as string;
      if (!farmStats[fId]) {
        farmStats[fId] = { farmId: sale.farmId, totalRevenue: 0 };
      }
      farmStats[fId].totalRevenue += sale.totalAmount;

      const [yStr, mStr] = sale.date.split("-");
      const key = `${yStr}-${mStr}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          month: parseInt(mStr, 10),
          year: parseInt(yStr, 10),
          totalAmount: 0,
        };
      }
      monthlyMap[key].totalAmount += sale.totalAmount;

      const cId = sale.cropId as string;
      if (!cropStats[cId]) {
        cropStats[cId] = { cropId: sale.cropId, totalRevenue: 0 };
      }
      cropStats[cId].totalRevenue += sale.totalAmount;

      const bName = sale.buyerName.trim();
      const bKey = bName.toLowerCase();
      if (!buyerStats[bKey]) {
        buyerStats[bKey] = {
          buyerName: bName,
          totalAmount: 0,
          transactionCount: 0,
        };
      }
      buyerStats[bKey].totalAmount += sale.totalAmount;
      buyerStats[bKey].transactionCount += 1;
    }

    const byFarm = await Promise.all(
      Object.values(farmStats).map(async (stat) => {
        const farm = await ctx.db.get(stat.farmId);
        return {
          farmName: farm?.name ?? "Unknown Farm",
          farmId: stat.farmId,
          totalRevenue: stat.totalRevenue,
        };
      })
    );

    const byMonth = Object.values(monthlyMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    let bestSellingCrop = null;
    let maxCropRev = 0;
    let maxCropId = null;
    for (const stat of Object.values(cropStats)) {
      if (stat.totalRevenue > maxCropRev) {
        maxCropRev = stat.totalRevenue;
        maxCropId = stat.cropId;
      }
    }
    if (maxCropId) {
      const crop = await ctx.db.get(maxCropId as Id<"crops">);
      let farmName = "Unknown Farm";
      if (crop) {
        const farm = await ctx.db.get(crop.farmId);
        farmName = farm?.name ?? "Unknown Farm";
      }
      bestSellingCrop = {
        cropName: crop?.name ?? "Unknown Crop",
        totalRevenue: maxCropRev,
        farmName,
      };
    }

    let bestBuyer = null;
    let maxBuyerRev = 0;
    for (const stat of Object.values(buyerStats)) {
      if (stat.totalAmount > maxBuyerRev) {
        maxBuyerRev = stat.totalAmount;
        bestBuyer = stat;
      }
    }

    return {
      totalRevenue,
      totalPendingAmount,
      bySaleType,
      byFarm: byFarm.sort((a, b) => b.totalRevenue - a.totalRevenue),
      monthlyRevenue: byMonth,
      bestSellingCrop,
      bestBuyer,
      saleCount: sales.length,
    };
  },
});

// 13. getBuyerHistory
export const getBuyerHistory = query({
  args: { buyerName: v.string() },
  handler: async (ctx, { buyerName }) => {
    const userId = await getAuthenticatedUserId(ctx);

    let sales = await ctx.db
      .query("sales")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const lowerQuery = buyerName.toLowerCase().trim();
    sales = sales.filter((s) => s.buyerName.toLowerCase().trim() === lowerQuery);

    sales.sort((a, b) => b.date.localeCompare(a.date));

    let totalAmountPaid = 0;
    let totalAmountPending = 0;
    let totalWeightKg = 0;
    let totalRevenue = 0;

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      if (sale.paymentStatus === "paid") {
        totalAmountPaid += sale.totalAmount;
      } else {
        totalAmountPending += sale.totalAmount;
      }
      totalWeightKg += getWeightInKg(sale.weight, sale.weightUnit);
    }

    const firstTransaction = sales.length > 0 ? sales[sales.length - 1].date : null;
    const lastTransaction = sales.length > 0 ? sales[0].date : null;

    return {
      sales,
      totalTransactions: sales.length,
      totalAmountPaid,
      totalAmountPending,
      averageRateHistory: totalWeightKg > 0 ? totalRevenue / totalWeightKg : 0,
      firstTransaction,
      lastTransaction,
    };
  },
});

// 14. listUniqueBuyers
export const listUniqueBuyers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const buyerStats: Record<string, any> = {};

    for (const sale of sales) {
      const bName = sale.buyerName.trim();
      const bKey = bName.toLowerCase();

      if (!buyerStats[bKey]) {
        buyerStats[bKey] = {
          buyerName: bName,
          buyerContact: sale.buyerContact,
          totalTransactions: 0,
          totalAmountPaid: 0,
          totalAmountPending: 0,
          lastTransactionDate: sale.date,
          paidCount: 0,
        };
      }

      const stat = buyerStats[bKey];
      stat.totalTransactions += 1;

      if (sale.date > stat.lastTransactionDate) {
        stat.lastTransactionDate = sale.date;
        if (sale.buyerContact) stat.buyerContact = sale.buyerContact;
      }

      if (sale.paymentStatus === "paid") {
        stat.totalAmountPaid += sale.totalAmount;
        stat.paidCount += 1;
      } else {
        stat.totalAmountPending += sale.totalAmount;
      }
    }

    return Object.values(buyerStats)
      .map((stat) => ({
        buyerName: stat.buyerName,
        buyerContact: stat.buyerContact,
        totalTransactions: stat.totalTransactions,
        totalAmountPaid: stat.totalAmountPaid,
        totalAmountPending: stat.totalAmountPending,
        lastTransactionDate: stat.lastTransactionDate,
        reliabilityScore:
          stat.totalTransactions > 0
            ? (stat.paidCount / stat.totalTransactions) * 100
            : 0,
      }))
      .sort((a, b) => b.totalAmountPaid - a.totalAmountPaid);
  },
});

// 15. getProfitByCrop
export const getProfitByCrop = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyCropOwnership(ctx, cropId, userId);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_crop", (q) => q.eq("cropId", cropId))
      .collect();

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    let totalRevenue = 0;
    let totalWeightSoldKg = 0;
    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      totalWeightSoldKg += getWeightInKg(sale.weight, sale.weightUnit);
    }

    const grossProfit = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const breakEvenRate =
      totalWeightSoldKg > 0 ? totalExpenses / totalWeightSoldKg : 0;

    return {
      totalExpenses,
      totalRevenue,
      grossProfit,
      profitMargin,
      isProfit: grossProfit > 0,
      breakEvenRate,
    };
  },
});

// 16. getSalesVsExpensesTimeline
export const getSalesVsExpensesTimeline = query({
  args: {
    cropId: v.optional(v.id("crops")),
    farmId: v.optional(v.id("farms")),
  },
  handler: async (ctx, { cropId, farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);

    let expenses = [];
    let sales = [];

    if (cropId) {
      await verifyCropOwnership(ctx, cropId, userId);
      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_crop", (q) => q.eq("cropId", cropId))
        .collect();
      sales = await ctx.db
        .query("sales")
        .withIndex("by_crop", (q) => q.eq("cropId", cropId))
        .collect();
    } else if (farmId) {
      await verifyFarmOwnership(ctx, farmId, userId);
      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_farm", (q) => q.eq("farmId", farmId))
        .collect();
      sales = await ctx.db
        .query("sales")
        .withIndex("by_farm", (q) => q.eq("farmId", farmId))
        .collect();
    } else {
      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      sales = await ctx.db
        .query("sales")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    const cropCache: Record<string, string> = {};
    const getCropName = async (cId: Id<"crops">) => {
      const key = cId as string;
      if (!cropCache[key]) {
        const c = await ctx.db.get(cId);
        cropCache[key] = c?.name ?? "Unknown Crop";
      }
      return cropCache[key];
    };

    const events: Array<any> = [];

    for (const exp of expenses) {
      events.push({
        type: "expense",
        date: exp.date,
        amount: exp.amount,
        category: exp.category,
        cropName: await getCropName(exp.cropId),
      });
    }

    for (const sale of sales) {
      events.push({
        type: "sale",
        date: sale.date,
        amount: sale.totalAmount,
        buyerName: sale.buyerName,
        cropName: await getCropName(sale.cropId),
      });
    }

    events.sort((a, b) => a.date.localeCompare(b.date));

    let cumulativeSales = 0;
    let cumulativeExpenses = 0;

    return events.map((event) => {
      if (event.type === "sale") cumulativeSales += event.amount;
      if (event.type === "expense") cumulativeExpenses += event.amount;

      return {
        ...event,
        runningBalance: cumulativeSales - cumulativeExpenses,
      };
    });
  },
});

// ─── BUYER MANAGEMENT ────────────────────────────────────────────────────────

const BUYER_TYPE = v.union(
  v.literal("trader"),
  v.literal("mandi"),
  v.literal("company"),
  v.literal("retailer"),
  v.literal("direct_consumer"),
  v.literal("exporter"),
  v.literal("other")
);

// 1. createBuyer
export const createBuyer = mutation({
  args: {
    name: v.string(),
    contact: v.optional(v.string()),
    address: v.optional(v.string()),
    buyerType: BUYER_TYPE,
    notes: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    return await ctx.db.insert("buyers", {
      ...args,
      isVerified: false,
      userId,
      createdAt: Date.now(),
    });
  },
});

// 2. updateBuyer
export const updateBuyer = mutation({
  args: {
    buyerId: v.id("buyers"),
    name: v.optional(v.string()),
    contact: v.optional(v.string()),
    address: v.optional(v.string()),
    buyerType: v.optional(BUYER_TYPE),
    notes: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, { buyerId, ...fields }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await verifyBuyerOwnership(ctx, buyerId, userId);

    await ctx.db.patch(buyerId, fields);
    return await ctx.db.get(buyerId);
  },
});

// 3. rateBuyer
export const rateBuyer = mutation({
  args: {
    buyerId: v.id("buyers"),
    rating: v.number(),
  },
  handler: async (ctx, { buyerId, rating }) => {
    if (rating < 1 || rating > 5) {
      throw new ConvexError("Rating must be between 1 and 5");
    }
    const userId = await getAuthenticatedUserId(ctx);
    await verifyBuyerOwnership(ctx, buyerId, userId);

    await ctx.db.patch(buyerId, { rating });
    return rating;
  },
});

// 4. deleteBuyer
export const deleteBuyer = mutation({
  args: { buyerId: v.id("buyers") },
  handler: async (ctx, { buyerId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const buyer = await verifyBuyerOwnership(ctx, buyerId, userId);

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const lowerName = buyer.name.toLowerCase().trim();
    const hasSales = sales.some(
      (s) => s.buyerName.toLowerCase().trim() === lowerName
    );

    if (hasSales) {
      throw new ConvexError("Cannot delete buyer with existing sales records");
    }

    await ctx.db.delete(buyerId);
    return { success: true };
  },
});

// 5. listBuyers
export const listBuyers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    const buyers = await ctx.db
      .query("buyers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const result = buyers.map((buyer) => {
      const bName = buyer.name.toLowerCase().trim();
      const buyerSales = sales.filter(
        (s) => s.buyerName.toLowerCase().trim() === bName
      );

      let totalAmountPaid = 0;
      let totalAmountPending = 0;
      let lastTransactionDate = null;
      let paidCount = 0;

      for (const sale of buyerSales) {
        if (sale.paymentStatus === "paid") {
          totalAmountPaid += sale.totalAmount;
          paidCount++;
        } else {
          totalAmountPending += sale.totalAmount;
        }

        if (!lastTransactionDate || sale.date > lastTransactionDate) {
          lastTransactionDate = sale.date;
        }
      }

      const totalTransactions = buyerSales.length;
      const reliabilityScore =
        totalTransactions > 0 ? (paidCount / totalTransactions) * 100 : 0;

      return {
        ...buyer,
        totalTransactions,
        totalAmountPaid,
        totalAmountPending,
        lastTransactionDate,
        reliabilityScore,
      };
    });

    return result.sort((a, b) => b.totalAmountPaid - a.totalAmountPaid);
  },
});

// 6. getBuyer
export const getBuyer = query({
  args: { buyerId: v.id("buyers") },
  handler: async (ctx, { buyerId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const buyer = await verifyBuyerOwnership(ctx, buyerId, userId);

    let sales = await ctx.db
      .query("sales")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const bName = buyer.name.toLowerCase().trim();
    sales = sales.filter((s) => s.buyerName.toLowerCase().trim() === bName);
    sales.sort((a, b) => b.date.localeCompare(a.date));

    return {
      ...buyer,
      salesHistory: sales,
    };
  },
});

// 7. searchBuyers
export const searchBuyers = query({
  args: { query: v.string() },
  handler: async (ctx, { query: searchQuery }) => {
    const userId = await getAuthenticatedUserId(ctx);

    const buyers = await ctx.db
      .query("buyers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const lowerQuery = searchQuery.toLowerCase().trim();
    if (!lowerQuery) return [];

    const matches = buyers.filter((b) => {
      return (
        b.name.toLowerCase().includes(lowerQuery) ||
        (b.contact && b.contact.toLowerCase().includes(lowerQuery))
      );
    });

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return matches.map((buyer) => {
      const bName = buyer.name.toLowerCase().trim();
      const buyerSales = sales.filter(
        (s) => s.buyerName.toLowerCase().trim() === bName
      );

      let totalAmountPaid = 0;
      let totalAmountPending = 0;
      let lastTransactionDate = null;
      let paidCount = 0;

      for (const sale of buyerSales) {
        if (sale.paymentStatus === "paid") {
          totalAmountPaid += sale.totalAmount;
          paidCount++;
        } else {
          totalAmountPending += sale.totalAmount;
        }

        if (!lastTransactionDate || sale.date > lastTransactionDate) {
          lastTransactionDate = sale.date;
        }
      }

      const totalTransactions = buyerSales.length;
      const reliabilityScore =
        totalTransactions > 0 ? (paidCount / totalTransactions) * 100 : 0;

      return {
        ...buyer,
        totalTransactions,
        totalAmountPaid,
        totalAmountPending,
        lastTransactionDate,
        reliabilityScore,
      };
    });
  },
});

// 8. getBuyerSuggestions
export const getBuyerSuggestions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    const buyers = await ctx.db
      .query("buyers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const frequencyMap: Record<string, number> = {};
    for (const sale of sales) {
      const name = sale.buyerName.toLowerCase().trim();
      frequencyMap[name] = (frequencyMap[name] || 0) + 1;
    }

    const result = buyers.map((buyer) => {
      const name = buyer.name.toLowerCase().trim();
      return {
        ...buyer,
        transactionFrequency: frequencyMap[name] || 0,
      };
    });

    return result
      .sort((a, b) => b.transactionFrequency - a.transactionFrequency)
      .slice(0, 5);
  },
});

// ─── 22. getSalesInsights ───────────────────────────────────────────────────

export const getSalesInsights = query({
  args: { farmId: v.optional(v.id("farms")) },
  handler: async (ctx, { farmId }) => {
    const userId = await getAuthenticatedUserId(ctx);

    // Fetch relevant data
    const allSales = await ctx.db
      .query("sales")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let sales = allSales;
    if (farmId) {
      sales = sales.filter((s) => s.farmId === farmId);
    }

    const allCrops = await ctx.db
      .query("crops")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
      
    // Create crop lookups
    const cropIdMap: Record<string, string> = {};
    for (const crop of allCrops) {
      cropIdMap[crop._id] = crop.name;
    }

    // 1. bestPriceAchieved & 2. priceDropAlert & 4. sellTimeOptimization
    let bestPriceAchieved = null;
    const priceDropAlert: any[] = [];
    const sellTimeStats: Record<string, Record<string, { totalRate: number, count: number }>> = {}; // cropName -> Month -> stats

    // Group sales by crop for time-series analysis
    const salesByCrop: Record<string, any[]> = {};

    for (const sale of sales) {
      const cropName = cropIdMap[sale.cropId] || "Unknown Crop";
      
      // Calculate normalized rate per Kg
      let ratePerKg = sale.ratePerUnit;
      if (sale.weightUnit === "quintal") ratePerKg = sale.ratePerUnit / 100;
      if (sale.weightUnit === "ton") ratePerKg = sale.ratePerUnit / 1000;

      // bestPriceAchieved calculation
      if (!bestPriceAchieved || ratePerKg > bestPriceAchieved.ratePerKg) {
        bestPriceAchieved = {
          cropName,
          ratePerKg,
          date: sale.date,
          buyerName: sale.buyerName,
          mandiName: sale.saleType === "mandi" ? sale.notes || "Local Mandi" : "Direct Sale",
        };
      }

      // Time series grouping
      if (!salesByCrop[cropName]) salesByCrop[cropName] = [];
      salesByCrop[cropName].push({ ...sale, ratePerKg });

      // Sell Time stats grouping
      const month = sale.date.split("-")[1]; // YYYY-MM-DD
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthStr = monthNames[parseInt(month, 10) - 1];

      if (!sellTimeStats[cropName]) sellTimeStats[cropName] = {};
      if (!sellTimeStats[cropName][monthStr]) sellTimeStats[cropName][monthStr] = { totalRate: 0, count: 0 };
      
      sellTimeStats[cropName][monthStr].totalRate += ratePerKg;
      sellTimeStats[cropName][monthStr].count += 1;
    }

    // Calculate Price Drops
    for (const [cropName, cropSales] of Object.entries(salesByCrop)) {
      // Sort older to newer
      cropSales.sort((a, b) => a.date.localeCompare(b.date));
      let previousRate = null;

      for (const sale of cropSales) {
        if (previousRate !== null) {
          const drop = ((previousRate - sale.ratePerKg) / previousRate) * 100;
          if (drop >= 10) {
             priceDropAlert.push({
               cropName,
               previousRate,
               currentRate: sale.ratePerKg,
               percentDrop: Math.round(drop)
             });
          }
        }
        previousRate = sale.ratePerKg;
      }
    }

    // Calculate Sell Time Optimization
    const sellTimeOptimization = [];
    for (const [cropName, monthsData] of Object.entries(sellTimeStats)) {
       const monthAverages = Object.entries(monthsData).map(([month, data]: any[]) => ({
          month,
          avgRate: data.totalRate / data.count
       })).sort((a, b) => b.avgRate - a.avgRate);

       if (monthAverages.length > 1) {
          sellTimeOptimization.push({
            cropName,
            bestMonth: monthAverages[0].month,
            averageRateInBestMonth: monthAverages[0].avgRate,
            worseMonth: monthAverages[monthAverages.length - 1].month,
            averageRateInWorseMonth: monthAverages[monthAverages.length - 1].avgRate
          });
       }
    }

    // 3. slowPayerBuyers
    const buyerPendingStats: Record<string, { pendingAmount: number, pendingCount: number, oldestPendingDate: number | null }> = {};
    for (const sale of sales) {
       if (sale.paymentStatus === "pending" || sale.paymentStatus === "partial") {
          const name = sale.buyerName;
          if (!buyerPendingStats[name]) buyerPendingStats[name] = { pendingAmount: 0, pendingCount: 0, oldestPendingDate: null };
          
          buyerPendingStats[name].pendingAmount += (sale.totalAmount); 
          buyerPendingStats[name].pendingCount += 1;

          const sDate = new Date(sale.date).getTime();
          if (!buyerPendingStats[name].oldestPendingDate || sDate < buyerPendingStats[name].oldestPendingDate!) {
             buyerPendingStats[name].oldestPendingDate = sDate;
          }
       }
    }

    const slowPayerBuyers = [];
    const now = new Date().getTime();
    for (const [buyerName, stats] of Object.entries(buyerPendingStats)) {
        if (!stats.oldestPendingDate) continue;
        const daysPending = Math.floor((now - stats.oldestPendingDate) / (1000 * 60 * 60 * 24));
        if (stats.pendingCount > 2 || daysPending > 30) {
            slowPayerBuyers.push({
               buyerName,
               pendingAmount: stats.pendingAmount,
               daysPending
            });
        }
    }

    // 5. unsoldCrops
    const unsoldCrops = [];
    const soldCropIds = new Set(sales.map(s => s.cropId));
    
    // Get farms for name mapping
    const allFarms = await ctx.db
       .query("farms")
       .withIndex("by_user", (q) => q.eq("userId", userId))
       .collect();
    const farmMap: Record<string, string> = {};
    for (const f of allFarms) farmMap[f._id] = f.name;

    for (const crop of allCrops) {
       if ((crop.status === "active" || crop.status === "harvested") && !soldCropIds.has(crop._id)) {
           unsoldCrops.push({
               cropName: crop.name,
               farmName: farmMap[crop.farmId] || "Unknown Farm",
               harvestDate: crop.actualHarvestDate || crop.expectedHarvestDate || "Unknown",
               estimatedValue: crop.area * 50000 
           });
       }
    }

    // 6. revenueVsLastYear
    const currentYear = new Date().getFullYear().toString();
    const lastYear = (new Date().getFullYear() - 1).toString();

    let thisYearRevenue = 0;
    let lastYearRevenue = 0;

    for (const sale of sales) {
       if (sale.date.startsWith(currentYear)) thisYearRevenue += sale.totalAmount;
       if (sale.date.startsWith(lastYear)) lastYearRevenue += sale.totalAmount;
    }

    let growthPercent = 0;
    if (lastYearRevenue > 0) {
       growthPercent = ((thisYearRevenue - lastYearRevenue) / lastYearRevenue) * 100;
    } else if (thisYearRevenue > 0) {
       growthPercent = 100;
    }

    return {
       bestPriceAchieved,
       priceDropAlert,
       slowPayerBuyers,
       sellTimeOptimization,
       unsoldCrops,
       revenueVsLastYear: {
          thisYearRevenue,
          lastYearRevenue,
          growthPercent
       }
    };
  }
});

// ─── 23. generateSalesReport ─────────────────────────────────────────────────

export const generateSalesReport = query({
   args: {
      farmId: v.optional(v.id("farms")),
      cropId: v.optional(v.id("crops")),
      year: v.optional(v.number()),
      startDate: v.optional(v.string()),
      endDate: v.optional(v.string())
   },
   handler: async (ctx, args) => {
      const userId = await getAuthenticatedUserId(ctx);

      let sales = await ctx.db
         .query("sales")
         .withIndex("by_user", (q) => q.eq("userId", userId))
         .collect();

      if (args.farmId) sales = sales.filter((s) => s.farmId === args.farmId);
      if (args.cropId) sales = sales.filter((s) => s.cropId === args.cropId);
      if (args.year) sales = sales.filter((s) => s.date.startsWith(args.year!.toString()));
      if (args.startDate) sales = sales.filter((s) => s.date >= args.startDate!);
      if (args.endDate) sales = sales.filter((s) => s.date <= args.endDate!);

      // Resolve names
      const allCrops = await ctx.db.query("crops").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
      const allFarms = await ctx.db.query("farms").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
      
      const cropMap: Record<string, string> = {};
      allCrops.forEach(c => cropMap[c._id] = c.name);
      
      const farmMap: Record<string, string> = {};
      allFarms.forEach(f => farmMap[f._id] = f.name);

      let totalRevenue = 0;
      let totalWeightKg = 0;
      let pendingAmount = 0;
      let paidAmount = 0;

      const buyerStats: Record<string, { totalAmount: number, count: number }> = {};
      const monthStats: Record<string, { revenue: number, count: number }> = {};

      const detailedSales = sales.map(sale => {
         totalRevenue += sale.totalAmount;
         
         if (sale.paymentStatus === "pending") pendingAmount += sale.totalAmount;
         else if (sale.paymentStatus === "paid") paidAmount += sale.totalAmount;
         else if (sale.paymentStatus === "partial") {
            paidAmount += (sale.totalAmount / 2);
            pendingAmount += (sale.totalAmount / 2);
         }

         let salesKg = sale.weight;
         if (sale.weightUnit === "quintal") salesKg = sale.weight * 100;
         if (sale.weightUnit === "ton") salesKg = sale.weight * 1000;
         totalWeightKg += salesKg;

         // Buyer stats
         if (!buyerStats[sale.buyerName]) buyerStats[sale.buyerName] = { totalAmount: 0, count: 0 };
         buyerStats[sale.buyerName].totalAmount += sale.totalAmount;
         buyerStats[sale.buyerName].count += 1;

         // Month stats
         const month = sale.date.substring(0, 7); // YYYY-MM
         if (!monthStats[month]) monthStats[month] = { revenue: 0, count: 0 };
         monthStats[month].revenue += sale.totalAmount;
         monthStats[month].count += 1;

         return {
            ...sale,
            cropName: cropMap[sale.cropId] || "Unknown Crop",
            farmName: farmMap[sale.farmId] || "Unknown Farm",
         };
      });

      // Sort detailed sales by date descending
      detailedSales.sort((a, b) => b.date.localeCompare(a.date));

      const buyerSummary = Object.entries(buyerStats).map(([buyerName, stats]) => ({
         buyerName,
         ...stats
      })).sort((a, b) => b.totalAmount - a.totalAmount);

      const monthlyBreakdown = Object.entries(monthStats).map(([month, stats]) => ({
         month,
         ...stats
      })).sort((a, b) => a.month.localeCompare(b.month));

      const avgRate = totalWeightKg > 0 ? totalRevenue / totalWeightKg : 0;

      return {
         title: "Comprehensive Sales Report",
         generatedAt: new Date().toISOString(),
         period: (args.startDate || args.endDate || args.year) 
            ? `${args.startDate || ''} to ${args.endDate || ''} ${args.year || ''}`.trim()
            : "All Time",
         summary: {
            totalRevenue,
            totalWeight: totalWeightKg,
            avgRate,
            pendingAmount,
            paidAmount,
            saleCount: sales.length
         },
         sales: detailedSales,
         buyerSummary,
         monthlyBreakdown
      };
   }
});

// ─── 24. getBuyerContactByName ───────────────────────────────────────────────

export const getBuyerContactByName = query({
  args: { buyerName: v.string() },
  handler: async (ctx, { buyerName }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const buyers = await ctx.db
      .query("buyers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const buyer = buyers.find((b) => b.name.toLowerCase().trim() === buyerName.toLowerCase().trim());
    return buyer?.contact || null;
  }
});

