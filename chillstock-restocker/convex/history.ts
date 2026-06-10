import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";

function totalLedgerCents(events: Array<{ amountCents: number }>) {
  return events.reduce((sum, event) => sum + event.amountCents, 0);
}

function consumedCents(items: Array<{ unitPriceCents: number; quantity: number }>) {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

export async function listRecentUserSessions(
  ctx: QueryCtx,
  userId: Id<"users">,
  limit = 6,
) {
  const sessions = await ctx.db
    .query("guestSessions")
    .withIndex("by_user_created", (q) => q.eq("userId", userId))
    .order("desc")
    .take(limit);

  return await Promise.all(
    sessions.map(async (session) => {
      const [fridge, ledgerEvents, consumptionItems, requests] = await Promise.all([
        ctx.db.get(session.fridgeId),
        ctx.db
          .query("ledgerEvents")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect(),
        ctx.db
          .query("consumptionItems")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect(),
        ctx.db
          .query("reconciliationRequests")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect(),
      ]);

      const sortedRequests = [...requests].sort((a, b) => b.requestedAt - a.requestedAt);
      const checkoutRequest =
        sortedRequests.find((request) => request.type === "checkout") ?? null;

      return {
        session: {
          id: session._id,
          status: session.status,
          unlockCode: session.unlockCode,
          createdAt: session.createdAt,
          checkedOutAt: session.checkedOutAt,
          hotelName: fridge?.hotelName ?? fridge?.name ?? "Unknown hotel",
          location: fridge?.location ?? "Guest suite",
        },
        totalAuthorizedCents: totalLedgerCents(
          ledgerEvents.filter((event) => event.type === "deposit_hold" || event.type === "top_up"),
        ),
        totalConsumedCents: consumedCents(consumptionItems),
        consumptionItems: consumptionItems.sort((a, b) => b.createdAt - a.createdAt),
        requests: sortedRequests,
        checkoutRequest,
      };
    }),
  );
}

export const listCurrentUserHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await listRecentUserSessions(ctx, userId, 6);
  },
});
