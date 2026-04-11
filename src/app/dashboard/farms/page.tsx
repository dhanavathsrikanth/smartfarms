"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useStoreUserEffect } from "../../../useStoreUserEffect";
import { FarmGrid } from "@/components/farms/FarmGrid";
import { CreateFarmDialog } from "@/components/farms/CreateFarmDialog";
import { FarmCard } from "@/components/farms/FarmCard";
import type { FarmWithStats } from "@/types/farm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TreePine,
  Plus,
  Loader2,
  ShieldAlert,
  Archive,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";

export default function FarmsPage() {
  useStoreUserEffect();

  return (
    <div className="min-h-screen bg-background">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
        </div>
      </AuthLoading>

      <Authenticated>
        <FarmsContent />
      </Authenticated>

      <Unauthenticated>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Access Restricted</h1>
            <p className="text-muted-foreground max-w-sm">
              Please sign in to access your farms.
            </p>
          </div>
          <Link href="/">
            <Button className="btn-primary-branding">Return to Home</Button>
          </Link>
        </div>
      </Unauthenticated>
    </div>
  );
}

function FarmsContent() {
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const archivedFarms = useQuery(api.farms.getArchivedFarms);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">My Farms</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TreePine className="h-6 w-6 text-secondary" />
            My Farms
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your farm locations, crops, and soil health.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="btn-secondary-branding gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Farm
        </Button>
      </div>

      {/* ── Main Farm Grid ── */}
      <FarmGrid />

      <Separator />

      {/* ── Archived Farms Toggle ── */}
      <div className="space-y-4">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Archive className="h-4 w-4" />
          <span>
            Archived Farms
            {archivedFarms !== undefined && archivedFarms.length > 0 && (
              <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1.5">
                {archivedFarms.length}
              </Badge>
            )}
          </span>
          {showArchived ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showArchived && (
          <div className="space-y-4">
            {archivedFarms === undefined ? (
              <p className="text-sm text-muted-foreground">Loading archived farms…</p>
            ) : archivedFarms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
                <Archive className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No archived farms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 opacity-70">
                {archivedFarms.map((farm: any) => (
                  <div key={farm._id} className="relative">
                    <div className="absolute top-2 right-2 z-20">
                      <Badge variant="outline" className="text-[10px] bg-background">
                        Archived
                      </Badge>
                    </div>
                    <FarmCard farm={{ ...farm, totalCrops: 0, activeCrops: 0 } as FarmWithStats} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateFarmDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
