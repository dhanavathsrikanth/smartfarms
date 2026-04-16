import { Id } from "../../convex/_generated/dataModel";

export type SaleType = "mandi" | "direct" | "contract" | "other";
export type PaymentStatus = "paid" | "pending" | "partial";
export type WeightUnit = "kg" | "quintal" | "ton";

export interface Sale {
  _id: Id<"sales">;
  _creationTime: number;
  cropId: Id<"crops">;
  farmId: Id<"farms">;
  userId: string;
  weight: number;
  weightUnit: WeightUnit;
  ratePerUnit: number;
  totalAmount: number;
  buyerName: string;
  buyerContact?: string;
  saleType: SaleType;
  paymentStatus: PaymentStatus;
  date: string;
  notes?: string;
  photoUrl?: string;
}

export interface SaleWithContext extends Sale {
  cropName: string;
  farmName: string;
}

export interface SaleSummary {
  totalRevenue: number;
  totalWeightSold: number;
  averageRatePerKg: number;
  saleCount: number;
  pendingAmount: number;
  paidAmount: number;
  bySaleType: Record<string, number>;
  buyerCount: number;
  cropBreakdown?: {
    cropName: string;
    cropId: Id<"crops">;
    totalRevenue: number;
    totalWeightKg: number;
    averageRate: number;
  }[];
  monthlyRevenue?: {
    month: number;
    year: number;
    totalAmount: number;
  }[];
}

export interface SalesInsights {
  bestPriceAchieved: {
    cropName: string;
    ratePerKg: number;
    date: string;
    buyerName: string;
    mandiName: string;
  } | null;
  priceDropAlert: {
    cropName: string;
    previousRate: number;
    currentRate: number;
    percentDrop: number;
  }[];
  slowPayerBuyers: {
    buyerName: string;
    pendingAmount: number;
    daysPending: number;
  }[];
  sellTimeOptimization: {
    cropName: string;
    bestMonth: string;
    averageRateInBestMonth: number;
    worseMonth: string;
    averageRateInWorseMonth: number;
  }[];
  unsoldCrops: {
    cropName: string;
    farmName: string;
    harvestDate: string;
    estimatedValue: number;
  }[];
  revenueVsLastYear: {
    thisYearRevenue: number;
    lastYearRevenue: number;
    growthPercent: number;
  };
}

export interface Buyer {
  _id: Id<"buyers">;
  _creationTime: number;
  userId: string;
  name: string;
  contact?: string;
  address?: string;
  buyerType: "trader" | "mandi" | "company" | "retailer" | "direct_consumer" | "exporter" | "other";
  notes?: string;
  isVerified: boolean;
  rating?: number;
}

export interface BuyerWithStats extends Buyer {
  totalTransactions: number;
  totalAmountPaid: number;
  totalAmountPending: number;
  lastTransactionDate: string | null;
  reliabilityScore: number;
}

export interface CreateSaleInput {
  cropId: Id<"crops">;
  weight: number;
  weightUnit: WeightUnit;
  ratePerUnit: number;
  buyerName: string;
  buyerContact?: string;
  saleType: SaleType;
  paymentStatus: PaymentStatus;
  date: string;
  notes?: string;
  photoUrl?: string;
}

export interface ProfitSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  profitMargin: number;
  trend: number;
}
