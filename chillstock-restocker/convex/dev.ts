import { mutation } from "./_generated/server";

const products = [
  {
    name: "Craft IPA",
    type: "Beer",
    priceCents: 450,
    description: "A heavily dry-hopped New England style IPA.",
    abv: "6.5%",
    volume: "330ml",
    imageColor: "bg-amber-100",
  },
  {
    name: "Premium Lager",
    type: "Beer",
    priceCents: 380,
    description: "Classic crisp lager served ice cold.",
    abv: "5.0%",
    volume: "330ml",
    imageColor: "bg-yellow-100",
  },
  {
    name: "Pilsner Select",
    type: "Beer",
    priceCents: 410,
    description: "Clean and bright pilsner with a dry finish.",
    abv: "4.8%",
    volume: "330ml",
    imageColor: "bg-amber-50",
  },
  {
    name: "Wheat Ale",
    type: "Beer",
    priceCents: 470,
    description: "Smooth wheat ale with citrus peel notes.",
    abv: "5.2%",
    volume: "330ml",
    imageColor: "bg-orange-100",
  },
  {
    name: "Pinot Noir Reserve",
    type: "Wine",
    priceCents: 1800,
    description: "Elegant and medium-bodied with aromas of ripe cherry.",
    abv: "13.5%",
    volume: "750ml",
    imageColor: "bg-rose-100",
  },
  {
    name: "Sauvignon Blanc",
    type: "Wine",
    priceCents: 1600,
    description: "Crisp white wine with citrus and tropical fruit notes.",
    abv: "12.5%",
    volume: "750ml",
    imageColor: "bg-lime-100",
  },
  {
    name: "Cabernet Sauvignon Estate",
    type: "Wine",
    priceCents: 2100,
    description: "Bold red wine with dark fruit and cedar notes.",
    abv: "14.0%",
    volume: "750ml",
    imageColor: "bg-red-100",
  },
  {
    name: "Rose Cuvee",
    type: "Wine",
    priceCents: 1500,
    description: "Dry rose with strawberry and floral aromatics.",
    abv: "12.0%",
    volume: "750ml",
    imageColor: "bg-pink-100",
  },
  {
    name: "Small Batch Gin",
    type: "Spirits",
    priceCents: 2400,
    description: "Juniper-forward gin for elevated minibar serves.",
    abv: "40%",
    volume: "375ml",
    imageColor: "bg-slate-100",
  },
  {
    name: "Aged Whisky",
    type: "Spirits",
    priceCents: 2900,
    description: "Oak-aged whisky with vanilla and smoke notes.",
    abv: "43%",
    volume: "375ml",
    imageColor: "bg-amber-200",
  },
  {
    name: "Reposado Tequila",
    type: "Spirits",
    priceCents: 2600,
    description: "Smooth tequila aged in oak barrels.",
    abv: "40%",
    volume: "375ml",
    imageColor: "bg-yellow-200",
  },
  {
    name: "Artisan Sparkling Water",
    type: "Water",
    priceCents: 250,
    description: "Locally sourced sparkling mineral water.",
    volume: "500ml",
    imageColor: "bg-blue-100",
  },
  {
    name: "Still Mineral Water",
    type: "Water",
    priceCents: 220,
    description: "Premium still water for in-room refreshment.",
    volume: "500ml",
    imageColor: "bg-cyan-100",
  },
  {
    name: "Cola Mixer",
    type: "Mixer",
    priceCents: 220,
    description: "Classic cola bottle for spirit pairings.",
    volume: "250ml",
    imageColor: "bg-amber-100",
  },
  {
    name: "Tonic Mixer",
    type: "Mixer",
    priceCents: 240,
    description: "Crisp tonic water for gin and vodka pairings.",
    volume: "250ml",
    imageColor: "bg-lime-100",
  },
  {
    name: "Ginger Ale Mixer",
    type: "Mixer",
    priceCents: 230,
    description: "Lightly spiced ginger ale for classic serves.",
    volume: "250ml",
    imageColor: "bg-orange-100",
  },
  {
    name: "Sparkling Apple Soda",
    type: "Soft Drink",
    priceCents: 280,
    description: "Lightly sweet sparkling apple drink.",
    volume: "330ml",
    imageColor: "bg-green-100",
  },
  {
    name: "Citrus Soda",
    type: "Soft Drink",
    priceCents: 270,
    description: "Refreshing citrus soda served chilled.",
    volume: "330ml",
    imageColor: "bg-yellow-100",
  },
  {
    name: "Sea Salt Chips",
    type: "Snack",
    priceCents: 320,
    description: "Hand-cooked chips with sea salt.",
    volume: "40g",
    imageColor: "bg-orange-100",
  },
  {
    name: "Dark Chocolate Bar",
    type: "Snack",
    priceCents: 480,
    description: "72% cocoa dark chocolate with citrus finish.",
    volume: "90g",
    imageColor: "bg-stone-200",
  },
  {
    name: "Smoked Almonds",
    type: "Snack",
    priceCents: 520,
    description: "Roasted almonds with a light smoked finish.",
    volume: "80g",
    imageColor: "bg-amber-200",
  },
  {
    name: "Pretzel Bites",
    type: "Snack",
    priceCents: 360,
    description: "Salted pretzel bites ideal for pairing.",
    volume: "70g",
    imageColor: "bg-amber-100",
  },
  {
    name: "Trail Mix",
    type: "Snack",
    priceCents: 440,
    description: "Mixed nuts and dried fruit blend.",
    volume: "85g",
    imageColor: "bg-orange-200",
  },
] as const;

const demoRestockers = [
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
      .withIndex("by_code", (q) => q.eq("code", "demo-fridge"))
      .unique();
    let fridgeId = existingFridge?._id;

    if (!existingFridge) {
      fridgeId = await ctx.db.insert("fridges", {
        code: "demo-fridge",
        name: "ChillStock Demo Fridge",
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
      if (productsByName.has(product.name)) continue;
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
