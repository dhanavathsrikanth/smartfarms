"use client";

import { useQuery, useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { 
  ChevronRight, 
  Home, 
  Sprout, 
  Pencil, 
  Wheat, 
  MoreVertical, 
  Trash2, 
  Archive,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  Calendar as CalendarIcon,
  MapPin,
  ChevronLeft,
  Loader2,
  FileText,
  ImageIcon,
  History,
  Bug,
  LineChart as LineChartIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CropStatusBadge } from "@/components/crops/CropStatusBadge";
import { CropSeasonBadge } from "@/components/crops/CropSeasonBadge";
import { EditCropDialog } from "@/components/crops/EditCropDialog";
import { MarkHarvestedDialog } from "@/components/crops/MarkHarvestedDialog";
import { CropTimeline } from "@/components/crops/CropTimeline";
import { CropPhotoDiary } from "@/components/crops/CropPhotoDiary";
import { CropWithStats, CropTimelineEvent } from "@/types/crop";
import { formatINR } from "@/lib/utils";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from "recharts";

export default function CropDetailPage() {
  const params = useParams();
  const router = useRouter();
  const farmId = params.farmId as Id<"farms">;
  const cropId = params.cropId as Id<"crops">;

  // State for dialogs
  const [editOpen, setEditOpen] = useState(false);
  const [harvestOpen, setHarvestOpen] = useState(false);

  // Queries
  const crop = useQuery(api.crops.getCrop, { cropId }) as CropWithStats | undefined;
  const timeline = useQuery(api.crops.getCropTimeline, { cropId });
  const photos = useQuery(api.cropPhotos.getPhotosByCrop, { cropId });

  // Mutations
  const archiveCrop = useMutation(api.crops.archiveCrop);
  const deleteCrop = useMutation(api.crops.deleteCrop);

  // Chart Data Processing
  const chartData = useMemo(() => {
    if (!timeline) return [];
    
    const monthlyData: Record<string, { month: string; expenses: number; sales: number }> = {};
    
    (timeline as CropTimelineEvent[]).forEach((event) => {
      const date = new Date(event.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthName, expenses: 0, sales: 0 };
      }
      
      if (event.type === "expense" && event.amount) {
        monthlyData[monthKey].expenses += event.amount;
      } else if (event.type === "sale" && event.amount) {
        monthlyData[monthKey].sales += event.amount;
      }
    });
    
    return Object.values(monthlyData).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  }, [timeline]);

  const calculateDaysActive = () => {
    if (!crop) return 0;
    const end = crop.actualHarvestDate ? new Date(crop.actualHarvestDate) : new Date();
    const start = new Date(crop.sowingDate);
    const diff = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const handleArchive = async () => {
    try {
      await archiveCrop({ cropId });
      toast.success("Crop record archived successfully");
    } catch {
      toast.error("Failed to archive crop");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Confirm Delete? All photo and financial records will be permanently removed.")) return;
    try {
      await deleteCrop({ cropId });
      toast.success("Crop sequence deleted");
      router.push(`/dashboard/farms/${farmId}`);
    } catch {
      toast.error("Deletion failed");
    }
  };

  if (crop === undefined) {
    return <CropDetailSkeleton />;
  }

  if (crop === null) {
    router.push("/dashboard/farms");
    return null;
  }

  const daysActive = calculateDaysActive();

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Breadcrumbs & Header */}
      <div className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <nav className="flex items-center text-xs font-medium text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Home className="h-3 w-3" /> Dashboard
            </Link>
            <ChevronRight className="h-3 w-3 mx-2" />
            <Link href={`/dashboard/farms/${farmId}`} className="hover:text-foreground transition-colors">
              {crop.farmName}
            </Link>
            <ChevronRight className="h-3 w-3 mx-2" />
            <span className="text-foreground font-bold">{crop.name}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 shadow-inner">
                <Sprout className="h-6 w-6 text-secondary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                    {crop.name}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground mr-2">
                    {crop.variety || "Standard Variety"}
                  </p>
                  <CropStatusBadge status={crop.status} />
                  <CropSeasonBadge season={crop.season} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-10 gap-2 border-primary/20 hover:bg-primary/5"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              {crop.status === "active" && (
                <Button 
                  size="sm" 
                  className="h-10 gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
                  onClick={() => setHarvestOpen(true)}
                >
                  <Wheat className="h-4 w-4" />
                  Mark Harvested
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none"
                >
                  <MoreVertical className="h-5 w-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleArchive} disabled={crop.status === "archived"}>
                    <Archive className="mr-2 h-4 w-4" /> Archive Cycle
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats Row */}
        <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
          <StatCard 
            label="Total Expenses" 
            value={formatINR(crop.totalExpenses)} 
            type="expense" 
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <StatCard 
            label="Total Sales" 
            value={formatINR(crop.totalSales)} 
            type="sale" 
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard 
            label="Net Profit" 
            value={(crop.profit >= 0 ? "+" : "") + formatINR(crop.profit)} 
            type={crop.profit >= 0 ? "profit" : "loss"} 
            icon={<LineChartIcon className="h-4 w-4" />}
          />
          <StatCard 
            label="Total Area" 
            value={`${crop.area} ${crop.areaUnit}`} 
            type="info" 
            icon={<Layers className="h-4 w-4" />}
          />
          <StatCard 
            label="Days Active" 
            value={`${daysActive} Days`} 
            type="neutral" 
            icon={<Clock className="h-4 w-4" />}
          />
        </div>

        {/* Info Card & Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Static Info Side Card */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-secondary/20 bg-secondary/[0.02]">
              <CardHeader className="pb-3 px-4">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-secondary" />
                  Cycle Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <div className="space-y-3">
                  <InfoItem label="Sowing Date" value={new Date(crop.sowingDate).toLocaleDateString()} icon={<CalendarIcon className="h-3.5 w-3.5" />} />
                  <InfoItem label="Expected Harvest" value={crop.expectedHarvestDate ? new Date(crop.expectedHarvestDate).toLocaleDateString() : "Not set"} icon={<Clock className="h-3.5 w-3.5" />} />
                  {crop.actualHarvestDate && <InfoItem label="Actual Harvest" value={new Date(crop.actualHarvestDate).toLocaleDateString()} icon={<Wheat className="h-3.5 w-3.5" />} />}
                  <DropdownMenuSeparator className="opacity-50" />
                  <InfoItem label="Season" value={crop.season} className="capitalize" icon={<Sprout className="h-3.5 w-3.5" />} />
                  <InfoItem label="Year" value={crop.year.toString()} icon={<CalendarIcon className="h-3.5 w-3.5" />} />
                  <InfoItem label="Farm" value={crop.farmName || "Unknown Farm"} icon={<Home className="h-3.5 w-3.5" />} />
                  <InfoItem label="Location" value={crop.farmLocation || "-"} icon={<MapPin className="h-3.5 w-3.5" />} />
                </div>

                {crop.notes && (
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Cycle Notes</p>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      &quot;{crop.notes}&quot;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto h-12 bg-muted/40 p-1 mb-6 no-scrollbar">
                <TabsTrigger value="overview" className="gap-2 px-6">Overview</TabsTrigger>
                <TabsTrigger value="expenses" className="gap-2 px-6">Expenses</TabsTrigger>
                <TabsTrigger value="sales" className="gap-2 px-6">Sales</TabsTrigger>
                <TabsTrigger value="yield" className="gap-2 px-6">Yield</TabsTrigger>
                <TabsTrigger value="diary" className="gap-2 px-6">Photo Diary</TabsTrigger>
                <TabsTrigger value="pest" className="gap-2 px-6">Pest Log</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-8 focus-visible:outline-none">
                {/* Analytics Chart */}
                <Card className="border-none shadow-sm bg-card/40 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold">Cycle Performance</CardTitle>
                      <CardDescription>Monthly breakdown of cultivation expenses vs revenue</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[300px] w-full pt-4">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#666" }} />
                          <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} tick={{ fill: "#666" }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            formatter={(v: string | number | readonly (string | number)[] | undefined) => [formatINR(Number(v) || 0), ""]}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                          <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} />
                          <Bar dataKey="sales" name="Sales" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/20 rounded-xl border-2 border-dashed">
                        <LineChartIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">Insufficient data for charting</p>
                        <p className="text-xs text-muted-foreground mt-1">Log expenses or sales to see performance trends.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Diary Preview & Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="border-none shadow-sm bg-card/40">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-md font-bold flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-secondary" />
                        Latest Observation
                      </CardTitle>
                      <Link href="#diary" className="text-xs text-secondary font-semibold hover:underline" onClick={(e) => { e.preventDefault(); /* Would trigger tab change programmatically */}}>
                        View Full Diary
                      </Link>
                    </CardHeader>
                    <CardContent>
                      {photos && photos.length > 0 ? (
                        <div className="space-y-4">
                          <div className="aspect-video relative rounded-xl overflow-hidden shadow-inner bg-black/5">
                            <img src={photos[0].photoUrl} alt="Latest growth" className="w-full h-full object-cover" />
                            <div className="absolute bottom-2 left-2 flex gap-1.5">
                              {photos[0].cropStage && (
                                <Badge className="bg-white/90 text-foreground border-none text-[9px] uppercase font-bold backdrop-blur-sm">
                                  {photos[0].cropStage}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold line-clamp-1">{photos[0].caption || "Observation Recorded"}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                              Logged on {new Date(photos[0].takenAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                          <ImageIcon className="h-6 w-6 mb-2 opacity-50" />
                          <p className="text-xs font-medium">No photos yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm bg-card/40">
                    <CardHeader className="pb-3 px-6">
                      <CardTitle className="text-md font-bold flex items-center gap-2">
                        <History className="h-4 w-4 text-secondary" />
                        Activity Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] overflow-y-auto px-6 no-scrollbar custom-scrollbar">
                      <CropTimeline cropId={cropId} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="expenses" className="focus-visible:outline-none">
                <BannerPlaceholder 
                  module="Expense Tracking" 
                  description="Coming in Module 3. You will be able to log seed, fertilizer, and labor costs." 
                  icon={<TrendingDown className="h-10 w-10" />}
                  statLabel="Current Total Expenses"
                  statValue={formatINR(crop.totalExpenses)}
                />
              </TabsContent>

              <TabsContent value="sales" className="focus-visible:outline-none">
                <BannerPlaceholder 
                  module="Sales Management" 
                  description="Coming in Module 4. Track buyers, rates, and market arrivals." 
                  icon={<TrendingUp className="h-10 w-10 text-emerald-500" />}
                  statLabel="Current Total Revenue"
                  statValue={formatINR(crop.totalSales)}
                />
              </TabsContent>

              <TabsContent value="yield" className="focus-visible:outline-none">
                <BannerPlaceholder 
                  module="Yield Analytics" 
                  description="Coming in Module 6. Visualize productivity per area." 
                  icon={<Wheat className="h-10 w-10 text-amber-500" />}
                />
              </TabsContent>

              <TabsContent value="diary" className="focus-visible:outline-none">
                <CropPhotoDiary cropId={cropId} />
              </TabsContent>

              <TabsContent value="pest" className="focus-visible:outline-none">
                <BannerPlaceholder 
                  module="Pest & Disease Log" 
                  description="Coming in Module 8. Identify and log crop health issues." 
                  icon={<Bug className="h-10 w-10 text-orange-500" />}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EditCropDialog 
        crop={crop} 
        open={editOpen} 
        onOpenChange={setEditOpen} 
      />
      
      <MarkHarvestedDialog 
        crop={crop} 
        open={harvestOpen} 
        onOpenChange={setHarvestOpen} 
      />
    </div>
  );
}

function StatCard({ label, value, type, icon }: { label: string; value: string; type: string; icon: React.ReactNode }) {
  const configs: Record<string, string> = {
    expense: "bg-red-500/10 text-red-700 border-red-500/20 shadow-red-500/5",
    sale: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shadow-emerald-500/5",
    profit: "bg-green-500/10 text-green-700 border-green-500/20 shadow-green-500/5",
    loss: "bg-rose-500/10 text-rose-700 border-rose-500/20 shadow-rose-500/5",
    info: "bg-blue-500/10 text-blue-700 border-blue-500/20 shadow-blue-500/5",
    neutral: "bg-slate-500/10 text-slate-700 border-slate-500/20 shadow-slate-500/5",
  };

  return (
    <Card className={`min-w-[180px] flex-1 border ${configs[type]} shadow-sm`}>
      <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
        <div className="p-2 rounded-full bg-white/50 backdrop-blur-sm shadow-sm">{icon}</div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 leading-none mb-1">{label}</p>
          <p className="text-lg font-extrabold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value, icon, className = "" }: { label: string; value: string; icon: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-muted-foreground font-medium">
        <span className="opacity-70">{icon}</span>
        {label}
      </div>
      <span className={`font-bold text-foreground text-right ${className}`}>{value}</span>
    </div>
  );
}

function BannerPlaceholder({ module, description, icon, statLabel, statValue }: { module: string; description: string; icon: React.ReactNode; statLabel?: string; statValue?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl bg-muted/30 border-2 border-dashed border-border/60 text-center gap-4">
      <div className="h-20 w-20 rounded-full bg-background flex items-center justify-center shadow-inner text-muted-foreground/30">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold">{module} Feature</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      
      {statLabel && (
        <div className="mt-8 p-6 bg-background/50 rounded-2xl border flex flex-col items-center min-w-[200px] shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{statLabel}</p>
          <p className="text-2xl font-black text-foreground">{statValue}</p>
        </div>
      )}
    </div>
  );
}

function CropDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-4">
        <Skeleton className="lg:col-span-1 h-[400px] rounded-2xl" />
        <div className="lg:col-span-3 space-y-6">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-[300px] w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-[200px] rounded-2xl" />
            <Skeleton className="h-[200px] rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
