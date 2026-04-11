import { Id } from "../../convex/_generated/dataModel";
import { AreaUnit, Season, CropStatus } from "./farm";

/** Core Crop type from schema */
export interface Crop {
  _id: Id<"crops">;
  _creationTime: number;
  farmId: Id<"farms">;
  userId: string;
  name: string;
  variety?: string;
  sowingDate: string;
  expectedHarvestDate?: string;
  actualHarvestDate?: string;
  area: number;
  areaUnit: AreaUnit;
  season: Season;
  year: number;
  status: CropStatus;
  notes?: string;
  createdAt: number;
}

/** Crop with computed fields from backend queries */
export interface CropWithStats extends Crop {
  totalExpenses: number;
  totalSales: number;
  profit: number;
  daysToHarvest: number | null;
  farmName?: string;
  farmLocation?: string;
}

/** Input for creating a new crop */
export interface CreateCropInput {
  farmId: Id<"farms">;
  name: string;
  variety?: string;
  sowingDate: string;
  expectedHarvestDate?: string;
  area: number;
  areaUnit: AreaUnit;
  season: Season;
  year: number;
  notes?: string;
}

/** Input for updating an existing crop */
export interface UpdateCropInput {
  cropId: Id<"crops">;
  name?: string;
  variety?: string;
  sowingDate?: string;
  expectedHarvestDate?: string;
  actualHarvestDate?: string;
  area?: number;
  areaUnit?: AreaUnit;
  season?: Season;
  status?: CropStatus;
  notes?: string;
}

/** Summary statistics for crops dashboard */
export interface CropSummaryStats {
  totalActiveCrops: number;
  totalHarvestedCrops: number;
  totalFailedCrops: number;
  totalProfitAllTime: number;
  bestPerformingCrop: string;
  mostExpensiveCrop: string;
}

export type CropStage = "sowing" | "germination" | "vegetative" | "flowering" | "fruiting" | "harvesting" | "post-harvest";

/** Crop Photo Diary Entry */
export interface CropPhoto {
  _id: Id<"cropPhotos">;
  _creationTime: number;
  cropId: Id<"crops">;
  farmId: Id<"farms">;
  userId: string;
  photoUrl: string;
  storageId: Id<"_storage">;
  caption?: string;
  cropStage?: CropStage;
  takenAt: string;
  createdAt: number;
}

/** Crop Activity Timeline Event */
export interface CropTimelineEvent {
  type: "expense" | "sale" | "pest" | "yield";
  date: string;
  description: string;
  amount?: number;
}
