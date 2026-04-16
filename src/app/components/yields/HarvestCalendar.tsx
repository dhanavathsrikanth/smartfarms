"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { YieldSummaryCard } from "./YieldSummaryCard";
import { cn } from "@/lib/utils";

interface Props {
  yieldRecords: any[]; // Array from listAllYields or listYieldsByFarm
}

export function HarvestCalendar({ yieldRecords }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfMonth(monthStart);
  // Pad the grid to start on Sunday (0)
  const startOffset = startDate.getDay();
  const calendarStart = new Date(startDate);
  calendarStart.setDate(calendarStart.getDate() - startOffset);

  const endDate = new Date(monthEnd);
  const endOffset = 6 - endDate.getDay();
  endDate.setDate(endDate.getDate() + endOffset);

  const dateRange = eachDayOfInterval({ start: calendarStart, end: endDate });

  const yieldsThisMonth = yieldRecords?.filter(y => isSameMonth(new Date(y.harvestDate), currentDate)) || [];

  const getDayYields = (date: Date) => {
    if (!yieldRecords) return [];
    return yieldRecords.filter(y => isSameDay(new Date(y.harvestDate), date));
  };

  const getCropColor = (cropName: string) => {
    const name = cropName.toLowerCase();
    if (name.includes("wheat") || name.includes("corn") || name.includes("maize")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (name.includes("cotton")) return "bg-slate-100 text-slate-800 border-slate-200";
    if (name.includes("tomato") || name.includes("chili") || name.includes("onion")) return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200"; // default greens
  };

  return (
    <div className="bg-white border border-[#e5dfd4] rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#e5dfd4] flex items-center justify-between bg-[#F7F0E3]/30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[#1C4E35]/10 flex items-center justify-center">
            <CalIcon className="h-4 w-4 text-[#1C4E35]" />
          </div>
          <h3 className="font-bold text-gray-900">{format(currentDate, "MMMM yyyy")}</h3>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {yieldsThisMonth.length === 0 && (
        <div className="py-2 text-center text-xs text-gray-400 bg-gray-50 border-b border-[#e5dfd4]">
          No harvests recorded for this month
        </div>
      )}

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-b border-[#e5dfd4]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr bg-[#e5dfd4] gap-[1px]">
        {dateRange.map((date, i) => {
          const isLapsed = !isSameMonth(date, currentDate);
          const isToday = isSameDay(date, new Date());
          const dayYields = getDayYields(date);

          return (
            <div 
              key={i} 
              className={cn(
                "min-h-[80px] bg-white p-1 pb-4 transition-colors relative",
                isLapsed ? "bg-gray-50/50 text-gray-400" : "text-gray-700",
                isToday && "bg-blue-50/20"
              )}
            >
              <div className="flex justify-between items-start">
                <span className={cn(
                  "inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold select-none",
                  isToday && "bg-[#D4840A] text-white"
                )}>
                  {format(date, "d")}
                </span>
              </div>
              
              <div className="mt-1 space-y-1">
                {dayYields.map((y, idx) => (
                  <Popover key={idx}>
                    <PopoverTrigger className={cn(
                        "w-full text-left text-[10px] px-1.5 py-1 rounded border shadow-sm truncate hover:opacity-80 transition-opacity font-medium block",
                        getCropColor(y.cropName)
                      )}>
                        {y.cropName}
                        <div className="opacity-80 font-mono text-[9px] truncate">
                          {y.totalYield} {y.yieldUnit}
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 border-none shadow-xl" align="start">
                      <div className="bg-white rounded-xl overflow-hidden">
                        <div className="p-3 bg-[#1C4E35] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                          <span>Harvest Details</span>
                          <span>{format(new Date(y.harvestDate), "MMM d")}</span>
                        </div>
                        {/* We reuse the generic YieldSummaryCard with fake cropData just to render */}
                        <YieldSummaryCard yieldData={y} cropData={{ _id: y.cropId }} />
                      </div>
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
