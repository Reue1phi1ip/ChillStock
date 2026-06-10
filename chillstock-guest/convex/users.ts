import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return { user, profile };
  },
});

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();
    const user = await ctx.db.get(userId);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: user?.email ?? existing.email,
        displayName: user?.name ?? existing.displayName,
        lastSeenAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      userId,
      email: user?.email,
      displayName: user?.name,
      createdAt: now,
      lastSeenAt: now,
    });
  },
});
