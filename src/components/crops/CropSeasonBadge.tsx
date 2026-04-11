"use client";

import { Badge } from "@/components/ui/badge";
import { Season } from "@/types/farm";

interface CropSeasonBadgeProps {
  season: Season;
  className?: string;
}

export function CropSeasonBadge({ season, className }: CropSeasonBadgeProps) {
  const config = {
    kharif: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
    rabi: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
    zaid: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
    annual: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
  }[season];

  return (
    <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-none ${config} ${className}`}>
      {season}
    </Badge>
  );
}
