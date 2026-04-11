"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CropWithStats } from "@/types/crop";
import { CropCard } from "./CropCard";
import { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  ArrowUpDown, 
  Sprout, 
  Wheat, 
  AlertCircle,
  LayoutGrid,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface CropGridProps {
  farmId?: Id<"farms">;
  onAddClick?: () => void;
}

type FilterStatus = "all" | "active" | "harvested" | "failed";
type SortOption = "newest" | "oldest" | "profitable" | "expensive";

export function CropGrid({ farmId, onAddClick }: CropGridProps) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Simple debounce logic
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  });
  
  // Use useEffect for the actual debounce
  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(handler);
  }, [search]);

  const cropsResult = useQuery(
    farmId ? api.crops.listCropsByFarm : api.crops.listAllCrops,
    farmId ? { farmId } : {}
  ) as CropWithStats[] | undefined;

  const filteredAndSortedCrops = useMemo(() => {
    if (!cropsResult) return [];

    let result = [...cropsResult];

    // Search
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.variety?.toLowerCase().includes(query) ||
        c.farmName?.toLowerCase().includes(query)
      );
    }

    // Filter
    if (filter !== "all") {
      result = result.filter(c => c.status === filter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case "newest": return b.createdAt - a.createdAt;
        case "oldest": return a.createdAt - b.createdAt;
        case "profitable": return b.profit - a.profit;
        case "expensive": return b.totalExpenses - a.totalExpenses;
        default: return 0;
      }
    });

    return result;
  }, [cropsResult, filter, sort, debouncedSearch]);

  if (cropsResult === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-xl border border-border bg-card/50 flex flex-col p-4 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="space-y-2 pt-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xs group">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-secondary transition-colors" />
          <Input
            placeholder="Search crop or farm..."
            className="pl-9 pr-9 h-10 border-muted-foreground/20 focus:border-secondary transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 h-5 w-5 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Tabs 
            defaultValue="all" 
            className="w-full md:w-auto"
            onValueChange={(v) => setFilter(v as FilterStatus)}
          >
            <TabsList className="bg-muted/50 w-full md:w-auto">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="active" className="text-xs gap-1.5">
                <Sprout className="h-3 w-3" /> Active
              </TabsTrigger>
              <TabsTrigger value="harvested" className="text-xs gap-1.5">
                <Wheat className="h-3 w-3" /> Harvested
              </TabsTrigger>
              <TabsTrigger value="failed" className="text-xs gap-1.5 text-destructive">
                <AlertCircle className="h-3 w-3" /> Failed
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSort("newest")}>Newest Sowed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("oldest")}>Oldest records</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("profitable")}>Most Profitable</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("expensive")}>Highest Costs</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onAddClick && (
            <Button 
              size="sm" 
              className="h-9 btn-secondary-branding gap-2 hidden md:flex"
              onClick={onAddClick}
            >
              <Plus className="h-4 w-4" />
              Log Crop
            </Button>
          )}
        </div>
      </div>

      {/* Grid Content */}
      {filteredAndSortedCrops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-xl bg-card/10">
          <div className="h-16 w-16 items-center justify-center rounded-2xl bg-muted flex mb-4">
            <LayoutGrid className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold">No crops found</h3>
          <p className="text-muted-foreground text-sm max-w-xs mt-1">
            {search ? "Try adjusting your search query." : "Register a farm and log your first crop cycle to start tracking growth and profits."}
          </p>
          {onAddClick && !search && (
            <Button className="mt-6 btn-primary-branding gap-2" onClick={onAddClick}>
              <Plus className="h-4 w-4" />
              Log Your First Crop
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCrops.map((crop) => (
            <CropCard 
              key={crop._id} 
              crop={crop} 
              // These will be wired to state in the parent page/container
              onEdit={() => console.log("Edit", crop._id)}
              onMarkHarvested={() => console.log("Harvest", crop._id)}
            />
          ))}
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      {onAddClick && (
        <Button 
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl md:hidden btn-secondary-branding p-0"
          onClick={onAddClick}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
