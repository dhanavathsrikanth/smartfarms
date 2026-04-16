import React from "react";
import { formatCurrency } from "@/lib/formatters";

interface BreakEvenProgressBarProps {
  data: {
    breakEvenAchieved: boolean;
    breakEvenProgressPercent: number; // 0-100
    revenueSoFar: number;
    remainingWeightToBreakEven: number;
    breakEvenRatePerKg: number;
  };
}

export function BreakEvenProgressBar({ data }: BreakEvenProgressBarProps) {
  return (
    <div className="w-full flex flex-col gap-3 font-sans">
      <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden relative shadow-inner">
         <div 
           className={`h-full transition-all duration-700 ease-out ${data.breakEvenAchieved ? 'bg-[#1C4E35]' : 'bg-[#D4840A]'}`}
           style={{ width: `${data.breakEvenProgressPercent}%` }}
         />
         
         {/* The break-even marker is ALWAYS at 100% boundary of the mathematical ratio. 
            Actually, the bar represents progress TO break even. So break even point is ALWAYS 100% of the bar width. 
            If the progress is <100, we haven't hit it. If >= 100, it's totally filled.
         */}
         <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#E24B4A] z-10 hidden" title="Break-even point" /> 
      </div>

      <div className="flex justify-center text-sm font-medium">
        {data.breakEvenAchieved ? (
          <span className="text-[#1C4E35] px-3 py-1 bg-green-50 rounded-full border border-green-200 shadow-sm">
            ✅ Break-even achieved! <span className="font-mono">{formatCurrency(data.revenueSoFar)}</span> generated.
          </span>
        ) : (
          <span className="text-[#D4840A] px-3 py-1 bg-amber-50 rounded-full border border-amber-200 shadow-sm">
            ⚠️ Need <span className="font-mono">{data.remainingWeightToBreakEven.toFixed(1)} kg</span> more sold at target rate 
            <span className="font-mono ml-1 text-gray-500">(@{formatCurrency(data.breakEvenRatePerKg)}/kg)</span> to cover costs.
          </span>
        )}
      </div>
    </div>
  );
}
