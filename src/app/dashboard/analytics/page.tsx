"use client";

import { useState, useMemo } from "react";
import { useQuery, Authenticated, AuthLoading } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatCurrency } from "@/lib/formatters";
import { 
  BarChart3, 
  TrendingUp, 
  Sprout, 
  Calendar,
  Layers,
  ChevronRight,
  Download,
  Loader2,
  AlertCircle,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Custom UI Components
import { MonthlyPLChart } from "@/app/components/analytics/MonthlyPLChart";
import { CropRankingTable } from "@/app/components/analytics/CropRankingTable";
import { EfficiencyHeatmap } from "@/app/components/analytics/EfficiencyHeatmap";
import { YearComparisonChart } from "@/app/components/analytics/YearComparisonChart";
import { InputOutputRadarChart } from "@/app/components/analytics/InputOutputRadarChart";
import { CropGradeCard } from "@/app/components/analytics/CropGradeCard";
import { BreakEvenCalculator } from "@/app/components/analytics/BreakEvenCalculator";
import { CropPlanCard } from "@/app/components/analytics/CropPlanCard";
import { ROIComparison } from "@/app/components/analytics/ROIComparison";
import { SeasonPlanningWidget } from "@/app/components/analytics/SeasonPlanningWidget";
import { ChartErrorBoundary } from "@/app/components/analytics/ChartErrorBoundary";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { YieldEfficiencyMatrix } from "@/app/components/yields/YieldEfficiencyMatrix";
import { YieldInputComparisonChart } from "@/app/components/yields/YieldInputComparisonChart";
import { 
  Plus, 
  Target, 
  Calculator as CalcIcon,
  Search,
  Layout
} from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <AuthLoading>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1C4E35]" />
        </div>
      </AuthLoading>
      <Authenticated>
        <AnalyticsDashboard />
      </Authenticated>
    </div>
  );
}

function AnalyticsDashboard() {
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState<number>(new Date().getFullYear() - 1);
  const [activeTab, setActiveTab] = useState("overview");

  // Global Queries
  const portfolio = useQuery(api.analytics.getPortfolioProfitSummary, { year: currentYear });
  const profitTrend = useQuery(api.analytics.getProfitTrendAnalysis, { months: 12 });
  
  // Tab-Specific Queries (they handle nulls gracefully on backend)
  const cropRanking = useQuery(api.analytics.getCropRanking, { year: currentYear });
  const expenseEfficiency = useQuery(api.analytics.getExpenseEfficiencyAnalysis, { year: currentYear });
  const yoyComparison = useQuery(api.analytics.getYearOverYearComparison, { 
    currentYear, 
    previousYear: compareYear 
  });
  const ioRatio = useQuery(api.analytics.getInputOutputRatioAnalysis, { year: currentYear });
  const cropPlans = useQuery(api.analytics.listCropPlans);
  const yieldEfficiency = useQuery(api.yields.getYieldEfficiencyMatrix, { year: currentYear });

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const availableYears = useMemo(
    () => Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i),
    []
  );

  // ── Memoized expensive data transforms ──
  const roiData = useMemo(
    () => portfolio?.cropBreakdown.map(c => ({
      cropName: c.cropName,
      roi: (c.profit / (c.expenses || 1)) * 100,
    })) ?? [],
    [portfolio]
  );

  const cropRankingWithMedals = useMemo(
    () => cropRanking?.map((item, index) => ({
      ...item,
      rank: index + 1,
      medal: index === 0 ? "gold" : index === 1 ? "silver" : index === 2 ? "bronze" : undefined as any,
    })) ?? [],
    [cropRanking]
  );

  const ioRadarData = useMemo(
    () => ioRatio ? [
      { subject: "A-Grade", current: ioRatio.filter(g => g.grade === "A").length, fullMark: ioRatio.length || 10 },
      { subject: "B-Grade", current: ioRatio.filter(g => g.grade === "B").length, fullMark: ioRatio.length || 10 },
      { subject: "C-Grade", current: ioRatio.filter(g => g.grade === "C").length, fullMark: ioRatio.length || 10 },
      { subject: "D-Grade", current: ioRatio.filter(g => g.grade === "D").length, fullMark: ioRatio.length || 10 },
      { subject: "Loss", current: ioRatio.filter(g => g.netPerKg < 0).length, fullMark: ioRatio.length || 10 },
    ] : [],
    [ioRatio]
  );

  if (portfolio === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin text-[#1C4E35]" />
        <span className="text-gray-500 font-medium">Crunching financial data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
        <Link href="/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-900">Analytics</span>
      </nav>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#1C4E35]" />
            Farm Analytics
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Your complete financial picture across all operations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-gray-200 shadow-sm">
            <Calendar className="h-4 w-4 text-gray-500 ml-1" />
            <Select value={currentYear.toString()} onValueChange={(v) => setCurrentYear(Number(v))}>
              <SelectTrigger className="w-[100px] h-7 border-none bg-transparent shadow-none focus:ring-0 font-semibold p-0 pr-2">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Link href="/dashboard/analytics/report">
            <Button className="hidden sm:flex gap-2 bg-[#1C4E35] hover:bg-[#143a28] text-white shadow-lg shadow-emerald-700/10 border-none font-semibold px-5">
              <FileText className="h-4 w-4" /> Generate Annual Report
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Tabs Container ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-[#F7F0E3] p-1 flex justify-start w-fit text-[#1C4E35] border border-[#e5dfd4]">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-[#1C4E35] data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="ranking" className="data-[state=active]:bg-white data-[state=active]:text-[#1C4E35] data-[state=active]:shadow-sm">Crop Ranking</TabsTrigger>
          <TabsTrigger value="planning" className="data-[state=active]:bg-white data-[state=active]:text-[#1C4E35] data-[state=active]:shadow-sm flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Planning
          </TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-white data-[state=active]:text-[#1C4E35] data-[state=active]:shadow-sm">Expense Analysis</TabsTrigger>
          <TabsTrigger value="yoy" className="data-[state=active]:bg-white data-[state=active]:text-[#1C4E35] data-[state=active]:shadow-sm">Year Comparison</TabsTrigger>
          <TabsTrigger value="efficiency" className="data-[state=active]:bg-white data-[state=active]:text-[#1C4E35] data-[state=active]:shadow-sm">Efficiency</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <OverviewStatCard 
              title="Total Profit This Year" 
              value={formatCurrency(portfolio.grandTotalProfit)} 
              isProfit={portfolio.grandTotalProfit >= 0}
              icon={<TrendingUp className={`h-4 w-4 ${portfolio.grandTotalProfit >= 0 ? "text-[#52A870]" : "text-[#E24B4A]"}`} />}
            />
            <OverviewStatCard 
              title="Best Performing Crop" 
              value={(cropRanking && cropRanking.length > 0) ? cropRanking[0].cropName : "N/A"} 
              subtext={(cropRanking && cropRanking.length > 0) ? `Profit: ${formatCurrency(cropRanking[0].totalProfit)}` : undefined}
              icon={<Sprout className="h-4 w-4 text-[#D4840A]" />}
            />
            <OverviewStatCard 
              title="Average Margin" 
              value={`${portfolio.averageProfitMargin.toFixed(1)}%`} 
              icon={<BarChart3 className="h-4 w-4 text-[#1C4E35]" />}
            />
            <OverviewStatCard 
              title="Total Farmland" 
              value={`${portfolio.farmBreakdown.reduce((sum, f) => sum + f.revenue, 0) > 0 ? "Multiple" : "N/A"}`} 
              subtext={`${portfolio.farmBreakdown.length} active farm(s)`}
              icon={<Layers className="h-4 w-4 text-blue-500" />}
            />
          </div>

          {/* Chart Area */}
          <div className="rounded-xl border border-[#e5dfd4] bg-white p-2 shadow-sm min-w-0 overflow-hidden">
             <ChartErrorBoundary title="Monthly P&L Chart">
               {profitTrend ? (
                 <MonthlyPLChart data={profitTrend.trend} />
               ) : (
                 <div className="h-96 w-full animate-pulse bg-gray-50 rounded-lg"></div>
               )}
             </ChartErrorBoundary>
          </div>

          <div className="mt-6 min-w-0 overflow-hidden">
             <ChartErrorBoundary title="ROI Comparison">
               <ROIComparison data={roiData} />
             </ChartErrorBoundary>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 bg-white border border-[#e5dfd4] rounded-xl shadow-sm">
               <h3 className="text-lg font-semibold text-gray-800 mb-4">Farm Breakthrough</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                     <tr>
                       <th className="px-4 py-2">Farm Name</th>
                       <th className="px-4 py-2">Revenue</th>
                       <th className="px-4 py-2">Expenses</th>
                       <th className="px-4 py-2">Profit</th>
                       <th className="px-4 py-2">Margin</th>
                     </tr>
                   </thead>
                   <tbody>
                     {portfolio.farmBreakdown.map((farm, i) => (
                       <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                         <td className="px-4 py-2 font-medium">{farm.farmName}</td>
                         <td className="px-4 py-2 font-mono">{formatCurrency(farm.revenue)}</td>
                         <td className="px-4 py-2 font-mono text-[#E24B4A]">{formatCurrency(farm.expenses)}</td>
                         <td className="px-4 py-2 font-mono font-bold text-[#1C4E35]">{formatCurrency(farm.profit)}</td>
                         <td className="px-4 py-2">
                           <span className={`px-2 py-1 rounded text-xs ${farm.margin >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                             {farm.margin.toFixed(1)}%
                           </span>
                         </td>
                       </tr>
                     ))}
                     {portfolio.farmBreakdown.length === 0 && (
                       <tr><td colSpan={5} className="py-4 text-center text-gray-500">No active farm data</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
            
            <div className="p-5 bg-white border border-[#e5dfd4] rounded-xl shadow-sm flex flex-col items-center justify-center text-center">
              {profitTrend && profitTrend.trend.length > 0 ? (
                <div className="w-full text-left space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Quick Insights</h3>
                  <ul className="space-y-3">
                    {profitTrend.bestMonth && (
                      <li className="flex items-start gap-2 text-sm text-gray-700">
                         <div className="mt-0.5 rounded-full bg-[#F7F0E3] p-1 text-[#D4840A]"><TrendingUp className="h-3 w-3" /></div>
                         <span>Your most profitable month was <strong>{profitTrend.bestMonth.label}</strong> with {formatCurrency(profitTrend.bestMonth.profit)}.</span>
                      </li>
                    )}
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                       <div className="mt-0.5 rounded-full bg-[#F7F0E3] p-1 text-[#D4840A]"><TrendingUp className="h-3 w-3" /></div>
                       <span>Overall profit growth trend is currently tracking <strong>{profitTrend.profitGrowthTrend}</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                       <div className="mt-0.5 rounded-full bg-[#F7F0E3] p-1 text-[#D4840A]"><TrendingUp className="h-3 w-3" /></div>
                       <span>Average monthly profit is roughly {formatCurrency(profitTrend.averageMonthlyProfit)}.</span>
                    </li>
                  </ul>
                </div>
              ) : (
                <>
                  <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm font-semibold text-gray-600">Not enough data for insights</p>
                  <p className="text-xs text-gray-400 mt-1">Record more sales and expenses.</p>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: CROP RANKING ── */}
        <TabsContent value="ranking" className="space-y-6 focus-visible:outline-none">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Crop Performance Ranking</h3>
              <p className="text-sm text-gray-500 mt-1">
                {cropRanking ? `${cropRanking.length} crops analyzed · ${cropRanking.filter(c => c.totalProfit > 0).length} profitable · ${cropRanking.filter(c => c.totalProfit < 0).length} at loss` : "Analyzing..."}
              </p>
            </div>
          </div>
          
          {cropRanking ? (
            <div className="space-y-6">
              <ChartErrorBoundary title="Crop Ranking Table">
                <CropRankingTable ranking={cropRankingWithMedals} />
              </ChartErrorBoundary>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SeasonPlanningWidget onPlanCrop={(data) => {
                    setEditingPlanId(null);
                    setIsCalculatorOpen(true);
                    // Pre-fill logic would go here if BreakfastCalculator supported it
                  }} />
                </div>
                <div className="bg-[#FAF9F6] border border-[#e5dfd4] rounded-xl p-6 flex flex-col justify-center gap-4">
                  <div className="p-3 bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-sm">
                    <Target className="h-6 w-6 text-[#D4840A]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1C4E35]">Target Setting</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">Planning your cycle based on historical profit-per-acre yields 24% higher returns on average.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full border-[#D4840A]/30 text-[#D4840A] hover:bg-[#D4840A] hover:text-white"
                    onClick={() => setIsCalculatorOpen(true)}
                  >
                    Launch Planner
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 w-full bg-white animate-pulse rounded-xl border border-gray-200"></div>
          )}

          <div className="pt-4 border-t border-gray-200">
             <div className="bg-[#1C4E35] text-white rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
               <div>
                 <h4 className="font-semibold text-lg flex items-center gap-2">
                   <Sprout className="h-5 w-5 text-[#52A870]" />
                   Which crops should I grow next season?
                 </h4>
                 <p className="text-sm text-[#F7F0E3] mt-1 opacity-90">Unlock personalized seed recommendations based on your local soil tests and historical margins.</p>
               </div>
               <Button className="bg-[#D4840A] hover:bg-[#b56e09] text-white border-none shadow-sm shrink-0 items-center">
                 Coming in AI Advisor <ChevronRight className="h-4 w-4 ml-1" />
               </Button>
             </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: EXPENSE ANALYSIS ── */}
        <TabsContent value="expenses" className="space-y-6 focus-visible:outline-none min-w-0 overflow-hidden">
          <div className="p-5 bg-white border border-[#e5dfd4] rounded-xl shadow-sm min-w-0 overflow-hidden">
             <h3 className="text-lg font-semibold text-gray-800 mb-2">Category Efficiency Heatmap</h3>
             <p className="text-sm text-gray-500 mb-4">Visualize when and where capital is deployed throughout the year.</p>
             <ChartErrorBoundary title="Efficiency Heatmap">
               {expenseEfficiency ? (
                 <EfficiencyHeatmap data={expenseEfficiency.map(e => ({ 
                   category: e.category, 
                   months: e.monthlySpend 
                 }))} />
               ) : (
                 <div className="h-64 w-full animate-pulse bg-gray-50 rounded-lg"></div>
               )}
             </ChartErrorBoundary>
          </div>
          
          <div className="p-5 bg-white border border-[#e5dfd4] rounded-xl shadow-sm">
             <h3 className="text-lg font-semibold text-gray-800 mb-4">Attributed Returns</h3>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-500 uppercase bg-[#F7F0E3]">
                     <tr>
                       <th className="px-4 py-3 rounded-tl-lg">Expense Category</th>
                       <th className="px-4 py-3 text-right">Total Spend</th>
                       <th className="px-4 py-3 text-right">Attributed Revenue</th>
                       <th className="px-4 py-3 text-right">Category ROI</th>
                     </tr>
                   </thead>
                   <tbody>
                     {expenseEfficiency?.map((row, i) => {
                       const spend = row.totalSpent;
                       const rev = row.revenueGenerated;
                       const roi = spend > 0 ? ((rev - spend) / spend) * 100 : 0;
                       return (
                         <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                           <td className="px-4 py-3 font-medium capitalize">{row.category}</td>
                           <td className="px-4 py-3 text-right font-mono text-[#E24B4A]">{formatCurrency(spend)}</td>
                           <td className="px-4 py-3 text-right font-mono text-[#52A870]">{formatCurrency(rev)}</td>
                           <td className="px-4 py-3 text-right">
                             <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${roi >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                               {roi.toFixed(1)}%
                             </span>
                           </td>
                         </tr>
                       )
                     })}
                     {expenseEfficiency?.length === 0 && (
                       <tr><td colSpan={4} className="py-6 text-center text-gray-500">No categorized expense data found.</td></tr>
                     )}
                   </tbody>
                 </table>
             </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: YEAR COMPARISON ── */}
        <TabsContent value="yoy" className="space-y-6 focus-visible:outline-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#e5dfd4] shadow-sm">
            <h3 className="font-semibold text-gray-800">Compare Performance</h3>
            <div className="flex items-center gap-3">
              <Select value={currentYear.toString()} onValueChange={(v) => setCurrentYear(Number(v))}>
                <SelectTrigger className="w-28 font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-gray-400 font-bold">VS</span>
              <Select value={compareYear.toString()} onValueChange={(v) => setCompareYear(Number(v))}>
                <SelectTrigger className="w-28 font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <ChartErrorBoundary title="Year Comparison Chart">
            {yoyComparison ? (
              <YearComparisonChart 
                data={yoyComparison.monthlyComparison || []} 
                currentYear={currentYear} 
                previousYear={compareYear} 
              />
            ) : (
              <div className="h-80 bg-white border border-[#e5dfd4] rounded-xl animate-pulse"></div>
            )}
          </ChartErrorBoundary>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Year A Summary */}
             <div className="p-5 bg-white border border-[#e5dfd4] rounded-xl shadow-sm text-center">
               <h4 className="text-sm font-semibold text-gray-500 mb-2">{currentYear} Financials</h4>
               <p className="text-3xl font-bold text-[#1C4E35] font-mono">{formatCurrency(yoyComparison?.currentYear.totalProfit || 0)}</p>
               <div className="flex justify-center gap-4 mt-4 text-xs">
                 <div className="text-[#52A870]">Revenue: <span className="font-mono">{formatCurrency(yoyComparison?.currentYear.totalRevenue || 0)}</span></div>
                 <div className="text-[#E24B4A]">Expenses: <span className="font-mono">{formatCurrency(yoyComparison?.currentYear.totalExpenses || 0)}</span></div>
               </div>
             </div>
             {/* Year B Summary */}
             <div className="p-5 bg-white border border-[#e5dfd4] rounded-xl shadow-sm text-center">
               <h4 className="text-sm font-semibold text-gray-500 mb-2">{compareYear} Financials</h4>
               <p className="text-3xl font-bold text-[#1C4E35] font-mono">{formatCurrency(yoyComparison?.previousYear.totalProfit || 0)}</p>
               <div className="flex justify-center gap-4 mt-4 text-xs">
                 <div className="text-[#52A870]">Revenue: <span className="font-mono">{formatCurrency(yoyComparison?.previousYear.totalRevenue || 0)}</span></div>
                 <div className="text-[#E24B4A]">Expenses: <span className="font-mono">{formatCurrency(yoyComparison?.previousYear.totalExpenses || 0)}</span></div>
               </div>
             </div>
          </div>
        </TabsContent>

        {/* ── TAB 6: PLANNING ── */}
        <TabsContent value="planning" className="space-y-8 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-[#1C4E35] text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
                  <div className="absolute -right-8 -bottom-8 opacity-10">
                     <CalcIcon className="h-40 w-40" />
                  </div>
                  <div className="relative z-10">
                    <Badge className="bg-[#D4840A] text-white border-none mb-4">New Tool</Badge>
                    <h2 className="text-3xl font-bold leading-tight">Investment Readiness</h2>
                    <p className="text-emerald-100/70 mt-3 text-sm leading-relaxed">
                      Don't guess your profit. Calculate your break-even point before buying seeds or hiring labour.
                    </p>
                    <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                      <DialogTrigger 
                        render={
                          <Button className="mt-8 w-full bg-white text-[#1C4E35] hover:bg-emerald-50 h-12 rounded-xl font-bold shadow-lg gap-2">
                            <CalcIcon className="h-5 w-5" />
                            Start New Calculator
                          </Button>
                        }
                      />
                      <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none">
                        <BreakEvenCalculator onSaveSuccess={() => setIsCalculatorOpen(false)} />
                      </DialogContent>
                    </Dialog>
                  </div>
               </div>

               <div className="bg-white border border-[#e5dfd4] rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Search className="h-4 w-4 text-[#D4840A]" />
                    Planning Strategy
                  </h3>
                  <div className="space-y-4">
                     <div className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                        <p className="text-xs text-gray-500">Analyze historical performance in the Ranking tab.</p>
                     </div>
                     <div className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                        <p className="text-xs text-gray-500">Run a simulation with expected market rates.</p>
                     </div>
                     <div className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                        <p className="text-xs text-gray-500">Save as a Crop Plan to compare targets with actual results.</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Your Saved Crop Plans</h3>
                  <div className="flex items-center gap-2">
                     <Button variant="ghost" size="sm" className="text-gray-400 group h-8">
                        <Layout className="h-4 w-4 mr-2 group-hover:text-[#1C4E35]" /> Grid
                     </Button>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cropPlans?.map(plan => (
                    <CropPlanCard 
                      key={plan._id} 
                      plan={plan} 
                      onEdit={() => {
                        setEditingPlanId(plan._id);
                        setIsCalculatorOpen(true);
                      }}
                    />
                  ))}
                  
                  {cropPlans?.length === 0 && (
                    <div className="col-span-2 py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center">
                       <CalcIcon className="h-12 w-12 text-gray-300 mb-4" />
                       <p className="text-gray-500 font-medium">No plans saved yet</p>
                       <p className="text-xs text-gray-400 mt-1 max-w-[250px]">
                          Use the calculator to simulate your next cultivation cycle.
                       </p>
                    </div>
                  )}

                  {cropPlans === undefined && (
                    <>
                      <div className="h-40 bg-gray-100 animate-pulse rounded-2xl" />
                      <div className="h-40 bg-gray-100 animate-pulse rounded-2xl" />
                    </>
                  )}
               </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 5: EFFICIENCY ── */}
        <TabsContent value="efficiency" className="space-y-6 focus-visible:outline-none min-w-0 overflow-hidden">
          {/* Scatter Plot */}
          <div className="bg-white border border-[#e5dfd4] rounded-xl shadow-sm p-6 min-w-0 overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Input vs. Output Efficiency</h3>
            <p className="text-sm text-gray-500 mb-6">Explore the relationship between expenses per acre and yield per acre across your crops. The size of the bubble indicates total farmland area used.</p>
            <ChartErrorBoundary title="Input vs Output Check">
              <YieldInputComparisonChart data={yieldEfficiency || []} />
            </ChartErrorBoundary>
          </div>

          {/* Efficiency Matrix Table */}
          <div className="bg-white border border-[#e5dfd4] rounded-xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Efficiency Matrix</h3>
                <p className="text-sm text-gray-500">A detailed breakdown comparing individual crop yields and costs against national benchmarks.</p>
              </div>
            </div>
            <ChartErrorBoundary title="Efficiency Matrix Check">
              <YieldEfficiencyMatrix data={yieldEfficiency || []} />
            </ChartErrorBoundary>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 border border-[#e5dfd4] rounded-xl shadow-sm bg-white p-5 flex flex-col justify-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Portfolio Report Radar</h3>
              <p className="text-xs text-gray-500 mb-4">Radar metric charting for across your entire operation based on cost-profit grades.</p>
              <ChartErrorBoundary title="Portfolio Radar">
                {ioRatio ? (
                  <div className="-mx-4">
                     <InputOutputRadarChart data={ioRadarData} />
                  </div>
                ) : (
                  <div className="h-64 animate-pulse bg-gray-50 rounded-lg"></div>
                )}
              </ChartErrorBoundary>
            </div>
            
            <div className="lg:col-span-2">
               <h3 className="text-lg font-semibold text-gray-800 mb-4">Crop Report Cards</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ioRatio?.map((grade, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -top-3 -right-2 bg-white px-3 py-1 shadow-sm rounded-full border border-gray-100 z-10 text-xs font-bold text-gray-700 capitalize">
                        {grade.cropName}
                      </div>
                      <CropGradeCard data={grade} />
                    </div>
                  ))}
                  {(!ioRatio || ioRatio.length === 0) && (
                    <div className="sm:col-span-2 p-8 text-center text-gray-500 bg-white border border-[#e5dfd4] rounded-xl">
                       No crop yields recorded yet to calculate efficiency grades.
                    </div>
                  )}
               </div>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

// ── FLOATING PLANNING BUTTON (FAB) ──
function PlanningFAB({ onClick }: { onClick: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button 
        onClick={onClick}
        className="h-14 w-14 rounded-full bg-[#D4840A] hover:bg-[#b56e09] text-white shadow-2xl flex items-center justify-center p-0 group overflow-hidden"
      >
        <CalcIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
        <span className="absolute left-0 right-0 bottom-1 text-[8px] font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity">PLAN</span>
      </Button>
    </div>
  );
}

function OverviewStatCard({ title, value, isProfit, icon, subtext }: { title: string, value: string, isProfit?: boolean, icon?: React.ReactNode, subtext?: string }) {
  return (
    <div className="bg-white border border-[#e5dfd4] shadow-sm rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
        {icon && <div className="p-1 rounded bg-[#F7F0E3]">{icon}</div>}
      </div>
      <p className={`text-2xl font-bold font-mono tracking-tight mb-1 ${isProfit !== undefined ? (isProfit ? 'text-[#52A870]' : 'text-[#E24B4A]') : 'text-[#1C4E35]'}`}>
        {value}
      </p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
}
