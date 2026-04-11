"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CropStage } from "@/types/crop";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
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
import { Camera, Loader2, Upload, X, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

interface CropPhotoUploaderProps {
  cropId: Id<"crops">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const GROWTH_STAGES = [
  { value: "sowing", label: "Sowing" },
  { value: "germination", label: "Germination" },
  { value: "vegetative", label: "Vegetative" },
  { value: "flowering", label: "Flowering" },
  { value: "fruiting", label: "Fruiting" },
  { value: "harvesting", label: "Harvesting" },
  { value: "post-harvest", label: "Post-harvest" },
];

export function CropPhotoUploader({ cropId, open, onOpenChange, onSuccess }: CropPhotoUploaderProps) {
  const generateUploadUrl = useMutation(api.cropPhotos.generateUploadUrl);
  const savePhoto = useMutation(api.cropPhotos.savePhoto);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState("");
  const [stage, setStage] = useState<CropStage | "">("");
  const [takenAt, setTakenAt] = useState(new Date().toISOString().split("T")[0]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      // 1. Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // 2. Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = await result.json();

      // 3. Save metadata to DB
      await savePhoto({
        cropId,
        storageId,
        caption: caption.trim() || undefined,
        cropStage: stage || undefined,
        takenAt,
      });

      toast.success("Photo uploaded successfully!");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset state
      clearSelection();
      setCaption("");
      setStage("");
    } catch (err) {
      toast.error("An error occurred during upload. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-secondary" />
            Upload Growth Photo
          </DialogTitle>
          <DialogDescription>
            Document the growth stage of your crop with a photo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File Picker / Preview */}
          {!previewUrl ? (
            <div 
              className="border-2 border-dashed border-muted rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-secondary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Click to upload photo</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WEBP up to 5MB</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="relative group rounded-xl overflow-hidden border bg-black/5 aspect-video flex items-center justify-center">
              <img src={previewUrl} alt="Preview" className="max-h-full object-contain" />
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={clearSelection}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Metadata Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Growth Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as CropStage || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage..." />
                </SelectTrigger>
                <SelectContent>
                  {GROWTH_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date Taken</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input 
                  type="date"
                  className="pl-8 h-10 text-xs"
                  value={takenAt}
                  onChange={(e) => setTakenAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Caption</Label>
            <Input 
              placeholder="e.g. First sprouts visible, applying urea..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            className="btn-secondary-branding gap-2" 
            onClick={handleUpload} 
            disabled={!selectedFile || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {loading ? "Uploading..." : "Save to Diary"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
