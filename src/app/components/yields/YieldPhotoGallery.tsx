"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Image as ImageIcon, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Props {
  farmId?: string; // Optional filter
}

export function YieldPhotoGallery({ farmId }: Props) {
  // Gracefully fallback if the photos query doesn't exist yet in the user's schema
  const photosApi: any = (api as any).photos;
  
  const photos = useQuery(
    photosApi?.listCropPhotos ?? (() => []), // dummy fallback if missing
    farmId ? { farmId } : {}
  )?.filter((p: any) => p.cropStage === "harvesting" || p.cropStage === "post-harvest") || [];

  if (!photosApi?.listCropPhotos) {
    return (
      <div className="bg-[#FAF9F6] border border-dashed border-[#e5dfd4] rounded-xl p-8 text-center text-gray-500">
        <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-bold">Photo Module Required</p>
        <p className="text-xs mt-1 max-w-sm mx-auto">
          The photo database isn't fully connected yet. You'll be able to attach harvest photos once the photo module is complete.
        </p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <ImageIcon className="h-6 w-6 text-emerald-600" />
        </div>
        <h4 className="font-bold text-gray-800 mb-1">Document your harvest</h4>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
          Upload photos of your yield, crop quality, and field conditions during harvest to maintain a visual diary of your progress.
        </p>
        {/* Assumes an upload flow exists in module 2 */}
        <Button className="bg-[#1C4E35] hover:bg-[#143a28]">
          <Plus className="h-4 w-4 mr-2" /> Add Harvest Photo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-gray-400" />
          Harvest Visual Diary
        </h3>
        <Link href="/dashboard/photos">
          <Button variant="ghost" size="sm" className="text-xs text-[#D4840A]">
            View All Photos
          </Button>
        </Link>
      </div>

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {photos.map((photo: any) => (
          <div key={photo._id} className="break-inside-avoid relative group rounded-xl overflow-hidden shadow-sm border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={photo.url} 
              alt={photo.caption || "Harvest photo"} 
              className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-end pt-12">
              <Badge className="w-fit mb-2 bg-black/50 hover:bg-black/50 text-white border-none font-medium backdrop-blur-sm">
                {photo.cropStage}
              </Badge>
              {photo.caption && (
                <p className="text-sm font-medium text-white line-clamp-2 leading-tight">
                  {photo.caption}
                </p>
              )}
              <p className="text-[10px] text-gray-300 mt-1.5 flex items-center gap-1.5">
                {photo.cropName && <span>{photo.cropName} &middot;</span>}
                {format(new Date(photo.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
