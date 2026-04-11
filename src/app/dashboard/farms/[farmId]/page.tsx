"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, Authenticated, AuthLoading } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useStoreUserEffect } from "../../../../useStoreUserEffect";
import { FarmStatsBar, FarmStatsBarSkeleton } from "@/components/farms/FarmStatsBar";
import { EditFarmDialog } from "@/components/farms/EditFarmDialog";
import { CreateCropDialog } from "@/components/crops/CreateCropDialog";
import { CropGrid } from "@/components/crops/CropGrid";
import type { EditableFarm } from "@/types/farm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogMedia,
} from "@/components/ui/alert-dialog";
import {
  TreePine,
  MapPin,
  Layers,
  Sprout,
  Pencil,
  Archive,
  Loader2,
  Navigation,
  FlaskConical,
  Users,
  AlertTriangle,
  ChevronRight,
  Plus
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function FarmDetailPage() {
  useStoreUserEffect();
  const params = useParams();
  const farmId = params.farmId as Id<"farms">;

  return (
    <div className="min-h-screen bg-background">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
        </div>
      </AuthLoading>
      <Authenticated>
        <FarmDetailContent farmId={farmId} />
      </Authenticated>
    </div>
  );
}

function FarmDetailContent({ farmId }: { farmId: Id<"farms"> }) {
  const router = useRouter();
  const farm = useQuery(api.farms.getFarm, { farmId });
  const stats = useQuery(api.farms.getFarmStats, { farmId });
  const archiveFarm = useMutation(api.farms.archiveFarm);

  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [createCropOpen, setCreateCropOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      // Close dialog immediately to avoid perceived lag
      setArchiveOpen(false);
      
      await archiveFarm({ farmId });
      toast.success(`"${farm?.name}" has been archived successfully.`, {
        icon: <Archive className="h-4 w-4 text-secondary" />,
        description: "Moving back to your active farms list..."
      });
      
      // Delay navigation slightly so the user sees the success toast
      setTimeout(() => {
        router.push("/dashboard/farms");
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to archive farm.";
      toast.error(message);
      setArchiveOpen(true); // Re-open on error so user can see what happened
    } finally {
      setArchiving(false);
    }
  };

  if (farm === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-6 w-64 bg-muted animate-pulse rounded" />
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <FarmStatsBarSkeleton />
        <div className="h-40 w-full bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (farm === null) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <TreePine className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Farm Not Found</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          This farm doesn't exist or you don't have access to it.
        </p>
        <Link href="/dashboard/farms">
          <Button variant="outline" className="gap-2">
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Farms
          </Button>
        </Link>
      </div>
    );
  }

  const editableFarm: EditableFarm = {
    _id: farm._id,
    name: farm.name,
    location: farm.location,
    totalArea: farm.totalArea,
    areaUnit: farm.areaUnit,
    soilType: farm.soilType,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/dashboard/farms" className="hover:text-foreground transition-colors">Farms</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{farm.name}</span>
      </nav>

      {/* ── Archived Banner ── */}
      {farm.isArchived && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">This farm is archived.</p>
            <p className="opacity-90">Data is preserved, but you cannot add new crops or expenses unless you restore it.</p>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 mt-0.5 relative">
            <TreePine className="h-6 w-6 text-secondary" />
            {farm.isArchived && (
              <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5 ring-2 ring-background">
                <div className="rounded-full bg-amber-500 p-0.5">
                  <Archive className="h-2.5 w-2.5 text-white" />
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{farm.name}</h1>
              {farm.isArchived && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-2 py-0 h-5 text-[10px] uppercase tracking-wider font-bold">
                  Archived
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {farm.location}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setEditOpen(true)}
            disabled={farm.isArchived}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => setArchiveOpen(true)}
            disabled={farm.isArchived}
          >
            <Archive className="h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      {stats ? (
        <FarmStatsBar stats={stats} />
      ) : (
        <FarmStatsBarSkeleton />
      )}

      {/* ── Farm Info Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Farm Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoPill
              label="Total Area"
              value={`${farm.totalArea} ${farm.areaUnit}`}
              icon={<Layers className="h-4 w-4" />}
            />
            <InfoPill
              label="Soil Type"
              value={farm.soilType ?? "Not recorded"}
              icon={<FlaskConical className="h-4 w-4" />}
            />
            {farm.gpsLat !== undefined && farm.gpsLng !== undefined ? (
              <InfoPill
                label="GPS Location"
                value={`${farm.gpsLat.toFixed(4)}, ${farm.gpsLng.toFixed(4)}`}
                icon={<Navigation className="h-4 w-4" />}
              />
            ) : (
              <InfoPill
                label="GPS Location"
                value="Not set"
                icon={<Navigation className="h-4 w-4" />}
                muted
              />
            )}
            <InfoPill
              label="Registered"
              value={new Date(farm.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              icon={<TreePine className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs defaultValue="crops">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="crops" className="gap-1.5">
            <Sprout className="h-4 w-4" /> Crops
          </TabsTrigger>
          <TabsTrigger value="soil" className="gap-1.5">
            <FlaskConical className="h-4 w-4" /> Soil Tests
          </TabsTrigger>
          <TabsTrigger value="labour" className="gap-1.5">
            <Users className="h-4 w-4" /> Labour
          </TabsTrigger>
        </TabsList>

        {/* Crops Tab */}
        <TabsContent value="crops" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Crop Management</h3>
                <p className="text-sm text-muted-foreground">Track current and historical cultivation cycles for this farm.</p>
              </div>
              <Button 
                size="sm" 
                className="btn-secondary-branding gap-2"
                onClick={() => setCreateCropOpen(true)}
                disabled={farm.isArchived}
              >
                <Plus className="h-4 w-4" />
                Log New Crop
              </Button>
            </div>
            
            <CropGrid farmId={farmId} onAddClick={() => setCreateCropOpen(true)} />
          </div>
        </TabsContent>

        {/* Soil Tests Tab */}
        <TabsContent value="soil" className="mt-4">
          <PlaceholderTabContent
            icon={<FlaskConical className="h-8 w-8 text-secondary" />}
            title="Soil Tests — Module 3"
            description="Track pH, nitrogen, phosphorus, potassium, and organic matter levels across seasons to make data-driven fertilization decisions."
            badge="Coming Soon"
          />
        </TabsContent>

        {/* Labour Tab */}
        <TabsContent value="labour" className="mt-4">
          <PlaceholderTabContent
            icon={<Users className="h-8 w-8 text-secondary" />}
            title="Labour Logs — Module 4"
            description="Manage daily labour attendance, wages, and task assignments for permanent, seasonal, and contract workers."
            badge="Coming Soon"
          />
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ── */}
      <EditFarmDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        farm={editableFarm}
      />
      
      <CreateCropDialog
        open={createCropOpen}
        onOpenChange={setCreateCropOpen}
        farmId={farmId}
      />

      {/* ── Archive Confirmation Dialog ── */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangle className="text-amber-500" />
            </AlertDialogMedia>
            <AlertDialogTitle>Archive this farm?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{farm.name}</strong> will be archived and hidden from your active farms list.
              All crop, expense, and sales data will be preserved. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={handleArchive}
              disabled={archiving}
              variant="destructive"
              className="gap-2"
            >
              {archiving && <Loader2 className="h-4 w-4 animate-spin" />}
              {archiving ? "Archiving…" : "Archive Farm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function InfoPill({
  label, value, icon, muted,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-secondary">{icon}</span>
        {label}
      </div>
      <p className={`text-sm font-semibold ${muted ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function PlaceholderTabContent({
  icon, title, description, badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4 rounded-xl border-2 border-dashed border-border bg-muted/10">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10">
        {icon}
      </div>
      <div className="space-y-1.5 max-w-sm">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Badge variant="outline" className="text-[10px] text-secondary border-secondary/30 bg-secondary/5">
            {badge}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
