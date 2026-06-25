import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import {
  createIncomeTicketForRequest,
  createLowStockSpecialOrderTicket,
  createRefillTicketForRequest,
  syncIncomeTicketForRequest,
  syncTicketForReconciliation,
} from "./tickets";
import { sendGuestNotification } from "./notifications";
import {
  resolveAddedSelections,
  resolveConsumedSelections,
} from "./inventory";
import { products as demoProducts } from "./dev";

const DEMO_FRIDGE_CODE = "7429";
const DEFAULT_DEPOSIT_HOLD_CENTS = 4000;
const FULL_RESTOCK_TOP_UP_CENTS = 4000;
const MAX_GUEST_NOTE_LENGTH = 200;
const restockNeedValidator = v.union(
  v.literal("beer"),
  v.literal("wine"),
  v.literal("water_mixers"),
  v.literal("general_refresh"),
);
const restockChargeModeValidator = v.union(
  v.literal("added_items"),
  v.literal("full_restock"),
);
const restockNeedLabels: Record<RestockNeed, string> = {
  beer: "beer",
  wine: "wine",
  water_mixers: "water & mixers",
  general_refresh: "a general refresh",
};

const openRequestStatuses = new Set([
  "requested",
  "enroute",
  "reconciled",
  "top_up_required",
]);

const inventorySelectionValidator = v.object({
  productId: v.id("products"),
  quantity: v.number(),
});
const reconciliationPhotoValidator = v.object({
  storageId: v.id("_storage"),
  url: v.string(),
  contentType: v.string(),
  fileName: v.string(),
  uploadedAt: v.number(),
});

type ReconciliationItemInput = {
  productId?: Id<"products">;
  name: string;
  type: string;
  unitPriceCents: number;
  quantity: number;
};

type InventorySelectionInput = {
  productId: Id<"products">;
  quantity: number;
};

type RequestedItemInput = InventorySelectionInput;
type ReconciliationPhotoInput = {
  storageId: Id<"_storage">;
  url: string;
  contentType: string;
  fileName: string;
  uploadedAt: number;
};

type RestockNeed = "beer" | "wine" | "water_mixers" | "general_refresh";
type LoggedItemTable = "consumptionItems" | "restockedItems";
type ReconciliationRequestType = Doc<"reconciliationRequests">["type"];
type InventoryRequestType = Exclude<ReconciliationRequestType, "checkout">;

function isInventoryRequestType(type: ReconciliationRequestType): type is InventoryRequestType {
  return type === "restock" || type === "add_on";
}

function requestTypeLabel(type: ReconciliationRequestType) {
  if (type === "add_on") return "Add-On";
  if (type === "checkout") return "Checkout";
  return "Restock";
}

function requestCompleteTitle(type: InventoryRequestType) {
  return type === "add_on" ? "Add-Ons Complete" : "Restock Complete";
}

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Authentication required");
  return userId;
}

async function getOrCreateDemoFridge(ctx: MutationCtx) {
  const existing = await ctx.db
    .query("fridges")
    .withIndex("by_code", (q) => q.eq("code", DEMO_FRIDGE_CODE))
    .unique();

  if (existing) {
    await ensureDemoFridgeInventory(ctx, existing._id);
    return existing._id;
  }

  const fridgeId = await ctx.db.insert("fridges", {
    code: DEMO_FRIDGE_CODE,
    name: "ChilledStock Demo Fridge",
    hotelName: "The Dunes Hotel",
    area: "South Shore",
    location: "Guest suite",
    status: "active",
    createdAt: Date.now(),
  });

  await ensureDemoFridgeInventory(ctx, fridgeId);
  return fridgeId;
}

async function ensureDemoFridgeInventory(
  ctx: MutationCtx,
  fridgeId: Id<"fridges">,
) {
  const existingProducts = await ctx.db.query("products").collect();
  const productsByName = new Map(existingProducts.map((product) => [product.name, product]));
  const productIds: Id<"products">[] = [];

  for (const product of demoProducts) {
    const existingProduct = productsByName.get(product.name);

    if (existingProduct) {
      productIds.push(existingProduct._id);

      if (existingProduct.imageUrl !== product.imageUrl) {
        await ctx.db.patch(existingProduct._id, {
          imageUrl: product.imageUrl,
        });
      }

      continue;
    }

    const productId = await ctx.db.insert("products", {
      ...product,
      inStock: true,
      createdAt: Date.now(),
    });

    productIds.push(productId);
  }

  const existingStock = await ctx.db
    .query("hotelInventory")
    .withIndex("by_fridge", (q) => q.eq("fridgeId", fridgeId))
    .collect();
  const stockedProductIds = new Set(existingStock.map((row) => row.productId));

  for (const productId of productIds) {
    if (stockedProductIds.has(productId)) continue;

    await ctx.db.insert("hotelInventory", {
      fridgeId,
      productId,
      quantityAvailable: 50,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("inventoryEvents", {
      fridgeId,
      productId,
      quantityDelta: 50,
      reason: "demo_seed_stock",
      actorName: "Demo Seed",
      actorType: "system",
      createdAt: Date.now(),
    });
  }
}

function normalizeFridgeCode(code: string | undefined | null) {
  const trimmed = code?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4,}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const nestedCode =
      url.searchParams.get("fridgeCode") ??
      url.searchParams.get("fridgecode") ??
      url.searchParams.get("fridge_code") ??
      url.searchParams.get("code");
    if (nestedCode?.trim()) return nestedCode.trim();
  } catch {
    // Continue with partial query parsing below.
  }

  const queryStart = trimmed.indexOf("?");
  if (queryStart !== -1) {
    const query = trimmed.slice(queryStart + 1).split("#")[0];
    const params = new URLSearchParams(query);
    const nestedCode =
      params.get("fridgeCode") ??
      params.get("fridgecode") ??
      params.get("fridge_code") ??
      params.get("code");
    if (nestedCode?.trim()) return nestedCode.trim();
  }

  return trimmed;
}

async function findFridgeByCode(
  ctx: QueryCtx | MutationCtx,
  fridgeCode: string,
) {
  return await ctx.db
    .query("fridges")
    .withIndex("by_code", (q) => q.eq("code", fridgeCode))
    .unique();
}

async function resolveFridgeByCode(
  ctx: MutationCtx,
  fridgeCode: string,
) {
  const normalizedCode = normalizeFridgeCode(fridgeCode);
  if (!normalizedCode) {
    throw new Error("Scan a valid fridge QR code to continue.");
  }

  let fridge = await findFridgeByCode(ctx, normalizedCode);
  if (!fridge && normalizedCode === DEMO_FRIDGE_CODE) {
    const fridgeId = await getOrCreateDemoFridge(ctx);
    fridge = await ctx.db.get(fridgeId);
  }

  if (!fridge) {
    throw new Error("This fridge code was not recognized.");
  }

  if (fridge.status !== "active") {
    throw new Error("This fridge is inactive right now.");
  }

  return fridge;
}

async function sessionForUserByStatus(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  status: Doc<"guestSessions">["status"],
) {
  return await ctx.db
    .query("guestSessions")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", status))
    .order("desc")
    .first();
}

async function activeSessionForUser(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await sessionForUserByStatus(ctx, userId, "active");
}

async function latestSessionForUserByStatuses(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  statuses: Doc<"guestSessions">["status"][],
) {
  const sessions = await Promise.all(
    statuses.map((status) => sessionForUserByStatus(ctx, userId, status)),
  );

  return (
    sessions
      .filter((session): session is Doc<"guestSessions"> => Boolean(session))
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  );
}

async function latestOpenSessionForUser(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await latestSessionForUserByStatuses(ctx, userId, [
    "deposit_pending",
    "active",
    "checkout_pending",
  ]);
}

async function openSessionForFridgeOwnedByAnotherUser(
  ctx: QueryCtx | MutationCtx,
  fridgeId: Id<"fridges">,
  userId: Id<"users">,
) {
  const openStatuses: Doc<"guestSessions">["status"][] = [
    "active",
    "checkout_pending",
  ];
  const sessions = await Promise.all(
    openStatuses.map((status) =>
      ctx.db
        .query("guestSessions")
        .withIndex("by_fridge_status", (q) => q.eq("fridgeId", fridgeId).eq("status", status))
        .order("desc")
        .first(),
    ),
  );

  return (
    sessions
      .filter((session): session is Doc<"guestSessions"> => Boolean(session))
      .filter((session) => session.userId !== userId)
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  );
}

async function currentSessionForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  options?: { includeCheckedOut?: boolean },
) {
  return (
    (await latestOpenSessionForUser(ctx, userId)) ??
    (options?.includeCheckedOut ? await sessionForUserByStatus(ctx, userId, "checked_out") : null)
  );
}

async function createGuestSession(
  ctx: MutationCtx,
  userId: Id<"users">,
  fridgeId: Id<"fridges">,
) {
  const sessionId = await ctx.db.insert("guestSessions", {
    userId,
    fridgeId,
    status: "deposit_pending",
    unlockCode: Math.floor(1000 + Math.random() * 9000).toString(),
    createdAt: Date.now(),
  });

  const session = await ctx.db.get(sessionId);
  if (!session) throw new Error("Failed to create session");
  return session;
}

async function getOrCreateCurrentSession(
  ctx: MutationCtx,
  userId: Id<"users">,
  fridgeCode?: string,
) {
  const normalizedCode = normalizeFridgeCode(fridgeCode);
  const existingOpenSession = await latestOpenSessionForUser(ctx, userId);

  if (!normalizedCode) return existingOpenSession ?? null;

  const fridge = await resolveFridgeByCode(ctx, normalizedCode);

  if (existingOpenSession) {
    if (existingOpenSession.fridgeId === fridge._id) {
      return existingOpenSession;
    }

    throw new Error(
      "You already have an open tab on another fridge. Finish that session before switching fridges.",
    );
  }

  const occupiedSession = await openSessionForFridgeOwnedByAnotherUser(
    ctx,
    fridge._id,
    userId,
  );
  if (occupiedSession) {
    throw new Error(
      "This fridge is currently linked to another active guest stay. Please finish checkout before starting a new stay.",
    );
  }

  return await createGuestSession(ctx, userId, fridge._id);
}

async function getOpenRequestForSession(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"guestSessions">,
  types?: ReconciliationRequestType[],
) {
  const requests = await ctx.db
    .query("reconciliationRequests")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();

  return (
    requests
      .filter(
        (request) =>
          openRequestStatuses.has(request.status) &&
          (!types || types.includes(request.type)),
      )
      .sort((a, b) => b.requestedAt - a.requestedAt)[0] ?? null
  );
}

function totalLedgerCents<T extends { amountCents: number }>(events: T[]) {
  return events.reduce((sum, event) => sum + event.amountCents, 0);
}

function consumedCents<T extends { unitPriceCents: number; quantity: number }>(items: T[]) {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

function formatEuros(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

async function totalAuthorizedCentsForSession(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"guestSessions">,
) {
  const ledgerEvents = await ctx.db
    .query("ledgerEvents")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();

  return totalLedgerCents(
    ledgerEvents.filter((event) => event.type === "deposit_hold" || event.type === "top_up"),
  );
}

function validateItems(items: ReconciliationItemInput[]) {
  for (const item of items) {
    if (item.quantity <= 0) throw new Error("Item quantity must be greater than zero");
    if (item.unitPriceCents < 0) throw new Error("Item price cannot be negative");
    if (!item.name.trim()) throw new Error("Item name is required");
    if (!item.type.trim()) throw new Error("Item type is required");
  }
}

function normalizeRestockNeeds(needs: RestockNeed[]) {
  const uniqueNeeds = Array.from(new Set(needs));

  if (uniqueNeeds.length === 0) {
    throw new Error("Choose at least one restock need");
  }

  return uniqueNeeds;
}

async function normalizeRequestedItems(
  ctx: QueryCtx | MutationCtx,
  items: RequestedItemInput[],
) {
  const normalized = items
    .map((item) => ({
      productId: item.productId,
      quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
    }))
    .filter((item) => item.quantity > 0);

  const merged = new Map<Id<"products">, number>();
  for (const item of normalized) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }

  const uniqueItems = Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));

  await Promise.all(
    uniqueItems.map(async (item) => {
      const product = await ctx.db.get(item.productId);
      if (!product) throw new Error("Requested item not found");
    }),
  );

  return uniqueItems;
}

function normalizeGuestNote(note: string | undefined) {
  const trimmed = note?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_GUEST_NOTE_LENGTH) {
    throw new Error(`Guest note must be ${MAX_GUEST_NOTE_LENGTH} characters or less`);
  }

  return trimmed;
}

function naturalList(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function formatRequestedNeeds(needs: RestockNeed[]) {
  if (needs.length === 0) return null;
  return naturalList(needs.map((need) => restockNeedLabels[need]));
}

async function insertConsumptionItems(
  ctx: MutationCtx,
  sessionId: Id<"guestSessions">,
  requestId: Id<"reconciliationRequests">,
  items: ReconciliationItemInput[],
) {
  await insertLoggedItems(ctx, "consumptionItems", sessionId, requestId, items);
}

async function insertRestockedItems(
  ctx: MutationCtx,
  sessionId: Id<"guestSessions">,
  requestId: Id<"reconciliationRequests">,
  items: ReconciliationItemInput[],
) {
  await insertLoggedItems(ctx, "restockedItems", sessionId, requestId, items);
}

async function insertLoggedItems(
  ctx: MutationCtx,
  table: LoggedItemTable,
  sessionId: Id<"guestSessions">,
  requestId: Id<"reconciliationRequests">,
  items: ReconciliationItemInput[],
) {
  validateItems(items);

  for (const item of items) {
    await ctx.db.insert(table, {
      sessionId,
      reconciliationRequestId: requestId,
      productId: item.productId,
      name: item.name.trim(),
      type: item.type.trim(),
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      createdAt: Date.now(),
    });
  }
}

async function hydrateRestockerRequestEntry(
  ctx: QueryCtx,
  request: Doc<"reconciliationRequests">,
) {
  const photos = await Promise.all(
    (request.photos ?? []).map(async (photo) => ({
      ...photo,
      url: (await ctx.storage.getUrl(photo.storageId)) ?? photo.url,
    })),
  );
  const [session, fridge, consumedItems, addedItems] = await Promise.all([
    ctx.db.get(request.sessionId),
    ctx.db.get(request.fridgeId),
    ctx.db
      .query("consumptionItems")
      .withIndex("by_reconciliation", (q) => q.eq("reconciliationRequestId", request._id))
      .collect(),
    ctx.db
      .query("restockedItems")
      .withIndex("by_reconciliation", (q) => q.eq("reconciliationRequestId", request._id))
      .collect(),
  ]);

  return {
    request: {
      ...request,
      photos,
    },
    session,
    fridge,
    consumedItems: consumedItems.sort((a, b) => b.createdAt - a.createdAt),
    addedItems: addedItems.sort((a, b) => b.createdAt - a.createdAt),
  };
}

function normalizeReconciliationPhotos(photos: ReconciliationPhotoInput[] | undefined) {
  return photos?.map((photo) => ({
    storageId: photo.storageId,
    url: photo.url.trim(),
    contentType: photo.contentType.trim(),
    fileName: photo.fileName.trim(),
    uploadedAt: photo.uploadedAt,
  }));
}

async function completeCheckout(
  ctx: MutationCtx,
  session: Doc<"guestSessions">,
  requestId: Id<"reconciliationRequests">,
  refundEstimateCents: number,
) {
  await ctx.db.insert("ledgerEvents", {
    sessionId: session._id,
    type: "checkout",
    amountCents: 0,
    createdAt: Date.now(),
  });

  await ctx.db.patch(requestId, {
    status: "completed",
    completedAt: Date.now(),
    refundEstimateCents,
    topUpRequiredCents: 0,
  });

  await ctx.db.patch(session._id, {
    status: "checked_out",
    checkedOutAt: Date.now(),
  });
}

async function createReconciliationRequest(
  ctx: MutationCtx,
  session: Doc<"guestSessions">,
  type: Doc<"reconciliationRequests">["type"],
  options?: {
    requestedNeeds?: RestockNeed[];
    requestedItems?: RequestedItemInput[];
    generalRefresh?: boolean;
    guestNote?: string;
  },
) {
  const requestedNeeds =
    type === "restock" && options?.requestedNeeds?.length ? options.requestedNeeds : undefined;
  const requestedItems =
    isInventoryRequestType(type) && options?.requestedItems?.length ? options.requestedItems : undefined;
  const generalRefresh = type === "restock" ? options?.generalRefresh === true : false;
  const guestNote = type === "restock" ? options?.guestNote : undefined;
  const requestId = await ctx.db.insert("reconciliationRequests", {
    sessionId: session._id,
    userId: session.userId,
    fridgeId: session.fridgeId,
    type,
    status: "requested",
    requestedAt: Date.now(),
    topUpRequiredCents: 0,
    refundEstimateCents: 0,
    consumedDeltaCents: 0,
    addedValueCents: 0,
    restockChargeMode: isInventoryRequestType(type) ? "added_items" : undefined,
    requestedNeeds,
    requestedItems,
    generalRefresh,
    guestNote,
  });

  const requestedNeedsSummary = requestedNeeds ? formatRequestedNeeds(requestedNeeds) : null;
  const requestedItemLabels =
    requestedItems && requestedItems.length > 0
      ? (
          await Promise.all(
            requestedItems.map(async (item) => {
              const product = await ctx.db.get(item.productId);
              return `${item.quantity}x ${product?.name ?? "Item"}`;
            }),
          )
        ).join(", ")
      : null;

  await sendGuestNotification(ctx, {
    sessionId: session._id,
    userId: session.userId,
    type: type === "checkout" ? "checkout_pending" : "restock_requested",
    title: type === "checkout" ? "Checkout Requested" : `${requestTypeLabel(type)} Requested`,
    message:
      type === "checkout"
        ? "A restocker will reconcile your final fridge usage before refund is calculated."
        : type === "add_on"
          ? requestedItemLabels
            ? `A restocker has been asked to deliver your add-ons. Items: ${requestedItemLabels}.`
            : "A restocker has been asked to deliver your add-ons."
          : requestedItemLabels || requestedNeedsSummary || generalRefresh
            ? `A restocker has been asked to refresh your minibar. ${[
                requestedItemLabels ? `Items: ${requestedItemLabels}.` : "",
                requestedNeedsSummary ? `Requested: ${requestedNeedsSummary}.` : "",
                generalRefresh ? "General refresh requested." : "",
              ]
                .filter(Boolean)
                .join(" ")}`
            : "A restocker has been asked to reconcile and restock your fridge.",
  });

  const request = await ctx.db.get(requestId);
  if (!request) throw new Error("Failed to create reconciliation request");

  if (isInventoryRequestType(type)) {
    await createRefillTicketForRequest(ctx, {
      request,
      requestedNeeds,
      requestedItems,
      guestNote,
      session,
    });
  }

  return requestId;
}

export const startOrResume = mutation({
  args: {
    fridgeCode: v.optional(v.string()),
    forceFreshPrototype: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const session = await getOrCreateCurrentSession(ctx, userId, args.fridgeCode);
    return session?._id ?? null;
  },
});

export const listPrototypeFridges = query({
  args: {},
  handler: async (ctx) => {
    const fridges = await ctx.db.query("fridges").collect();

    return fridges
      .sort((left, right) => {
        const leftLabel = `${left.hotelName ?? left.name} ${left.location ?? ""}`.trim();
        const rightLabel = `${right.hotelName ?? right.name} ${right.location ?? ""}`.trim();
        return leftLabel.localeCompare(rightLabel);
      })
      .map((fridge) => ({
        id: fridge._id,
        code: fridge.code,
        name: fridge.name,
        hotelName: fridge.hotelName ?? fridge.name,
        area: fridge.area ?? "Unmapped area",
        location: fridge.location ?? "Guest suite",
        status: fridge.status,
      }));
  },
});

export const getCurrent = query({
  args: { includeCheckedOut: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const session = await currentSessionForUser(ctx, userId, {
      includeCheckedOut: args.includeCheckedOut ?? false,
    });
    if (!session) return null;

    const fridge = await ctx.db.get(session.fridgeId);

    const ledgerEvents = await ctx.db
      .query("ledgerEvents")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();

    const consumptionItems = await ctx.db
      .query("consumptionItems")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
    const restockedItems = await ctx.db
      .query("restockedItems")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .filter((q) => q.eq(q.field("dismissed"), false))
      .collect();

    const requests = await ctx.db
      .query("reconciliationRequests")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();

    const sortedRequests = [...requests].sort((a, b) => b.requestedAt - a.requestedAt);
    const totalAuthorizedCents = totalLedgerCents(
      ledgerEvents.filter((event) => event.type === "deposit_hold" || event.type === "top_up"),
    );
    const totalConsumedCents = consumedCents(consumptionItems);
    const rawAvailableBalanceCents = totalAuthorizedCents - totalConsumedCents;
    const openRequest =
      sortedRequests
        .filter((request) => openRequestStatuses.has(request.status))
        .sort((a, b) => b.requestedAt - a.requestedAt)[0] ?? null;
    const topUpRequest =
      sortedRequests.find((request) => request.status === "top_up_required") ?? null;
    const latestRequest = sortedRequests[0] ?? null;

    return {
      session,
      fridgeCode: fridge?.code ?? null,
      defaultDepositHoldCents: DEFAULT_DEPOSIT_HOLD_CENTS,
      totalAuthorizedCents,
      totalConsumedCents,
      availableBalanceCents: Math.max(0, rawAvailableBalanceCents),
      rawAvailableBalanceCents,
      requiredTopUpCents: topUpRequest?.topUpRequiredCents ?? 0,
      finalRefundEstimateCents:
        latestRequest?.type === "checkout" ? (latestRequest.refundEstimateCents ?? 0) : 0,
      openRequest,
      latestRequest,
      requests: sortedRequests,
      consumptionItems: consumptionItems.sort((a, b) => b.createdAt - a.createdAt),
      restockedItems: restockedItems.sort((a, b) => b.createdAt - a.createdAt),
      notifications: notifications.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

export const authorizeDepositHold = mutation({
  args: { amountCents: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const amountCents = args.amountCents ?? DEFAULT_DEPOSIT_HOLD_CENTS;
    let session = await getOrCreateCurrentSession(ctx, userId);
    if (!session) {
      throw new Error("Scan a fridge QR code before adding a deposit.");
    }
    let totalAuthorizedCents = await totalAuthorizedCentsForSession(ctx, session._id);

    if (totalAuthorizedCents > 0) {
      return session._id;
    }

    if (session.status !== "deposit_pending") {
      session = await createGuestSession(ctx, userId, session.fridgeId);
      totalAuthorizedCents = await totalAuthorizedCentsForSession(ctx, session._id);
    }

    const occupiedSession = await openSessionForFridgeOwnedByAnotherUser(
      ctx,
      session.fridgeId,
      userId,
    );
    if (occupiedSession) {
      throw new Error(
        "This fridge is currently linked to another active guest stay. Please finish checkout before starting a new stay.",
      );
    }

    if (totalAuthorizedCents > 0) {
      await ctx.db.patch(session._id, { status: "active" });
      return session._id;
    }

    await ctx.db.insert("ledgerEvents", {
      sessionId: session._id,
      type: "deposit_hold",
      amountCents,
      createdAt: Date.now(),
    });

    await ctx.db.patch(session._id, { status: "active" });
    return session._id;
  },
});

export const requestRestock = mutation({
  args: {
    requestedItems: v.array(inventorySelectionValidator),
    generalRefresh: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const session = await activeSessionForUser(ctx, userId);
    if (!session) throw new Error("No active session");

    const requestedItems = await normalizeRequestedItems(ctx, args.requestedItems);
    const requestedNeeds = args.generalRefresh ? normalizeRestockNeeds(["general_refresh"]) : [];
    const guestNote = normalizeGuestNote(args.note);
    if (requestedItems.length === 0 && requestedNeeds.length === 0) {
      throw new Error("Add items or request a general refresh");
    }
    const openRequest = await getOpenRequestForSession(ctx, session._id, ["restock", "checkout"]);
    if (openRequest) {
      if (openRequest.type === "restock") return openRequest._id;
      throw new Error("Checkout reconciliation is already in progress");
    }

    return await createReconciliationRequest(ctx, session, "restock", {
      requestedNeeds,
      requestedItems,
      generalRefresh: args.generalRefresh,
      guestNote,
    });
  },
});

export const requestAddOn = mutation({
  args: {
    requestedItems: v.array(inventorySelectionValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const session = await activeSessionForUser(ctx, userId);
    if (!session) throw new Error("No active session");

    const requestedItems = await normalizeRequestedItems(ctx, args.requestedItems);
    if (requestedItems.length === 0) {
      throw new Error("Add at least one item");
    }

    const openRequest = await getOpenRequestForSession(ctx, session._id, ["add_on", "checkout"]);
    if (openRequest) {
      if (openRequest.type === "add_on") return openRequest._id;
      throw new Error("Checkout reconciliation is already in progress");
    }

    return await createReconciliationRequest(ctx, session, "add_on", {
      requestedItems,
    });
  },
});

export const requestCheckout = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const session =
      (await sessionForUserByStatus(ctx, userId, "checkout_pending")) ??
      (await activeSessionForUser(ctx, userId));
    if (!session) throw new Error("No active session");

    const openRequest = await getOpenRequestForSession(ctx, session._id, ["restock", "add_on", "checkout"]);
    if (openRequest) {
      if (openRequest.type === "checkout") return openRequest._id;
      throw new Error("Open minibar requests must be completed before checkout");
    }

    await ctx.db.patch(session._id, { status: "checkout_pending" });
    return await createReconciliationRequest(ctx, session, "checkout");
  },
});

export const payRequiredTopUp = mutation({
  args: { requestId: v.id("reconciliationRequests") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.userId !== userId) throw new Error("Reconciliation request not found");
    if (request.status !== "top_up_required") throw new Error("No top-up is required");

    const amountCents = request.topUpRequiredCents ?? 0;
    if (amountCents <= 0) throw new Error("Top-up amount is missing");

    const session = await ctx.db.get(request.sessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.insert("ledgerEvents", {
      sessionId: request.sessionId,
      type: "top_up",
      amountCents,
      createdAt: Date.now(),
    });

    if (request.type === "checkout") {
      await completeCheckout(ctx, session, request._id, 0);
      await sendGuestNotification(ctx, {
        sessionId: request.sessionId,
        userId,
        type: "checkout_reconciled",
        title: "Checkout Complete",
        message: "Your final top-up was received and your ChilledStock tab is closed.",
      });
      await syncIncomeTicketForRequest(ctx, {
        reconciliationRequestId: request._id,
        actorType: "system",
        actorName: "ChilledStock Billing",
        action: "closed",
        message: "Guest settled the outstanding checkout amount.",
        patch: {
          status: "closed",
        },
      });
      return;
    }

    await ctx.db.patch(request._id, {
      status: "completed",
      completedAt: Date.now(),
      topUpRequiredCents: 0,
    });

    const topUpMessage =
      request.type === "add_on"
        ? request.addedValueCents && request.addedValueCents > 0
          ? "Your add-on top-up was received and your extra items are on the way."
          : "Your add-on request was settled."
        : request.restockChargeMode === "full_restock"
        ? "Your full fridge refresh was topped up and the minibar is ready again."
        : request.addedValueCents && request.addedValueCents > 0
          ? "Your top-up for the items added back was received and the restocked fridge is ready."
          : "Your wallet was topped up and the restocked fridge is ready to enjoy.";

    await sendGuestNotification(ctx, {
      sessionId: request.sessionId,
      userId,
      type: "restock_complete",
      title: requestCompleteTitle(request.type),
      message: topUpMessage,
    });
    await syncTicketForReconciliation(ctx, {
      reconciliationRequestId: request._id,
      actorType: "system",
      actorName: "ChilledStock Billing",
      action: "resolved",
      message:
        request.type === "add_on"
          ? "Guest settled the add-on top-up and the request is complete."
          : "Guest settled the refill top-up and the request is complete.",
      patch: {
        status: "resolved",
        blockedReason: undefined,
        resolvedAt: Date.now(),
      },
    });
    await syncIncomeTicketForRequest(ctx, {
      reconciliationRequestId: request._id,
      actorType: "system",
      actorName: "ChilledStock Billing",
      action: "closed",
      message:
        request.type === "add_on"
          ? "Guest settled the add-on top-up."
          : "Guest settled the refill top-up.",
      patch: {
        status: "closed",
      },
    });
  },
});

export const listOpenRequests = query({
  args: {},
  handler: async (ctx) => {
    const [requested, enroute, topUpRequired] = await Promise.all([
      ctx.db
        .query("reconciliationRequests")
        .withIndex("by_status", (q) => q.eq("status", "requested"))
        .collect(),
      ctx.db
        .query("reconciliationRequests")
        .withIndex("by_status", (q) => q.eq("status", "enroute"))
        .collect(),
      ctx.db
        .query("reconciliationRequests")
        .withIndex("by_status", (q) => q.eq("status", "top_up_required"))
        .collect(),
    ]);

    const requests = [...requested, ...enroute, ...topUpRequired].sort(
      (a, b) => b.requestedAt - a.requestedAt,
    );

    return await Promise.all(requests.map((request) => hydrateRestockerRequestEntry(ctx, request)));
  },
});

export const listRestockerRequests = query({
  args: {},
  handler: async (ctx) => {
    const [requested, enroute, topUpRequired, completed, cancelled] = await Promise.all([
      ctx.db
        .query("reconciliationRequests")
        .withIndex("by_status", (q) => q.eq("status", "requested"))
        .collect(),
      ctx.db
        .query("reconciliationRequests")
        .withIndex("by_status", (q) => q.eq("status", "enroute"))
        .collect(),
      ctx.db
        .query("reconciliationRequests")
        .withIndex("by_status", (q) => q.eq("status", "top_up_required"))
        .collect(),
      ctx.db
        .query("reconciliationRequests")
        .withIndex("by_status", (q) => q.eq("status", "completed"))
        .collect(),
      ctx.db
        .query("reconciliationRequests")
        .withIndex("by_status", (q) => q.eq("status", "cancelled"))
        .collect(),
    ]);

    const liveRequests = [...requested, ...enroute, ...topUpRequired].sort(
      (a, b) => b.requestedAt - a.requestedAt,
    );
    const recentResolved = [...completed, ...cancelled]
      .sort(
        (a, b) =>
          (b.completedAt ?? b.reconciledAt ?? b.requestedAt) -
          (a.completedAt ?? a.reconciledAt ?? a.requestedAt),
      )
      .slice(0, 12);

    return {
      liveRequests: await Promise.all(
        liveRequests.map((request) => hydrateRestockerRequestEntry(ctx, request)),
      ),
      recentResolved: await Promise.all(
        recentResolved.map((request) => hydrateRestockerRequestEntry(ctx, request)),
      ),
    };
  },
});

export const getRestockerRequest = query({
  args: { requestId: v.id("reconciliationRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    return await hydrateRestockerRequestEntry(ctx, request);
  },
});

export const generateRestockerPhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const markEnroute = mutation({
  args: { requestId: v.id("reconciliationRequests"), restockerName: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Reconciliation request not found");
    if (request.status !== "requested" && request.status !== "enroute") {
      throw new Error("Request cannot be marked enroute");
    }
    const restockerName = args.restockerName.trim() || "Restocker";

    await ctx.db.patch(request._id, {
      status: "enroute",
      enrouteAt: Date.now(),
      restockerName,
    });

    await syncTicketForReconciliation(ctx, {
      reconciliationRequestId: request._id,
      actorType: "restocker",
      actorName: restockerName,
      action: "started",
      message: `${restockerName} is on the way to the fridge.`,
      patch: {
        status: "in_progress",
      },
    });

    await sendGuestNotification(ctx, {
      sessionId: request.sessionId,
      userId: request.userId,
      type: request.type === "checkout" ? "checkout_pending" : "restock_enroute",
      title:
        request.type === "checkout"
          ? "Checkout Reconciliation Started"
          : request.type === "add_on"
            ? "Add-Ons En Route"
            : "Restocker En Route",
      message:
        request.type === "checkout"
          ? `${restockerName} is reconciling your final fridge usage.`
          : request.type === "add_on"
            ? `${restockerName} is on the way with your add-ons.`
            : `${restockerName} is on the way to reconcile and restock.`,
    });
  },
});

export const logRestockReconciliation = mutation({
  args: {
    requestId: v.id("reconciliationRequests"),
    restockerName: v.string(),
    consumedItems: v.array(inventorySelectionValidator),
    addedItems: v.array(inventorySelectionValidator),
    restockChargeMode: restockChargeModeValidator,
    photos: v.optional(v.array(reconciliationPhotoValidator)),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || !isInventoryRequestType(request.type)) throw new Error("Inventory request not found");
    if (request.status !== "requested" && request.status !== "enroute") {
      throw new Error("Inventory request cannot be reconciled");
    }

    const restockerName = args.restockerName.trim() || "Restocker";
    const consumedSelections =
      request.type === "restock" ? await resolveConsumedSelections(ctx, args.consumedItems) : [];
    const { loggedItems: addedSelections, shortages } = await resolveAddedSelections(ctx, {
      actorName: restockerName,
      fridgeId: request.fridgeId,
      reconciliationRequestId: request._id,
      selections: args.addedItems,
    });

    await insertConsumptionItems(ctx, request.sessionId, request._id, consumedSelections);
    await insertRestockedItems(ctx, request.sessionId, request._id, addedSelections);
    const consumedDeltaCents = consumedCents(consumedSelections);
    const addedValueCents = consumedCents(addedSelections);
    const photos = normalizeReconciliationPhotos(args.photos);
    const topUpRequiredCents =
      request.type === "restock" && args.restockChargeMode === "full_restock"
        ? FULL_RESTOCK_TOP_UP_CENTS
        : addedValueCents;

    if (shortages.length > 0) {
      await createLowStockSpecialOrderTicket(ctx, {
        fridgeId: request.fridgeId,
        reconciliationRequestId: request._id,
        sessionId: request.sessionId,
        shortages,
        userId: request.userId,
      });
    }

    if (topUpRequiredCents > 0) {
      await ctx.db.patch(request._id, {
        status: "top_up_required",
        reconciledAt: Date.now(),
        restockerName,
        consumedDeltaCents,
        addedValueCents,
        photos,
        topUpRequiredCents,
        refundEstimateCents: 0,
        restockChargeMode: request.type === "restock" ? args.restockChargeMode : "added_items",
      });

      await sendGuestNotification(ctx, {
        sessionId: request.sessionId,
        userId: request.userId,
        type: "top_up_required",
        title: "Top-Up Required",
        message:
          request.type === "add_on"
            ? `${restockerName} added ${formatEuros(addedValueCents)} in extra items to your minibar. Top up to confirm the delivery.`
            : args.restockChargeMode === "full_restock"
            ? `${restockerName} marked this as a full fridge refresh. Top up ${formatEuros(FULL_RESTOCK_TOP_UP_CENTS)} to continue.`
            : `${restockerName} added ${formatEuros(addedValueCents)} back into the fridge. Top up to keep enjoying the refresh.`,
      });

      await syncTicketForReconciliation(ctx, {
        reconciliationRequestId: request._id,
        actorType: "restocker",
        actorName: restockerName,
        action: "blocked",
        message: `Awaiting guest top-up of ${formatEuros(topUpRequiredCents)} after reconciliation.`,
        patch: {
          status: "blocked",
          blockedReason: "Awaiting guest top-up",
        },
      });
      await createIncomeTicketForRequest(ctx, {
        request,
        priority: topUpRequiredCents >= FULL_RESTOCK_TOP_UP_CENTS ? "urgent" : "high",
        title: request.type === "add_on" ? "Guest add-on top-up review" : "Guest top-up review",
        description:
          request.type === "add_on"
            ? `${restockerName} completed an add-on delivery and the guest now owes ${formatEuros(topUpRequiredCents)}.`
            : `${restockerName} completed a refill reconciliation and the guest now owes ${formatEuros(topUpRequiredCents)}.`,
      });
      return;
    }

    await ctx.db.patch(request._id, {
      status: "completed",
      reconciledAt: Date.now(),
      completedAt: Date.now(),
      restockerName,
      consumedDeltaCents,
      addedValueCents,
      photos,
      topUpRequiredCents: 0,
      refundEstimateCents: 0,
      restockChargeMode: request.type === "restock" ? args.restockChargeMode : "added_items",
    });

    await sendGuestNotification(ctx, {
      sessionId: request.sessionId,
      userId: request.userId,
      type: "restock_complete",
      title: requestCompleteTitle(request.type),
      message:
        request.type === "add_on"
          ? `${restockerName} delivered your add-ons. No top-up was needed this time.`
          : `${restockerName} restocked your fridge. No top-up was needed this time.`,
    });

    await syncTicketForReconciliation(ctx, {
      reconciliationRequestId: request._id,
      actorType: "restocker",
      actorName: restockerName,
      action: "resolved",
      message: "Reconciliation completed without requiring a guest top-up.",
      patch: {
        status: "resolved",
        blockedReason: undefined,
        resolvedAt: Date.now(),
      },
    });
  },
});

export const logCheckoutReconciliation = mutation({
  args: {
    requestId: v.id("reconciliationRequests"),
    restockerName: v.string(),
    items: v.array(inventorySelectionValidator),
    photos: v.optional(v.array(reconciliationPhotoValidator)),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.type !== "checkout") throw new Error("Checkout request not found");
    if (request.status !== "requested" && request.status !== "enroute") {
      throw new Error("Checkout request cannot be reconciled");
    }

    const session = await ctx.db.get(request.sessionId);
    if (!session) throw new Error("Session not found");

    const loggedItems = await resolveConsumedSelections(ctx, args.items);
    await insertConsumptionItems(ctx, request.sessionId, request._id, loggedItems);
    const deltaCents = consumedCents(loggedItems);
    const restockerName = args.restockerName.trim() || "Restocker";
    const photos = normalizeReconciliationPhotos(args.photos);

    const ledgerEvents = await ctx.db
      .query("ledgerEvents")
      .withIndex("by_session", (q) => q.eq("sessionId", request.sessionId))
      .collect();
    const consumptionItems = await ctx.db
      .query("consumptionItems")
      .withIndex("by_session", (q) => q.eq("sessionId", request.sessionId))
      .collect();

    const totalAuthorizedCents = totalLedgerCents(
      ledgerEvents.filter((event) => event.type === "deposit_hold" || event.type === "top_up"),
    );
    const totalConsumedCents = consumedCents(consumptionItems);
    const balanceCents = totalAuthorizedCents - totalConsumedCents;

    if (balanceCents < 0) {
      await ctx.db.patch(request._id, {
        status: "top_up_required",
        reconciledAt: Date.now(),
        restockerName,
        consumedDeltaCents: deltaCents,
        photos,
        topUpRequiredCents: Math.abs(balanceCents),
        refundEstimateCents: 0,
      });

      await sendGuestNotification(ctx, {
        sessionId: request.sessionId,
        userId: request.userId,
        type: "top_up_required",
        title: "Final Top-Up Required",
        message: `${restockerName} logged final usage. Add €${(Math.abs(balanceCents) / 100).toFixed(2)} to close your tab.`,
      });
      await createIncomeTicketForRequest(ctx, {
        request,
        priority: "urgent",
        title: "Checkout top-up review",
        description: `${restockerName} reconciled checkout and the guest owes ${formatEuros(Math.abs(balanceCents))} to close the tab.`,
      });
      return;
    }

    await ctx.db.patch(request._id, {
      status: "reconciled",
      reconciledAt: Date.now(),
      restockerName,
      consumedDeltaCents: deltaCents,
      photos,
      topUpRequiredCents: 0,
      refundEstimateCents: balanceCents,
    });
    await completeCheckout(ctx, session, request._id, balanceCents);

    await sendGuestNotification(ctx, {
      sessionId: request.sessionId,
      userId: request.userId,
      type: "checkout_reconciled",
      title: "Checkout Reconciled",
      message:
        balanceCents > 0
          ? `Your final refund estimate is €${(balanceCents / 100).toFixed(2)}.`
          : "Your final fridge usage matched the available balance. No refund is due.",
    });

    if (balanceCents > 0) {
      await createIncomeTicketForRequest(ctx, {
        request,
        priority: "high",
        title: "Refund follow-up",
        description: `${restockerName} reconciled checkout with a refund estimate of ${formatEuros(balanceCents)}.`,
      });
    }
  },
});
