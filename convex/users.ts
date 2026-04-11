import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";

/**
 * Current User Query
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

/**
 * Client-side Storage Mutation
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if we've already stored this identity before.
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) =>
        q.eq("externalId", identity.subject),
      )
      .unique();

    const publicMetadata = identity.publicMetadata as any;

    const userProps = {
      name: identity.name ?? "Anonymous",
      tokenIdentifier: identity.tokenIdentifier,
      externalId: identity.subject,
      email: identity.email ?? "",
      firstName: identity.givenName,
      lastName: identity.familyName,
      imageUrl: identity.pictureUrl,
      username: identity.nickname,
      // Comprehensive Timestamps & Metadata
      publicMetadata: publicMetadata,
      role: publicMetadata?.role ?? undefined,
    };

    if (user !== null) {
      await ctx.db.patch(user._id, userProps);
      return user._id;
    }

    return await ctx.db.insert("users", userProps);
  },
});

/**
 * Webhook Upsert Mutation
 */
export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> },
  async handler(ctx, { data }) {
    const primaryEmail = data.email_addresses.find(
      (e: any) => e.id === data.primary_email_address_id
    )?.email_address ?? data.email_addresses[0]?.email_address ?? "";

    const payload = data as any;
    const userProps = {
      name: `${payload.first_name || ""} ${payload.last_name || ""}`.trim() || "Anonymous",
      email: primaryEmail,
      externalId: payload.id,
      firstName: payload.first_name ?? undefined,
      lastName: payload.last_name ?? undefined,
      imageUrl: payload.image_url ?? undefined,
      username: payload.username ?? undefined,
      // Comprehensive Timestamps & Metadata
      createdAt: payload.created_at ?? undefined,
      lastSignInAt: payload.last_sign_in_at ?? undefined,
      publicMetadata: payload.public_metadata ?? undefined,
      birthday: payload.birthday ?? undefined,
      gender: payload.gender ?? undefined,
      // Promote 'role' from public metadata to a first-class field
      role: payload.public_metadata?.role ?? undefined,
    };

    const user = await userByExternalId(ctx, data.id);
    
    if (user === null) {
      await ctx.db.insert("users", {
        ...userProps,
        tokenIdentifier: data.id, 
      });
    } else {
      await ctx.db.patch(user._id, userProps);
    }
  },
});

/**
 * Webhook Delete Mutation
 */
export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});

/**
 * Helper: Get Current User or Throw
 */
export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

/**
 * Helper: Get Current User Detail
 */
export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

/**
 * Helper: Query Database by Clerk External ID
 */
async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}
