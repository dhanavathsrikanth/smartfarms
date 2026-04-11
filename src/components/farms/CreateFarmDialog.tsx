"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { CreateFarmInput, AreaUnit } from "@/types/farm";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TreePine } from "lucide-react";
import { toast } from "sonner";

const AREA_UNITS: AreaUnit[] = ["acres", "hectares", "bigha"];
const SOIL_TYPES = [
  "Sandy",
  "Clay",
  "Loam",
  "Sandy Loam",
  "Black Cotton",
  "Red",
  "Other",
];

type FormState = {
  name: string;
  location: string;
  totalArea: string;
  areaUnit: AreaUnit;
  soilType: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const DEFAULT_FORM: FormState = {
  name: "",
  location: "",
  totalArea: "",
  areaUnit: "acres",
  soilType: "",
};

interface CreateFarmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFarmDialog({ open, onOpenChange }: CreateFarmDialogProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const createFarm = useMutation(api.farms.createFarm);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = "Farm name is required.";
    if (!form.location.trim()) newErrors.location = "Location is required.";
    const area = Number(form.totalArea);
    if (!form.totalArea || isNaN(area) || area <= 0)
      newErrors.totalArea = "Enter a valid area greater than 0.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const input: CreateFarmInput = {
        name: form.name.trim(),
        location: form.location.trim(),
        totalArea: Number(form.totalArea),
        areaUnit: form.areaUnit,
        soilType: form.soilType || undefined,
      };
      await createFarm(input);
      toast.success(`"${input.name}" registered successfully!`);
      setForm(DEFAULT_FORM);
      setErrors({});
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create farm. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const setField = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setForm(DEFAULT_FORM);
      setErrors({});
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
              <TreePine className="h-5 w-5 text-secondary" />
            </div>
            <DialogTitle className="text-lg">Register New Farm</DialogTitle>
          </div>
          <DialogDescription>
            Enter your farm details to start tracking crops and finances.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Farm Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-name">
              Farm Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cf-name"
              placeholder="e.g. North Field, Gaon Ka Khet"
              value={form.name}
              onChange={(e) => setField("name")(e.target.value)}
              className={errors.name ? "border-destructive ring-1 ring-destructive" : ""}
              disabled={loading}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-location">
              Location / Village <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cf-location"
              placeholder="e.g. Anantapur, Andhra Pradesh"
              value={form.location}
              onChange={(e) => setField("location")(e.target.value)}
              className={errors.location ? "border-destructive ring-1 ring-destructive" : ""}
              disabled={loading}
            />
            {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
          </div>

          {/* Area + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cf-area">
                Total Area <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cf-area"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="e.g. 5.5"
                value={form.totalArea}
                onChange={(e) => setField("totalArea")(e.target.value)}
                className={errors.totalArea ? "border-destructive ring-1 ring-destructive" : ""}
                disabled={loading}
              />
              {errors.totalArea && <p className="text-xs text-destructive">{errors.totalArea}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Area Unit</Label>
              <Select
                value={form.areaUnit ?? "acres"}
                onValueChange={(value: AreaUnit | null) => {
                  if (value) setField("areaUnit")(value);
                }}
              >
                <SelectTrigger className="w-full" disabled={loading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit.charAt(0).toUpperCase() + unit.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Soil Type */}
          <div className="space-y-1.5">
            <Label>
              Soil Type{" "}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Select
              value={form.soilType ?? ""}
              onValueChange={(value: string | null) => {
                setField("soilType")(value ?? "");
              }}
            >
              <SelectTrigger className="w-full" disabled={loading}>
                <SelectValue placeholder="Select soil type…" />
              </SelectTrigger>
              <SelectContent>
                {SOIL_TYPES.map((soil) => (
                  <SelectItem key={soil} value={soil}>
                    {soil}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="btn-secondary-branding gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Registering…" : "Register Farm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
