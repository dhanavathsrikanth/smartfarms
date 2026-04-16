"use client";

import { useQuery, Authenticated, AuthLoading } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { ChevronRight, Home, TrendingUp, Loader2, BarChart3, Receipt, Tractor } from "lucide-react";
import Link from "next/link";

// Custom UI Components
import { ProfitSummaryCard } from "@/app/components/sales/ProfitSummaryCard";
import { CropRankingTable } from "@/app/components/analytics/CropRankingTable";
import { MonthlyPLChart } from "@/app/components/analytics/MonthlyPLChart";
import { BreakEvenProgressBar } from "@/app/components/analytics/BreakEvenProgressBar";
import { formatCurrency } from "@/lib/formatters";

export default function FarmAnalyticsPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <AuthLoading>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1C4E35]" />
        </div>
      </AuthLoading>
      <Authenticated>
        <FarmAnalyticsDashboard />
      </Authenticated>
    </div>
  );
}

function FarmAnalyticsDashboard() {
  const params = useParams();
  const farmId = params.farmId as Id<"farms">;
  const currentYear = new Date().getFullYear();

  // Queries
  const farm = useQuery(api.farms.getFarm, { farmId });
  const profitSummary = useQuery(api.analytics.getFarmProfitSummary, { farmId, year: currentYear });
  const cropRanking = useQuery(api.analytics.getCropRanking, { year: currentYear, farmId });
  const profitTrend = useQuery(api.analytics.getProfitTrendAnalysis, { months: 12, farmId });
  
  // To get BreakEven, we technically need cropIds, so let's query all active crops on this farm and their detailed reports.
  const allCrops = useQuery(api.crops.listCropsByFarm, { farmId });
  const detailedReports = useQuery(
    api.analytics.getMultiCropComparison, 
    allCrops ? { cropIds: allCrops.map(c => c._id) } : "skip"
  );

  if (farm === undefined || profitSummary === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin text-[#1C4E35]" />
        <span className="text-gray-500 font-medium">Crunching farm financial data...</span>
      </div>
    );
  }

  if (farm === null) {
    return <div className="text-center py-20 text-gray-500">Farm not found.</div>;
  }

  const margin = profitSummary.totalRevenue > 0 
    ? (profitSummary.grossProfit / profitSummary.totalRevenue) * 100 
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
        <Link href="/dashboard" className="hover:text-gray-900 transition-colors"><Home className="h-3 w-3"/></Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/dashboard/farms" className="hover:text-gray-900 transition-colors">Farms</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/dashboard/farms/${farmId}`} className="hover:text-gray-900 transition-colors">{farm.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-900">Analytics</span>
      </nav>

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Tractor className="h-6 w-6 text-[#1C4E35]" />
          {farm.name} — Financial Analytics
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Deep dive into crop-level performance specifically for this location.
        </p>
      </div>

      {/* ── unified profit reporting ── */}
      <ProfitSummaryCard 
        totalProfit={profitSummary.grossProfit} 
        margin={margin}
        trend={0}
        loading={false}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
         {/* LEFT COLUMN */}
         <div className="xl:col-span-2 space-y-8">
            {/* Section 1: Monthly Trend */}
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#D4840A]" /> Monthly Trend ({currentYear})
              </h2>
              <div className="bg-white p-2 rounded-xl border border-[#e5dfd4] shadow-sm">
                {profitTrend ? (
                  <MonthlyPLChart data={profitTrend.trend} />
                ) : (
                  <div className="h-80 w-full bg-gray-50 animate-pulse rounded-lg"></div>
                )}
              </div>
            </section>

            {/* Section 2: Crop Performance */}
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#52A870]" /> Crop Performance Rank
              </h2>
              {cropRanking ? (
                <CropRankingTable ranking={cropRanking.map((item, index) => ({
                  ...item,
                  rank: index + 1,
                  medal: index === 0 ? "gold" : index === 1 ? "silver" : index === 2 ? "bronze" : undefined as any
                }))} />
              ) : (
                <div className="h-64 border border-[#e5dfd4] bg-white animate-pulse rounded-xl shadow-sm"></div>
              )}
            </section>
         </div>

         {/* RIGHT COLUMN */}
         <div className="xl:col-span-1 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#E24B4A]" /> Break-Even Status
              </h2>
              <div className="space-y-4">
                {detailedReports && detailedReports.map(report => (
                   <div key={report.cropId} className="bg-white p-4 rounded-xl border border-[#e5dfd4] shadow-sm">
                     <div className="flex justify-between items-center mb-2">
                       <h3 className="font-semibold text-sm">{report.cropName}</h3>
                       <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">{report.season} {report.year}</span>
                     </div>
                     <BreakEvenProgressBar 
                       data={{
                         breakEvenAchieved: report.revenue >= report.expenses,
                         breakEvenProgressPercent: report.expenses > 0 ? Math.min(100, (report.revenue / report.expenses) * 100) : 0,
                         revenueSoFar: report.revenue,
                         remainingWeightToBreakEven: Math.max(0, (report.expenses - report.revenue) / (report.ratePerKg || 1)),
                         breakEvenRatePerKg: report.expenses > 0 ? report.expenses / (report.yieldKg || 1) : 0
                       }}
                     />
                   </div>
                ))}
                {(!detailedReports || detailedReports.length === 0) && (
                   <div className="bg-gray-50 p-6 text-center rounded-xl border border-dashed border-[#e5dfd4] text-sm text-gray-500">
                     No active crops with financial data found.
                   </div>
                )}
              </div>
            </section>
         </div>
      </div>
    </div>
  );
}
