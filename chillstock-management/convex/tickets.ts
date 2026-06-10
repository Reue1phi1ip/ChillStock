import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { listRecentUserSessions } from "./history";
import { getHotelStockRows } from "./inventory";
import { sendGuestNotification } from "./notifications";

const DEFAULT_RESTOCKER_CAPACITY = 3;
const ACTIVE_RESTOCKER_TICKET_STATUSES = new Set<Doc<"tickets">["status"]>([
  "assigned",
  "in_progress",
  "blocked",
]);
const ACTIVE_SESSION_STATUSES = new Set<Doc<"guestSessions">["status"]>([
  "deposit_pending",
  "active",
  "checkout_pending",
]);

const ticketTypeValidator = v.union(
  v.literal("income_td"),
  v.literal("support"),
  v.literal("refill"),
  v.literal("special_order"),
);
const ticketStatusValidator = v.union(
  v.literal("new"),
  v.literal("triaged"),
  v.literal("assigned"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("resolved"),
  v.literal("closed"),
);
const ticketPriorityValidator = v.union(
  v.literal("normal"),
  v.literal("high"),
  v.literal("urgent"),
);
const ticketActorTypeValidator = v.union(
  v.literal("guest"),
  v.literal("manager"),
  v.literal("restocker"),
  v.literal("system"),
);
const restockNeedValidator = v.union(
  v.literal("beer"),
  v.literal("wine"),
  v.literal("water_mixers"),
  v.literal("general_refresh"),
);
const guestNotificationPresetValidator = v.union(
  v.literal("offer"),
  v.literal("on_the_house"),
  v.literal("friendly_reminder"),
  v.literal("custom"),
);

type TicketType = Doc<"tickets">["type"];
type TicketStatus = Doc<"tickets">["status"];
type TicketPriority = Doc<"tickets">["priority"];
type TicketActorType = Doc<"ticketEvents">["actorType"];
type RestockNeed = "beer" | "wine" | "water_mixers" | "general_refresh";
type RequestedItem = {
  productId: Id<"products">;
  quantity: number;
};

const OPEN_TICKET_STATUSES = new Set<TicketStatus>([
  "new",
  "triaged",
  "assigned",
  "in_progress",
  "blocked",
]);

type TicketPatch = Partial<
  Pick<
    Doc<"tickets">,
    | "assignedRestockerId"
    | "assignedRestockerName"
    | "blockedReason"
    | "closedAt"
    | "description"
    | "priority"
    | "resolvedAt"
    | "status"
    | "title"
    | "updatedAt"
  >
>;

function trimOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sortByPriorityThenUpdated(
  left: Doc<"tickets">,
  right: Doc<"tickets">,
) {
  const priorityRank: Record<TicketPriority, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
  };
  const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
  if (priorityDelta !== 0) return priorityDelta;
  return right.updatedAt - left.updatedAt;
}

function normalizeTicketPatch(
  ticket: Doc<"tickets">,
  patch: TicketPatch,
  now = Date.now(),
) {
  const normalized: TicketPatch = {
    ...patch,
    updatedAt: patch.updatedAt ?? now,
  };
  const nextStatus = patch.status;

  if (!nextStatus) {
    return normalized;
  }

  if (OPEN_TICKET_STATUSES.has(nextStatus)) {
    normalized.resolvedAt = undefined;
    normalized.closedAt = undefined;
  } else if (nextStatus === "resolved") {
    normalized.resolvedAt = patch.resolvedAt ?? now;
    normalized.closedAt = undefined;
  } else if (nextStatus === "closed") {
    normalized.closedAt = patch.closedAt ?? now;
  }

  if (nextStatus === "blocked") {
    normalized.blockedReason = patch.blockedReason ?? ticket.blockedReason ?? "Awaiting action";
  } else if (patch.blockedReason === undefined) {
    normalized.blockedReason = undefined;
  }

  return normalized;
}

async function getCurrentGuestSession(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  const sessions = await Promise.all([
    ctx.db
      .query("guestSessions")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
      .first(),
    ctx.db
      .query("guestSessions")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "deposit_pending"))
      .first(),
    ctx.db
      .query("guestSessions")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "checkout_pending"))
      .first(),
  ]);

  return (
    sessions
      .filter((session): session is Doc<"guestSessions"> => Boolean(session))
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  );
}

async function buildRestockerWorkload(
  ctx: QueryCtx | MutationCtx,
  restocker: Doc<"restockers">,
) {
  const assignedTickets = await ctx.db
    .query("tickets")
    .withIndex("by_assigned_restocker", (q) => q.eq("assignedRestockerId", restocker._id))
    .collect();

  const activeTickets = assignedTickets
    .filter((ticket) => ACTIVE_RESTOCKER_TICKET_STATUSES.has(ticket.status))
    .sort((a, b) => a.createdAt - b.createdAt);

  return {
    restocker,
    activeCount: activeTickets.length,
    oldestActiveAt: activeTickets[0]?.createdAt ?? Number.MAX_SAFE_INTEGER,
  };
}

export async function appendTicketEvent(
  ctx: MutationCtx,
  args: {
    action: string;
    actorName: string;
    actorType: TicketActorType;
    message: string;
    ticketId: Id<"tickets">;
  },
) {
  await ctx.db.insert("ticketEvents", {
    ticketId: args.ticketId,
    actorType: args.actorType,
    actorName: args.actorName,
    action: args.action,
    message: args.message,
    createdAt: Date.now(),
  });
}

async function createTicket(
  ctx: MutationCtx,
  args: {
    actorName: string;
    actorType: TicketActorType;
    area?: string;
    assignedRestockerId?: Id<"restockers">;
    assignedRestockerName?: string;
    customerLabel?: string;
    description?: string;
    fridgeId?: Id<"fridges">;
    hotelName?: string;
    message: string;
    priority: TicketPriority;
    reconciliationRequestId?: Id<"reconciliationRequests">;
    requestedNeeds?: RestockNeed[];
    requestedItems?: RequestedItem[];
    sessionId?: Id<"guestSessions">;
    source: Doc<"tickets">["source"];
    status: TicketStatus;
    title: string;
    type: TicketType;
    userId?: Id<"users">;
  },
) {
  const now = Date.now();
  const ticketId = await ctx.db.insert("tickets", {
    type: args.type,
    status: args.status,
    priority: args.priority,
    source: args.source,
    title: args.title,
    description: args.description,
    userId: args.userId,
    sessionId: args.sessionId,
    fridgeId: args.fridgeId,
    reconciliationRequestId: args.reconciliationRequestId,
    assignedRestockerId: args.assignedRestockerId,
    assignedRestockerName: args.assignedRestockerName,
    hotelName: args.hotelName,
    area: args.area,
    customerLabel: args.customerLabel,
    requestedNeeds: args.requestedNeeds,
    requestedItems: args.requestedItems,
    createdAt: now,
    updatedAt: now,
  });

  await appendTicketEvent(ctx, {
    ticketId,
    actorType: args.actorType,
    actorName: args.actorName,
    action: "created",
    message: args.message,
  });

  return ticketId;
}

async function getRestockerPoolForFridge(
  ctx: QueryCtx | MutationCtx,
  fridgeId: Id<"fridges">,
) {
  const fridge = await ctx.db.get(fridgeId);
  if (!fridge) return { fridge: null, candidates: [] as Awaited<ReturnType<typeof buildRestockerWorkload>>[] };

  const poolIds = fridge.assignedRestockerIds ?? [];
  const pool =
    poolIds.length > 0
      ? await Promise.all(poolIds.map((restockerId) => ctx.db.get(restockerId)))
      : await ctx.db
          .query("restockers")
          .withIndex("by_active", (q) => q.eq("active", true))
          .collect();

  const activeRestockers = pool.filter(
    (restocker): restocker is Doc<"restockers"> => restocker !== null && restocker.active,
  );
  const candidates = await Promise.all(
    activeRestockers.map((restocker) => buildRestockerWorkload(ctx, restocker)),
  );

  return { fridge, candidates };
}

export async function chooseRestockerForFridge(
  ctx: QueryCtx | MutationCtx,
  fridgeId: Id<"fridges">,
) {
  const { fridge, candidates } = await getRestockerPoolForFridge(ctx, fridgeId);
  if (!fridge) return { fridge: null, candidates, chosen: null };

  const eligible = candidates
    .filter(({ activeCount, restocker }) => activeCount < (restocker.capacity || DEFAULT_RESTOCKER_CAPACITY))
    .sort((left, right) => {
      if (left.activeCount !== right.activeCount) return left.activeCount - right.activeCount;
      return left.oldestActiveAt - right.oldestActiveAt;
    });

  return {
    fridge,
    candidates: candidates.sort((left, right) => {
      if (left.activeCount !== right.activeCount) return left.activeCount - right.activeCount;
      return left.oldestActiveAt - right.oldestActiveAt;
    }),
    chosen: eligible[0]?.restocker ?? null,
  };
}

async function findRefillTicketByReconciliation(
  ctx: QueryCtx | MutationCtx,
  reconciliationRequestId: Id<"reconciliationRequests">,
) {
  const linked = await ctx.db
    .query("tickets")
    .withIndex("by_reconciliation", (q) => q.eq("reconciliationRequestId", reconciliationRequestId))
    .collect();
  return linked
    .filter((ticket) => ticket.type === "refill")
    .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export async function createRefillTicketForRequest(
  ctx: MutationCtx,
  args: {
    guestNote?: string;
    request: Doc<"reconciliationRequests">;
    requestedNeeds?: RestockNeed[];
    requestedItems?: RequestedItem[];
    session: Doc<"guestSessions">;
  },
) {
  const assignment = await chooseRestockerForFridge(ctx, args.request.fridgeId);
  const assignedRestocker = assignment.chosen;
  const fridge = assignment.fridge;
  const hotelName = fridge?.hotelName ?? fridge?.name ?? "Unmapped hotel";
  const requestedNeeds = args.requestedNeeds ?? [];
  const requestedItems = args.requestedItems ?? [];
  const requestedNeedsLabel =
    requestedNeeds.length > 0 ? `Needs: ${requestedNeeds.join(", ").replaceAll("_", " ")}` : "";
  const requestedItemsLabel =
    requestedItems.length > 0
      ? `Items: ${(
          await Promise.all(
            requestedItems.map(async (item) => {
              const product = await ctx.db.get(item.productId);
              const label = product?.name ?? "Unknown item";
              return `${item.quantity}x ${label}`;
            }),
          )
        ).join(", ")}`
      : "";
  const noteLabel = trimOptional(args.guestNote);
  const description = [requestedItemsLabel, requestedNeedsLabel, noteLabel].filter(Boolean).join("\n\n") || undefined;
  const status: TicketStatus = assignedRestocker ? "assigned" : "new";
  const message = assignedRestocker
    ? `${assignedRestocker.name} was auto-assigned from the ${hotelName} pool.`
    : `No restocker had capacity in the ${hotelName} pool, so this request is waiting in management.`;
  const requestLabel = args.request.type === "add_on" ? "add-on" : "refill";

  const ticketId = await createTicket(ctx, {
    actorType: "system",
    actorName: "ChillStock Router",
    area: fridge?.area,
    assignedRestockerId: assignedRestocker?._id,
    assignedRestockerName: assignedRestocker?.name,
    customerLabel: `QR ${args.session.unlockCode}`,
    description,
    fridgeId: args.request.fridgeId,
    hotelName,
    message,
    priority: "normal",
    reconciliationRequestId: args.request._id,
    requestedNeeds,
    requestedItems,
    sessionId: args.request.sessionId,
    source: "guest",
    status,
    title: `${hotelName} ${requestLabel} request`,
    type: "refill",
    userId: args.request.userId,
  });

  await ctx.db.patch(args.request._id, {
    assignedRestockerId: assignedRestocker?._id,
    assignedRestockerName: assignedRestocker?.name,
  });

  return ticketId;
}

export async function syncTicketForReconciliation(
  ctx: MutationCtx,
  args: {
    action: string;
    actorName: string;
    actorType: TicketActorType;
    message: string;
    patch: TicketPatch;
    reconciliationRequestId: Id<"reconciliationRequests">;
  },
) {
  const ticket = await findRefillTicketByReconciliation(ctx, args.reconciliationRequestId);
  if (!ticket) return null;

  const patch = normalizeTicketPatch(ticket, args.patch);
  await ctx.db.patch(ticket._id, patch);
  await appendTicketEvent(ctx, {
    ticketId: ticket._id,
    actorType: args.actorType,
    actorName: args.actorName,
    action: args.action,
    message: args.message,
  });

  return ticket._id;
}

export async function createIncomeTicketForRequest(
  ctx: MutationCtx,
  args: {
    description: string;
    priority: TicketPriority;
    request: Doc<"reconciliationRequests">;
    title: string;
  },
) {
  const existing = await ctx.db
    .query("tickets")
    .withIndex("by_reconciliation", (q) => q.eq("reconciliationRequestId", args.request._id))
    .collect();
  const existingIncomeTicket = existing.find((ticket) => ticket.type === "income_td");
  if (existingIncomeTicket) {
    await ctx.db.patch(
      existingIncomeTicket._id,
      normalizeTicketPatch(existingIncomeTicket, {
        description: args.description,
        priority: args.priority,
        status: "new",
        title: args.title,
      }),
    );
    await appendTicketEvent(ctx, {
      ticketId: existingIncomeTicket._id,
      actorType: "system",
      actorName: "ChillStock Billing",
      action: "reopened",
      message: args.description,
    });
    return existingIncomeTicket._id;
  }

  const fridge = await ctx.db.get(args.request.fridgeId);
  const session = await ctx.db.get(args.request.sessionId);
  return await createTicket(ctx, {
    actorType: "system",
    actorName: "ChillStock Billing",
    area: fridge?.area,
    customerLabel: session ? `QR ${session.unlockCode}` : undefined,
    description: args.description,
    fridgeId: args.request.fridgeId,
    hotelName: fridge?.hotelName ?? fridge?.name,
    message: args.description,
    priority: args.priority,
    reconciliationRequestId: args.request._id,
    sessionId: args.request.sessionId,
    source: "system",
    status: "new",
    title: args.title,
    type: "income_td",
    userId: args.request.userId,
  });
}

export async function syncIncomeTicketForRequest(
  ctx: MutationCtx,
  args: {
    action: string;
    actorName: string;
    actorType: TicketActorType;
    message: string;
    patch: TicketPatch;
    reconciliationRequestId: Id<"reconciliationRequests">;
  },
) {
  const linked = await ctx.db
    .query("tickets")
    .withIndex("by_reconciliation", (q) => q.eq("reconciliationRequestId", args.reconciliationRequestId))
    .collect();
  const incomeTicket = linked.find((ticket) => ticket.type === "income_td");
  if (!incomeTicket) return null;

  await ctx.db.patch(incomeTicket._id, normalizeTicketPatch(incomeTicket, args.patch));
  await appendTicketEvent(ctx, {
    ticketId: incomeTicket._id,
    actorType: args.actorType,
    actorName: args.actorName,
    action: args.action,
    message: args.message,
  });

  return incomeTicket._id;
}

export async function createLowStockSpecialOrderTicket(
  ctx: MutationCtx,
  args: {
    fridgeId: Id<"fridges">;
    reconciliationRequestId: Id<"reconciliationRequests">;
    sessionId: Id<"guestSessions">;
    shortages: Array<{
      availableQuantity: number;
      productId: Id<"products">;
      productName: string;
      requestedQuantity: number;
    }>;
    userId: Id<"users">;
  },
) {
  if (args.shortages.length === 0) return null;

  const existing = await ctx.db
    .query("tickets")
    .withIndex("by_reconciliation", (q) => q.eq("reconciliationRequestId", args.reconciliationRequestId))
    .collect();
  const existingSpecialOrder = existing.find((ticket) => ticket.type === "special_order");
  const fridge = await ctx.db.get(args.fridgeId);
  const session = await ctx.db.get(args.sessionId);
  const shortageSummary = args.shortages
    .map(
      (shortage) =>
        `${shortage.productName}: requested ${shortage.requestedQuantity}, available ${shortage.availableQuantity}`,
    )
    .join("\n");

  if (existingSpecialOrder) {
    await ctx.db.patch(
      existingSpecialOrder._id,
      normalizeTicketPatch(existingSpecialOrder, {
        title: "Urgent stock replenishment needed",
        description: shortageSummary,
        priority: "urgent",
        status: "new",
      }),
    );
    await appendTicketEvent(ctx, {
      ticketId: existingSpecialOrder._id,
      actorType: "system",
      actorName: "Inventory Guard",
      action: "reopened",
      message: "Restocker requested urgent stock replenishment after low-stock capping.",
    });
    return existingSpecialOrder._id;
  }

  return await createTicket(ctx, {
    actorType: "system",
    actorName: "Inventory Guard",
    area: fridge?.area,
    customerLabel: session ? `QR ${session.unlockCode}` : undefined,
    description: shortageSummary,
    fridgeId: args.fridgeId,
    hotelName: fridge?.hotelName ?? fridge?.name,
    message: "Restocker hit low stock while adding items back to the guest fridge.",
    priority: "urgent",
    reconciliationRequestId: args.reconciliationRequestId,
    sessionId: args.sessionId,
    source: "system",
    status: "new",
    title: "Urgent stock replenishment needed",
    type: "special_order",
    userId: args.userId,
  });
}

function labelForTicketType(type: TicketType) {
  if (type === "income_td") return "Income TD";
  if (type === "special_order") return "Special order";
  if (type === "support") return "Support";
  return "Refill";
}

async function buildCustomerActivity(ctx: QueryCtx) {
  const sessions = await ctx.db.query("guestSessions").collect();
  const relevantSessions = sessions
    .filter((session) => ACTIVE_SESSION_STATUSES.has(session.status))
    .sort((a, b) => b.createdAt - a.createdAt);

  const results = await Promise.all(
    relevantSessions.map(async (session) => {
      const [fridge, ledgerEvents] = await Promise.all([
        ctx.db.get(session.fridgeId),
        ctx.db
          .query("ledgerEvents")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect(),
      ]);
      const totalAuthorized = ledgerEvents
        .filter((event) => event.type === "deposit_hold" || event.type === "top_up")
        .reduce((sum, event) => sum + event.amountCents, 0);

      return {
        sessionId: session._id,
        customerLabel: `QR ${session.unlockCode}`,
        hotelName: fridge?.hotelName ?? fridge?.name ?? "Unknown hotel",
        status: totalAuthorized > 0 ? "consuming" : "idle",
        hasDepositHold: totalAuthorized > 0,
        sessionStatus: session.status,
      };
    }),
  );

  return results;
}

async function getSessionFinancials(
  ctx: QueryCtx,
  sessionId: Id<"guestSessions">,
) {
  const [ledgerEvents, consumptionItems] = await Promise.all([
    ctx.db
      .query("ledgerEvents")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("consumptionItems")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect(),
  ]);

  const totalAuthorizedCents = ledgerEvents
    .filter((event) => event.type === "deposit_hold" || event.type === "top_up")
    .reduce((sum, event) => sum + event.amountCents, 0);
  const totalConsumedCents = consumptionItems.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );

  return {
    totalAuthorizedCents,
    totalConsumedCents,
    hasDepositHold: totalAuthorizedCents > 0,
  };
}

async function buildManagementConsumerEntry(
  ctx: QueryCtx,
  session: Doc<"guestSessions">,
) {
  const [fridge, profile, financials] = await Promise.all([
    ctx.db.get(session.fridgeId),
    ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .unique(),
    getSessionFinancials(ctx, session._id),
  ]);

  return {
    sessionId: session._id,
    userId: session.userId,
    guestQr: `QR ${session.unlockCode}`,
    unlockCode: session.unlockCode,
    displayName: profile?.displayName,
    email: profile?.email,
    hotelName: fridge?.hotelName ?? fridge?.name ?? "Unknown hotel",
    area: fridge?.area ?? "Unmapped area",
    location: fridge?.location ?? "Guest suite",
    sessionStatus: session.status,
    status: financials.hasDepositHold ? "consuming" : "idle",
    hasDepositHold: financials.hasDepositHold,
    totalAuthorizedCents: financials.totalAuthorizedCents,
    totalConsumedCents: financials.totalConsumedCents,
    createdAt: session.createdAt,
  };
}

export const listManagementDashboard = query({
  args: {},
  handler: async (ctx) => {
    const [tickets, restockers, stockLevels, customerActivity, fridges] = await Promise.all([
      ctx.db.query("tickets").collect(),
      ctx.db.query("restockers").collect(),
      getHotelStockRows(ctx),
      buildCustomerActivity(ctx),
      ctx.db.query("fridges").collect(),
    ]);

    const orderedTickets = tickets.sort(sortByPriorityThenUpdated);

    return {
      tickets: orderedTickets,
      restockers,
      hotels: fridges.map((fridge) => ({
        id: fridge._id,
        name: fridge.hotelName ?? fridge.name,
        area: fridge.area ?? "Unmapped area",
      })),
      stockLevels,
      customerActivity,
      kpis: {
        open: orderedTickets.filter((ticket) => OPEN_TICKET_STATUSES.has(ticket.status)).length,
        urgent: orderedTickets.filter(
          (ticket) => OPEN_TICKET_STATUSES.has(ticket.status) && ticket.priority === "urgent",
        ).length,
        blocked: orderedTickets.filter((ticket) => ticket.status === "blocked").length,
        overflow: orderedTickets.filter(
          (ticket) => ticket.type === "refill" && ticket.status === "new" && !ticket.assignedRestockerId,
        ).length,
      },
    };
  },
});

export const getManagementTicket = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return null;

    const [events, request, session, fridge, consumedItems, addedItems, assignment, profile] = await Promise.all([
      ctx.db
        .query("ticketEvents")
        .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
        .collect(),
      ticket.reconciliationRequestId ? ctx.db.get(ticket.reconciliationRequestId) : null,
      ticket.sessionId ? ctx.db.get(ticket.sessionId) : null,
      ticket.fridgeId ? ctx.db.get(ticket.fridgeId) : null,
      ticket.reconciliationRequestId
        ? ctx.db
            .query("consumptionItems")
            .withIndex("by_reconciliation", (q) => q.eq("reconciliationRequestId", ticket.reconciliationRequestId))
            .collect()
        : [],
      ticket.reconciliationRequestId
        ? ctx.db
            .query("restockedItems")
            .withIndex("by_reconciliation", (q) => q.eq("reconciliationRequestId", ticket.reconciliationRequestId))
            .collect()
        : [],
      ticket.fridgeId ? getRestockerPoolForFridge(ctx, ticket.fridgeId) : Promise.resolve(null),
      ticket.userId
        ? ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", ticket.userId!))
            .unique()
        : null,
    ]);
    const recentUserSessions = ticket.userId
      ? await listRecentUserSessions(ctx, ticket.userId, 5)
      : [];
    const customerMessages = events
      .filter((event) => event.action === "customer_message")
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((event) => {
        const separatorIndex = event.message.indexOf(": ");
        return {
          id: event._id,
          title: separatorIndex >= 0 ? event.message.slice(0, separatorIndex) : "Guest update",
          message: separatorIndex >= 0 ? event.message.slice(separatorIndex + 2) : event.message,
          createdAt: event.createdAt,
        };
      });

    const resolvedRequest = request
      ? {
          ...request,
          photos: await Promise.all(
            (request.photos ?? []).map(async (photo) => ({
              ...photo,
              url: (await ctx.storage.getUrl(photo.storageId)) ?? photo.url,
            })),
          ),
        }
      : null;

    return {
      ticket,
      request: resolvedRequest,
      session,
      fridge,
      profile,
      consumedItems: consumedItems.sort((a, b) => b.createdAt - a.createdAt),
      addedItems: addedItems.sort((a, b) => b.createdAt - a.createdAt),
      events: events.sort((a, b) => b.createdAt - a.createdAt),
      customerMessages,
      recentUserSessions,
      assigneeOptions:
        assignment?.candidates.map((candidate) => ({
          id: candidate.restocker._id,
          name: candidate.restocker.name,
          area: candidate.restocker.area,
          activeCount: candidate.activeCount,
          capacity: candidate.restocker.capacity,
        })) ?? [],
    };
  },
});

export const listManagementConsumers = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("guestSessions").collect();
    const relevantSessions = sessions
      .filter((session) => ACTIVE_SESSION_STATUSES.has(session.status))
      .sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      relevantSessions.map((session) => buildManagementConsumerEntry(ctx, session)),
    );
  },
});

export const getManagementConsumer = query({
  args: { sessionId: v.id("guestSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const [consumer, recentUserSessions, recentNotifications] = await Promise.all([
      buildManagementConsumerEntry(ctx, session),
      listRecentUserSessions(ctx, session.userId, 5),
      ctx.db
        .query("notifications")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect(),
    ]);

    return {
      consumer,
      recentUserSessions,
      recentNotifications: recentNotifications
        .filter((notification) => notification.type === "info")
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10),
    };
  },
});

export const saveManagementTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
    title: v.string(),
    description: v.optional(v.string()),
    status: ticketStatusValidator,
    priority: ticketPriorityValidator,
    assignedRestockerId: v.optional(v.id("restockers")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const assignedRestocker = args.assignedRestockerId
      ? await ctx.db.get(args.assignedRestockerId)
      : null;
    const now = Date.now();
    const description = trimOptional(args.description);
    const note = trimOptional(args.note);

    await ctx.db.patch(
      ticket._id,
      normalizeTicketPatch(
        ticket,
        {
          title: args.title.trim(),
          description,
          status: args.status,
          priority: args.priority,
          assignedRestockerId: assignedRestocker?._id,
          assignedRestockerName: assignedRestocker?.name,
        },
        now,
      ),
    );

    if (ticket.reconciliationRequestId) {
      await ctx.db.patch(ticket.reconciliationRequestId, {
        assignedRestockerId: assignedRestocker?._id,
        assignedRestockerName: assignedRestocker?.name,
      });
    }

    await appendTicketEvent(ctx, {
      ticketId: ticket._id,
      actorType: "manager",
      actorName: "Management",
      action: "saved",
      message: `Updated ${labelForTicketType(ticket.type)} ticket to ${args.status.replaceAll("_", " ")}.`,
    });

    if (note) {
      await appendTicketEvent(ctx, {
        ticketId: ticket._id,
        actorType: "manager",
        actorName: "Management",
        action: "note",
        message: note,
      });
    }
  },
});

export const addManagementTicketNote = mutation({
  args: {
    ticketId: v.id("tickets"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const note = trimOptional(args.note);
    if (!note) throw new Error("Note is required");

    await appendTicketEvent(ctx, {
      ticketId: ticket._id,
      actorType: "manager",
      actorName: "Management",
      action: "note",
      message: note,
    });
  },
});

export const sendManagementTicketMessage = mutation({
  args: {
    ticketId: v.id("tickets"),
    title: v.string(),
    message: v.string(),
    messageHtml: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    if (!ticket.userId || !ticket.sessionId) {
      throw new Error("This ticket is not linked to a guest session");
    }

    await sendGuestNotification(ctx, {
      sessionId: ticket.sessionId,
      userId: ticket.userId,
      type: "info",
      title: args.title,
      message: args.message,
      messageHtml: args.messageHtml,
    });

    const title = args.title.trim();
    const message = args.message.trim();
    await appendTicketEvent(ctx, {
      ticketId: ticket._id,
      actorType: "manager",
      actorName: "Management",
      action: "customer_message",
      message: `${title}: ${message}`,
    });
  },
});

export const sendManagementConsumerNotification = mutation({
  args: {
    sessionId: v.id("guestSessions"),
    title: v.string(),
    message: v.string(),
    messageHtml: v.optional(v.string()),
    presetKey: v.optional(guestNotificationPresetValidator),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Guest session not found");

    await sendGuestNotification(ctx, {
      sessionId: session._id,
      userId: session.userId,
      type: "info",
      title: args.title,
      message: args.message,
      messageHtml: args.messageHtml,
    });

    return session._id;
  },
});

export const bulkCloseOpenTickets = mutation({
  args: {},
  handler: async (ctx) => {
    const tickets = await ctx.db.query("tickets").collect();
    const openTickets = tickets.filter((ticket) => OPEN_TICKET_STATUSES.has(ticket.status));
    const now = Date.now();

    for (const ticket of openTickets) {
      await ctx.db.patch(
        ticket._id,
        normalizeTicketPatch(
          ticket,
          {
            status: "closed",
          },
          now,
        ),
      );
      await appendTicketEvent(ctx, {
        ticketId: ticket._id,
        actorType: "manager",
        actorName: "Management",
        action: "closed",
        message: "Management bulk-closed this ticket during dashboard cleanup.",
      });
    }

    return {
      closedCount: openTickets.length,
    };
  },
});

export const createManagementTicket = mutation({
  args: {
    type: ticketTypeValidator,
    title: v.string(),
    description: v.optional(v.string()),
    priority: ticketPriorityValidator,
    hotelName: v.optional(v.string()),
    customerLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (!title) throw new Error("Title is required");

    return await createTicket(ctx, {
      actorType: "manager",
      actorName: "Management",
      customerLabel: trimOptional(args.customerLabel),
      description: trimOptional(args.description),
      hotelName: trimOptional(args.hotelName),
      message: `Management created a ${labelForTicketType(args.type)} ticket.`,
      priority: args.priority,
      source: "management",
      status: "new",
      title,
      type: args.type,
    });
  },
});

async function createGuestServiceTicket(
  ctx: MutationCtx,
  args: {
    description: string;
    priority: TicketPriority;
    title: string;
    type: "special_order" | "support";
  },
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Authentication required");

  const session = await getCurrentGuestSession(ctx, userId);
  if (!session) throw new Error("No active session");

  const fridge = await ctx.db.get(session.fridgeId);
  return await createTicket(ctx, {
    actorType: "guest",
    actorName: `Guest ${session.unlockCode}`,
    area: fridge?.area,
    customerLabel: `QR ${session.unlockCode}`,
    description: trimOptional(args.description),
    fridgeId: session.fridgeId,
    hotelName: fridge?.hotelName ?? fridge?.name,
    message: `Guest submitted a ${labelForTicketType(args.type).toLowerCase()} request.`,
    priority: args.priority,
    sessionId: session._id,
    source: "guest",
    status: "new",
    title: args.title.trim(),
    type: args.type,
    userId,
  });
}

export const createGuestSupportTicket = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    priority: v.optional(ticketPriorityValidator),
  },
  handler: async (ctx, args) => {
    return await createGuestServiceTicket(ctx, {
      type: "support",
      title: args.title,
      description: args.description,
      priority: args.priority ?? "normal",
    });
  },
});

export const createGuestSpecialOrderTicket = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    priority: v.optional(ticketPriorityValidator),
  },
  handler: async (ctx, args) => {
    return await createGuestServiceTicket(ctx, {
      type: "special_order",
      title: args.title,
      description: args.description,
      priority: args.priority ?? "high",
    });
  },
});

export const listRestockerAssignments = query({
  args: {},
  handler: async (ctx) => {
    const restockers = await ctx.db.query("restockers").collect();
    const workloads = await Promise.all(restockers.map((restocker) => buildRestockerWorkload(ctx, restocker)));
    return workloads.sort((left, right) => {
      if (left.activeCount !== right.activeCount) return left.activeCount - right.activeCount;
      return left.oldestActiveAt - right.oldestActiveAt;
    });
  },
});
