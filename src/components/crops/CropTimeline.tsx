"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { 
  History, 
  TrendingDown, 
  TrendingUp, 
  Bug, 
  Wheat, 
  Calendar,
  Circle
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface CropTimelineProps {
  cropId: Id<"crops">;
}

export function CropTimeline({ cropId }: CropTimelineProps) {
  const timeline = useQuery(api.crops.getCropTimeline, { cropId });

  if (timeline === undefined) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-16 flex-1 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <History className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground">No operations logged yet</p>
        <p className="text-xs text-muted-foreground max-w-[200px] mt-1">
          Activity such as expenses, sales, and pest observations will appear here chronologically.
        </p>
      </div>
    );
  }

  const getEventConfig = (type: string) => {
    switch (type) {
      case "expense":
        return {
          icon: <TrendingDown className="h-3.5 w-3.5" />,
          color: "bg-red-100 text-red-700 border-red-200",
          dotColor: "bg-red-500",
          label: "Expense"
        };
      case "sale":
        return {
          icon: <TrendingUp className="h-3.5 w-3.5" />,
          color: "bg-emerald-100 text-emerald-700 border-emerald-200",
          dotColor: "bg-emerald-500",
          label: "Sale"
        };
      case "pest":
        return {
          icon: <Bug className="h-3.5 w-3.5" />,
          color: "bg-orange-100 text-orange-700 border-orange-200",
          dotColor: "bg-orange-500",
          label: "Pest Activity"
        };
      case "yield":
        return {
          icon: <Wheat className="h-3.5 w-3.5" />,
          color: "bg-amber-100 text-amber-700 border-amber-200",
          dotColor: "bg-amber-500",
          label: "Yield Log"
        };
      default:
        return {
          icon: <Circle className="h-3.5 w-3.5" />,
          color: "bg-slate-100 text-slate-700 border-slate-200",
          dotColor: "bg-slate-500",
          label: "Event"
        };
    }
  };

  return (
    <div className="relative pl-4 space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
      {timeline.map((event, index) => {
        const config = getEventConfig(event.type);
        const date = new Date(event.date);
        
        return (
          <div key={index} className="relative pl-8">
            {/* Timeline Dot */}
            <div className={`absolute left-[-4px] top-1.5 h-4 w-4 rounded-full border-2 border-background z-10 ${config.dotColor} ring-4 ring-background shadow-sm`} />
            
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 group">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground tabular-nums">
                    {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <Badge variant="outline" className={`${config.color} border-none font-bold text-[9px] uppercase tracking-wider py-0 px-1.5`}>
                    {config.label}
                  </Badge>
                </div>
                
                <div className="rounded-xl border border-border/50 bg-card/40 p-4 transition-all group-hover:bg-card/70 group-hover:border-border group-hover:shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                    </div>
                    
                    {("amount" in event) && (
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${event.type === 'sale' ? 'text-emerald-700' : 'text-red-700'}`}>
                          {event.type === 'sale' ? '+' : '-'}{formatINR((event as { amount: number }).amount)}
                        </p>
                        <p className="text-[9px] uppercase font-bold text-muted-foreground">Total</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
