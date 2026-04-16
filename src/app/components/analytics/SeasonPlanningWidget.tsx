"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { 
  History, 
  ArrowUpRight, 
  ChevronRight, 
  Star, 
  TrendingUp, 
  TrendingDown,
  LayoutGrid
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SeasonPlanningWidgetProps {
  onPlanCrop: (cropData: any) => void;
}

export function SeasonPlanningWidget({ onPlanCrop }: SeasonPlanningWidgetProps) {
  // Use existing getCropRanking for overall historical context
  const ranking = useQuery(api.analytics.getCropRanking, {});

  if (ranking === undefined) return <SeasonPlanningSkeleton />;
  
  // Aggregate by crop name to get averages across seasons
  const topCropsMap: Record<string, any> = {};
  ranking.forEach(c => {
    if (!topCropsMap[c.cropName]) {
      topCropsMap[c.cropName] = { 
        name: c.cropName, 
        totalProfit: 0, 
        totalArea: 0, 
        count: 0, 
        profits: [] 
      };
    }
    topCropsMap[c.cropName].totalProfit += c.totalProfit;
    topCropsMap[c.cropName].totalArea += c.area;
    topCropsMap[c.cropName].count += 1;
    topCropsMap[c.cropName].profits.push(c.totalProfit);
  });

  const recommendedCrops = Object.values(topCropsMap)
    .map((c: any) => {
      const avgProfitPerAcre = c.totalArea > 0 ? c.totalProfit / c.totalArea : 0;
      // Determine trend: compare last profit with average
      const lastProfit = c.profits[c.profits.length - 1];
      const trend = lastProfit > (c.totalProfit / c.count) ? "improving" : "declining";
      
      return {
        ...c,
        avgProfitPerAcre,
        trend
      };
    })
    .sort((a, b) => b.avgProfitPerAcre - a.avgProfitPerAcre)
    .slice(0, 4);

  return (
    <Card className="border-[#e5dfd4] bg-white overflow-hidden">
      <CardHeader className="bg-[#FAF9F6] border-b border-[#e5dfd4]/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1C4E35]/10 rounded-lg">
             <Star className="h-5 w-5 text-[#1C4E35]" fill="currentColor" />
          </div>
          <div>
            <CardTitle className="text-lg">Smart Planning Recommendations</CardTitle>
            <CardDescription className="text-xs">Based on your farm's historical dataset</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[#e5dfd4]/50">
          {recommendedCrops.map((crop, idx) => (
            <div 
               key={crop.name} 
               className="group flex items-center justify-between p-4 hover:bg-[#F9FAF8] transition-colors"
            >
              <div className="flex items-center gap-4">
                 <div className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-[10px] font-bold text-gray-400 group-hover:bg-[#1C4E35] group-hover:text-white transition-colors">
                    #{idx + 1}
                 </div>
                 <div className="space-y-0.5">
                    <p className="font-bold text-[#1C4E35]">{crop.name}</p>
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-gray-500 font-medium">{formatINR(crop.avgProfitPerAcre)}/acre avg</span>
                       <div className="h-1 w-1 rounded-full bg-gray-300" />
                       <span className="text-xs text-gray-500">{crop.count} seasons</span>
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-6">
                 <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Trend</span>
                    <div className="flex items-center gap-1">
                       {crop.trend === "improving" ? (
                         <>
                           <TrendingUp className="h-3 w-3 text-emerald-500" />
                           <span className="text-xs font-bold text-emerald-600">Improving</span>
                         </>
                       ) : (
                         <>
                           <TrendingDown className="h-3 w-3 text-amber-500" />
                           <span className="text-xs font-bold text-amber-600">Declining</span>
                         </>
                       )}
                    </div>
                 </div>

                 <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-[#1C4E35]/20 text-[#1C4E35] hover:bg-[#1C4E35] hover:text-white gap-2 h-8 text-xs font-bold shadow-sm"
                    onClick={() => onPlanCrop(crop)}
                 >
                    Plan Cycle
                    <ArrowUpRight className="h-3.5 w-3.5" />
                 </Button>
              </div>
            </div>
          ))}

          {recommendedCrops.length === 0 && (
             <div className="p-8 text-center space-y-3">
                <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                   <History className="h-6 w-6 text-gray-300" />
                </div>
                <div className="space-y-1">
                   <p className="text-sm font-bold text-gray-700">No Harvest History Yet</p>
                   <p className="text-xs text-gray-400 max-w-[200px] mx-auto">Start recording your harvest yields to unlock data-driven planning.</p>
                </div>
             </div>
          )}
        </div>
        
        <div className="p-3 bg-gray-50/50 flex items-center justify-center">
            <Button variant="ghost" size="sm" className="text-[10px] text-gray-400 font-bold hover:bg-transparent hover:text-gray-600 gap-1 uppercase tracking-wider">
               <LayoutGrid className="h-3 w-3" />
               View Full Strategic Report
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SeasonPlanningSkeleton() {
  return (
    <Card className="border-[#e5dfd4] bg-white overflow-hidden">
      <CardContent className="p-0">
        <div className="divide-y divide-[#e5dfd4]/50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                 <Skeleton className="w-8 h-8 rounded-full" />
                 <div className="space-y-2">
                    <Skeleton className="w-24 h-4" />
                    <Skeleton className="w-32 h-3" />
                 </div>
              </div>
              <Skeleton className="w-20 h-8 rounded-lg" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
