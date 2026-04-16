"use client";

import React, { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  ArrowRight, 
  Info, 
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { formatINR, formatArea, formatWeight } from "@/lib/utils";
import { toast } from "sonner";

interface BreakEvenCalculatorProps {
  initialData?: {
    cropName?: string;
    area?: number;
    areaUnit?: "acres" | "hectares" | "bigha";
    expectedYieldPerAcre?: number;
    expectedRate?: number;
    inputCosts?: {
      seed: number;
      fertilizer: number;
      pesticide: number;
      labour: number;
      irrigation: number;
      other: number;
    };
  };
  onSaveSuccess?: () => void;
}

export function BreakEvenCalculator({ initialData, onSaveSuccess }: BreakEvenCalculatorProps) {
  // Inputs
  const [cropName, setCropName] = useState(initialData?.cropName || "");
  const [area, setArea] = useState<string>(initialData?.area?.toString() || "1");
  const [areaUnit, setAreaUnit] = useState<"acres" | "hectares" | "bigha">(initialData?.areaUnit || "acres");
  const [yieldPerAcre, setYieldPerAcre] = useState<string>(initialData?.expectedYieldPerAcre?.toString() || "");
  const [marketRate, setMarketRate] = useState<string>(initialData?.expectedRate?.toString() || "");
  const [rateUnit, setRateUnit] = useState<"kg" | "quintal">("quintal");

  // Expenses per acre
  const [seedCost, setSeedCost] = useState<string>(initialData?.inputCosts?.seed.toString() || "");
  const [fertilizerCost, setFertilizerCost] = useState<string>(initialData?.inputCosts?.fertilizer.toString() || "");
  const [pesticideCost, setPesticideCost] = useState<string>(initialData?.inputCosts?.pesticide.toString() || "");
  const [labourCost, setLabourCost] = useState<string>(initialData?.inputCosts?.labour.toString() || "");
  const [irrigationCost, setIrrigationCost] = useState<string>(initialData?.inputCosts?.irrigation.toString() || "");
  const [otherCost, setOtherCost] = useState<string>(initialData?.inputCosts?.other.toString() || "");

  const [expensesExpanded, setExpensesExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mutations
  const savePlan = useMutation(api.analytics.saveCropPlan);

  // Calculations
  const calculations = useMemo(() => {
    const a = parseFloat(area) || 0;
    const ypa = parseFloat(yieldPerAcre) || 0;
    const rate = parseFloat(marketRate) || 0;

    const costs = {
      seed: parseFloat(seedCost) || 0,
      fertilizer: parseFloat(fertilizerCost) || 0,
      pesticide: parseFloat(pesticideCost) || 0,
      labour: parseFloat(labourCost) || 0,
      irrigation: parseFloat(irrigationCost) || 0,
      other: parseFloat(otherCost) || 0,
    };

    const costPerAcre = Object.values(costs).reduce((sum, c) => sum + c, 0);
    const totalInvestment = costPerAcre * a;
    
    // Total yield based on unit (rate is usually per quintal in mandis)
    const totalExpectedYield = ypa * a;
    const expectedRevenue = totalExpectedYield * rate;
    const expectedProfit = expectedRevenue - totalInvestment;
    const profitMargin = expectedRevenue > 0 ? (expectedProfit / expectedRevenue) * 100 : 0;
    const roi = totalInvestment > 0 ? (expectedProfit / totalInvestment) * 100 : 0;

    const breakEvenRate = totalExpectedYield > 0 ? totalInvestment / totalExpectedYield : 0;
    const breakEvenYield = rate > 0 ? totalInvestment / rate : 0;

    // Risk Assessment
    let risk: "Low" | "Medium" | "High" = "High";
    if (profitMargin > 25) risk = "Low";
    else if (profitMargin >= 10) risk = "Medium";

    return {
      costPerAcre,
      totalInvestment,
      totalExpectedYield,
      expectedRevenue,
      expectedProfit,
      profitMargin,
      roi,
      breakEvenRate,
      breakEvenYield,
      risk,
      costs
    };
  }, [area, yieldPerAcre, marketRate, seedCost, fertilizerCost, pesticideCost, labourCost, irrigationCost, otherCost]);

  const handleSave = async () => {
    if (!cropName) {
      toast.error("Please enter a crop name");
      return;
    }
    if (!calculations.expectedRevenue) {
       toast.error("Enter yield and market rate to see potential profit");
       return;
    }

    setIsSaving(true);
    try {
      await savePlan({
        cropName,
        area: parseFloat(area) || 0,
        areaUnit,
        inputCosts: calculations.costs,
        expectedYieldPerAcre: parseFloat(yieldPerAcre) || 0,
        expectedRate: parseFloat(marketRate) || 0,
        calculatedProfit: calculations.expectedProfit,
      });
      toast.success("Crop plan saved successfully!");
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      toast.error("Failed to save crop plan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full shadow-lg border-[#e5dfd4] bg-white overflow-hidden">
      <CardHeader className="bg-[#1C4E35] text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Investment Calculator</CardTitle>
              <CardDescription className="text-emerald-100/70">Plan your crop cycle and assess risks</CardDescription>
            </div>
          </div>
          {calculations.expectedProfit > 0 && (
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-3 py-1 font-bold">
               {calculations.risk} Risk
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* INPUTS COLUMN */}
          <div className="p-6 border-r border-[#e5dfd4] space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cropName">Crop Name</Label>
                <div className="relative">
                  <Input 
                    id="cropName"
                    placeholder="e.g. Basmati Rice, Cotton"
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    className="pl-9 h-11 border-[#e5dfd4] focus-visible:ring-[#1C4E35]"
                  />
                  <ChevronDown className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label>Cultivation Area</Label>
                  <Input 
                    type="number"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="h-11 border-[#e5dfd4] focus-visible:ring-[#1C4E35]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={areaUnit} onValueChange={(v: any) => setAreaUnit(v)}>
                    <SelectTrigger className="h-11 border-[#e5dfd4]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acres">Acres</SelectItem>
                      <SelectItem value="hectares">Hectares</SelectItem>
                      <SelectItem value="bigha">Bigha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Yield per Acre</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      placeholder="e.g. 15"
                      value={yieldPerAcre}
                      onChange={(e) => setYieldPerAcre(e.target.value)}
                      className="h-11 border-[#e5dfd4] pr-12 focus-visible:ring-[#1C4E35]"
                    />
                    <span className="absolute right-3 top-3 text-xs text-gray-400 font-medium">{rateUnit}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Market Rate (₹/{rateUnit})</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      placeholder="e.g. 2400"
                      value={marketRate}
                      onChange={(e) => setMarketRate(e.target.value)}
                      className="h-11 border-[#e5dfd4] pl-7 focus-visible:ring-[#1C4E35]"
                    />
                    <span className="absolute left-2.5 top-3 text-sm text-gray-400">₹</span>
                  </div>
                </div>
              </div>
            </div>

            {/* EXPENSES SECTION */}
            <div className="bg-[#F7F0E3]/50 rounded-xl border border-[#e5dfd4] overflow-hidden">
               <button 
                 onClick={() => setExpensesExpanded(!expensesExpanded)}
                 className="w-full flex items-center justify-between p-4 hover:bg-[#F7F0E3]/80 transition-colors"
               >
                 <div className="flex items-center gap-2">
                   <DollarSign className="h-4 w-4 text-[#1C4E35]" />
                   <span className="font-semibold text-sm">Detailed Input Costs</span>
                   <span className="text-xs text-gray-500 font-normal ml-1">
                     ({formatINR(calculations.costPerAcre)} / acre)
                   </span>
                 </div>
                 {expensesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
               </button>

               <AnimatePresence>
                 {expensesExpanded && (
                   <motion.div 
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: "auto", opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="px-4 pb-4 overflow-hidden"
                   >
                     <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2">
                       <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase text-gray-500 font-bold">Seeds</Label>
                         <Input 
                            type="number" value={seedCost} onChange={(e) => setSeedCost(e.target.value)}
                            className="h-9 text-xs border-[#e5dfd4]" placeholder="₹/acre"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase text-gray-500 font-bold">Fertilizers</Label>
                         <Input 
                            type="number" value={fertilizerCost} onChange={(e) => setFertilizerCost(e.target.value)}
                            className="h-9 text-xs border-[#e5dfd4]" placeholder="₹/acre"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase text-gray-500 font-bold">Pesticide</Label>
                         <Input 
                            type="number" value={pesticideCost} onChange={(e) => setPesticideCost(e.target.value)}
                            className="h-9 text-xs border-[#e5dfd4]" placeholder="₹/acre"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase text-gray-500 font-bold">Labour</Label>
                         <Input 
                            type="number" value={labourCost} onChange={(e) => setLabourCost(e.target.value)}
                            className="h-9 text-xs border-[#e5dfd4]" placeholder="₹/acre"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase text-gray-500 font-bold">Irrigation</Label>
                         <Input 
                            type="number" value={irrigationCost} onChange={(e) => setIrrigationCost(e.target.value)}
                            className="h-9 text-xs border-[#e5dfd4]" placeholder="₹/acre"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase text-gray-500 font-bold">Other</Label>
                         <Input 
                            type="number" value={otherCost} onChange={(e) => setOtherCost(e.target.value)}
                            className="h-9 text-xs border-[#e5dfd4]" placeholder="₹/acre"
                         />
                       </div>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            <Button 
              className="w-full h-11 bg-[#1C4E35] hover:bg-[#143a28] rounded-xl shadow-md gap-2"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save as Crop Plan
            </Button>
          </div>

          {/* RESULTS COLUMN */}
          <div className="bg-[#F9FAF8] p-6 flex flex-col justify-between">
            <div className="space-y-8">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Summary Projection</Label>
                <div className="mt-4 grid grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-xl border border-[#e5dfd4] shadow-sm">
                    <p className="text-xs text-gray-500 font-medium">Total Investment</p>
                    <p className="text-xl font-bold font-mono text-gray-900 mt-1">{formatINR(calculations.totalInvestment)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-[#e5dfd4] shadow-sm">
                    <p className="text-xs text-gray-500 font-medium">Expected Yield</p>
                    <p className="text-xl font-bold font-mono text-gray-900 mt-1">
                       {calculations.totalExpectedYield.toFixed(0)} <span className="text-xs font-sans text-gray-400">{rateUnit}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#e5dfd4] shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 right-0 p-3 opacity-10`}>
                   <TrendingUp className={`h-12 w-12 ${calculations.expectedProfit >= 0 ? 'text-[#52A870]' : 'text-[#E24B4A]'}`} />
                </div>
                <div className="relative z-10">
                  <p className="text-xs text-gray-500 font-bold uppercase">Estimated Profit</p>
                  <p className={`text-4xl font-extrabold font-mono tracking-tight mt-1 ${calculations.expectedProfit >= 0 ? 'text-[#52A870]' : 'text-[#E24B4A]'}`}>
                    {formatINR(calculations.expectedProfit)}
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                     <div>
                       <span className="text-[10px] text-gray-400 font-bold uppercase block">Margin</span>
                       <span className={`text-sm font-bold font-mono ${calculations.expectedProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                         {calculations.profitMargin.toFixed(1)}%
                       </span>
                     </div>
                     <div>
                       <span className="text-[10px] text-gray-400 font-bold uppercase block">ROI</span>
                       <span className={`text-sm font-bold font-mono ${calculations.expectedProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                         {calculations.roi.toFixed(1)}%
                       </span>
                     </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div className="p-1.5 bg-blue-500 rounded text-white mt-0.5">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-900">Break-even Targets</p>
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-blue-800">
                        Sell at at least <span className="font-bold underline">₹{calculations.breakEvenRate.toFixed(0)}/{rateUnit}</span> to recover costs.
                      </p>
                      <p className="text-xs text-blue-800">
                        Harvest at least <span className="font-bold underline">{calculations.breakEvenYield.toFixed(1)} {rateUnit}</span> at your expected rate.
                      </p>
                    </div>
                  </div>
                </div>
                
                {calculations.expectedProfit < 0 && (
                   <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-xl border border-rose-100 text-rose-800">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <p className="text-xs font-semibold">Projections show a net loss. Consider reducing input costs or increasing targeted yield.</p>
                   </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-[#e5dfd4] mt-6 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-medium">Calculation based on current input cost estimates per acre.</span>
              <div className="flex gap-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-[#1C4E35]/40" />
                 <div className="h-1.5 w-1.5 rounded-full bg-[#1C4E35]/20" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" 
      fill="none" stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );
}
