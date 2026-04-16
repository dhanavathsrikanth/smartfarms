"use client";

import { CalendarDays, Edit2, Target } from "lucide-react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { UpdateYieldDialog } from "./UpdateYieldDialog";
import { Id } from "../../../../convex/_generated/dataModel";

interface Props {
  yieldData: any; // Return type from getYieldByCrop
  cropData: any; 
}

export function YieldSummaryCard({ yieldData, cropData }: Props) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (!yieldData) return null;

  const pct = yieldData.achievedExpectedPercent;
  let progressColor = "bg-emerald-500";
  if (pct && pct < 70) progressColor = "bg-rose-500";
  else if (pct && pct < 90) progressColor = "bg-amber-500";

  return (
    <>
      <div className="bg-white border border-border shadow-sm rounded-xl p-6 relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F7F0E3] rounded-bl-full -mr-16 -mt-16 z-0 opacity-50" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Harvest Total</p>
              <h2 className="text-4xl font-mono font-extrabold text-[#1C4E35]">
                {yieldData.totalYield} <span className="text-xl capitalize">{yieldData.yieldUnit}</span>
              </h2>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-[#D4840A]"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm font-medium text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-gray-900 bg-gray-100 px-1.5 rounded">{yieldData.totalYieldKg.toLocaleString()}</span> KG
            </div>
            <div className="h-4 w-px bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-gray-900 bg-gray-100 px-1.5 rounded">{yieldData.yieldPerAcreQuintal.toFixed(2)}</span> Quintal / Acre
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            Harvested on {format(new Date(yieldData.harvestDate), "MMMM d, yyyy")}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            {yieldData.expectedYield ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" /> Target: {yieldData.expectedYield} {yieldData.yieldUnit}
                  </span>
                  <span className={pct >= 90 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-rose-600"}>
                    {pct.toFixed(1)}% Achieved
                  </span>
                </div>
                <Progress value={Math.min(pct, 100)} className="h-2" indicatorClassName={progressColor} />
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 italic">No target yield was set</span>
                <Button variant="link" className="h-auto p-0 text-[#D4840A] text-xs" onClick={() => setIsEditOpen(true)}>
                  Set Target
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <UpdateYieldDialog 
        yieldId={yieldData._id}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        cropId={cropData._id}
        initialData={{
          totalYield: yieldData.totalYield,
          yieldUnit: yieldData.yieldUnit,
          expectedYield: yieldData.expectedYield,
          harvestDate: yieldData.harvestDate,
          notes: yieldData.notes,
        }}
      />
    </>
  );
}
