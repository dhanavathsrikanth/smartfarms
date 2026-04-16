import { TrendingUp, Minus, TrendingDown, ArrowRight, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";

interface Props {
  benchmarkData: {
    farmerYieldPerAcre: number | null;
    nationalAvgPerAcre: number | null;
    differencePercent: number | null;
    performanceLabel: "Above Average" | "At Average" | "Below Average" | null;
    gapToClose: number | null;
    potentialExtraRevenue: number | null;
    message?: string;
  };
}

export function YieldVsBenchmarkCard({ benchmarkData }: Props) {
  if (!benchmarkData.nationalAvgPerAcre) {
    return (
      <div className="bg-white border border-border shadow-sm rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[220px]">
        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Activity className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">Benchmark data not available</p>
        <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
          We don't currently have national average data for this specific crop variety.
        </p>
      </div>
    );
  }

  if (!benchmarkData.farmerYieldPerAcre) {
    return (
      <div className="bg-white border border-border shadow-sm rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[220px]">
        <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
          <Activity className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-sm font-medium text-gray-600">National avg: <span className="font-bold text-gray-900">{((benchmarkData.nationalAvgPerAcre || 0) / 100).toFixed(2)} q/ac</span></p>
        <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
          Record your harvest to see how your yield compares to the national average.
        </p>
      </div>
    );
  }

  const {
    farmerYieldPerAcre,
    nationalAvgPerAcre,
    differencePercent,
    performanceLabel,
    gapToClose,
    potentialExtraRevenue,
  } = benchmarkData;

  const farmerQ = farmerYieldPerAcre / 100;
  const nationalQ = nationalAvgPerAcre / 100;

  let badgeColor = "bg-amber-100 text-amber-800";
  let Icon = Minus;
  
  if (performanceLabel === "Above Average") {
    badgeColor = "bg-emerald-100 text-emerald-800";
    Icon = TrendingUp;
  } else if (performanceLabel === "Below Average") {
    badgeColor = "bg-rose-100 text-rose-800";
    Icon = TrendingDown;
  }

  return (
    <div className="bg-white border border-border shadow-sm rounded-xl p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">National Benchmark</h3>
          <Badge className={`gap-1 border-none font-bold ${badgeColor} hover:${badgeColor}`}>
            <Icon className="h-3 w-3 shrink-0" />
            {performanceLabel}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-center flex-1">
            <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Your Yield</p>
            <p className="text-3xl font-mono font-bold text-[#1C4E35]">{farmerQ.toFixed(1)}</p>
            <p className="text-xs text-gray-400">q/ac</p>
          </div>
          
          <div className="flex flex-col items-center shrink-0">
            <div className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full mb-1">VS</div>
            <ArrowRight className="h-4 w-4 text-gray-300 hidden sm:block" />
          </div>

          <div className="text-center flex-1 opacity-70">
            <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">National Avg</p>
            <p className="text-3xl font-mono font-bold text-gray-600">{nationalQ.toFixed(1)}</p>
            <p className="text-xs text-gray-400">q/ac</p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-gray-100">
        {performanceLabel === "Above Average" ? (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-emerald-100 p-1.5 shrink-0">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              You produce <span className="font-bold text-emerald-700">{Math.abs(differencePercent || 0).toFixed(1)}% more</span> than the national average. Excellent farming practices!
            </p>
          </div>
        ) : performanceLabel === "Below Average" ? (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 shrink-0">
              <TrendingDown className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Closing the yield gap of {(gapToClose! / 100).toFixed(1)} q/ac could earn you roughly <span className="font-bold text-[#D4840A]">{formatCurrency(potentialExtraRevenue || 0)}</span> more per season.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-blue-100 p-1.5 shrink-0">
              <Minus className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Your yield is right on par with the national average. Focus on cost efficiency to boost margins further.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
