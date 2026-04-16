/**
 * KhetSmart Analytics — Shared TypeScript Interfaces
 * Mirrors the backend Convex analytics query return shapes for type-safe consumption in React.
 */

// ─── Core Primitives ─────────────────────────────────────────────────────────

export interface MonthlyPLData {
  month: string;          // "Jan", "Feb", …
  monthIndex: number;     // 0–11
  revenue: number;        // ₹
  expenses: number;       // ₹
  profit: number;         // revenue - expenses
}

// ─── Crop-Level Analytics ─────────────────────────────────────────────────────

export interface CropProfitSummary {
  totalExpenses: number;
  totalRevenue: number;
  grossProfit: number;
  profitMargin: number;          // 0-100
  costPerKg: number;
  costPerAcre: number;
  revenuePerAcre: number;
  profitPerAcre: number;
  roi: number;                   // Return on investment %
  expenseBreakdown: ExpenseCategoryBreakdown[];
  monthlyRevenue: MonthlyRevenue[];
  saleCount: number;
  totalWeightSoldKg: number;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

// ─── Crop Ranking ─────────────────────────────────────────────────────────────

export interface CropRankingItem {
  cropId: string;
  cropName: string;
  farmName: string;
  season: string;
  year: number;
  totalExpenses: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  roi: number;
  grade: "A" | "B" | "C" | "D" | "F";
}

// ─── Farm-Level Analytics ─────────────────────────────────────────────────────

export interface FarmProfitSummary {
  farmId: string;
  farmName: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  cropCount: number;
}

// ─── Portfolio Analytics ──────────────────────────────────────────────────────

export interface PortfolioProfitSummary {
  grandTotalRevenue: number;
  grandTotalExpenses: number;
  grandTotalProfit: number;
  averageProfitMargin: number;
  totalCrops: number;
  profitableCrops: number;
  lossCrops: number;
  farmBreakdown: FarmProfitSummary[];
  monthlyPL: MonthlyPLData[];
  topCrop: string | null;
  worstCrop: string | null;
}

// ─── Break-Even Analysis ──────────────────────────────────────────────────────

export interface BreakEvenAnalysis {
  totalInvestment: number;
  currentRevenue: number;
  breakEvenRevenue: number;         // = totalInvestment
  breakEvenReached: boolean;
  progressPercent: number;          // 0–100 (capped)
  remainingToBreakEven: number;     // 0 if already reached
  profitBeyondBreakEven: number;
}

// ─── Input/Output Analysis ────────────────────────────────────────────────────

export interface InputOutputAnalysis {
  seed: number;
  fertilizer: number;
  pesticide: number;
  labour: number;
  irrigation: number;
  equipment: number;
  transport: number;
  other: number;
  totalInput: number;
  totalOutput: number;
  ioRatio: number;                  // output / input
}

// ─── Year-over-Year Comparison ────────────────────────────────────────────────

export interface YearComparison {
  currentYear: number;
  previousYear: number;
  current: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
    cropCount: number;
  };
  previous: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
    cropCount: number;
  };
  revenueChange: number;            // %
  expenseChange: number;            // %
  profitChange: number;             // %
  commonCrops: YearComparisonCropRow[];
}

export interface YearComparisonCropRow {
  cropName: string;
  currentProfit: number;
  previousProfit: number;
  profitChange: number;             // %
}

// ─── Crop Plan ────────────────────────────────────────────────────────────────

export interface CropPlan {
  _id: string;
  userId: string;
  cropName: string;
  area: number;
  areaUnit: "acres" | "hectares" | "bigha";
  inputCosts: {
    seed: number;
    fertilizer: number;
    pesticide: number;
    labour: number;
    irrigation: number;
    other: number;
  };
  expectedYieldPerAcre: number;
  expectedRate: number;
  calculatedProfit: number;
  createdAt: number;
}

// ─── Financial Report ─────────────────────────────────────────────────────────

export interface FinancialReport {
  reportMeta: {
    title: string;
    generatedAt: string;
    period: string;
    farmerName: string;
    farmName?: string;
  };
  executive_summary: {
    totalExpenses: number;
    totalRevenue: number;
    totalProfit: number;
    profitMarginPercent: number;
    roiPercent: number;
    totalCrops: number;
    profitableCrops: number;
    lossCrops: number;
    totalAreaFarmed: number;
    bestCrop: string;
    worstCrop: string;
  };
  income_statement: {
    revenue: {
      total: number;
      byMonth: MonthlyPLData[];
      byCrop: { cropName: string; total: number; percentage: number }[];
      bySaleType: { type: string; total: number; percentage: number }[];
    };
    expenses: {
      total: number;
      byMonth: { month: string; total: number }[];
      byCrop: { cropName: string; total: number }[];
      byCategory: { category: string; total: number; percentage: number }[];
    };
    grossProfit: { total: number };
    netProfit: number;
  };
  crop_performance: CropRankingItem[];
  sales_analysis: {
    totalSales: number;
    avgDealSize: number;
    byBuyer: { buyerName: string; total: number; count: number }[];
    bySaleType: { type: string; total: number; percentage: number }[];
    pendingCollections: number;
  };
  year_over_year: YearComparison | null;
  farm_breakdown: FarmProfitSummary[];
}
