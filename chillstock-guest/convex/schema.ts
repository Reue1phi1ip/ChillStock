import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const restockNeed = v.union(
  v.literal("beer"),
  v.literal("wine"),
  v.literal("water_mixers"),
  v.literal("general_refresh"),
);
const requestedItem = v.object({
  productId: v.id("products"),
  quantity: v.number(),
});
const reconciliationPhoto = v.object({
  storageId: v.id("_storage"),
  url: v.string(),
  contentType: v.string(),
  fileName: v.string(),
  uploadedAt: v.number(),
});
const restockChargeMode = v.union(v.literal("added_items"), v.literal("full_restock"));
const ticketType = v.union(
  v.literal("income_td"),
  v.literal("support"),
  v.literal("refill"),
  v.literal("special_order"),
);
const ticketStatus = v.union(
  v.literal("new"),
  v.literal("triaged"),
  v.literal("assigned"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("resolved"),
  v.literal("closed"),
);
const ticketPriority = v.union(v.literal("normal"), v.literal("high"), v.literal("urgent"));
const ticketSource = v.union(v.literal("guest"), v.literal("management"), v.literal("system"));
const ticketActorType = v.union(
  v.literal("guest"),
  v.literal("manager"),
  v.literal("restocker"),
  v.literal("system"),
);

export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.id("users"),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_user", ["userId"]),

  fridges: defineTable({
    code: v.string(),
    name: v.string(),
    hotelName: v.optional(v.string()),
    area: v.optional(v.string()),
    location: v.optional(v.string()),
    assignedRestockerIds: v.optional(v.array(v.id("restockers"))),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
  }).index("by_code", ["code"]),

  restockers: defineTable({
    name: v.string(),
    slug: v.string(),
    area: v.string(),
    active: v.boolean(),
    capacity: v.number(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["active"]),

  products: defineTable({
    name: v.string(),
    type: v.string(),
    priceCents: v.number(),
    description: v.string(),
    abv: v.optional(v.string()),
    volume: v.string(),
    imageColor: v.string(),
    imageUrl: v.optional(v.string()),
    inStock: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_name", ["name"]),

  guestSessions: defineTable({
    userId: v.id("users"),
    fridgeId: v.id("fridges"),
    status: v.union(
      v.literal("deposit_pending"),
      v.literal("active"),
      v.literal("checkout_pending"),
      v.literal("checked_out"),
    ),
    unlockCode: v.string(),
    createdAt: v.number(),
    checkedOutAt: v.optional(v.number()),
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_fridge_status", ["fridgeId", "status"]),

  hotelInventory: defineTable({
    fridgeId: v.id("fridges"),
    productId: v.id("products"),
    quantityAvailable: v.number(),
    updatedAt: v.number(),
  })
    .index("by_fridge", ["fridgeId"])
    .index("by_product", ["productId"])
    .index("by_fridge_product", ["fridgeId", "productId"]),

  inventoryEvents: defineTable({
    fridgeId: v.id("fridges"),
    productId: v.id("products"),
    quantityDelta: v.number(),
    reason: v.string(),
    actorName: v.string(),
    actorType: ticketActorType,
    reconciliationRequestId: v.optional(v.id("reconciliationRequests")),
    createdAt: v.number(),
  })
    .index("by_fridge", ["fridgeId"])
    .index("by_product", ["productId"])
    .index("by_reconciliation", ["reconciliationRequestId"]),

  ledgerEvents: defineTable({
    sessionId: v.id("guestSessions"),
    type: v.union(
      v.literal("deposit_hold"),
      v.literal("top_up"),
      v.literal("checkout"),
      v.literal("refund_estimate"),
    ),
    amountCents: v.number(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  reconciliationRequests: defineTable({
    sessionId: v.id("guestSessions"),
    userId: v.id("users"),
    fridgeId: v.id("fridges"),
    type: v.union(v.literal("restock"), v.literal("add_on"), v.literal("checkout")),
    status: v.union(
      v.literal("requested"),
      v.literal("enroute"),
      v.literal("reconciled"),
      v.literal("top_up_required"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    requestedAt: v.number(),
    enrouteAt: v.optional(v.number()),
    reconciledAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    assignedRestockerId: v.optional(v.id("restockers")),
    assignedRestockerName: v.optional(v.string()),
    restockerName: v.optional(v.string()),
    consumedDeltaCents: v.optional(v.number()),
    addedValueCents: v.optional(v.number()),
    topUpRequiredCents: v.optional(v.number()),
    refundEstimateCents: v.optional(v.number()),
    restockChargeMode: v.optional(restockChargeMode),
    requestedNeeds: v.optional(v.array(restockNeed)),
    requestedItems: v.optional(v.array(requestedItem)),
    generalRefresh: v.optional(v.boolean()),
    guestNote: v.optional(v.string()),
    photos: v.optional(v.array(reconciliationPhoto)),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  consumptionItems: defineTable({
    sessionId: v.id("guestSessions"),
    reconciliationRequestId: v.optional(v.id("reconciliationRequests")),
    productId: v.optional(v.id("products")),
    name: v.string(),
    type: v.string(),
    unitPriceCents: v.number(),
    quantity: v.number(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_reconciliation", ["reconciliationRequestId"]),

  restockedItems: defineTable({
    sessionId: v.id("guestSessions"),
    reconciliationRequestId: v.optional(v.id("reconciliationRequests")),
    productId: v.optional(v.id("products")),
    name: v.string(),
    type: v.string(),
    unitPriceCents: v.number(),
    quantity: v.number(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_reconciliation", ["reconciliationRequestId"]),

  notifications: defineTable({
    sessionId: v.id("guestSessions"),
    userId: v.id("users"),
    type: v.union(
      v.literal("over_deposit"),
      v.literal("restock_requested"),
      v.literal("restock_enroute"),
      v.literal("restock_complete"),
      v.literal("top_up_required"),
      v.literal("checkout_pending"),
      v.literal("checkout_reconciled"),
      v.literal("info"),
    ),
    title: v.string(),
    message: v.string(),
    messageHtml: v.optional(v.string()),
    read: v.boolean(),
    dismissed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),

  tickets: defineTable({
    type: ticketType,
    status: ticketStatus,
    priority: ticketPriority,
    source: ticketSource,
    title: v.string(),
    description: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.id("guestSessions")),
    fridgeId: v.optional(v.id("fridges")),
    reconciliationRequestId: v.optional(v.id("reconciliationRequests")),
    assignedRestockerId: v.optional(v.id("restockers")),
    assignedRestockerName: v.optional(v.string()),
    hotelName: v.optional(v.string()),
    area: v.optional(v.string()),
    customerLabel: v.optional(v.string()),
    requestedNeeds: v.optional(v.array(restockNeed)),
    requestedItems: v.optional(v.array(requestedItem)),
    blockedReason: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type_status", ["type", "status"])
    .index("by_status", ["status"])
    .index("by_assigned_restocker", ["assignedRestockerId"])
    .index("by_reconciliation", ["reconciliationRequestId"])
    .index("by_session", ["sessionId"]),

  ticketEvents: defineTable({
    ticketId: v.id("tickets"),
    actorType: ticketActorType,
    actorName: v.string(),
    action: v.string(),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_ticket", ["ticketId"]),
});
