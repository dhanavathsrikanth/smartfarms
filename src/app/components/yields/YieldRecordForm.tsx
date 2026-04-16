"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";

interface Props {
  cropId: Id<"crops">;
  cropName: string;
  cropArea: number;
  areaUnit: string;
  onSuccess?: () => void;
}

type YieldUnit = "kg" | "quintal" | "ton";

export function YieldRecordForm({ cropId, cropName, cropArea, areaUnit, onSuccess }: Props) {
  const recordYield = useMutation(api.yields.recordYield);

  const [totalYield, setTotalYield] = useState<string>("");
  const [yieldUnit, setYieldUnit] = useState<YieldUnit>("quintal");
  const [expectedYield, setExpectedYield] = useState<string>("");
  const [harvestDate, setHarvestDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedTotalYield = parseFloat(totalYield) || 0;
  const parsedExpectedYield = parseFloat(expectedYield) || 0;

  const { totalYieldKg, yieldPerAcre, achievementPercent } = useMemo(() => {
    let multiplier = 1;
    if (yieldUnit === "quintal") multiplier = 100;
    if (yieldUnit === "ton") multiplier = 1000;

    const yieldKg = parsedTotalYield * multiplier;
    
    let areaAcres = cropArea;
    if (areaUnit === "hectares") areaAcres = cropArea * 2.47105;
    if (areaUnit === "bigha") areaAcres = cropArea / 1.6;

    const perAcre = areaAcres > 0 ? yieldKg / areaAcres : 0;
    
    let pct = null;
    if (parsedExpectedYield > 0 && parsedTotalYield > 0) {
      pct = (parsedTotalYield / parsedExpectedYield) * 100;
    }

    // Convert perAcre (kg) to quintal for display
    const perAcreQuintal = perAcre / 100;

    return { 
      totalYieldKg: yieldKg, 
      yieldPerAcre: perAcreQuintal, 
      achievementPercent: pct 
    };
  }, [parsedTotalYield, yieldUnit, cropArea, areaUnit, parsedExpectedYield]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedTotalYield <= 0) {
      toast.error("Please enter a valid yield amount");
      return;
    }
    if (!harvestDate) {
      toast.error("Please select a harvest date");
      return;
    }

    setIsSubmitting(true);
    try {
      await recordYield({
        cropId,
        totalYield: parsedTotalYield,
        yieldUnit,
        expectedYield: expectedYield ? parsedExpectedYield : undefined,
        harvestDate: harvestDate.toISOString(),
        notes: notes || undefined,
      });
      toast.success(`Harvest recorded! ${parsedTotalYield} ${yieldUnit} from ${cropName}`);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Failed to record yield", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Total Yield Harvested</Label>
          <div className="flex gap-4">
            <Input
              type="number"
              step="any"
              min="0"
              value={totalYield}
              onChange={(e) => setTotalYield(e.target.value)}
              placeholder="0.00"
              className="text-2xl font-mono h-14 w-1/2"
              required
            />
            <div className="w-1/2">
              <ToggleGroup 
                type="single" 
                value={yieldUnit} 
                onValueChange={(val: any) => val && setYieldUnit(val)}
                className="justify-start h-14 bg-muted/50 p-1 rounded-md"
              >
                <ToggleGroupItem value="kg" className="flex-1 data-[state=on]:bg-white data-[state=on]:shadow-sm">
                  KG
                </ToggleGroupItem>
                <ToggleGroupItem value="quintal" className="flex-1 data-[state=on]:bg-white data-[state=on]:shadow-sm">
                  Quintal
                </ToggleGroupItem>
                <ToggleGroupItem value="ton" className="flex-1 data-[state=on]:bg-white data-[state=on]:shadow-sm">
                  Ton
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            1 Quintal = 100 KG &middot; 1 Ton = 1000 KG
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Harvest Date</Label>
            <Popover>
              <PopoverTrigger className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full justify-start text-left font-normal h-10",
                  !harvestDate && "text-muted-foreground"
                )}
              >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {harvestDate ? format(harvestDate, "PPP") : <span>Pick a date</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={harvestDate}
                  onSelect={(d) => d && setHarvestDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Expected Yield (Optional)</Label>
            <div className="relative">
              <Input
                type="number"
                step="any"
                min="0"
                value={expectedYield}
                onChange={(e) => setExpectedYield(e.target.value)}
                placeholder={`Target in ${yieldUnit}`}
                className="h-10 pr-16"
              />
              <span className="absolute right-3 top-2.5 text-xs font-semibold text-muted-foreground uppercase">
                {yieldUnit}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Notes (Optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this harvest — weather conditions, pest damage, irrigation issues..."
            className="min-h-[100px] resize-none"
          />
        </div>
      </div>

      {/* ── CALCULATED PREVIEW ── */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Harvest Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-emerald-600 font-medium">YIELD PER ACRE</p>
            <p className="text-lg font-mono font-bold text-emerald-900">
              {yieldPerAcre > 0 ? yieldPerAcre.toFixed(2) : "0.00"} <span className="text-xs font-sans text-emerald-700">quintal/ac</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-emerald-600 font-medium">TOTAL YIELD (KG)</p>
            <p className="text-lg font-mono font-bold text-emerald-900">
              {totalYieldKg > 0 ? totalYieldKg.toLocaleString() : "0"} <span className="text-xs font-sans text-emerald-700">kg</span>
            </p>
          </div>
        </div>
        
        {achievementPercent !== null && (
          <div className="pt-2 mt-2 border-t border-emerald-200/60">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-emerald-800">Target Achievement</p>
              <Badge 
                variant="outline" 
                className={cn(
                  "border-none text-white font-bold text-[10px] px-2 py-0.5",
                  achievementPercent >= 90 ? "bg-emerald-500" : 
                  achievementPercent >= 70 ? "bg-amber-500" : "bg-rose-500"
                )}
              >
                {achievementPercent.toFixed(1)}%
              </Badge>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button 
          type="submit" 
          disabled={isSubmitting || parsedTotalYield <= 0}
          className="w-full sm:w-auto bg-[#1C4E35] hover:bg-[#143a28] shadow-md min-w-[150px]"
        >
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...</>
          ) : (
            "Record Harvest"
          )}
        </Button>
      </div>
    </form>
  );
}
