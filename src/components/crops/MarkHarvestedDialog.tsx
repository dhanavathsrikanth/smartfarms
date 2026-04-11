"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CropWithStats } from "@/types/crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wheat, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

interface MarkHarvestedDialogProps {
  crop: CropWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarkHarvestedDialog({ crop, open, onOpenChange }: MarkHarvestedDialogProps) {
  const markAsHarvested = useMutation(api.crops.markAsHarvested);
  const [loading, setLoading] = useState(false);
  const [actualDate, setActualDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crop || !actualDate) return;

    setLoading(true);
    try {
      await markAsHarvested({
        cropId: crop._id,
        actualHarvestDate: actualDate,
        notes: notes.trim() || undefined,
      });
      toast.success(`Congratulations! "${crop.name}" marked as harvested.`);
      onOpenChange(false);
      setNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record harvest.");
    } finally {
      setLoading(false);
    }
  };

  if (!crop) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 mb-2">
            <Wheat className="h-5 w-5 text-amber-600" />
          </div>
          <DialogTitle>Harvest Record: {crop.name}</DialogTitle>
          <DialogDescription>
            Document the completion of this cultivation cycle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="actual-date">Actual Harvest Date</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input 
                id="actual-date"
                type="date"
                className="pl-9"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="harvest-notes">Harvest Notes</Label>
            <Textarea 
              id="harvest-notes"
              placeholder="e.g. Good yield, rainy day, manual harvest completed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none h-24"
            />
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button className="btn-secondary-branding gap-2" type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wheat className="h-4 w-4" />}
              Save Harvest Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
