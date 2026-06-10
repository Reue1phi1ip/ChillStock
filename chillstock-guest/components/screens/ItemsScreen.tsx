"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { AppShell } from "@/components/layout/AppShell";
import { useAppContext, type CartItem, type Product } from "@/components/providers/AppProvider";
import { guestTypography } from "@/components/shared/guestTypography";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MenuKind } from "@/lib/catalog";
import { cn, formatCurrency } from "@/lib/utils";

function iconForProductType(type: string): IconName {
  const normalized = type.toLowerCase();
  if (normalized.includes("wine")) return "wine";
  if (normalized.includes("water") || normalized.includes("mixer")) return "droplet";
  if (normalized.includes("beer")) return "beer";
  return "shopping-bag";
}

function categoryLabel(type: string) {
  return type
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function groupedCatalog(products: Product[]) {
  const groups = new Map<string, Product[]>();

  for (const product of products) {
    const key = product.type || "other";
    groups.set(key, [...(groups.get(key) ?? []), product]);
  }

  return Array.from(groups.entries()).sort((left, right) => left[0].localeCompare(right[0]));
}

const menuCopy: Record<
  MenuKind,
  {
    cartHref: string;
    cartLabel: string;
    eyebrow: string;
    emptyMessage: string;
    requestHref: string;
    requestLabel: string;
    title: string;
  }
> = {
  main: {
    cartHref: "/restockcart",
    cartLabel: "Restock cart",
    eyebrow: "Main menu",
    emptyMessage: "No main menu items are available right now.",
    requestHref: "/restock",
    requestLabel: "View restock",
    title: "Menu",
  },
  addons: {
    cartHref: "/addonscart",
    cartLabel: "Add-On cart",
    eyebrow: "Add-ons",
    emptyMessage: "No add-ons are available right now.",
    requestHref: "/addons",
    requestLabel: "View add-ons",
    title: "Add-Ons",
  },
};

function ProductCard({
  addLabel,
  onAdd,
  onDecrement,
  onIncrement,
  product,
  quantity,
}: {
  addLabel: string;
  onAdd: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
  product: Product;
  quantity: number;
}) {
  const productIcon = iconForProductType(product.type);

  return (
    <Card className="overflow-hidden rounded-[1.7rem] p-0" key={product.id}>
      <div
        className={cn(
          "relative flex h-24 items-center justify-center sm:h-28",
          product.imageColor || "bg-amber-100",
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_58%)]" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-[1rem] border border-white/50 bg-white/70 text-slate-900 shadow-[0_16px_30px_rgba(74,88,118,0.1)] backdrop-blur sm:h-14 sm:w-14">
          <Icon name={productIcon} size={24} strokeWidth={1.7} />
        </div>
      </div>

      <div className="space-y-2.5 p-2.5">
        <div className="space-y-0.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-slate-950">{product.name}</h3>
          <p className="text-xs font-semibold text-slate-600">{formatCurrency(product.price)}</p>
        </div>

        {quantity > 0 ? (
          <div className="inline-flex w-full items-center justify-between rounded-[1rem] border border-slate-200 bg-slate-50">
            <button
              className="h-10 w-10 text-lg font-bold text-slate-700"
              onClick={onDecrement}
              type="button"
            >
              -
            </button>
            <span className="text-center text-sm font-semibold text-slate-950">{quantity}</span>
            <button
              className="h-10 w-10 text-lg font-bold text-slate-700"
              onClick={onIncrement}
              type="button"
            >
              +
            </button>
          </div>
        ) : (
          <Button className="h-10 w-full px-3 py-2 text-sm" onClick={onAdd}>
            {addLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}

function countForProduct(cartItems: CartItem[], productId: string) {
  return cartItems.find((item) => item.productId === productId)?.quantity ?? 0;
}

export function ItemsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeMenu: MenuKind = searchParams.get("menu") === "addons" ? "addons" : "main";
  const {
    mainMenuInventory,
    addOnInventory,
    cartItems,
    cartCount,
    addOnCartItems,
    addOnCartCount,
    addToCart,
    addToAddOnCart,
    setCartQuantity,
    setAddOnCartQuantity,
    activeRestockRequest,
    activeAddOnRequest,
  } = useAppContext();
  const products = activeMenu === "main" ? mainMenuInventory : addOnInventory;
  const activeCartItems = activeMenu === "main" ? cartItems : addOnCartItems;
  const activeCartCount = activeMenu === "main" ? cartCount : addOnCartCount;
  const activeRequest = activeMenu === "main" ? activeRestockRequest : activeAddOnRequest;
  const copy = menuCopy[activeMenu];
  const groups = groupedCatalog(products);

  const handleMenuChange = (menu: MenuKind) => {
    router.replace(menu === "addons" ? "/items?menu=addons" : "/items");
  };

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <section className="rounded-[1.3rem] bg-transparent p-2 sm:p-2.5">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className={guestTypography.eyebrowAccent}>{copy.eyebrow}</p>
                <h1 className={guestTypography.pageTitle}>{copy.title}</h1>
              </div>

              {activeRequest ? (
                <Link
                  className="rounded-[1rem] border border-teal-200/70 bg-white/28 px-3 py-2 text-right shadow-[0_10px_22px_rgba(108,123,153,0.12)] backdrop-blur-[8px]"
                  href={copy.requestHref}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Open</p>
                  <p className="mt-1 text-sm font-semibold text-teal-950">{copy.requestLabel}</p>
                </Link>
              ) : null}
            </div>
            <p className={guestTypography.caption}>
                {activeMenu === "main" ? "For restocks and refreshes." : "Extra premium items already in stock."}
              </p>
            <div className="grid grid-cols-2 gap-1.5 rounded-[1rem] border border-white/40 bg-white/18 p-1 backdrop-blur-[6px]">
              <button
                className={cn(
                  "rounded-[0.85rem] px-2.5 py-2 text-xs font-semibold transition",
                  activeMenu === "main"
                    ? "bg-teal-600 text-white shadow-[0_10px_22px_rgba(16,150,138,0.2)]"
                    : "text-slate-600 hover:bg-white/75 hover:text-slate-950",
                )}
                onClick={() => handleMenuChange("main")}
                type="button"
              >
                Main Menu
              </button>
              <button
                className={cn(
                  "rounded-[1.1rem] px-3 py-2.5 text-sm font-semibold transition",
                  activeMenu === "addons"
                    ? "bg-teal-600 text-white shadow-[0_10px_22px_rgba(16,150,138,0.2)]"
                    : "text-slate-600 hover:bg-white/75 hover:text-slate-950",
                )}
                onClick={() => handleMenuChange("addons")}
                type="button"
              >
                Add-Ons
              </button>
            </div>
          </div>
        </section>

        {groups.length === 0 ? (
          <Card className="rounded-[1.8rem]">
            <p className="text-sm text-slate-500">{copy.emptyMessage}</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {groups.map(([type, groupedProducts]) => (
              <section className="space-y-3" key={type}>
                <div className="space-y-1">
                  <p className={guestTypography.eyebrowMuted}>Category</p>
                  <h2 className={guestTypography.sectionTitle}>{categoryLabel(type)}</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {groupedProducts.map((product) => {
                    const quantity = countForProduct(activeCartItems, product.id);

                    return (
                      <ProductCard
                        addLabel={activeMenu === "main" ? "Add" : "Add-On"}
                        key={product.id}
                        onAdd={() =>
                          activeMenu === "main" ? addToCart(product.id) : addToAddOnCart(product.id)
                        }
                        onDecrement={() =>
                          activeMenu === "main"
                            ? setCartQuantity(product.id, quantity - 1)
                            : setAddOnCartQuantity(product.id, quantity - 1)
                        }
                        onIncrement={() =>
                          activeMenu === "main"
                            ? setCartQuantity(product.id, quantity + 1)
                            : setAddOnCartQuantity(product.id, quantity + 1)
                        }
                        product={product}
                        quantity={quantity}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="pointer-events-none fixed inset-x-0 bottom-[5.75rem] z-20 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-xl">
            <Link
              className={cn(
                "flex items-center justify-between gap-3 rounded-[1.8rem] border px-5 py-4 shadow-[0_20px_46px_rgba(108,123,153,0.18)] backdrop-blur-[18px] transition",
                activeCartCount > 0
                  ? "border-teal-300 bg-[linear-gradient(135deg,#0f847f_0%,#16988f_56%,#19a89f_100%)] text-white"
                  : "border-white/65 bg-white/82 text-slate-500",
              )}
              href={copy.cartHref}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Cart</p>
                <p className="mt-1 text-sm font-semibold">
                  {activeCartCount > 0 ? `${activeCartCount} items selected` : copy.cartLabel}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{activeCartCount > 0 ? "View Cart" : "Open Cart"}</span>
                <Icon name="arrow-right" size={18} />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
