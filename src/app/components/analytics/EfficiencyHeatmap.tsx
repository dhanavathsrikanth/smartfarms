import React from "react";
import { formatCurrency } from "@/lib/formatters";

interface HeatmapCategory {
  category: string;
  months: number[]; // Array of 12 numbers representing spend each month
}

interface EfficiencyHeatmapProps {
  data: HeatmapCategory[];
}

export function EfficiencyHeatmap({ data }: EfficiencyHeatmapProps) {
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Find max spend to calculate heat levels
  let maxSpend = 0;
  data.forEach(row => {
    row.months.forEach(val => {
      if (val > maxSpend) maxSpend = val;
    });
  });

  const getHeatIntensity = (val: number) => {
    if (val === 0) return "bg-white border-gray-100 text-transparent"; // Empty
    if (maxSpend === 0) return "bg-gray-100";
    
    const ratio = val / maxSpend;
    if (ratio < 0.33) return "bg-green-100 hover:bg-green-200 border-green-200 text-green-900"; // Low
    if (ratio < 0.66) return "bg-[#52A870] bg-opacity-70 border-[#52A870] hover:bg-opacity-90 text-white"; // Medium
    return "bg-[#1C4E35] border-[#1C4E35] text-white"; // High
  };

  return (
    <div className="w-full bg-[#fcfcfc] rounded-xl shadow-sm border border-[#e5dfd4] p-4 overflow-x-auto font-sans">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
           <div className="col-span-1"></div> {/* Empty corner */}
           {monthLabels.map(m => (
             <div key={m} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
               {m}
             </div>
           ))}
        </div>

        {/* Heatmap rows */}
        <div className="flex flex-col gap-1">
          {data.map((row) => (
            <div key={row.category} className="grid gap-1 items-center" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
              <div className="col-span-1 text-xs font-medium text-gray-700 capitalize pr-2 text-right truncate" title={row.category}>
                {row.category}
              </div>
              
              {row.months.map((val, idx) => (
                <div 
                  key={`${row.category}-${idx}`}
                  className={`w-full aspect-square rounded-sm border flex items-center justify-center transition-colors cursor-pointer group relative ${getHeatIntensity(val)}`}
                  title={`${row.category} in ${monthLabels[idx]}: ${formatCurrency(val)}`}
                >
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] font-mono leading-none transition-opacity">
                    {(val / 1000).toFixed(0)}k
                  </span>
                </div>
              ))}
            </div>
          ))}
          {data.length === 0 && (
             <div className="col-[span_13_/_span_13] text-center py-8 text-gray-400 text-sm">No expenses available for heatmap generation.</div>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex justify-end items-center mt-6 gap-2 text-xs text-gray-500">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-white border border-gray-200"></div>
          <div className="w-3 h-3 rounded-sm bg-green-100"></div>
          <div className="w-3 h-3 rounded-sm bg-[#52A870] bg-opacity-70"></div>
          <div className="w-3 h-3 rounded-sm bg-[#1C4E35]"></div>
          <span>More Spend</span>
        </div>
      </div>
    </div>
  );
}
