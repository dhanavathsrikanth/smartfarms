"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { 
  Calendar, 
  Trash2, 
  Edit2, 
  ArrowRightLeft, 
  TrendingUp, 
  Target, 
  ArrowUpRight,
  ChevronRight,
  AlertCircle,
  BarChart2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { formatINR, formatArea } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface CropPlanCardProps {
  plan: {
    _id: Id<"cropPlans">;
    cropName: string;
    area: number;
    areaUnit: "acres" | "hectares" | "bigha";
    inputCosts: {
      seed: number;
      fertilizer: number;
      pesticide: number;
      labour: number;
      irrigation: number;
      other: number;
    };
    expectedYieldPerAcre: number;
    expectedRate: number;
    calculatedProfit: number;
    totalInvestment: number;
    expectedRevenue: number;
    expectedProfit: number;
    margin: number;
    breakEvenRate: number;
    roi: number;
    createdAt: number;
  };
  onEdit?: (planId: Id<"cropPlans">) => void;
  onDeleteSuccess?: () => void;
}

export function CropPlanCard({ plan, onEdit, onDeleteSuccess }: CropPlanCardProps) {
  const [showComparison, setShowComparison] = useState(false);
  const deletePlan = useMutation(api.analytics.deleteCropPlan);
  
  // Fetch historical data for comparison if name matches
  const historicalData = useQuery(api.analytics.getSeasonComparison, { 
    cropName: plan.cropName 
  });

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this crop plan?")) return;
    try {
      await deletePlan({ planId: plan._id });
      toast.success("Plan deleted");
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (err) {
      toast.error("Failed to delete plan");
    }
  };

  const riskLevel = plan.margin > 25 ? "Low" : plan.margin > 10 ? "Medium" : "High";
  const riskColor = riskLevel === "Low" ? "bg-emerald-100 text-emerald-700" : 
                    riskLevel === "Medium" ? "bg-amber-100 text-amber-700" : 
                    "bg-rose-100 text-rose-700";

  // Calculate weighted averages of historical data for "Actual" comparison
  const actualAverages = historicalData && historicalData.length > 0 ? {
    revenue: historicalData.reduce((s, h) => s + h.revenue, 0) / historicalData.length,
    expenses: historicalData.reduce((s, h) => s + h.expenses, 0) / historicalData.length,
    profit: historicalData.reduce((s, h) => s + h.profit, 0) / historicalData.length,
    rate: historicalData.reduce((s, h) => s + h.rateAchieved, 0) / historicalData.length,
    count: historicalData.length
  } : null;

  return (
    <Card className="group border-[#e5dfd4] bg-white hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-3 border-b border-[#e5dfd4]/50">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg text-[#1C4E35] flex items-center gap-2">
              {plan.cropName}
              <Badge variant="outline" className="font-normal text-[10px] h-5 border-[#e5dfd4]">
                Target Plan
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-gray-400">
               <Calendar className="h-3 w-3" />
               <span>Planned {format(plan.createdAt, "MMM d, yyyy")}</span>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#1C4E35]" onClick={() => onEdit?.(plan._id)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-rose-500" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Main Stats Row */}
        <div className="grid grid-cols-3 gap-2">
           <div className="bg-[#F9FAF8] p-3 rounded-lg text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Investment</span>
              <span className="text-xs font-bold text-gray-700 mt-1 block">{formatINR(plan.totalInvestment)}</span>
           </div>
           <div className="bg-[#F9FAF8] p-3 rounded-lg text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Revenue</span>
              <span className="text-xs font-bold text-gray-700 mt-1 block">{formatINR(plan.expectedRevenue)}</span>
           </div>
           <div className="bg-[#1C4E35]/5 p-3 rounded-lg text-center">
              <span className="text-[10px] text-[#1C4E35]/60 font-bold uppercase block">Profit Target</span>
              <span className="text-xs font-bold text-[#1C4E35] mt-1 block">{formatINR(plan.expectedProfit)}</span>
           </div>
        </div>

        {/* Secondary Details */}
        <div className="flex items-center justify-between py-1 px-1">
           <div className="flex items-center gap-3">
              <div className="flex flex-col">
                 <span className="text-[10px] text-gray-400 font-bold uppercase">Margin</span>
                 <span className="text-sm font-bold text-gray-900">{plan.margin.toFixed(1)}%</span>
              </div>
              <div className="h-6 w-px bg-[#e5dfd4]" />
              <div className="flex flex-col">
                 <span className="text-[10px] text-gray-400 font-bold uppercase">Break-even</span>
                 <span className="text-sm font-bold text-gray-900">₹{plan.breakEvenRate.toFixed(0)}</span>
              </div>
           </div>
           <Badge className={`${riskColor} border-none font-bold text-[10px]`}>
              {riskLevel} RISK
           </Badge>
        </div>

        {/* Comparison Section (Collapsible in Dialog) */}
        {actualAverages ? (
          <Dialog open={showComparison} onOpenChange={setShowComparison}>
            <DialogTrigger 
              render={
                <Button 
                  variant="outline" 
                  className="w-full border-[#1C4E35]/20 text-[#1C4E35] bg-[#1C4E35]/5 hover:bg-[#1C4E35]/10 gap-2 h-9 text-xs font-semibold"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Compare with Actual Performance
                </Button>
              }
            />
            <DialogContent className="max-w-md sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-[#1C4E35]" />
                  Planned vs. Historical Reality: {plan.cropName}
                </DialogTitle>
              </DialogHeader>
              
              <div className="py-6 overflow-x-auto">
                 <table className="w-full text-sm">
                    <thead>
                       <tr className="border-b border-[#e5dfd4]">
                          <th className="text-left pb-4 font-bold text-gray-400 uppercase text-[10px]">Metric</th>
                          <th className="text-right pb-4 font-bold text-[#1C4E35] uppercase text-[10px]">Your Plan</th>
                          <th className="text-right pb-4 font-bold text-amber-600 uppercase text-[10px]">Actual Avg ({actualAverages.count} seasons)</th>
                          <th className="text-right pb-4 font-bold text-gray-400 uppercase text-[10px]">Delta</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5dfd4]/50">
                       <tr className="group">
                          <td className="py-4 font-medium text-gray-600">Revenue / Acre</td>
                          <td className="text-right py-4 font-mono">{formatINR(plan.expectedRevenue / plan.area)}</td>
                          <td className="text-right py-4 font-mono">{formatINR(actualAverages.revenue / plan.area)}</td>
                          <ComparisonCell target={plan.expectedRevenue / plan.area} actual={actualAverages.revenue / plan.area} />
                       </tr>
                       <tr className="group">
                          <td className="py-4 font-medium text-gray-600">Cost / Acre</td>
                          <td className="text-right py-4 font-mono">{formatINR(plan.totalInvestment / plan.area)}</td>
                          <td className="text-right py-4 font-mono">{formatINR(actualAverages.expenses / plan.area)}</td>
                          <ComparisonCell target={plan.totalInvestment / plan.area} actual={actualAverages.expenses / plan.area} inverse />
                       </tr>
                       <tr className="group">
                          <td className="py-4 font-semibold text-gray-900">Profit / Acre</td>
                          <td className="text-right py-4 font-bold text-emerald-700 font-mono">{formatINR(plan.expectedProfit / plan.area)}</td>
                          <td className="text-right py-4 font-bold text-amber-700 font-mono">{formatINR(actualAverages.profit / plan.area)}</td>
                          <ComparisonCell target={plan.expectedProfit / plan.area} actual={actualAverages.profit / plan.area} />
                       </tr>
                       <tr className="group">
                          <td className="py-4 font-medium text-gray-600">Market Rate</td>
                          <td className="text-right py-4 font-mono">₹{plan.expectedRate}/Q</td>
                          <td className="text-right py-4 font-mono">₹{actualAverages.rate.toFixed(0)}/Q</td>
                          <ComparisonCell target={plan.expectedRate} actual={actualAverages.rate} />
                       </tr>
                    </tbody>
                 </table>

                 <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-[#e5dfd4] flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                       <Target className="h-5 w-5 text-[#1C4E35]" />
                    </div>
                    <div>
                       <h4 className="text-sm font-bold text-gray-900">Insight</h4>
                       <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {plan.expectedRate > actualAverages.rate * 1.1 ? 
                            "Your targeted market rate is significantly higher than your historical average. Verify if this is realistic for current market trends." :
                            plan.expectedProfit / plan.area > (actualAverages.profit / plan.area) * 1.5 ?
                            "Your projected profit is 50%+ higher than your average for this crop. Review cost reduction strategies planned for this cycle." :
                            "Your plan aligns closely with historical performance, suggesting a realistic and grounded target."}
                       </p>
                    </div>
                 </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="p-3 rounded-lg border border-dashed border-[#e5dfd4] flex items-center justify-between group/tip">
             <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                <AlertCircle className="h-3 w-3" />
                No historical data for comparison
             </div>
             <ChevronRight className="h-3 w-3 text-gray-200 group-hover/tip:translate-x-1 transition-transform" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonCell({ target, actual, inverse }: { target: number, actual: number, inverse?: boolean }) {
  const diff = target - actual;
  const percent = actual !== 0 ? (Math.abs(diff) / actual) * 100 : 0;
  
  const isBetter = inverse ? target < actual : target > actual;
  const colorClass = isBetter ? "text-emerald-600" : "text-rose-600";
  
  if (Math.abs(percent) < 1) return <td className="text-right py-4 text-gray-400 text-xs">-</td>;

  return (
    <td className={`text-right py-4 font-bold text-xs ${colorClass}`}>
       {isBetter ? "+" : "-"}{percent.toFixed(0)}%
    </td>
  );
}
