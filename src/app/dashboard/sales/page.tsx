"use client";

import { useQuery, Authenticated } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useMemo } from "react";
import { formatINR } from "@/lib/utils";
import { 
  TrendingUp, 
  ChevronRight, 
  ShoppingCart, 
  Users, 
  Filter, 
  BarChart3, 
  AlertTriangle,
  Plus,
  Home,
  Sprout,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { SaleList } from "@/app/components/sales/SaleList";
import { SalesRevenueChart } from "@/app/components/sales/SalesRevenueChart";
import { AddSaleForm } from "@/app/components/sales/AddSaleForm";
import { SalesInsightsPanel } from "@/app/components/sales/SalesInsightsPanel";
import { RateCalculatorWidget } from "@/app/components/sales/RateCalculatorWidget";
import { SalesReportPDFButton } from "@/app/components/sales/SalesReportPDF";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend 
} from "recharts";
import Link from "next/link";
import { Id } from "../../../../convex/_generated/dataModel";

export default function GlobalSalesPage() {
  return (
    <Authenticated>
      <SalesContent />
    </Authenticated>
  );
}

function SalesContent() {
  const [farmFilter, setFarmFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCropId, setSelectedCropId] = useState<Id<"crops"> | null>(null);

  const farms = useQuery(api.farms.listFarms) || [];
  const crops = useQuery(api.crops.listAllCrops) || [];
  const summaryRaw = useQuery(api.sales.getSaleSummaryAllFarms, { year: parseInt(yearFilter) });

  const summary = summaryRaw || {
    totalRevenue: 0,
    totalPendingAmount: 0,
    bySaleType: {},
    monthlyRevenue: [],
    bestSellingCrop: null,
    bestBuyer: null,
  };

  const donutData = useMemo(() => {
    if (!summary.bySaleType) return [];
    return Object.entries(summary.bySaleType).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  }, [summary.bySaleType]);

  const COLORS = ["#1C4E35", "#10b981", "#6366f1", "#94a3b8"];

  const handleRecordSale = () => {
    setSelectedCropId(null);
    setAddOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground font-medium mb-1">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Sales</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">All Sales</h1>
            <Badge variant="secondary" className="px-2 py-0 h-5 text-xs">
              {summaryRaw?.saleCount || 0} Records
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SalesReportPDFButton farmId={farmFilter === "all" ? undefined : (farmFilter as Id<"farms">)} year={parseInt(yearFilter)} />
          <Link href="/dashboard/sales/buyers">
            <Button variant="outline" className="gap-2 h-10">
              <Users className="h-4 w-4" />
              Manage Buyers
            </Button>
          </Link>
          <Button className="bg-[#1C4E35] hover:bg-[#163d29] text-white gap-2 h-10 shadow-lg shadow-emerald-900/10" onClick={handleRecordSale}>
            <Plus className="h-4 w-4" />
            Record Sale
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard 
          label="Total Revenue" 
          value={formatINR(summary.totalRevenue)} 
          description="All time"
          icon={<DollarSign className="h-4 w-4" />}
          color="bg-emerald-50 text-emerald-700 border-emerald-100"
        />
        <SummaryCard 
          label="Annual Sales" 
          value={formatINR(summary.totalRevenue)} // Note: getSaleSummaryAllFarms is filtered by year, so this is annual
          description={`Year ${yearFilter}`}
          icon={<TrendingUp className="h-4 w-4" />}
          color="bg-emerald-50 text-emerald-700 border-emerald-100"
        />
        <SummaryCard 
          label="Pending" 
          value={formatINR(summary.totalPendingAmount)} 
          description="Awaiting collection"
          icon={<ShoppingCart className="h-4 w-4" />}
          color="bg-rose-50 text-rose-700 border-rose-100"
          alert={summary.totalPendingAmount > 0}
        />
        <SummaryCard 
          label="Best Selling" 
          value={summary.bestSellingCrop?.cropName || "—"} 
          description={summary.bestSellingCrop ? formatINR(summary.bestSellingCrop.totalRevenue) : "No sales data"}
          icon={<Sprout className="h-4 w-4" />}
          color="bg-blue-50 text-blue-700 border-blue-100"
        />
        <SummaryCard 
          label="Top Buyer" 
          value={summary.bestBuyer?.buyerName || "—"} 
          description={summary.bestBuyer ? `${summary.bestBuyer.transactionCount} transactions` : "No buyer data"}
          icon={<Users className="h-4 w-4" />}
          color="bg-purple-50 text-purple-700 border-purple-100"
        />
      </div>

      {/* ── Pending Alert Banner ── */}
      {summary.totalPendingAmount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600 animate-pulse" />
            </div>
            <div>
              <p className="font-bold sm:text-lg leading-tight">Attention: Pending Payments</p>
              <p className="text-xs sm:text-sm font-medium opacity-90">
                You have {formatINR(summary.totalPendingAmount)} in pending payments from your buyers. Review and follow up.
              </p>
            </div>
          </div>
          <Button variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0 font-bold" onClick={() => {
            const el = document.getElementById('sale-list-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}>
            View Pending
          </Button>
        </div>
      )}

      {/* ── AI Sales Insights ── */}
      <SalesInsightsPanel farmId={farmFilter === "all" ? undefined : (farmFilter as Id<"farms">)} />

      {/* ── Charts Development ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Monthly Revenue
            </CardTitle>
            <CardDescription>Revenue and cash flow trends over time</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <SalesRevenueChart monthlyRevenue={summary.monthlyRevenue} />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Revenue by Sale Type
            </CardTitle>
            <CardDescription>Mandi vs Direct vs Contract sales</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: any) => formatINR(val as number)} />
                  <RechartsLegend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No categorical sales data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground mr-2 font-bold uppercase tracking-wider text-[10px]">
          <Filter className="h-3 w-3" />
          Filter Data
        </div>
        <Select value={farmFilter} onValueChange={val => val && setFarmFilter(val)}>
          <SelectTrigger className="w-full sm:w-52 h-10 rounded-xl bg-card">
            <Home className="h-4 w-4 text-muted-foreground mr-1" />
            <SelectValue placeholder="All Farms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Farms</SelectItem>
            {farms.map(f => <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={yearFilter} onValueChange={val => val && setYearFilter(val)}>
          <SelectTrigger className="w-full sm:w-32 h-10 rounded-xl bg-card">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Sale List ── */}
      <div id="sale-list-section" className="space-y-4">
        <SaleList farmId={farmFilter === "all" ? undefined : (farmFilter as Id<"farms">)} year={parseInt(yearFilter)} />
      </div>

      {/* ── Add Sale Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCropId ? "Record Sale" : "Start Registration"}</DialogTitle>
          </DialogHeader>
          {!selectedCropId ? (
            <div className="space-y-4 py-4">
              <p className="text-sm font-medium text-muted-foreground">Select a crop cycle to record a sale for:</p>
              <div className="grid gap-2 max-h-60 overflow-y-auto no-scrollbar">
                {crops.filter(c => c.status === "active").map(crop => (
                  <button 
                    key={crop._id} 
                    onClick={() => setSelectedCropId(crop._id)}
                    className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/50 transition-all text-left"
                  >
                    <div>
                      <p className="font-bold text-sm">{crop.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Home className="h-2.5 w-2.5" /> {crop.farmName}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
              {crops.filter(c => c.status === "active").length === 0 && (
                <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed font-medium text-muted-foreground">
                  No active crops found.
                </div>
              )}
            </div>
          ) : (
            <AddSaleForm cropId={selectedCropId} onSuccess={() => { setAddOpen(false); setSelectedCropId(null); }} />
          )}
        </DialogContent>
      </Dialog>
      
      {/* ── Floating Calculator Widget ── */}
      <RateCalculatorWidget />
    </div>
  );
}

function SummaryCard({ label, value, description, icon, color, alert }: { label: string, value: string, description: string, icon: any, color: string, alert?: boolean }) {
  return (
    <Card className={`shadow-sm border-none ${color}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 leading-none">{label}</p>
          <div className="p-1 px-1.5 rounded bg-white/40">
            {icon}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xl font-extrabold tracking-tight leading-none">{value}</p>
            {alert && <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse mt-0.5" />}
          </div>
          <p className="text-[10px] font-medium opacity-80 leading-none truncate">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
