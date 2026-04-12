"use client";

import { useState } from "react";
import { useQuery, Authenticated } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatINR } from "@/lib/utils";
import { 
  BarChart3, 
  TrendingUp, 
  Sprout, 
  Map, 
  Calendar,
  Wallet,
  Activity,
  ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthlyProfitTrendChart } from "@/app/components/analytics/MonthlyProfitTrendChart";
import { SeasonComparisonChart } from "@/app/components/analytics/SeasonComparisonChart";

export default function AnalyticsPage() {
  return (
    <Authenticated>
      <AnalyticsContent />
    </Authenticated>
  );
}

function AnalyticsContent() {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const parsedYear = parseInt(year);

  const portfolio = useQuery(api.analytics.getPortfolioProfitSummary, { year: parsedYear });

  const bestCropName = portfolio?.cropBreakdown && portfolio.cropBreakdown.length > 0 
    ? portfolio.cropBreakdown[0].cropName 
    : undefined;

  const bestCropSeasons = useQuery(
    api.analytics.getSeasonComparison, 
    bestCropName ? { cropName: bestCropName } : "skip"
  );

  const isLoading = portfolio === undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            Financial Intelligence
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Analyze your entire operations, from overall ROIs to crop-specific seasonal trends.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border shadow-sm w-max">
          <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
          <Select value={year} onValueChange={val => val && setYear(val)}>
            <SelectTrigger className="w-28 h-8 border-transparent bg-transparent shadow-none focus:ring-0 font-bold">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isLoading && portfolio ? (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
          
          {/* ── Section 1: Portfolio Summary Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox 
              title="Net Profit" 
              value={formatINR(portfolio.grandTotalProfit)} 
              isProfit={portfolio.grandTotalProfit >= 0}
              subtext={
                portfolio.yearOverYearGrowth 
                  ? `${portfolio.yearOverYearGrowth.growthPercent.toFixed(1)}% vs last year` 
                  : "No prior year data"
              }
              trendUp={portfolio.yearOverYearGrowth ? portfolio.yearOverYearGrowth.growthPercent > 0 : undefined}
            />
            <StatBox 
              title="Annual Revenue" 
              value={formatINR(portfolio.grandTotalRevenue)} 
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              subtext={`Across ${portfolio.farmBreakdown.length} farms`}
            />
            <StatBox 
              title="Annual Expenses" 
              value={formatINR(portfolio.grandTotalExpenses)} 
              icon={<Wallet className="h-4 w-4 text-rose-500" />}
              subtext="Operational & material costs"
            />
            <StatBox 
              title="Overall ROI" 
              value={`${portfolio.roiPercent.toFixed(2)}%`} 
              icon={<Activity className="h-4 w-4 text-blue-500" />}
              subtext={`Avg Margin: ${portfolio.averageProfitMargin.toFixed(1)}%`}
            />
          </div>

          {/* ── Section 2: Trend Chart ── */}
          <MonthlyProfitTrendChart data={portfolio.monthlyProfitTrend} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ── Section 3: Farm Comparison ── */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Map className="h-4 w-4 text-emerald-600" />
                  Farm Performance
                </CardTitle>
                <CardDescription>Profit and margins across your locations</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/10 text-xs uppercase text-muted-foreground border-b">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Farm Name</th>
                        <th className="px-5 py-3 font-semibold text-right">Revenue</th>
                        <th className="px-5 py-3 font-semibold text-right">Profit</th>
                        <th className="px-5 py-3 font-semibold text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {portfolio.farmBreakdown.map((farm: any, i: number) => (
                        <tr key={farm.farmId} className="hover:bg-muted/30">
                          <td className="px-5 py-3 font-medium">{farm.farmName}</td>
                          <td className="px-5 py-3 text-right font-mono">{formatINR(farm.revenue)}</td>
                          <td className={`px-5 py-3 text-right font-bold font-mono ${farm.profit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {formatINR(farm.profit)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${farm.margin >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {farm.margin.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {portfolio.farmBreakdown.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No farm data found for {year}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ── Section 4: Crop Comparison ── */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-emerald-600" />
                  Crop Portfolio
                </CardTitle>
                <CardDescription>Aggregate profitability by crop variety</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/10 text-xs uppercase text-muted-foreground border-b">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Variety</th>
                        <th className="px-5 py-3 font-semibold text-right">Revenue</th>
                        <th className="px-5 py-3 font-semibold text-right">Profit</th>
                        <th className="px-5 py-3 font-semibold text-right">ROI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {portfolio.cropBreakdown?.map((crop: any, i: number) => {
                        const roi = crop.expenses > 0 ? (crop.profit / crop.expenses) * 100 : 0;
                        return (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="px-5 py-3 font-medium capitalize">{crop.cropName}</td>
                            <td className="px-5 py-3 text-right font-mono">{formatINR(crop.revenue)}</td>
                            <td className={`px-5 py-3 text-right font-bold font-mono ${crop.profit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                              {formatINR(crop.profit)}
                            </td>
                            <td className="px-5 py-3 text-right font-medium">
                              {roi.toFixed(0)}%
                            </td>
                          </tr>
                        )
                      })}
                      {(!portfolio.cropBreakdown || portfolio.cropBreakdown.length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No crop data found for {year}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Section 5: Best Crop Season Comparison ── */}
          {bestCropName && bestCropSeasons && bestCropSeasons.length > 0 && (
            <div className="pt-4">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                Deep Dive: Best Performing Variety
              </h3>
              <SeasonComparisonChart cropName={bestCropName} data={bestCropSeasons} />
            </div>
          )}

        </div>
      ) : (
        <div className="h-[60vh] flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4 text-emerald-600">
            <BarChart3 className="h-10 w-10 opacity-50" />
            <p className="font-bold opacity-50">Analyzing financial data...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ 
  title, value, isProfit, icon, subtext, trendUp 
}: { 
  title: string, value: string, isProfit?: boolean, icon?: React.ReactNode, subtext?: string, trendUp?: boolean 
}) {
  return (
    <Card className="shadow-sm border-border/50 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          {icon && <div className="p-1 rounded bg-muted/60">{icon}</div>}
        </div>
        <p className={`text-2xl font-extrabold tracking-tight mb-1 ${isProfit !== undefined ? (isProfit ? 'text-emerald-600' : 'text-rose-500') : ''}`}>
          {value}
        </p>
        <div className="flex items-center gap-1 mt-2">
          {trendUp !== undefined && (
            <div className={`flex items-center justify-center h-4 w-4 rounded-full ${trendUp ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
              <ArrowUpRight className={`h-3 w-3 ${!trendUp && 'rotate-90'}`} />
            </div>
          )}
          <p className="text-[10px] font-medium text-muted-foreground">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}
