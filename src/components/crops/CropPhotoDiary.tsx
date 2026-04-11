"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CropPhoto } from "@/types/crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  Trash2, 
  Calendar, 
  Maximize2, 
  Plus, 
  History,
  Sprout
} from "lucide-react";
import { CropPhotoUploader } from "./CropPhotoUploader";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface CropPhotoDiaryProps {
  cropId: Id<"crops">;
}

export function CropPhotoDiary({ cropId }: CropPhotoDiaryProps) {
  const photos = useQuery(api.cropPhotos.getPhotosByCrop, { cropId });
  const deletePhoto = useMutation(api.cropPhotos.deletePhoto);
  
  const [selectedPhoto, setSelectedPhoto] = useState<CropPhoto | null>(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent, photoId: Id<"cropPhotos">) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this photo?")) return;
    
    try {
      await deletePhoto({ photoId });
      toast.success("Photo removed from diary.");
    } catch (err) {
      toast.error("Failed to delete photo.");
    }
  };

  if (photos === undefined) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-secondary" />
          <h3 className="text-lg font-bold">Growth Diary</h3>
          <Badge variant="secondary" className="px-2 py-0">{photos.length}</Badge>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="gap-2 h-9 border-secondary/20 hover:bg-secondary/5 text-secondary"
          onClick={() => setIsUploaderOpen(true)}
        >
          <Camera className="h-4 w-4" />
          Add Log
        </Button>
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-muted/20">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Camera className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-semibold">Document your growth</p>
          <p className="text-xs text-muted-foreground mt-1 text-center max-w-[200px]">
            Take photos of your crop at different stages to track its health and progress.
          </p>
          <Button 
            className="mt-6 btn-secondary-branding gap-2" 
            onClick={() => setIsUploaderOpen(true)}
          >
            <Plus className="h-4 w-4" />
            First Entry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div 
              key={photo._id} 
              className="group relative rounded-xl overflow-hidden border bg-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="aspect-[4/3] bg-muted overflow-hidden">
                <img 
                  src={photo.photoUrl} 
                  alt={photo.caption || "Growth Photo"} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              {/* Badges & Overlay */}
              <div className="absolute top-2 left-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.cropStage && (
                  <Badge className="bg-white/90 text-foreground border-none text-[10px] uppercase font-bold backdrop-blur-sm self-start">
                    {photo.cropStage}
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-black/60 text-white border-none text-[10px] backdrop-blur-sm self-start">
                  <Calendar className="mr-1 h-3 w-3" />
                  {new Date(photo.takenAt).toLocaleDateString()}
                </Badge>
              </div>

              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                  onClick={(e) => handleDelete(e, photo._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Caption Footer */}
              {photo.caption && (
                <div className="p-3 border-t bg-card/80 backdrop-blur-md">
                  <p className="text-xs font-medium text-foreground line-clamp-2">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(o) => { if (!o) setSelectedPhoto(null); }}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black/95 text-white border-none">
          <DialogHeader className="p-4 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20">
                <Sprout className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg text-white">
                  {selectedPhoto?.caption || "Growth Log"}
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium">
                  {selectedPhoto?.cropStage ? `${selectedPhoto.cropStage.toUpperCase()} Stage • ` : ""}
                  Captured on {selectedPhoto ? new Date(selectedPhoto.takenAt).toLocaleDateString() : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex items-center justify-center p-2 min-h-[400px] max-h-[80vh]">
            <img 
              src={selectedPhoto?.photoUrl} 
              alt="Viewing photo" 
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div className="p-4 bg-muted/10 border-t border-white/5 flex justify-between items-center text-xs">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">Captured: {selectedPhoto ? new Date(selectedPhoto.takenAt).toLocaleDateString() : ""}</span>
              <span className="text-slate-400">Uploaded: {selectedPhoto ? new Date(selectedPhoto.createdAt).toLocaleDateString() : ""}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setSelectedPhoto(null)}>
              Close Zoom
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Uploader Dialog */}
      <CropPhotoUploader 
        cropId={cropId} 
        open={isUploaderOpen} 
        onOpenChange={setIsUploaderOpen} 
      />
    </div>
  );
}
