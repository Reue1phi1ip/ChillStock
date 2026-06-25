import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEMO_FRIDGE_CODE = "7429";
const BLOCKING_SESSION_STATUSES = ["active", "checkout_pending"] as const;
const REPAIR_SESSION_STATUSES = ["deposit_pending", "active", "checkout_pending"] as const;
const OPEN_REQUEST_STATUSES = new Set(["requested", "enroute", "reconciled", "top_up_required"]);

export const products = [
  {
    name: "Craft IPA",
    type: "Beer",
    priceCents: 450,
    description: "A heavily dry-hopped New England style IPA.",
    abv: "6.5%",
    volume: "330ml",
    imageColor: "bg-amber-100",
    imageUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Premium Lager",
    type: "Beer",
    priceCents: 380,
    description: "Classic crisp lager served ice cold.",
    abv: "5.0%",
    volume: "330ml",
    imageColor: "bg-yellow-100",
    imageUrl: "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Pilsner Select",
    type: "Beer",
    priceCents: 410,
    description: "Clean and bright pilsner with a dry finish.",
    abv: "4.8%",
    volume: "330ml",
    imageColor: "bg-amber-50",
    imageUrl: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Wheat Ale",
    type: "Beer",
    priceCents: 470,
    description: "Smooth wheat ale with citrus peel notes.",
    abv: "5.2%",
    volume: "330ml",
    imageColor: "bg-orange-100",
    imageUrl: "https://images.unsplash.com/photo-1567696911980-2eed69a46042?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Pinot Noir Reserve",
    type: "Wine",
    priceCents: 1800,
    description: "Elegant and medium-bodied with aromas of ripe cherry.",
    abv: "13.5%",
    volume: "750ml",
    imageColor: "bg-rose-100",
    imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Sauvignon Blanc",
    type: "Wine",
    priceCents: 1600,
    description: "Crisp white wine with citrus and tropical fruit notes.",
    abv: "12.5%",
    volume: "750ml",
    imageColor: "bg-lime-100",
    imageUrl: "https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Cabernet Sauvignon Estate",
    type: "Wine",
    priceCents: 2100,
    description: "Bold red wine with dark fruit and cedar notes.",
    abv: "14.0%",
    volume: "750ml",
    imageColor: "bg-red-100",
    imageUrl: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Rose Cuvee",
    type: "Wine",
    priceCents: 1500,
    description: "Dry rose with strawberry and floral aromatics.",
    abv: "12.0%",
    volume: "750ml",
    imageColor: "bg-pink-100",
    imageUrl: "https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Small Batch Gin",
    type: "Spirits",
    priceCents: 2400,
    description: "Juniper-forward gin for elevated minibar serves.",
    abv: "40%",
    volume: "375ml",
    imageColor: "bg-slate-100",
    imageUrl: "https://images.unsplash.com/photo-1614313511387-1436a4480ebb?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Aged Whisky",
    type: "Spirits",
    priceCents: 2900,
    description: "Oak-aged whisky with vanilla and smoke notes.",
    abv: "43%",
    volume: "375ml",
    imageColor: "bg-amber-200",
    imageUrl: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Reposado Tequila",
    type: "Spirits",
    priceCents: 2600,
    description: "Smooth tequila aged in oak barrels.",
    abv: "40%",
    volume: "375ml",
    imageColor: "bg-yellow-200",
    imageUrl: "https://images.unsplash.com/photo-1635185100709-bf76aecc76b9?auto=format&fit=crop&fm=jpg&q=80&w=900",
  },
  {
    name: "Artisan Sparkling Water",
    type: "Water",
    priceCents: 250,
    description: "Locally sourced sparkling mineral water.",
    volume: "500ml",
    imageColor: "bg-blue-100",
    imageUrl: "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Still Mineral Water",
    type: "Water",
    priceCents: 220,
    description: "Premium still water for in-room refreshment.",
    volume: "500ml",
    imageColor: "bg-cyan-100",
    imageUrl: "https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Cola Mixer",
    type: "Mixer",
    priceCents: 220,
    description: "Classic cola bottle for spirit pairings.",
    volume: "250ml",
    imageColor: "bg-amber-100",
    imageUrl: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Tonic Mixer",
    type: "Mixer",
    priceCents: 240,
    description: "Crisp tonic water for gin and vodka pairings.",
    volume: "250ml",
    imageColor: "bg-lime-100",
    imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Ginger Ale Mixer",
    type: "Mixer",
    priceCents: 230,
    description: "Lightly spiced ginger ale for classic serves.",
    volume: "250ml",
    imageColor: "bg-orange-100",
    imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Sparkling Apple Soda",
    type: "Soft Drink",
    priceCents: 280,
    description: "Lightly sweet sparkling apple drink.",
    volume: "330ml",
    imageColor: "bg-green-100",
    imageUrl: "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Citrus Soda",
    type: "Soft Drink",
    priceCents: 270,
    description: "Refreshing citrus soda served chilled.",
    volume: "330ml",
    imageColor: "bg-yellow-100",
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Sea Salt Chips",
    type: "Snack",
    priceCents: 320,
    description: "Hand-cooked chips with sea salt.",
    volume: "40g",
    imageColor: "bg-orange-100",
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Dark Chocolate Bar",
    type: "Snack",
    priceCents: 480,
    description: "72% cocoa dark chocolate with citrus finish.",
    volume: "90g",
    imageColor: "bg-stone-200",
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Smoked Almonds",
    type: "Snack",
    priceCents: 520,
    description: "Roasted almonds with a light smoked finish.",
    volume: "80g",
    imageColor: "bg-amber-200",
    imageUrl: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Pretzel Bites",
    type: "Snack",
    priceCents: 360,
    description: "Salted pretzel bites ideal for pairing.",
    volume: "70g",
    imageColor: "bg-amber-100",
    imageUrl: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Trail Mix",
    type: "Snack",
    priceCents: 440,
    description: "Mixed nuts and dried fruit blend.",
    volume: "85g",
    imageColor: "bg-orange-200",
    imageUrl: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=900&q=80",
  },
] as const;

export const demoRestockers = [
  { name: "Aarav Singh", slug: "aarav-singh", area: "South Shore", capacity: 3 },
  { name: "Mia Fernandes", slug: "mia-fernandes", area: "South Shore", capacity: 3 },
  { name: "Noah D'Souza", slug: "noah-dsouza", area: "South Shore", capacity: 3 },
] as const;

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingRestockers = await ctx.db.query("restockers").collect();
    let restockerIds = existingRestockers.map((restocker) => restocker._id);
    if (existingRestockers.length === 0) {
      restockerIds = [];
      for (const restocker of demoRestockers) {
        const restockerId = await ctx.db.insert("restockers", {
          ...restocker,
          active: true,
          createdAt: Date.now(),
        });
        restockerIds.push(restockerId);
      }
    }

    const existingFridge = await ctx.db
      .query("fridges")
      .withIndex("by_code", (q) => q.eq("code", "7429"))
      .unique();
    let fridgeId = existingFridge?._id;

    if (!existingFridge) {
      fridgeId = await ctx.db.insert("fridges", {
        code: "7429",
        name: "ChilledStock Demo Fridge",
        hotelName: "The Dunes Hotel",
        area: "South Shore",
        location: "Guest suite",
        assignedRestockerIds: restockerIds,
        status: "active",
        createdAt: Date.now(),
      });
    } else if (!existingFridge.assignedRestockerIds?.length) {
      await ctx.db.patch(existingFridge._id, {
        hotelName: existingFridge.hotelName ?? "The Dunes Hotel",
        area: existingFridge.area ?? "South Shore",
        assignedRestockerIds: restockerIds,
      });
    }

    const existingProducts = await ctx.db.query("products").collect();
    const productsByName = new Map(existingProducts.map((product) => [product.name, product]));

    for (const product of products) {
      const existingProduct = productsByName.get(product.name);
      if (existingProduct) {
        if (existingProduct.imageUrl !== product.imageUrl) {
          await ctx.db.patch(existingProduct._id, {
            imageUrl: product.imageUrl,
          });
          productsByName.set(product.name, {
            ...existingProduct,
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
      productsByName.set(product.name, {
        _id: productId,
        _creationTime: Date.now(),
        ...product,
        inStock: true,
        createdAt: Date.now(),
      });
    }

    if (!fridgeId) return;

    const existingStock = await ctx.db
      .query("hotelInventory")
      .withIndex("by_fridge", (q) => q.eq("fridgeId", fridgeId))
      .collect();
    const stockedProductIds = new Set(existingStock.map((row) => row.productId));

    for (const product of productsByName.values()) {
      if (stockedProductIds.has(product._id)) continue;

      await ctx.db.insert("hotelInventory", {
        fridgeId,
        productId: product._id,
        quantityAvailable: 50,
        updatedAt: Date.now(),
      });

      await ctx.db.insert("inventoryEvents", {
        fridgeId,
        productId: product._id,
        quantityDelta: 50,
        reason: "demo_seed_stock",
        actorName: "Demo Seed",
        actorType: "system",
        createdAt: Date.now(),
      });
    }
  },
});

export const repairDemoFridge = mutation({
  args: {},
  handler: async (ctx) => {
    const existingRestockers = await ctx.db.query("restockers").collect();
    let restockerIds = existingRestockers.map((restocker) => restocker._id);

    if (existingRestockers.length === 0) {
      restockerIds = [];
      for (const restocker of demoRestockers) {
        const restockerId = await ctx.db.insert("restockers", {
          ...restocker,
          active: true,
          createdAt: Date.now(),
        });
        restockerIds.push(restockerId);
      }
    }

    const existingFridge = await ctx.db
      .query("fridges")
      .withIndex("by_code", (q) => q.eq("code", "7429"))
      .unique();
    const fridgeId =
      existingFridge?._id ??
      (await ctx.db.insert("fridges", {
        code: "7429",
        name: "ChilledStock Demo Fridge",
        hotelName: "The Dunes Hotel",
        area: "South Shore",
        location: "Guest suite",
        assignedRestockerIds: restockerIds,
        status: "active",
        createdAt: Date.now(),
      }));

    if (existingFridge && !existingFridge.assignedRestockerIds?.length) {
      await ctx.db.patch(existingFridge._id, {
        hotelName: existingFridge.hotelName ?? "The Dunes Hotel",
        area: existingFridge.area ?? "South Shore",
        assignedRestockerIds: restockerIds,
      });
    }

    const existingProducts = await ctx.db.query("products").collect();
    const productsByName = new Map(existingProducts.map((product) => [product.name, product]));
    const productIds = [];

    for (const product of products) {
      const existingProduct = productsByName.get(product.name);
      if (existingProduct) {
        productIds.push(existingProduct._id);
        if (existingProduct.imageUrl !== product.imageUrl) {
          await ctx.db.patch(existingProduct._id, { imageUrl: product.imageUrl });
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

    let insertedStockRows = 0;
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
        reason: "demo_repair_stock",
        actorName: "Demo Repair",
        actorType: "system",
        createdAt: Date.now(),
      });
      insertedStockRows += 1;
    }

    return {
      fridgeId,
      productCount: productIds.length,
      insertedStockRows,
    };
  },
});

export const listDemoFridgeBlockers = query({
  args: {
    fridgeCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const fridgeCode = args.fridgeCode?.trim() || DEMO_FRIDGE_CODE;
    const fridge = await ctx.db
      .query("fridges")
      .withIndex("by_code", (q) => q.eq("code", fridgeCode))
      .unique();

    if (!fridge) {
      return {
        fridgeCode,
        fridgeId: null,
        blockers: [],
      };
    }

    const sessions = (
      await Promise.all(
        BLOCKING_SESSION_STATUSES.map((status) =>
          ctx.db
            .query("guestSessions")
            .withIndex("by_fridge_status", (q) =>
              q.eq("fridgeId", fridge._id).eq("status", status),
            )
            .collect(),
        ),
      )
    )
      .flat()
      .sort((left, right) => right.createdAt - left.createdAt);

    const blockers = await Promise.all(
      sessions.map(async (session) => {
        const [user, requests] = await Promise.all([
          ctx.db.get(session.userId),
          ctx.db
            .query("reconciliationRequests")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .collect(),
        ]);
        const latestRequest =
          requests.sort((left, right) => right.requestedAt - left.requestedAt)[0] ?? null;

        return {
          sessionId: session._id,
          userId: session.userId,
          userEmail: user?.email ?? null,
          userName: user?.name ?? null,
          status: session.status,
          createdAt: session.createdAt,
          checkedOutAt: session.checkedOutAt ?? null,
          latestRequest: latestRequest
            ? {
                id: latestRequest._id,
                type: latestRequest.type,
                status: latestRequest.status,
                requestedAt: latestRequest.requestedAt,
                completedAt: latestRequest.completedAt ?? null,
              }
            : null,
        };
      }),
    );

    return {
      fridgeCode,
      fridgeId: fridge._id,
      blockers,
    };
  },
});

export const closeDemoFridgeStaleSessions = mutation({
  args: {
    fridgeCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const fridgeCode = args.fridgeCode?.trim() || DEMO_FRIDGE_CODE;
    if (fridgeCode !== DEMO_FRIDGE_CODE) {
      throw new Error("This repair mutation is scoped to the demo fridge only.");
    }

    const fridge = await ctx.db
      .query("fridges")
      .withIndex("by_code", (q) => q.eq("code", fridgeCode))
      .unique();

    if (!fridge) {
      return {
        fridgeCode,
        fridgeId: null,
        closedSessionIds: [],
        cancelledRequestIds: [],
      };
    }

    const now = Date.now();
    const sessions = (
      await Promise.all(
        REPAIR_SESSION_STATUSES.map((status) =>
          ctx.db
            .query("guestSessions")
            .withIndex("by_fridge_status", (q) =>
              q.eq("fridgeId", fridge._id).eq("status", status),
            )
            .collect(),
        ),
      )
    ).flat();
    const closedSessionIds = [];
    const cancelledRequestIds = [];

    for (const session of sessions) {
      const requests = await ctx.db
        .query("reconciliationRequests")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const request of requests) {
        if (!OPEN_REQUEST_STATUSES.has(request.status)) continue;

        await ctx.db.patch(request._id, {
          status: "cancelled",
          completedAt: now,
        });
        cancelledRequestIds.push(request._id);
      }

      await ctx.db.patch(session._id, {
        status: "checked_out",
        checkedOutAt: now,
      });
      closedSessionIds.push(session._id);
    }

    return {
      fridgeCode,
      fridgeId: fridge._id,
      closedSessionIds,
      cancelledRequestIds,
    };
  },
});
