"use client";

import { useState } from "react";
import { useQuery, Authenticated, AuthLoading } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useStoreUserEffect } from "../../../useStoreUserEffect";
import { CropGrid } from "@/components/crops/CropGrid";
import { CreateCropDialog } from "@/components/crops/CreateCropDialog";
import { CropCalendar } from "@/components/crops/CropCalendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Sprout, 
  Wheat, 
  TrendingUp, 
  Trophy,
  Loader2,
  ChevronRight,
  LayoutGrid,
  CalendarDays,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";

export default function AllCropsPage() {
  useStoreUserEffect();

  return (
    <div className="min-h-screen bg-background">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
        </div>
      </AuthLoading>
      <Authenticated>
        <AllCropsContent />
      </Authenticated>
    </div>
  );
}

function AllCropsContent() {
  const [createOpen, setCreateOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const stats = useQuery(api.crops.getCropSummaryStats);
  const crops = useQuery(api.crops.listAllCrops);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">All Crops</span>
      </nav>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">All Crops</h1>
            {crops !== undefined && (
              <Badge variant="secondary" className="h-6 rounded-full px-3 text-xs font-bold bg-secondary/10 text-secondary border-secondary/20">
                {crops.length} Total
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">Monitor cultivation cycles across all your farms.</p>
        </div>
        
        <Button 
          className="btn-secondary-branding gap-2 h-11 px-6 shadow-lg shadow-secondary/10"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-5 w-5" />
          <span className="font-semibold">Register New Crop</span>
        </Button>
      </div>

      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats ? (
          <>
            <SummaryCard 
              label="Active Cycles" 
              value={stats.totalActiveCrops.toString()} 
              icon={<Sprout className="h-5 w-5" />} 
              color="text-secondary"
              bg="bg-secondary/10"
            />
            <SummaryCard 
              label="Harvested" 
              value={stats.totalHarvestedCrops.toString()} 
              icon={<Wheat className="h-5 w-5" />} 
              color="text-amber-600"
              bg="bg-amber-100/50"
            />
            <SummaryCard 
              label="Total Profit" 
              value={formatINR(stats.totalProfitAllTime)} 
              icon={<TrendingUp className="h-5 w-5" />} 
              color="text-emerald-600"
              bg="bg-emerald-100/50"
            />
            <SummaryCard 
              label="Best Performer" 
              value={stats.bestPerformingCrop} 
              icon={<Trophy className="h-5 w-5" />} 
              color="text-secondary"
              bg="bg-secondary/10"
              isTruncated
            />
          </>
        ) : (
          [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl w-full" />)
        )}
      </div>

      {/* ── Calendar Toggle ── */}
      {stats && stats.totalActiveCrops > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-secondary" />
              Sowing Timeline
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs font-bold gap-2 hover:bg-secondary/10 hover:text-secondary transition-all"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              {showCalendar ? (
                <>Hide Calendar <ChevronUp className="h-3.5 w-3.5" /></>
              ) : (
                <>Show Calendar <ChevronDown className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </div>
          
          {showCalendar && (
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <CropCalendar />
            </div>
          )}
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="pt-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-secondary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">All Crop Records</h2>
        </div>
        <CropGrid onAddClick={() => setCreateOpen(true)} />
      </div>

      {/* ── Create Dialog ── */}
      <CreateCropDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen} 
      />
    </div>
  );
}

function SummaryCard({ label, value, icon, color, bg, isTruncated }: { 
  label: string; 
  value: string; 
  icon: React.ReactNode; 
  color: string; 
  bg: string;
  isTruncated?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-lg font-bold tracking-tight ${color} ${isTruncated ? "truncate" : ""}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
