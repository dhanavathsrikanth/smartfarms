"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CreateCropInput } from "@/types/crop";
import { AreaUnit, Season } from "@/types/farm";
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
import { Loader2, Sprout, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const CROP_SUGGESTIONS = [
  "Wheat", "Rice", "Cotton", "Sugarcane", "Maize", "Soybean", "Tomato", 
  "Onion", "Potato", "Mustard", "Groundnut", "Bajra", "Jowar", "Other"
];

const SEASONS: Season[] = ["kharif", "rabi", "zaid", "annual"];
const AREA_UNITS: AreaUnit[] = ["acres", "hectares", "bigha"];

interface CreateCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId?: Id<"farms">; // Pre-selected if on farm detail page
}

type FormState = {
  farmId: string;
  name: string;
  variety: string;
  season: Season;
  year: string;
  area: string;
  areaUnit: AreaUnit;
  sowingDate: string;
  expectedHarvestDate: string;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  farmId: "",
  name: "",
  variety: "",
  season: "kharif",
  year: new Date().getFullYear().toString(),
  area: "",
  areaUnit: "acres",
  sowingDate: new Date().toISOString().split("T")[0],
  expectedHarvestDate: "",
  notes: "",
};

export function CreateCropDialog({ open, onOpenChange, farmId }: CreateCropDialogProps) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState<FormState>({
    ...DEFAULT_FORM,
    farmId: farmId || "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const createCrop = useMutation(api.crops.createCrop);
  const farms = useQuery(api.farms.listFarms);

  const validate = () => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.farmId) newErrors.farmId = "Please select a farm.";
    if (!form.name.trim()) newErrors.name = "Crop name is required.";
    if (!form.area || isNaN(Number(form.area)) || Number(form.area) <= 0) 
      newErrors.area = "Enter a valid area.";
    if (!form.sowingDate) newErrors.sowingDate = "Sowing date is required.";
    
    if (form.expectedHarvestDate && new Date(form.expectedHarvestDate) <= new Date(form.sowingDate)) {
      newErrors.expectedHarvestDate = "Harvest date must be after sowing date.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const input: CreateCropInput = {
        farmId: form.farmId as Id<"farms">,
        name: form.name.trim(),
        variety: form.variety.trim() || undefined,
        season: form.season,
        year: Number(form.year),
        area: Number(form.area),
        areaUnit: form.areaUnit,
        sowingDate: form.sowingDate,
        expectedHarvestDate: form.expectedHarvestDate || undefined,
        notes: form.notes.trim() || undefined,
      };

      await createCrop(input);
      toast.success(`Registered ${input.name} crop successfully!`);
      onOpenChange(false);
      setForm({ ...DEFAULT_FORM, farmId: farmId || "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to register crop.");
    } finally {
      setLoading(false);
    }
  };

  const setField = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const FormContent = (
    <form id="create-crop-form" onSubmit={handleSubmit} className="space-y-4 py-4">
      {/* Farm Selection */}
      <div className="space-y-1.5">
        <Label>Farm <span className="text-destructive">*</span></Label>
        <Select 
          value={form.farmId} 
          onValueChange={(v) => v !== null && setField("farmId", v)}
          disabled={!!farmId || loading}
        >
          <SelectTrigger className={errors.farmId ? "border-destructive" : ""}>
            <SelectValue placeholder="Select a farm..." />
          </SelectTrigger>
          <SelectContent>
            {farms?.map((f) => (
              <SelectItem key={f._id} value={f._id as string}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.farmId && <p className="text-xs text-destructive">{errors.farmId}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Crop Name */}
        <div className="space-y-1.5">
          <Label>Crop Name <span className="text-destructive">*</span></Label>
          <Select value={form.name} onValueChange={(v) => v !== null && setField("name", v)}>
            <SelectTrigger className={errors.name ? "border-destructive" : ""}>
              <SelectValue placeholder="Select or type..." />
            </SelectTrigger>
            <SelectContent>
              {CROP_SUGGESTIONS.map(s => <SelectItem key={s} value={s as string}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* Variety */}
        <div className="space-y-1.5">
          <Label>Variety <span className="text-muted-foreground">(Optional)</span></Label>
          <Input 
            placeholder="e.g. Sona Masuri, PB-1121" 
            value={form.variety}
            onChange={(e) => setField("variety", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Season */}
        <div className="space-y-1.5">
          <Label>Season <span className="text-destructive">*</span></Label>
          <Select value={form.season} onValueChange={(v) => setField("season", v as Season)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Year */}
        <div className="space-y-1.5">
          <Label>Year <span className="text-destructive">*</span></Label>
          <Input 
            type="number" 
            value={form.year}
            onChange={(e) => setField("year", e.target.value)}
          />
        </div>

        {/* Area */}
        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <div className="flex justify-between items-center">
            <Label>Area <span className="text-destructive">*</span></Label>
            <Select value={form.areaUnit} onValueChange={(v) => setField("areaUnit", v as AreaUnit)}>
              <SelectTrigger className="h-6 w-24 text-[10px] border-none bg-muted px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AREA_UNITS.map(u => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input 
            type="number" 
            step="0.1"
            placeholder="e.g. 5.5"
            value={form.area}
            onChange={(e) => setField("area", e.target.value)}
            className={errors.area ? "border-destructive" : ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sowing Date */}
        <div className="space-y-1.5">
          <Label>Sowing Date <span className="text-destructive">*</span></Label>
          <div className="relative">
            <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input 
              type="date"
              className={`pl-9 ${errors.sowingDate ? "border-destructive" : ""}`}
              value={form.sowingDate}
              onChange={(e) => setField("sowingDate", e.target.value)}
            />
          </div>
        </div>

        {/* Expected Harvest */}
        <div className="space-y-1.5">
          <Label>Expected Harvest <span className="text-muted-foreground">(Optional)</span></Label>
          <div className="relative">
            <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input 
              type="date"
              className={`pl-9 ${errors.expectedHarvestDate ? "border-destructive" : ""}`}
              value={form.expectedHarvestDate}
              onChange={(e) => setField("expectedHarvestDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea 
          placeholder="Any specific observations about this crop cycle..."
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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}
          Register Crop Cycle
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
              <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Sprout className="h-5 w-5 text-secondary" />
              </div>
              Register New Crop
            </SheetTitle>
            <SheetDescription>Log a new cultivation cycle for your farm.</SheetDescription>
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
            <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Sprout className="h-5 w-5 text-secondary" />
            </div>
            Register New Crop
          </DialogTitle>
          <DialogDescription>Enter the details for your new sowing cycle.</DialogDescription>
        </DialogHeader>
        {FormContent}
      </DialogContent>
    </Dialog>
  );
}
