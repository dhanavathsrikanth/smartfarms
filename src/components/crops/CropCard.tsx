"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CropWithStats } from "@/types/crop";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Layers, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Archive, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Clock,
  Wheat,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CropStatusBadge } from "./CropStatusBadge";
import { CropSeasonBadge } from "./CropSeasonBadge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface CropCardProps {
  crop: CropWithStats;
  onEdit?: (crop: CropWithStats) => void;
  onMarkHarvested?: (crop: CropWithStats) => void;
}

export function CropCard({ crop, onEdit, onMarkHarvested }: CropCardProps) {
  const router = useRouter();
  const deleteCrop = useMutation(api.crops.deleteCrop);
  const archiveCrop = useMutation(api.crops.archiveCrop);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCrop({ cropId: crop._id });
      toast.success(`"${crop.name}" deleted successfully.`);
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to delete crop record.");
    } finally {
      setDeleting(false);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await archiveCrop({ cropId: crop._id });
      toast.success(`"${crop.name}" archived.`);
    } catch {
      toast.error("Failed to archive crop.");
    }
  };

  const navigateToDetail = () => {
    router.push(`/dashboard/farms/${crop.farmId}/crops/${crop._id}`);
  };

  const getDaysLeftColor = (days: number | null) => {
    if (days === null) return "bg-slate-100 text-slate-600";
    if (days < 14) return "bg-red-100 text-red-700 border-red-200 animate-pulse";
    if (days < 30) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  const statusBorderMap = {
    active: "border-l-emerald-500",
    harvested: "border-l-amber-500",
    failed: "border-l-red-500",
    archived: "border-l-slate-400",
  };

  return (
    <Card 
      className={`group overflow-hidden border-l-4 ${statusBorderMap[crop.status]} hover:shadow-lg transition-all cursor-pointer bg-card/50 backdrop-blur-sm`}
      onClick={navigateToDetail}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-secondary transition-colors line-clamp-1">
              {crop.name}
            </h3>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider line-clamp-1">
              {crop.variety || "Standard Variety"}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 focus:outline-none"
              aria-label="Crop options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(crop); }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(e); }} disabled={crop.status === "archived"}>
                <Archive className="mr-2 h-4 w-4" /> Archive Cycle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive bg-destructive/5 font-semibold" 
                onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2 mt-2">
          <CropStatusBadge status={crop.status} />
          <CropSeasonBadge season={crop.season} />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-4">
        {/* Timeline Dates */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground rounded-md bg-muted/40 p-2">
            <Calendar className="h-3.5 w-3.5 text-secondary" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Sowed</span>
              <span className="font-semibold text-foreground">{new Date(crop.sowingDate).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground rounded-md bg-muted/40 p-2">
            <Layers className="h-3.5 w-3.5 text-secondary" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Area</span>
              <span className="font-semibold text-foreground">{crop.area} {crop.areaUnit}</span>
            </div>
          </div>
        </div>

        {/* Harvest Status / Countdown */}
        <div className="rounded-lg border border-border/50 bg-background/50 p-3 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest leading-none">
              {crop.status === "active" ? "Expected Harvest" : "Harvested Date"}
            </p>
            <p className="text-sm font-bold text-foreground">
              {crop.status === "active" 
                ? (crop.expectedHarvestDate ? new Date(crop.expectedHarvestDate).toLocaleDateString() : "Not set")
                : (crop.actualHarvestDate ? new Date(crop.actualHarvestDate).toLocaleDateString() : "Unknown")
              }
            </p>
          </div>
          {crop.status === "active" && crop.daysToHarvest !== null && (
            <Badge className={`${getDaysLeftColor(crop.daysToHarvest)} flex items-center gap-1.5 px-3 py-1`}>
              <Clock className="h-3 w-3" />
              {crop.daysToHarvest === 0 ? "Harvest Now" : `${crop.daysToHarvest} days left`}
            </Badge>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 divide-x divide-border/50 border-t border-border/30 pt-4">
          <div className="text-center px-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Expenses</p>
            <p className="text-sm font-bold text-foreground font-mono">{formatINR(crop.totalExpenses)}</p>
          </div>
          <div className="text-center px-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Sales</p>
            <p className="text-sm font-bold text-foreground font-mono">{formatINR(crop.totalSales)}</p>
          </div>
          <div className="text-center px-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Profit</p>
            <div className="flex items-center justify-center gap-0.5">
              {crop.profit >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />}
              <p className={`text-sm font-bold font-mono ${crop.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {crop.profit >= 0 ? "+" : ""}{formatINR(crop.profit)}
              </p>
              {crop.totalExpenses > crop.totalSales && crop.totalSales > 0 && (
                <span title="Expenses exceed sales">
                  <AlertTriangle className="h-3 w-3 text-amber-500 ml-0.5" />
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 gap-2 flex-wrap">
        <Button 
          variant="outline" 
          size="sm"
          className="h-9 gap-2 border-muted-foreground/20"
          onClick={(e) => { e.stopPropagation(); onEdit?.(crop); }}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        {crop.status === "active" && (
          <Button 
            className="flex-1 btn-primary-branding h-9 gap-2"
            onClick={(e) => { e.stopPropagation(); onMarkHarvested?.(crop); }}
          >
            <Wheat className="h-4 w-4" />
            Mark Harvested
          </Button>
        )}
        <Button 
          variant="outline" 
          className="flex-1 h-9 gap-2 group-hover:bg-secondary/5 transition-colors"
          onClick={(e) => { e.stopPropagation(); navigateToDetail(); }}
        >
          Details
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete {crop.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will permanently delete this crop and all associated data, including:
              <ul className="list-disc list-inside mt-2 space-y-1 font-medium text-foreground/80">
                <li>Yield & Profit Records</li>
                <li>Expense & Sales logs</li>
                <li>Pest & Growth updates</li>
                <li>Photo Diary entries</li>
              </ul>
              <p className="mt-3 font-bold text-destructive underline">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={deleting}>Cancel Operation</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Confirm Deletion"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
