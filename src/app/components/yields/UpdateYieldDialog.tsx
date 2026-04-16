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
import { CalendarIcon, Loader2, Info, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  yieldId: Id<"yields">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: {
    totalYield: number;
    yieldUnit: "kg" | "quintal" | "ton";
    expectedYield?: number;
    harvestDate: string;
    notes?: string;
  };
  cropId: Id<"crops">; // needed for mutation cache validation or UI if we expand, not strictly needed for updateYield mutation though.
}

export function UpdateYieldDialog({ yieldId, open, onOpenChange, initialData }: Props) {
  const updateYield = useMutation(api.yields.updateYield);

  const [totalYield, setTotalYield] = useState<string>(initialData.totalYield.toString());
  const [yieldUnit, setYieldUnit] = useState<"kg" | "quintal" | "ton">(initialData.yieldUnit);
  const [expectedYield, setExpectedYield] = useState<string>(initialData.expectedYield?.toString() || "");
  const [harvestDate, setHarvestDate] = useState<Date>(new Date(initialData.harvestDate));
  const [notes, setNotes] = useState(initialData.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedTotalYield = parseFloat(totalYield) || 0;
  const parsedExpectedYield = parseFloat(expectedYield) || 0;

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
      await updateYield({
        yieldId,
        totalYield: parsedTotalYield,
        yieldUnit,
        expectedYield: expectedYield ? parsedExpectedYield : undefined,
        harvestDate: harvestDate.toISOString(),
        notes: notes || undefined,
      });
      toast.success("Harvest record updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to update yield", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Update Harvest Record</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 mt-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
          <div className="text-xs font-medium">
            Updating the yield amount will automatically recalculate all yield per acre and efficiency scores for this crop.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
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
                placeholder="Any notes about this harvest..."
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || parsedTotalYield <= 0}
              className="bg-[#D4840A] hover:bg-[#b56e09] text-white min-w-[150px]"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
              ) : (
                "Update Record"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
