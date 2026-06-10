import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const listForCurrentSession = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const activeSession = await ctx.db
      .query("guestSessions")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
      .first();
    const checkoutPendingSession = await ctx.db
      .query("guestSessions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "checkout_pending"),
      )
      .first();
    const checkedOutSession = await ctx.db
      .query("guestSessions")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "checked_out"))
      .order("desc")
      .first();
    const session = activeSession ?? checkoutPendingSession ?? checkedOutSession;

    if (!session) return [];

    return await ctx.db
      .query("consumptionItems")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
  },
});
