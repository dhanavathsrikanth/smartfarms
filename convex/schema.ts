import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    userId: v.id("users"),
    body: v.string(),
  }).index("by_userId", ["userId"]),
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }),
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
    externalId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    username: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("byExternalId", ["externalId"]),
});
