"use client";

import { Badge } from "@/components/ui/badge";
import { Sprout, Wheat, AlertCircle, Archive } from "lucide-react";
import { CropStatus } from "@/types/farm";

interface CropStatusBadgeProps {
  status: CropStatus;
  className?: string;
}

export function CropStatusBadge({ status, className }: CropStatusBadgeProps) {
  const config = {
    active: {
      label: "Active",
      icon: <Sprout className="h-3 w-3" />,
      styles: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    },
    harvested: {
      label: "Harvested",
      icon: <Wheat className="h-3 w-3" />,
      styles: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
    },
    failed: {
      label: "Failed",
      icon: <AlertCircle className="h-3 w-3" />,
      styles: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
    },
    archived: {
      label: "Archived",
      icon: <Archive className="h-3 w-3" />,
      styles: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
    },
  }[status];

  return (
    <Badge variant="outline" className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-none ${config.styles} ${className}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
