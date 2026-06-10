import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";

export async function sendGuestNotification(
  ctx: MutationCtx,
  args: {
    sessionId: Id<"guestSessions">;
    userId: Id<"users">;
    type: Doc<"notifications">["type"];
    title: string;
    message: string;
    messageHtml?: string;
  },
) {
  const title = args.title.trim();
  const message = args.message.trim();
  const messageHtml = args.messageHtml?.trim();

  if (!title || !message) {
    throw new Error("Title and message are required");
  }

  await ctx.db.insert("notifications", {
    sessionId: args.sessionId,
    userId: args.userId,
    type: args.type,
    title,
    message,
    messageHtml: messageHtml ? messageHtml : undefined,
    read: false,
    dismissed: false,
    createdAt: Date.now(),
  });
}

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
      .query("notifications")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .filter((q) => q.eq(q.field("dismissed"), false))
      .collect();
  },
});

export const dismiss = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.id, { dismissed: true, read: true });
  },
});
