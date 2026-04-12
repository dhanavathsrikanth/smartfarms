import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // --- IDENTITY INFRASTRUCTURE ---
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
    externalId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    username: v.optional(v.string()),
    role: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    lastSignInAt: v.optional(v.number()),
    publicMetadata: v.optional(v.any()),
    birthday: v.optional(v.string()),
    gender: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("byExternalId", ["externalId"]),

  // --- 1. FARMS ---
  farms: defineTable({
    userId: v.string(), // Clerk ID
    name: v.string(),
    location: v.string(),
    totalArea: v.number(),
    areaUnit: v.union(v.literal("acres"), v.literal("hectares"), v.literal("bigha")),
    gpsLat: v.optional(v.number()),
    gpsLng: v.optional(v.number()),
    soilType: v.optional(v.string()),
    isArchived: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "isArchived"]),

  // --- 2. CROPS ---
  crops: defineTable({
    farmId: v.id("farms"),
    userId: v.string(),
    name: v.string(),
    variety: v.optional(v.string()),
    sowingDate: v.string(),
    expectedHarvestDate: v.optional(v.string()),
    actualHarvestDate: v.optional(v.string()),
    area: v.number(),
    areaUnit: v.union(v.literal("acres"), v.literal("hectares"), v.literal("bigha")),
    season: v.union(v.literal("kharif"), v.literal("rabi"), v.literal("zaid"), v.literal("annual")),
    year: v.number(),
    status: v.union(v.literal("active"), v.literal("harvested"), v.literal("failed"), v.literal("archived")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_farm", ["farmId"])
    .index("by_user", ["userId"])
    .index("by_status", ["userId", "status"]),

  // --- 3. EXPENSES ---
  expenses: defineTable({
    cropId: v.id("crops"),
    farmId: v.id("farms"),
    userId: v.string(),
    category: v.union(
      v.literal("seed"), v.literal("fertilizer"), v.literal("pesticide"), 
      v.literal("labour"), v.literal("irrigation"), v.literal("equipment"), 
      v.literal("transport"), v.literal("other")
    ),
    amount: v.number(),
    date: v.string(),
    notes: v.optional(v.string()),
    supplier: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    inventoryItemId: v.optional(v.id("inventory")),
    createdAt: v.number(),
  })
    .index("by_crop", ["cropId"])
    .index("by_farm", ["farmId"])
    .index("by_user", ["userId"]),

  // --- 4. SALES ---
  sales: defineTable({
    cropId: v.id("crops"),
    farmId: v.id("farms"),
    userId: v.string(),
    weight: v.number(),
    weightUnit: v.union(v.literal("kg"), v.literal("quintal"), v.literal("ton")),
    ratePerUnit: v.number(),
    totalAmount: v.number(),
    buyerName: v.string(),
    buyerContact: v.optional(v.string()),
    saleType: v.union(v.literal("mandi"), v.literal("direct"), v.literal("contract"), v.literal("other")),
    paymentStatus: v.union(v.literal("paid"), v.literal("pending"), v.literal("partial")),
    date: v.string(),
    notes: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_crop", ["cropId"])
    .index("by_farm", ["farmId"])
    .index("by_user", ["userId"]),

  // --- 5. YIELDS ---
  yields: defineTable({
    cropId: v.id("crops"),
    farmId: v.id("farms"),
    userId: v.string(),
    totalYield: v.number(),
    yieldUnit: v.union(v.literal("kg"), v.literal("quintal"), v.literal("ton")),
    yieldPerAcre: v.number(),
    expectedYield: v.optional(v.number()),
    harvestDate: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_crop", ["cropId"])
    .index("by_farm", ["farmId"]),

  // --- 6. SOIL TESTS ---
  soilTests: defineTable({
    farmId: v.id("farms"),
    userId: v.string(),
    testDate: v.string(),
    pH: v.optional(v.number()),
    nitrogen: v.optional(v.number()),
    phosphorus: v.optional(v.number()),
    potassium: v.optional(v.number()),
    organicMatter: v.optional(v.number()),
    moisture: v.optional(v.number()),
    labName: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_farm", ["farmId"])
    .index("by_user", ["userId"]),

  // --- 7. PEST LOGS ---
  pestLogs: defineTable({
    cropId: v.id("crops"),
    farmId: v.id("farms"),
    userId: v.string(),
    pestType: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    date: v.string(),
    cropStage: v.optional(v.string()),
    treatment: v.optional(v.string()),
    pesticide: v.optional(v.string()),
    treatmentCost: v.optional(v.number()),
    effectiveness: v.optional(v.union(v.literal("poor"), v.literal("moderate"), v.literal("good"), v.literal("excellent"))),
    photoUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_crop", ["cropId"])
    .index("by_farm", ["farmId"]),

  // --- 8. LABOUR LOGS ---
  labourLogs: defineTable({
    farmId: v.id("farms"),
    cropId: v.optional(v.id("crops")),
    userId: v.string(),
    workerName: v.string(),
    workerType: v.union(v.literal("permanent"), v.literal("seasonal"), v.literal("contract")),
    date: v.string(),
    hoursWorked: v.number(),
    wageRate: v.number(),
    totalWage: v.number(),
    task: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_farm", ["farmId"])
    .index("by_user", ["userId"]),

  // --- 9. INVENTORY ---
  inventory: defineTable({
    userId: v.string(),
    itemName: v.string(),
    category: v.union(
      v.literal("seed"), v.literal("fertilizer"), v.literal("pesticide"), 
      v.literal("tool"), v.literal("equipment"), v.literal("other")
    ),
    quantity: v.number(),
    unit: v.string(),
    lowStockThreshold: v.number(),
    expiryDate: v.optional(v.string()),
    purchasePrice: v.number(),
    supplier: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["userId", "category"]),

  // --- 10. FINANCES ---
  finances: defineTable({
    userId: v.string(),
    type: v.union(v.literal("loan"), v.literal("subsidy"), v.literal("insurance"), v.literal("other")),
    name: v.string(),
    amount: v.number(),
    date: v.string(),
    interestRate: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("paid"), v.literal("overdue"), v.literal("claimed")),
    provider: v.optional(v.string()),
    cropId: v.optional(v.id("crops")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["userId", "type"]),

  // --- 11. CROP PHOTOS ---
  cropPhotos: defineTable({
    cropId: v.id("crops"),
    farmId: v.id("farms"),
    userId: v.string(),
    photoUrl: v.string(), // Convex storage URL
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    cropStage: v.optional(
      v.union(
        v.literal("sowing"),
        v.literal("germination"),
        v.literal("vegetative"),
        v.literal("flowering"),
        v.literal("fruiting"),
        v.literal("harvesting"),
        v.literal("post-harvest")
      )
    ),
    takenAt: v.string(), // ISO date string
    createdAt: v.number(),
  })
    .index("by_crop", ["cropId"])
    .index("by_farm", ["farmId"]),

  // --- 12. NOTIFICATIONS ---
  notifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("low_stock"),
      v.literal("price_alert"),
      v.literal("weather"),
      v.literal("ai_insight")
    ),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"]),
});
