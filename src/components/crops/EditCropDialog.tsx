"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CropWithStats, UpdateCropInput } from "@/types/crop";
import { AreaUnit, Season, CropStatus } from "@/types/farm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const SEASONS: Season[] = ["kharif", "rabi", "zaid", "annual"];
const STATUSES: CropStatus[] = ["active", "harvested", "failed", "archived"];

interface EditCropDialogProps {
  crop: CropWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormState = {
  name: string;
  variety: string;
  season: Season;
  year: string;
  area: string;
  areaUnit: AreaUnit;
  status: CropStatus;
  sowingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate: string;
  notes: string;
};

export function EditCropDialog({ crop, open, onOpenChange }: EditCropDialogProps) {
  const isMobile = useIsMobile();
  const updateCrop = useMutation(api.crops.updateCrop);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (crop) {
      setForm({
        name: crop.name,
        variety: crop.variety || "",
        season: crop.season,
        year: crop.year.toString(),
        area: crop.area.toString(),
        areaUnit: crop.areaUnit,
        status: crop.status,
        sowingDate: crop.sowingDate,
        expectedHarvestDate: crop.expectedHarvestDate || "",
        actualHarvestDate: crop.actualHarvestDate || new Date().toISOString().split("T")[0],
        notes: crop.notes || "",
      });
    }
  }, [crop]);

  if (!form) return null;

  const validate = () => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) newErrors.name = "Crop name is required.";
    if (!form.area || isNaN(Number(form.area)) || Number(form.area) <= 0) 
      newErrors.area = "Enter a valid area.";
    if (!form.sowingDate) newErrors.sowingDate = "Sowing date is required.";
    
    if (form.status === "harvested" && !form.actualHarvestDate) {
      newErrors.actualHarvestDate = "Actual harvest date is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crop || !validate()) return;

    setLoading(true);
    try {
      const input: UpdateCropInput = {
        cropId: crop._id,
        name: form.name.trim(),
        variety: form.variety.trim() || undefined,
        season: form.season,
        area: Number(form.area),
        areaUnit: form.areaUnit,
        status: form.status,
        sowingDate: form.sowingDate,
        expectedHarvestDate: form.expectedHarvestDate || undefined,
        actualHarvestDate: form.status === "harvested" ? form.actualHarvestDate : undefined,
        notes: form.notes.trim() || undefined,
      };

      await updateCrop(input);
      toast.success(`"${input.name}" updated successfully.`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update crop.");
    } finally {
      setLoading(false);
    }
  };

  const setField = (field: keyof FormState, value: string) => {
    setForm(prev => prev ? ({ ...prev, [field]: value }) : null);
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const FormContent = (
    <form id="edit-crop-form" onSubmit={handleSubmit} className="space-y-4 py-4">
      {/* Read-only Farm Context */}
      <div className="bg-muted/50 p-3 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Location</p>
          <p className="text-sm font-semibold">{crop?.farmName || "Standard Farm"}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Registered</p>
          <p className="text-sm font-semibold">{new Date(crop?._creationTime || 0).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Crop Name */}
        <div className="space-y-1.5">
          <Label>Crop Name <span className="text-destructive">*</span></Label>
          <Input 
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* Variety */}
        <div className="space-y-1.5">
          <Label>Variety</Label>
          <Input 
            value={form.variety}
            onChange={(e) => setField("variety", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Status */}
        <div className="space-y-1.5">
          <Label>Status <span className="text-destructive">*</span></Label>
          <Select value={form.status} onValueChange={(v) => setField("status", v as CropStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Season */}
        <div className="space-y-1.5">
          <Label>Season</Label>
          <Select value={form.season} onValueChange={(v) => setField("season", v as Season)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Area */}
        <div className="space-y-1.5">
          <Label>Area ({form.areaUnit})</Label>
          <Input 
            type="number" 
            step="0.1"
            value={form.area}
            onChange={(e) => setField("area", e.target.value)}
            className={errors.area ? "border-destructive" : ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sowing Date */}
        <div className="space-y-1.5">
          <Label>Sowing Date</Label>
          <div className="relative">
            <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="date"
              className="pl-9"
              value={form.sowingDate}
              onChange={(e) => setField("sowingDate", e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Date Field based on Status */}
        <div className="space-y-1.5">
          <Label>
            {form.status === "harvested" ? "Actual Harvest Date" : "Expected Harvest"}
          </Label>
          <div className="relative">
            <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="date"
              className={`pl-9 ${errors.actualHarvestDate ? "border-destructive" : ""}`}
              value={form.status === "harvested" ? form.actualHarvestDate : form.expectedHarvestDate}
              onChange={(e) => setField(form.status === "harvested" ? "actualHarvestDate" : "expectedHarvestDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      {form.status === "failed" && (
        <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20 flex gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-destructive uppercase">Warning: Failed Status</p>
            <p className="text-xs text-muted-foreground">Marking a crop as failed will keep its history but close future operations.</p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Observations & Notes</Label>
        <Textarea 
          placeholder="Update observations about this crop cycle..."
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          className="resize-none h-20"
        />
      </div>

      <DialogFooter className="pt-4 gap-2 flex-col sm:flex-row">
        <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={loading}>
          Cancel
        </Button>
        <Button className="btn-secondary-branding gap-2" type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
          Update Cycle Details
        </Button>
      </DialogFooter>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl px-6">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-secondary" />
              Edit Crop Details
            </SheetTitle>
            <SheetDescription>Modify the records for this cultivation activity.</SheetDescription>
          </SheetHeader>
          <div className="pb-8">
            {FormContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-secondary" />
            Edit Crop Details
          </DialogTitle>
          <DialogDescription>Update sowing details or lifecycle status.</DialogDescription>
        </DialogHeader>
        {FormContent}
      </DialogContent>
    </Dialog>
  );
}
