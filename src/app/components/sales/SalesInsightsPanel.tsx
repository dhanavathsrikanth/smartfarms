"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { formatINR } from "@/lib/utils";
import { 
  Lightbulb, 
  TrendingDown, 
  Trophy, 
  Clock, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  PackageX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PaymentReminder } from "@/app/components/sales/PaymentReminder";

interface SalesInsightsPanelProps {
  farmId?: Id<"farms">;
}

export function SalesInsightsPanel({ farmId }: SalesInsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const insights = useQuery(api.sales.getSalesInsights, { farmId });

  if (insights === undefined) {
    return (
      <div className="animate-pulse space-y-4 border rounded-xl p-4 bg-muted/20">
        <div className="h-6 w-48 bg-muted rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  // Count active actionable insights
  let insightCount = 0;
  if (insights.bestPriceAchieved) insightCount++;
  if (insights.priceDropAlert.length > 0) insightCount++;
  if (insights.slowPayerBuyers.length > 0) insightCount++;
  if (insights.sellTimeOptimization.length > 0) insightCount++;
  if (insights.unsoldCrops.length > 0) insightCount++;

  if (insightCount === 0) return null;

  return (
    <div className="border border-emerald-100 bg-emerald-50/30 rounded-xl overflow-hidden shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-900 leading-tight">AI Sales Insights</h3>
            <p className="text-xs text-emerald-700 font-medium">
              We found {insightCount} actionable insights based on your data.
            </p>
          </div>
        </div>
        <div className="text-emerald-700 bg-emerald-100/50 p-1 rounded-md">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          
          {/* Best Price Achieved */}
          {insights.bestPriceAchieved && (
            <InsightCard
              icon={<Trophy className="h-5 w-5 text-amber-500" />}
              title="Best Price Achieved"
              color="border-amber-200 bg-amber-50/50"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  You got the highest rate for <strong className="text-foreground capitalize">{insights.bestPriceAchieved.cropName}</strong>.
                </p>
                <div className="flex items-center justify-between bg-white rounded-lg p-2 border shadow-sm">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Rate</p>
                    <p className="text-lg font-black text-emerald-600 font-mono">
                      {formatINR(insights.bestPriceAchieved.ratePerKg)}<span className="text-xs text-muted-foreground">/kg</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Sold To</p>
                    <p className="text-sm font-bold truncate max-w-[120px]">{insights.bestPriceAchieved.buyerName}</p>
                  </div>
                </div>
              </div>
            </InsightCard>
          )}

          {/* Slow Payers */}
          {insights.slowPayerBuyers.map((buyer, idx) => (
            <InsightCard
              key={`slow-${idx}`}
              icon={<Clock className="h-5 w-5 text-rose-500" />}
              title="Slow Payer Detected"
              color="border-rose-200 bg-rose-50/50"
            >
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  <strong className="text-foreground">{buyer.buyerName}</strong> has payments pending for over {buyer.daysPending} days ({formatINR(buyer.pendingAmount)}).
                </p>
                <PaymentReminder 
                  buyerName={buyer.buyerName} 
                  amount={buyer.pendingAmount} 
                  triggerText="Send WhatsApp Reminder" 
                  fullWidth
                  variant="default"
                />
              </div>
            </InsightCard>
          ))}

          {/* Price Drops */}
          {insights.priceDropAlert.map((alert, idx) => (
            <InsightCard
              key={`drop-${idx}`}
              icon={<TrendingDown className="h-5 w-5 text-orange-500" />}
              title="Market Rate Drop"
              color="border-orange-200 bg-orange-50/50"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  The rate for <strong className="text-foreground capitalize">{alert.cropName}</strong> dropped by <span className="text-rose-600 font-bold">{alert.percentDrop}%</span> compared to your last sale.
                </p>
                <div className="flex items-center justify-between text-xs font-mono bg-white rounded p-2 border">
                  <div>
                    <span className="text-muted-foreground">Previous:</span> <br/>
                    <span className="font-bold">{formatINR(alert.previousRate)}/kg</span>
                  </div>
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                  <div className="text-right">
                    <span className="text-muted-foreground">Current:</span> <br/>
                    <span className="font-bold text-rose-600">{formatINR(alert.currentRate)}/kg</span>
                  </div>
                </div>
              </div>
            </InsightCard>
          ))}

          {/* Unsold Crops */}
          {insights.unsoldCrops.slice(0, 2).map((crop, idx) => (
            <InsightCard
              key={`unsold-${idx}`}
              icon={<PackageX className="h-5 w-5 text-blue-500" />}
              title="Unsold Inventory"
              color="border-blue-200 bg-blue-50/50"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  <strong className="text-foreground capitalize">{crop.cropName}</strong> at {crop.farmName} has no registered sales yet.
                </p>
                <div className="bg-white rounded-lg p-2 border text-xs">
                  Harvested around: <span className="font-bold">{crop.harvestDate}</span>
                </div>
              </div>
            </InsightCard>
          ))}

          {/* Sell Time Optimization */}
          {insights.sellTimeOptimization.slice(0, 1).map((opt, idx) => (
            <InsightCard
              key={`opt-${idx}`}
              icon={<Lightbulb className="h-5 w-5 text-indigo-500" />}
              title="Sell Time Analytics"
              color="border-indigo-200 bg-indigo-50/50"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Historically, <strong className="text-foreground capitalize">{opt.cropName}</strong> sells for the highest average rate ({formatINR(opt.averageRateInBestMonth)}/kg) in <strong className="text-foreground">{opt.bestMonth}</strong>.
                </p>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-2 border-t pt-2">
                  Avoid {opt.worseMonth} ({formatINR(opt.averageRateInWorseMonth)}/kg)
                </div>
              </div>
            </InsightCard>
          ))}

        </div>
      )}
    </div>
  );
}

function InsightCard({ title, icon, color, children }: { title: string, icon: React.ReactNode, color: string, children: React.ReactNode }) {
  return (
    <Card className={`shadow-none border ${color}`}>
      <CardHeader className="p-4 pb-2 space-y-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {children}
      </CardContent>
    </Card>
  );
}
