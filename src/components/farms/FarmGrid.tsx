"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FarmCard } from "./FarmCard";
import { CreateFarmDialog } from "./CreateFarmDialog";
import type { FarmWithStats } from "@/types/farm";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, TreePine, Sprout, AlertTriangle } from "lucide-react";
import { useState } from "react";

export function FarmGrid() {
  const farms = useQuery(api.farms.listFarms);
  const [createOpen, setCreateOpen] = useState(false);

  // useQuery returns `undefined` while loading, then the data or throws.
  // We catch the error state by checking if farms is an Error instance.
  const isError = farms instanceof Error;
  const isLoading = farms === undefined && !isError;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <TreePine className="h-5 w-5 text-secondary" />
            Your Farms
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading…"
              : isError
              ? "Could not load farms"
              : `${farms.length} farm${farms.length !== 1 ? "s" : ""} registered`}
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="btn-secondary-branding gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Farm
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <FarmCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => setCreateOpen(false)} />
      ) : farms.length === 0 ? (
        <EmptyFarmsState onAddFarm={() => setCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {(farms as FarmWithStats[]).map((farm) => (
            <FarmCard key={farm._id} farm={farm} />
          ))}
        </div>
      )}

      <CreateFarmDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function FarmCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-secondary/30 overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-px w-full" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyFarmsState({ onAddFarm }: { onAddFarm: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-5 rounded-2xl border-2 border-dashed border-border bg-muted/20">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary/10">
          <TreePine className="h-10 w-10 text-secondary" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary border-2 border-background">
          <Sprout className="h-3.5 w-3.5 text-black" />
        </div>
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-semibold text-foreground">No farms registered yet</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Start by registering your first farm. You can track crops, expenses,
          sales, and soil health all in one place.
        </p>
      </div>
      <Button
        onClick={onAddFarm}
        className="btn-primary-branding gap-2 mt-2"
        size="default"
      >
        <Plus className="h-4 w-4" />
        Add your first farm
      </Button>
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4 rounded-2xl border border-destructive/20 bg-destructive/5">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-foreground">Failed to load farms</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          There was a problem fetching your farms. Check your connection and try again.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        Retry
      </Button>
    </div>
  );
}
