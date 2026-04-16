"use client";

import { useState, useMemo } from "react";
import { useQuery, Authenticated, AuthLoading } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { 
  BarChart3, 
  ChevronRight, 
  Loader2, 
  Wheat, 
  Sprout, 
  AlertTriangle,
  Scale
} from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

// Yield Components
import { YieldVsBenchmarkCard } from "@/app/components/yields/YieldVsBenchmarkCard";
import { YieldEfficiencyMatrix } from "@/app/components/yields/YieldEfficiencyMatrix";
import { YieldInputComparisonChart } from "@/app/components/yields/YieldInputComparisonChart";
import { HarvestCalendar } from "@/app/components/yields/HarvestCalendar";

export default function GlobalYieldsPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <AuthLoading>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1C4E35]" />
        </div>
      </AuthLoading>
      <Authenticated>
        <YieldsDashboard />
      </Authenticated>
    </div>
  );
}

function YieldsDashboard() {
  const currentYearOptions = useMemo(() => Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i), []);
  const [year, setYear] = useState<number>(currentYearOptions[0]);
  const [season, setSeason] = useState<string>("all");

  const yields = useQuery(api.yields.listAllYields, { 
    year, 
    season: season !== "all" ? season : undefined 
  });
  
  const allCrops = useQuery(api.crops.listAllCrops);
  const matrixData = useQuery(api.yields.getYieldEfficiencyMatrix, { year });

  // Compute summary stats
  const summary = useMemo(() => {
    if (!yields || !allCrops) return null;

    let totalYieldQuintal = 0;
    let totalAreaAcres = 0;
    let bestCropMatch = { name: "N/A", yield: 0 };

    yields.forEach(y => {
      totalYieldQuintal += (y.yieldPerAcreQuintal * (y.area || 1)); // total quintal approx
      totalAreaAcres += (y.area || 1);
      
      if (y.yieldPerAcreQuintal > bestCropMatch.yield) {
        bestCropMatch = { name: y.cropName, yield: y.yieldPerAcreQuintal };
      }
    });

    const averageYieldPerAc = totalAreaAcres > 0 ? (totalYieldQuintal / totalAreaAcres) : 0;

    // Crops without yield: harvested but no yield record
    const yieldedCropIds = new Set(yields.map(y => y.cropId));
    let missingYieldsCount = 0;
    allCrops.forEach(c => {
      // Apply filters manually to 'allCrops' for missing check
      if (c.year === year && (season === "all" || c.season === season)) {
        if (c.status === "harvested" && !yieldedCropIds.has(c._id)) {
          missingYieldsCount++;
        }
      }
    });

    return {
      totalYieldQuintal,
      averageYieldPerAc,
      bestCropMatch,
      missingYieldsCount
    };
  }, [yields, allCrops, year, season]);

  // Unique crop names for benchmarks
  const uniqueCropNames = useMemo(() => {
    if (!allCrops) return [];
    const names = new Set<string>();
    allCrops.forEach(c => {
      if (c.year === year && (season === "all" || c.season === season)) {
        names.add(c.name);
      }
    });
    return Array.from(names);
  }, [allCrops, year, season]);

  if (!summary || !yields || !matrixData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin text-[#1C4E35]" />
        <span className="text-gray-500 font-medium">Gathering harvest data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-900">Yields</span>
      </nav>

      {/* ── Header & Filters ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            <Wheat className="h-8 w-8 text-[#D4840A]" />
            Harvest Yields
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Track what your land actually produces and measure efficiency.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-gray-200 shadow-sm">
             <FilterSelect 
               value={year.toString()} 
               options={currentYearOptions.map(y => ({ label: y.toString(), value: y.toString() }))}
               onChange={(v) => setYear(Number(v))}
             />
             <div className="w-px h-4 bg-gray-200 mx-1"></div>
             <FilterSelect 
               value={season} 
               options={[
                 {label: "All Seasons", value: "all"},
                 {label: "Kharif", value: "kharif"},
                 {label: "Rabi", value: "rabi"},
                 {label: "Zaid", value: "zaid"},
                 {label: "Annual", value: "annual"},
               ]}
               onChange={setSeason}
             />
          </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label={`Total Yield (${year})`}
          value={`${summary.totalYieldQuintal.toFixed(0)} q`}
          icon={<Scale className="h-5 w-5 text-emerald-600" />}
          bg="bg-emerald-50"
          valueClass="text-[#1C4E35] font-mono"
        />
        <StatCard 
          label="Avg Yield per Acre"
          value={`${summary.averageYieldPerAc.toFixed(2)} q/ac`}
          icon={<Wheat className="h-5 w-5 text-[#D4840A]" />}
          bg="bg-[#F7F0E3]"
        />
        <StatCard 
          label="Best Performer"
          value={summary.bestCropMatch.name}
          subValue={`${summary.bestCropMatch.yield.toFixed(1)} q/ac`}
          icon={<Sprout className="h-5 w-5 text-blue-600" />}
          bg="bg-blue-50"
        />
        <StatCard 
          label="Missing Yield Entries"
          value={summary.missingYieldsCount.toString()}
          icon={<AlertTriangle className={`h-5 w-5 ${summary.missingYieldsCount > 0 ? 'text-amber-600' : 'text-gray-400'}`} />}
          bg={summary.missingYieldsCount > 0 ? "bg-amber-50" : "bg-gray-50"}
          valueClass={summary.missingYieldsCount > 0 ? "text-amber-700" : "text-gray-600"}
          subValue={summary.missingYieldsCount > 0 ? "Requires attention" : "All up to date"}
        />
      </div>

      {/* ── Benchmarks ── */}
      {uniqueCropNames.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <h2 className="text-xl font-bold text-gray-900">How Do You Compare?</h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
             {uniqueCropNames.map(cropName => (
               <div key={cropName} className="min-w-[300px] w-[350px] shrink-0">
                 <BenchmarkWrapper cropName={cropName} />
               </div>
             ))}
          </div>
        </div>
      )}

      {/* ── Main Data Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            {/* Efficiency Matrix */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <div className="mb-6">
                 <h2 className="text-lg font-bold text-gray-900">Efficiency Matrix</h2>
                 <p className="text-sm text-gray-500">Grading every crop's yield vs expenses per acre.</p>
               </div>
               <YieldEfficiencyMatrix data={matrixData} />
            </div>

            {/* Scatter Plot */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <div className="mb-6">
                 <h2 className="text-lg font-bold text-gray-900">Investment vs Yield — Find Your Sweet Spot</h2>
                 <p className="text-sm text-gray-500">Visualize whether higher inputs actually led to higher yields.</p>
               </div>
               <YieldInputComparisonChart data={matrixData} />
            </div>
         </div>

         <div className="lg:col-span-1 space-y-8">
            {/* Calendar */}
            <div>
               <h2 className="text-lg font-bold text-gray-900 mb-4 px-1">Harvest Schedule</h2>
               <HarvestCalendar yieldRecords={yields} />
            </div>
         </div>
      </div>

    </div>
  );
}

// ── Helpers ──

function FilterSelect({ value, options, onChange }: { value: string, options: {label: string, value: string}[], onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectTrigger className="border-none bg-transparent shadow-none focus:ring-0 font-semibold p-0 pr-1 h-7">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function StatCard({ label, value, icon, bg, valueClass, subValue }: any) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center gap-4">
      <div className={`shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">{label}</p>
        <div className="flex items-baseline gap-2">
           <p className={`text-2xl font-bold ${valueClass || "text-gray-900"}`}>{value}</p>
           {subValue && <span className="text-xs font-semibold text-gray-400">{subValue}</span>}
        </div>
      </div>
    </div>
  );
}

/** Wrapper so we can use hooks inside a loop map safely */
function BenchmarkWrapper({ cropName }: { cropName: string }) {
  const benchmarkData = useQuery(api.yields.getYieldBenchmarkComparison, { cropName });
  if (benchmarkData === undefined) return <div className="h-64 rounded-xl bg-gray-50 animate-pulse border border-gray-100" />;
  return <div className="h-full"><YieldVsBenchmarkCard benchmarkData={benchmarkData} /></div>;
}
