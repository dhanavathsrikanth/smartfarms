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

    // Base props always present
    const baseProps = {
      name: identity.name ?? "Anonymous",
      tokenIdentifier: identity.tokenIdentifier,
      externalId: identity.subject,
    };

    // Optional props — only set if present in JWT to avoid overwriting webhook data
    const optionalProps = {
      ...(identity.email       && { email: identity.email }),
      ...(identity.givenName   && { firstName: identity.givenName }),
      ...(identity.familyName  && { lastName: identity.familyName }),
      ...(identity.pictureUrl  && { imageUrl: identity.pictureUrl }),
      ...(identity.nickname    && { username: identity.nickname }),
      ...(publicMetadata       && { publicMetadata }),
      ...(publicMetadata?.role && { role: publicMetadata.role }),
    };

    if (user !== null) {
      await ctx.db.patch(user._id, { ...baseProps, ...optionalProps });
      return user._id;
    }

    // email is required in schema — use "" as placeholder until webhook fills it
    return await ctx.db.insert("users", { email: "", ...baseProps, ...optionalProps });
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
 * Backfill Mutation — run once to fix existing users with empty fields
 * by fetching real data from Clerk's API.
 * Call via: npx convex run users:backfillFromClerk
 */
export const backfillFromClerk = internalMutation({
  args: {},
  async handler(ctx) {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) throw new Error("CLERK_SECRET_KEY not set");

    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      // Only backfill rows that are missing data
      if (user.firstName && user.email && user.email !== "") continue;

      const res = await fetch(`https://api.clerk.com/v1/users/${user.externalId}`, {
        headers: { Authorization: `Bearer ${clerkSecretKey}` },
      });
      if (!res.ok) {
        console.warn(`Failed to fetch Clerk user ${user.externalId}: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const primaryEmail = data.email_addresses?.find(
        (e: any) => e.id === data.primary_email_address_id
      )?.email_address ?? data.email_addresses?.[0]?.email_address ?? "";

      await ctx.db.patch(user._id, {
        email: primaryEmail || user.email,
        firstName: data.first_name ?? user.firstName,
        lastName: data.last_name ?? user.lastName,
        imageUrl: data.image_url ?? user.imageUrl,
        username: data.username ?? user.username,
        lastSignInAt: data.last_sign_in_at ?? user.lastSignInAt,
        createdAt: data.created_at ?? user.createdAt,
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || user.name,
      });
    }
  },
});
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
