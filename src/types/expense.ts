import { Id } from "../../convex/_generated/dataModel";

// ─── Expense category literal ──────────────────────────────────────────────
export type ExpenseCategory =
  | "seed"
  | "fertilizer"
  | "pesticide"
  | "labour"
  | "irrigation"
  | "equipment"
  | "transport"
  | "other";

export const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "seed",
  "fertilizer",
  "pesticide",
  "labour",
  "irrigation",
  "equipment",
  "transport",
  "other",
];

// ─── Core Expense (mirrors schema) ────────────────────────────────────────
export interface Expense {
  _id: Id<"expenses">;
  _creationTime: number;
  cropId: Id<"crops">;
  farmId: Id<"farms">;
  userId: string;
  category: ExpenseCategory;
  amount: number;
  date: string;           // ISO date string YYYY-MM-DD
  notes?: string;
  supplier?: string;
  photoUrl?: string;
  inventoryItemId?: Id<"inventory">;
  createdAt: number;
}

// ─── Expense enriched with crop/farm names (from listAllExpenses) ─────────
export interface ExpenseWithContext extends Expense {
  cropName: string;
  farmName: string;
}

// ─── Summary returned by getExpenseSummaryAllFarms ───────────────────────
export interface ExpenseSummary {
  totalExpenses: number;
  byCategory: Record<ExpenseCategory, number>;
  byFarm: Array<{ farmId: Id<"farms">; farmName: string; totalExpenses: number }>;
  byMonth: Array<{ year: number; month: number; totalAmount: number }>;
  monthlyAverage?: number;
}

// ─── Per-category breakdown row (used in analytics tables) ───────────────
export interface CategoryBreakdownRow {
  category: ExpenseCategory;
  total: number;
  count: number;
  pct: string;          // "12.3"
  yoyPct?: string;      // "+35.0" | "-8.2" | "+∞" | "0"
  yoyUp?: boolean;
}

// ─── Report data (from generateExpenseReport) ────────────────────────────
export interface ExpenseReportData {
  title: string;
  generatedAt: string;
  period: string;
  summary: {
    totalAmount: number;
    count: number;
    byCategory: Record<string, { total: number; count: number }>;
  };
  expenses: Array<ExpenseWithContext & { cropName: string; farmName: string }>;
  charts: {
    categoryBreakdown: CategoryBreakdownRow[];
    monthlyTrend: Array<{ month: string; total: number }>;
  };
}

// ─── Smart insights (from getExpenseInsights) ────────────────────────────
export interface ExpenseInsights {
  categorySpike: {
    category: string;
    thisYear: number;
    lastYear: number;
    percentIncrease: number;
  } | null;
  unusualExpense: {
    expenseId: Id<"expenses">;
    category: string;
    amount: number;
    average: number;
    date: string;
  } | null;
  missingCategories: Array<{
    cropName: string;
    missingCategory: string;
  }>;
  topSupplier: {
    supplierName: string;
    totalAmount: number;
    transactionCount: number;
  } | null;
  expenseForecast: {
    estimatedRemainingAmount: number;
    currentYearToDate: number;
    lastYearTotal: number;
  };
}

// ─── Mutation input shapes ────────────────────────────────────────────────
export interface CreateExpenseInput {
  cropId: Id<"crops">;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
  supplier?: string;
  photoUrl?: string;
  inventoryItemId?: Id<"inventory">;
}

export interface BulkExpenseItem {
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
  supplier?: string;
}

export interface UpdateExpenseInput {
  expenseId: Id<"expenses">;
  category?: ExpenseCategory;
  amount?: number;
  date?: string;
  notes?: string;
  supplier?: string;
  photoUrl?: string;
}
