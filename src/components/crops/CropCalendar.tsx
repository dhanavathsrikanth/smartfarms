"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CropWithStats } from "@/types/crop";
import { 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  MapPin,
  Maximize2,
  Clock
} from "lucide-react";
import { format, isLeapYear, getDayOfYear, startOfYear, endOfYear } from "date-fns";
import { formatINR } from "@/lib/utils";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const SEASON_COLORS = {
  kharif: "bg-blue-500 border-blue-600",
  rabi: "bg-orange-500 border-orange-600",
  zaid: "bg-purple-500 border-purple-600",
  annual: "bg-slate-500 border-slate-600",
};

export function CropCalendar() {
  const crops = useQuery(api.crops.listAllCrops) as CropWithStats[] | undefined;
  
  if (crops === undefined) {
    return (
      <div className="w-full h-64 bg-muted/20 animate-pulse rounded-2xl border border-dashed border-border flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Clock className="h-8 w-8 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Generating timeline...</p>
        </div>
      </div>
    );
  }

  // Filter for active and harvested crops appearing in the current year
  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());
  const totalDays = isLeapYear(new Date()) ? 366 : 365;

  const visibleCrops = crops.filter(c => {
    if (c.status === "archived" || c.status === "failed") return false;
    
    const sowing = new Date(c.sowingDate);
    const harvest = c.expectedHarvestDate ? new Date(c.expectedHarvestDate) : new Date(sowing.getTime() + 120 * 86400000);
    
    // Check if crop lifecycle overlaps with current year
    return sowing <= yearEnd && harvest >= yearStart;
  });

  const todayPercent = (getDayOfYear(new Date()) / totalDays) * 100;

  return (
    <div className="w-full space-y-4">
      <div className="overflow-x-auto pb-4 scrollbar-hide">
        <div className="min-w-[800px] relative pt-10 pb-6 px-2">
          
          {/* Month Headers */}
          <div className="absolute top-0 left-0 right-0 flex border-b border-border/50">
            {MONTHS.map((month) => (
              <div key={month} className="flex-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-2 px-2 border-l first:border-l-0 border-border/30">
                {month}
              </div>
            ))}
          </div>

          {/* Background Grid */}
          <div className="absolute top-10 bottom-6 left-0 right-0 flex pointer-events-none">
            {MONTHS.map((month) => (
              <div key={`grid-${month}`} className="flex-1 border-l first:border-l-0 border-border/10" />
            ))}
          </div>

          {/* "Today" Indicator line */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-rose-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.5)]"
            style={{ left: `${todayPercent}%` }}
          >
            <div className="absolute top-[-4px] left-[-4px] w-2 h-2 rounded-full bg-rose-500" />
          </div>

          {/* Crop Bars Container */}
          <div className="space-y-3 relative z-10">
            {visibleCrops.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No active crops registered for {currentYear}.</p>
              </div>
            ) : (
              visibleCrops.map((crop) => {
                const sowing = new Date(crop.sowingDate);
                const harvest = crop.expectedHarvestDate ? new Date(crop.expectedHarvestDate) : new Date(sowing.getTime() + 120 * 86400000);
                
                // Calculate display metrics
                const rawStart = Math.max(sowing.getTime(), yearStart.getTime());
                const rawEnd = Math.min(harvest.getTime(), yearEnd.getTime());
                
                const startDay = getDayOfYear(new Date(rawStart));
                const endDay = getDayOfYear(new Date(rawEnd));
                
                const leftPercent = ((startDay - 1) / totalDays) * 100;
                const widthPercent = ((endDay - startDay + 1) / totalDays) * 100;

                return (
                  <div key={crop._id} className="h-8 relative group">
                    <Popover>
                      <PopoverTrigger
                        render={
                          <div 
                            className={`absolute h-7 rounded-lg border shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center px-3 text-xs font-bold text-white truncate overflow-hidden whitespace-nowrap ${SEASON_COLORS[crop.season]}`}
                            style={{ 
                              left: `${leftPercent}%`, 
                              width: `${Math.max(widthPercent, 5)}%`, // Minimum width for visibility
                              zIndex: crop.status === "active" ? 10 : 5,
                              opacity: crop.status === "harvested" ? 0.7 : 1
                            }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pointer-events-none">
                              {crop.status === "harvested" && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                              <span className="truncate">{crop.name}</span>
                            </div>
                          </div>
                        }
                      />
                      <PopoverContent className="w-64 p-4 shadow-xl border-border/50" side="top" align="center">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-foreground text-sm leading-tight">{crop.name}</h4>
                              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{crop.variety || "Standard Variety"}</p>
                            </div>
                            {crop.status === "harvested" ? (
                              <div className="bg-emerald-500/10 text-emerald-600 p-1.5 rounded-lg">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                            ) : (
                              <div className="bg-secondary/10 text-secondary p-1.5 rounded-lg">
                                <Clock className="h-4 w-4" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                              <MapPin className="h-3.5 w-3.5 text-secondary" />
                              <span className="font-medium text-foreground">{crop.farmName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <CalendarIcon className="h-3.5 w-3.5 text-secondary" />
                              <span className="text-muted-foreground">
                                {format(new Date(crop.sowingDate), "MMM d, yyyy")} → {crop.expectedHarvestDate ? format(new Date(crop.expectedHarvestDate), "MMM d, yyyy") : "?"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Maximize2 className="h-3.5 w-3.5 text-secondary" />
                              <span className="text-muted-foreground font-medium">{crop.area} {crop.areaUnit}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter">
                            <span className="text-muted-foreground">Potential Profit:</span>
                            <span className="text-emerald-600">{formatINR(crop.profit)}</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 px-2 justify-center py-2 border-t border-border/50 bg-muted/5 rounded-xl">
        <LegendItem label="Kharif" color="bg-blue-500" />
        <LegendItem label="Rabi" color="bg-orange-500" />
        <LegendItem label="Zaid" color="bg-purple-500" />
        <LegendItem label="Annual" color="bg-slate-500" />
        <div className="h-4 w-px bg-border mx-2" />
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3 bg-rose-500 rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today</span>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2.5 w-2.5 rounded-full ${color} shadow-sm`} />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}
