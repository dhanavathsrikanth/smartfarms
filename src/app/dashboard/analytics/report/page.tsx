"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { 
  FileText, 
  Settings, 
  Share2, 
  Download, 
  Eye, 
  Check, 
  Loader2, 
  ChevronLeft,
  Calendar,
  Building2,
  Filter,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";

// Dynamically import ALL @react-pdf/renderer components + FinancialReportPDF
// to avoid SSR issues (they use browser-only layout APIs)
const FinancialReportPDF = dynamic(
  () => import("@/app/components/analytics/FinancialReportPDF").then((mod) => mod.FinancialReportPDF),
  { ssr: false }
);

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false }
);

const AVAILABLE_YEARS = [2022, 2023, 2024, 2025, 2026];

export default function FinancialReportPage() {
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [selectedFarm, setSelectedFarm] = useState<string>("all");
  const [reportType, setReportType] = useState<string>("full");
  const [sections, setSections] = useState({
    executiveSummary: true,
    incomeStatement: true,
    cropPerformance: true,
    salesAnalysis: true,
    expenseBreakdown: true,
    yearComparison: true
  });

  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Queries
  const farms = useQuery(api.farms.listFarms);
  const generateReport = useAction(api.analytics.generateFullFinancialReport);

  const handleGeneratePreview = async () => {
    setIsLoading(true);
    setReportData(null);
    try {
      const result = await generateReport({
        year: parseInt(selectedYear),
        farmId: selectedFarm === "all" ? undefined : (selectedFarm as Id<"farms">)
      });
      setReportData(result);
    } catch (err) {
      toast.error("Failed to fetch report data. " + (err instanceof Error ? err.message : ""));
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh preview when year or farm selection changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { handleGeneratePreview(); }, [selectedYear, selectedFarm]);

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleWhatsAppShare = () => {
    if (!reportData) return;
    const { reportMeta, executive_summary } = reportData;
    const text = `*KhetSmart Farm Report [${selectedYear}]*%0A%0A` +
      `👤 Farmer: ${reportMeta.farmerName}%0A` +
      `🚜 Farm: ${reportMeta.farmName}%0A%0A` +
      `💰 Revenue: ₹${executive_summary.totalRevenue.toLocaleString("en-IN")}%0A` +
      `💸 Expenses: ₹${executive_summary.totalExpenses.toLocaleString("en-IN")}%0A` +
      `📈 Profit: ₹${executive_summary.totalProfit.toLocaleString("en-IN")} (${executive_summary.profitMarginPercent.toFixed(1)}% margin)%0A` +
      `⭐ Best Crop: ${executive_summary.bestCrop}%0A%0A` +
      `Check your full report in the SmartFarm dashboard.`;
    
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaf7]">
      {/* --- HEADER --- */}
      <div className="border-b bg-white px-8 py-4 sticky top-0 z-30 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/analytics">
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-emerald-50 text-gray-400 hover:text-[#1C4E35]">
                <ChevronLeft className="h-5 w-5" />
             </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#1C4E35] flex items-center gap-2">
               <FileText className="h-5 w-5" />
               Professional Financial Report
            </h1>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">Annual Performance Review — Module 5</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button 
             variant="outline" 
             onClick={handleWhatsAppShare}
             disabled={!reportData}
             className="gap-2 border-emerald-100 text-[#1C4E35] hover:bg-emerald-50"
           >
              <Share2 className="h-4 w-4" />
              WhatsApp Summary
           </Button>

           {reportData ? (
             <PDFDownloadLink
                document={<FinancialReportPDF data={reportData} />}
                fileName={`KhetSmart_Report_${selectedYear}_${reportData.reportMeta.farmerName.replace(/\s+/g, '_')}.pdf`}
             >
                {/* @ts-ignore */}
                {({ loading }) => (
                   <Button 
                     disabled={loading}
                     className="gap-2 bg-[#1C4E35] hover:bg-[#143a28] shadow-lg shadow-emerald-700/10 min-w-[140px]"
                   >
                     {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                     {loading ? "Preparing PDF..." : "Download Full PDF"}
                   </Button>
                )}
             </PDFDownloadLink>
           ) : (
             <Button disabled className="gap-2 bg-gray-100 text-gray-400 min-w-[140px]">
                <Download className="h-4 w-4" />
                Download PDF
             </Button>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6">
        {/* --- CONFIGURATION PANEL (LEFT) --- */}
        <div className="w-full md:w-80 space-y-6 flex flex-col overflow-y-auto pr-2">
           <Card className="border-[#e5dfd4] shadow-sm">
              <CardHeader className="pb-3 border-b border-[#e5dfd4]/50 bg-gray-50/50">
                 <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-gray-400" />
                    <CardTitle className="text-sm">Report Configuration</CardTitle>
                 </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                 <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                       <Calendar className="h-3 w-3" /> REPORT YEAR
                    </Label>
                    <Select value={selectedYear} onValueChange={(v) => { if (v) setSelectedYear(v); }}>
                       <SelectTrigger className="border-[#e5dfd4]">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          {AVAILABLE_YEARS.map(y => (
                             <SelectItem key={y} value={y.toString()}>{y} Fiscal Year</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>

                 <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                       <Building2 className="h-3 w-3" /> TARGET FARM
                    </Label>
                    <Select value={selectedFarm} onValueChange={(v) => { if (v !== null) setSelectedFarm(v); }}>
                       <SelectTrigger className="border-[#e5dfd4]">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="all">Consolidated (All Farms)</SelectItem>
                          {farms?.map(f => (
                             <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>

                 <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                       <Filter className="h-3 w-3" /> REPORT TYPE
                    </Label>
                    <Select value={reportType} onValueChange={(v) => { if (v) setReportType(v); }}>
                       <SelectTrigger className="border-[#e5dfd4]">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="full">Comprehensive Annual</SelectItem>
                          <SelectItem value="performance">Crop Performance Only</SelectItem>
                          <SelectItem value="financial">Income Statement Only</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
              </CardContent>
           </Card>

           <Card className="border-[#e5dfd4] shadow-sm flex-1">
              <CardHeader className="pb-3 border-b border-[#e5dfd4]/50 bg-gray-50/50">
                 <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <CardTitle className="text-sm">Included Sections</CardTitle>
                 </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                 {Object.entries({
                   executiveSummary: "Executive Summary",
                   incomeStatement: "Income Statement (P&L)",
                   cropPerformance: "Crop Performance Table",
                   salesAnalysis: "Sales & Buyer Analysis",
                   expenseBreakdown: "Detailed Expense Distribution",
                   yearComparison: "Year-over-Year Progression"
                 }).map(([key, label]) => (
                   <div key={key} className="flex items-start gap-3 group cursor-pointer" onClick={() => toggleSection(key as any)}>
                      <div className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors"
                        style={{ 
                          backgroundColor: (sections as any)[key] ? '#1C4E35' : 'transparent',
                          borderColor: (sections as any)[key] ? '#1C4E35' : '#d1d5db'
                        }}
                      >
                        {(sections as any)[key] && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <label htmlFor={key} className="text-xs font-medium leading-relaxed group-hover:text-[#1C4E35] transition-colors cursor-pointer">
                        {label}
                      </label>
                   </div>
                 ))}
                 
                 <div className="pt-4 mt-2 border-t border-[#e5dfd4]">
                    <Button 
                      className="w-full h-10 gap-2 border-[#1C4E35]/20 text-[#1C4E35] bg-emerald-50/30 hover:bg-emerald-50"
                      variant="outline"
                      onClick={handleGeneratePreview}
                      disabled={isLoading}
                    >
                       {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                       Refresh Preview
                    </Button>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* --- PREVIEW PANEL (RIGHT) --- */}
        <div className="flex-1 flex flex-col min-h-[400px]">
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                 <Badge variant="outline" className="text-[10px] font-bold uppercase py-0.5 border-[#e5dfd4]">Preview</Badge>
                 <span className="text-[10px] text-gray-400 font-medium">Interactive PDF Render</span>
              </div>
              {isLoading && (
                 <div className="flex items-center gap-2 text-xs text-amber-600 animate-pulse bg-amber-50 px-3 py-1 rounded-full">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Calculating Metrics...
                 </div>
              )}
           </div>

           <Card className="flex-1 overflow-hidden border-[#e5dfd4] relative bg-[#525659] shadow-inner">
              {reportData && !isLoading ? (
                 <div className="w-full h-full">
                    <PDFViewer width="100%" height="100%" showToolbar={false} className="border-none shadow-2xl">
                       <FinancialReportPDF data={reportData} />
                    </PDFViewer>
                 </div>
              ) : isLoading ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-white space-y-6">
                    <div className="relative">
                       <div className="w-24 h-24 rounded-full border-4 border-emerald-50 border-t-emerald-600 animate-spin" />
                       <FileText className="h-10 w-10 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div>
                       <h3 className="text-lg font-bold text-gray-900">Crunching Your Farm Data</h3>
                       <p className="text-sm text-gray-500 max-w-xs mt-2">
                          We are aggregating your expenses, sales, and yields across all farms to build a verified financial statement.
                       </p>
                    </div>
                    <div className="w-64 space-y-2">
                       <Skeleton className="h-3 w-full" />
                       <Skeleton className="h-3 w-3/4 mx-auto" />
                    </div>
                 </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-white opacity-40">
                   <div className="p-5 bg-gray-50 rounded-full mb-6">
                      <FileText className="h-16 w-16 text-gray-300" />
                   </div>
                   <h3 className="text-xl font-bold text-gray-900">Generate Your First Report</h3>
                   <p className="text-sm text-gray-500 max-w-xs mt-3">
                      Select a year and farm to start your comprehensive financial review.
                   </p>
                   <Button 
                     onClick={handleGeneratePreview}
                     className="mt-8 bg-[#1C4E35] gap-2 rounded-xl h-12 px-8"
                   >
                     Initialize Report Data
                     <ArrowRight className="h-4 w-4" />
                   </Button>
                </div>
              )}
           </Card>
        </div>
      </div>
    </div>
  );
}
