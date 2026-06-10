export type MenuKind = "main" | "addons";

const ADD_ON_PRODUCT_NAMES = new Set([
  "Pinot Noir Reserve",
  "Sauvignon Blanc",
  "Cabernet Sauvignon Estate",
  "Rose Cuvee",
  "Small Batch Gin",
  "Aged Whisky",
  "Reposado Tequila",
]);

export function menuKindForProduct(product: { name: string }): MenuKind {
  return ADD_ON_PRODUCT_NAMES.has(product.name) ? "addons" : "main";
}

export function isAddOnProduct(product: { name: string }) {
  return menuKindForProduct(product) === "addons";
}

export function isMainMenuProduct(product: { name: string }) {
  return menuKindForProduct(product) === "main";
}
