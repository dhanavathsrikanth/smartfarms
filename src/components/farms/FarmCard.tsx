"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { FarmWithStats, EditableFarm } from "@/types/farm";
import { formatINR, formatArea } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  MapPin,
  Sprout,
  TrendingUp,
  TrendingDown,
  Pencil,
  Archive,
  Eye,
  TreePine,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { EditFarmDialog } from "@/components/farms/EditFarmDialog";

interface FarmCardProps {
  farm: FarmWithStats;
}

export function FarmCard({ farm }: FarmCardProps) {
  const router = useRouter();
  const archiveFarm = useMutation(api.farms.archiveFarm);
  const [editOpen, setEditOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const profit = farm.totalProfit ?? 0;
  const isProfitable = profit >= 0;

  // Build EditableFarm snapshot for the dialog
  const editableFarm: EditableFarm = {
    _id: farm._id,
    name: farm.name,
    location: farm.location,
    totalArea: farm.totalArea,
    areaUnit: farm.areaUnit,
    soilType: farm.soilType,
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setArchiving(true);
    try {
      await archiveFarm({ farmId: farm._id });
      toast.success(`"${farm.name}" archived successfully.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to archive farm.";
      toast.error(message);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <>
      <Card
        onClick={() => router.push(`/dashboard/farms/${farm._id}`)}
        className="relative cursor-pointer overflow-hidden border border-border bg-card hover:shadow-md transition-all duration-200 hover:border-secondary/40 group border-l-4 border-l-secondary"
      >
        {/* Subtle green glow overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-transparent" />

        <CardContent className="p-5 relative z-10">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                <TreePine className="h-5 w-5 text-secondary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground leading-tight truncate max-w-[160px] group-hover:text-secondary transition-colors">
                  {farm.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[140px]">{farm.location}</span>
                </p>
              </div>
            </div>

            {/* Three-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 focus:outline-none"
                aria-label="Farm options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/farms/${farm._id}`);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Farm
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleArchive}
                  disabled={archiving}
                  className="text-destructive"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {archiving ? "Archiving…" : "Archive Farm"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-lg bg-muted/60 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Area</p>
              <p className="text-sm font-bold text-foreground leading-tight mt-0.5">
                {formatArea(farm.totalArea, farm.areaUnit)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/60 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total</p>
              <p className="text-sm font-bold text-foreground leading-tight mt-0.5 flex items-center justify-center gap-1">
                <Sprout className="h-3 w-3 text-secondary shrink-0" />
                {farm.totalCrops}
              </p>
            </div>
            <div className="rounded-lg bg-muted/60 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Active</p>
              <p className="text-sm font-bold text-secondary leading-tight mt-0.5">
                {farm.activeCrops}
              </p>
            </div>
          </div>

          {/* Profit/Loss Row */}
          {farm.totalProfit !== undefined && (
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">Net Profit</span>
              <span
                className={`flex items-center gap-1 text-sm font-bold ${
                  isProfitable ? "text-emerald-600" : "text-rose-500"
                }`}
              >
                {isProfitable ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {formatINR(profit)}
              </span>
            </div>
          )}

          {/* Soil type badge */}
          {farm.soilType && (
            <div className="mt-3">
              <Badge variant="outline" className="text-[10px] text-muted-foreground capitalize border-border">
                {farm.soilType} soil
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <EditFarmDialog open={editOpen} onOpenChange={setEditOpen} farm={editableFarm} />
    </>
  );
}
