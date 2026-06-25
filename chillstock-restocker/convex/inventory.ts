import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

const inventorySelectionValidator = v.object({
  productId: v.id("products"),
  quantity: v.number(),
});
const fridgeStatusValidator = v.union(v.literal("active"), v.literal("inactive"));

export type InventorySelection = {
  productId: Id<"products">;
  quantity: number;
};

export type LoggedInventorySelection = {
  productId: Id<"products">;
  name: string;
  type: string;
  unitPriceCents: number;
  quantity: number;
};

export type InventoryShortage = {
  availableQuantity: number;
  productId: Id<"products">;
  productName: string;
  requestedQuantity: number;
};

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Inventory quantities must be greater than zero");
  }

  return Math.floor(quantity);
}

function trimOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function getHotelStockRows(ctx: QueryCtx) {
  const [products, stockRows, fridges] = await Promise.all([
    ctx.db.query("products").collect(),
    ctx.db.query("hotelInventory").collect(),
    ctx.db.query("fridges").collect(),
  ]);

  return stockRows
    .map((row) => {
      const product = products.find((entry) => entry._id === row.productId);
      const fridge = fridges.find((entry) => entry._id === row.fridgeId);
      if (!product || !fridge) return null;

      return {
        id: `${row.fridgeId}:${row.productId}`,
        fridgeId: row.fridgeId,
        productId: row.productId,
        hotelName: fridge.hotelName ?? fridge.name,
        area: fridge.area ?? "Unmapped area",
        name: product.name,
        type: product.type,
        priceCents: product.priceCents,
        quantityAvailable: row.quantityAvailable,
        lowStock: row.quantityAvailable <= 2 || !product.inStock,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((left, right) => {
      if (left.hotelName !== right.hotelName) {
        return left.hotelName.localeCompare(right.hotelName);
      }
      if (left.lowStock !== right.lowStock) {
        return Number(right.lowStock) - Number(left.lowStock);
      }
      return left.name.localeCompare(right.name);
    });
}

export async function buildRequestInventory(ctx: QueryCtx, requestId: Id<"reconciliationRequests">) {
  const request = await ctx.db.get(requestId);
  if (!request) return null;

  const fridge = await ctx.db.get(request.fridgeId);
  const [products, stockRows] = await Promise.all([
    ctx.db.query("products").collect(),
    ctx.db
      .query("hotelInventory")
      .withIndex("by_fridge", (q) => q.eq("fridgeId", request.fridgeId))
      .collect(),
  ]);

  const stockByProduct = new Map(
    stockRows.map((row) => [row.productId, row.quantityAvailable] as const),
  );

  return {
    request,
    fridge,
    products: products
      .map((product) => ({
        id: product._id,
        name: product.name,
        type: product.type,
        priceCents: product.priceCents,
        description: product.description,
        volume: product.volume,
        availableQuantity: stockByProduct.get(product._id) ?? 0,
      }))
      .sort((left, right) => {
        if (left.type !== right.type) return left.type.localeCompare(right.type);
        return left.name.localeCompare(right.name);
      }),
  };
}

export async function buildGuestCatalog(ctx: QueryCtx, fridgeId: Id<"fridges">) {
  const [products, stockRows] = await Promise.all([
    ctx.db.query("products").collect(),
    ctx.db
      .query("hotelInventory")
      .withIndex("by_fridge", (q) => q.eq("fridgeId", fridgeId))
      .collect(),
  ]);

  const visibleProductIds = new Set(
    stockRows.filter((row) => row.quantityAvailable > 0).map((row) => row.productId),
  );

  return products
    .filter((product) => visibleProductIds.has(product._id) && product.inStock)
    .map((product) => ({
      id: product._id,
      name: product.name,
      type: product.type,
      priceCents: product.priceCents,
      imageColor: product.imageColor,
      imageUrl: product.imageUrl,
    }))
    .sort((left, right) => {
      if (left.type !== right.type) return left.type.localeCompare(right.type);
      return left.name.localeCompare(right.name);
    });
}

async function mapSelectionsToProducts(
  ctx: QueryCtx | MutationCtx,
  selections: InventorySelection[],
) {
  const normalized = selections
    .filter((selection) => selection.quantity > 0)
    .map((selection) => ({
      ...selection,
      quantity: normalizeQuantity(selection.quantity),
    }));

  const products = await Promise.all(
    normalized.map((selection) => ctx.db.get(selection.productId)),
  );

  return normalized.map((selection, index) => {
    const product = products[index];
    if (!product) throw new Error("Inventory item not found");

    return {
      productId: selection.productId,
      name: product.name,
      type: product.type,
      unitPriceCents: product.priceCents,
      quantity: selection.quantity,
    };
  });
}

export async function resolveConsumedSelections(
  ctx: QueryCtx | MutationCtx,
  selections: InventorySelection[],
) {
  return await mapSelectionsToProducts(ctx, selections);
}

export async function resolveAddedSelections(
  ctx: MutationCtx,
  args: {
    actorName: string;
    fridgeId: Id<"fridges">;
    reconciliationRequestId: Id<"reconciliationRequests">;
    selections: InventorySelection[];
  },
) {
  const mappedSelections = await mapSelectionsToProducts(ctx, args.selections);
  const stockRows = await ctx.db
    .query("hotelInventory")
    .withIndex("by_fridge", (q) => q.eq("fridgeId", args.fridgeId))
    .collect();
  const stockByProduct = new Map(
    stockRows.map((row) => [row.productId, row] as const),
  );

  const loggedItems: LoggedInventorySelection[] = [];
  const shortages: InventoryShortage[] = [];

  for (const item of mappedSelections) {
    const stockRow = stockByProduct.get(item.productId);
    const availableQuantity = stockRow?.quantityAvailable ?? 0;
    const loggedQuantity = Math.min(item.quantity, availableQuantity);

    if (loggedQuantity > 0) {
      loggedItems.push({ ...item, quantity: loggedQuantity });

      if (stockRow) {
        await ctx.db.patch(stockRow._id, {
          quantityAvailable: stockRow.quantityAvailable - loggedQuantity,
          updatedAt: Date.now(),
        });
      }

      await ctx.db.insert("inventoryEvents", {
        fridgeId: args.fridgeId,
        productId: item.productId,
        quantityDelta: loggedQuantity * -1,
        reason: "restock_added_to_guest_fridge",
        actorName: args.actorName,
        actorType: "restocker",
        reconciliationRequestId: args.reconciliationRequestId,
        createdAt: Date.now(),
      });
    }

    if (loggedQuantity < item.quantity) {
      shortages.push({
        productId: item.productId,
        productName: item.name,
        requestedQuantity: item.quantity,
        availableQuantity,
      });
    }
  }

  return { loggedItems, shortages };
}

export const getRequestInventory = query({
  args: { requestId: v.id("reconciliationRequests") },
  handler: async (ctx, args) => {
    return await buildRequestInventory(ctx, args.requestId);
  },
});

export const getGuestCatalog = query({
  args: { fridgeId: v.id("fridges") },
  handler: async (ctx, args) => {
    return await buildGuestCatalog(ctx, args.fridgeId);
  },
});

export const listFridges = query({
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

export const saveFridge = mutation({
  args: {
    fridgeId: v.optional(v.id("fridges")),
    code: v.string(),
    name: v.string(),
    hotelName: v.optional(v.string()),
    area: v.optional(v.string()),
    location: v.optional(v.string()),
    status: fridgeStatusValidator,
  },
  handler: async (ctx, args) => {
    const code = args.code.trim();
    const name = args.name.trim();
    if (!code) throw new Error("Fridge code is required");
    if (!name) throw new Error("Fridge name is required");

    const existingByCode = await ctx.db
      .query("fridges")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (existingByCode && existingByCode._id !== args.fridgeId) {
      throw new Error("Another fridge already uses this code");
    }

    const payload = {
      code,
      name,
      hotelName: trimOptional(args.hotelName),
      area: trimOptional(args.area),
      location: trimOptional(args.location),
      status: args.status,
    };

    if (args.fridgeId) {
      const fridge = await ctx.db.get(args.fridgeId);
      if (!fridge) throw new Error("Fridge not found");
      await ctx.db.patch(args.fridgeId, payload);
      return args.fridgeId;
    }

    return await ctx.db.insert("fridges", {
      ...payload,
      createdAt: Date.now(),
    });
  },
});

export const createCatalogItem = mutation({
  args: {
    fridgeId: v.id("fridges"),
    name: v.string(),
    type: v.string(),
    priceCents: v.number(),
    description: v.string(),
    volume: v.string(),
    abv: v.optional(v.string()),
    imageColor: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    initialQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const quantity = normalizeQuantity(args.initialQuantity);
    const existing = await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", args.name.trim()))
      .unique();
    if (existing) {
      throw new Error("An inventory item with this name already exists");
    }

    const productId = await ctx.db.insert("products", {
      name: args.name.trim(),
      type: args.type.trim(),
      priceCents: args.priceCents,
      description: args.description.trim(),
      abv: args.abv?.trim() || undefined,
      volume: args.volume.trim(),
      imageColor: args.imageColor?.trim() || "bg-amber-100",
      imageUrl: trimOptional(args.imageUrl),
      inStock: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("hotelInventory", {
      fridgeId: args.fridgeId,
      productId,
      quantityAvailable: quantity,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("inventoryEvents", {
      fridgeId: args.fridgeId,
      productId,
      quantityDelta: quantity,
      reason: "catalog_item_created",
      actorName: "Management",
      actorType: "manager",
      createdAt: Date.now(),
    });

    return productId;
  },
});

export const increaseHotelStock = mutation({
  args: {
    fridgeId: v.id("fridges"),
    productId: v.id("products"),
    quantity: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const quantity = normalizeQuantity(args.quantity);
    const existing = await ctx.db
      .query("hotelInventory")
      .withIndex("by_fridge_product", (q) =>
        q.eq("fridgeId", args.fridgeId).eq("productId", args.productId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantityAvailable: existing.quantityAvailable + quantity,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("hotelInventory", {
        fridgeId: args.fridgeId,
        productId: args.productId,
        quantityAvailable: quantity,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("inventoryEvents", {
      fridgeId: args.fridgeId,
      productId: args.productId,
      quantityDelta: quantity,
      reason: args.reason?.trim() || "manual_stock_increase",
      actorName: "Management",
      actorType: "manager",
      createdAt: Date.now(),
    });
  },
});
