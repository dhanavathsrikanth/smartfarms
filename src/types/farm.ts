import { Id } from "../../convex/_generated/dataModel";

// ─── Core Farm types (mirroring the Convex schema) ───────────────────────────

export type AreaUnit = "acres" | "hectares" | "bigha";

export type Season = "kharif" | "rabi" | "zaid" | "annual";

export type CropStatus = "active" | "harvested" | "failed" | "archived";

export interface Farm {
  _id: Id<"farms">;
  _creationTime: number;
  userId: string;
  name: string;
  location: string;
  totalArea: number;
  areaUnit: AreaUnit;
  gpsLat?: number;
  gpsLng?: number;
  soilType?: string;
  isArchived: boolean;
  createdAt: number;
}

/** Farm returned from listFarms — includes computed crop counts */
export interface FarmWithCropStats extends Farm {
  totalCrops: number;
  activeCrops: number;
}

/** Full card data — FarmWithCropStats + optional financial overlay */
export interface FarmWithStats extends FarmWithCropStats {
  totalExpenses?: number;
  totalSales?: number;
  totalProfit?: number;
  activeCropsCount?: number;
}

// ─── Stats returned from getFarmStats ────────────────────────────────────────

export interface FarmStats {
  totalExpenses: number;
  totalSales: number;
  totalProfit: number;
  activeCropsCount: number;
  totalCropsCount: number;
  lastActivityDate: number | null;
}

// ─── Mutation input shapes ────────────────────────────────────────────────────

export interface CreateFarmInput {
  name: string;
  location: string;
  totalArea: number;
  areaUnit: AreaUnit;
  gpsLat?: number;
  gpsLng?: number;
  soilType?: string;
}

export interface UpdateFarmInput {
  farmId: Id<"farms">;
  name?: string;
  location?: string;
  totalArea?: number;
  areaUnit?: AreaUnit;
  gpsLat?: number;
  gpsLng?: number;
  soilType?: string;
}

// ─── Editable snapshot passed to EditFarmDialog ──────────────────────────────

export interface EditableFarm {
  _id: Id<"farms">;
  name: string;
  location: string;
  totalArea: number;
  areaUnit: AreaUnit;
  soilType?: string;
}
