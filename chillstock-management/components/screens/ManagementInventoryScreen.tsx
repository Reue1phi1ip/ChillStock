"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableShell, TBody, TD, TH, THead } from "@/components/ui/table";
import { Tabs, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

function toneForStatus(lowStock: boolean) {
  return lowStock
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function toneForFridgeStatus(status: "active" | "inactive") {
  return status === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-100 text-slate-600";
}

type FridgeDraft = {
  fridgeId: Id<"fridges"> | "";
  code: string;
  name: string;
  hotelName: string;
  area: string;
  location: string;
  status: "active" | "inactive";
};

const emptyFridgeDraft: FridgeDraft = {
  fridgeId: "",
  code: "",
  name: "",
  hotelName: "",
  area: "",
  location: "",
  status: "active",
};

type FridgeListItem = {
  id: Id<"fridges">;
  code: string;
  name: string;
  hotelName: string;
  area: string;
  location: string;
  status: "active" | "inactive";
};

type InventoryView = "stock" | "fridges";

export function ManagementInventoryScreen() {
  const dashboard = useQuery(api.tickets.listManagementDashboard);
  const fridges = (useQuery(api.inventory.listFridges) ?? []) as FridgeListItem[];
  const createCatalogItem = useMutation(api.inventory.createCatalogItem);
  const increaseHotelStock = useMutation(api.inventory.increaseHotelStock);
  const saveFridge = useMutation(api.inventory.saveFridge);
  const [activeView, setActiveView] = useState<InventoryView>("stock");
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isFridgeOpen, setIsFridgeOpen] = useState(false);
  const [fridgeError, setFridgeError] = useState("");
  const [catalogDraft, setCatalogDraft] = useState({
    fridgeId: "" as Id<"fridges"> | "",
    name: "",
    type: "Wine",
    price: "12.00",
    description: "",
    volume: "750 ml",
    abv: "",
    initialQuantity: "8",
  });
  const [stockDraft, setStockDraft] = useState({
    fridgeId: "" as Id<"fridges"> | "",
    productId: "" as Id<"products"> | "",
    quantity: "6",
    reason: "",
  });
  const [fridgeDraft, setFridgeDraft] = useState<FridgeDraft>(emptyFridgeDraft);
  const [busyState, setBusyState] = useState<"catalog" | "stock" | "fridge" | null>(null);

  useEffect(() => {
    if (!fridges.length || catalogDraft.fridgeId) return;
    setCatalogDraft((current) => ({ ...current, fridgeId: fridges[0].id }));
  }, [catalogDraft.fridgeId, fridges]);

  useEffect(() => {
    if (!dashboard?.stockLevels?.length || (stockDraft.fridgeId && stockDraft.productId)) return;
    const firstRow = dashboard.stockLevels[0];
    setStockDraft((current) => ({
      ...current,
      fridgeId: firstRow.fridgeId,
      productId: firstRow.productId,
    }));
  }, [dashboard?.stockLevels, stockDraft.fridgeId, stockDraft.productId]);

  const selectedStockRowId = useMemo(() => {
    return (
      dashboard?.stockLevels?.find(
        (row) => row.fridgeId === stockDraft.fridgeId && row.productId === stockDraft.productId,
      )?.id ?? ""
    );
  }, [dashboard?.stockLevels, stockDraft.fridgeId, stockDraft.productId]);

  const totalRows = dashboard?.stockLevels?.length ?? 0;
  const totalQuantity = (dashboard?.stockLevels ?? []).reduce(
    (sum, row) => sum + row.quantityAvailable,
    0,
  );
  const lowStockCount = (dashboard?.stockLevels ?? []).filter((row) => row.lowStock).length;
  const activeFridgeCount = fridges.filter((fridge) => fridge.status === "active").length;
  const inactiveFridgeCount = fridges.length - activeFridgeCount;

  const resetFridgeDialog = () => {
    setFridgeDraft(emptyFridgeDraft);
    setFridgeError("");
  };

  const handleCreateCatalogItem = async () => {
    if (!catalogDraft.fridgeId) return;
    setBusyState("catalog");
    try {
      await createCatalogItem({
        fridgeId: catalogDraft.fridgeId,
        name: catalogDraft.name,
        type: catalogDraft.type,
        priceCents: Math.round(Number(catalogDraft.price || "0") * 100),
        description: catalogDraft.description,
        volume: catalogDraft.volume,
        abv: catalogDraft.abv || undefined,
        initialQuantity: Number(catalogDraft.initialQuantity || "0"),
      });
      setCatalogDraft((current) => ({
        ...current,
        name: "",
        description: "",
        abv: "",
        price: "12.00",
        initialQuantity: "8",
      }));
      setIsCatalogOpen(false);
    } finally {
      setBusyState(null);
    }
  };

  const handleIncreaseStock = async () => {
    if (!stockDraft.fridgeId || !stockDraft.productId) return;
    setBusyState("stock");
    try {
      await increaseHotelStock({
        fridgeId: stockDraft.fridgeId,
        productId: stockDraft.productId,
        quantity: Number(stockDraft.quantity || "0"),
        reason: stockDraft.reason || undefined,
      });
      setStockDraft((current) => ({
        ...current,
        quantity: "6",
        reason: "",
      }));
      setIsStockOpen(false);
    } finally {
      setBusyState(null);
    }
  };

  const openCreateFridge = () => {
    resetFridgeDialog();
    setIsFridgeOpen(true);
  };

  const openEditFridge = (fridge: (typeof fridges)[number]) => {
    setFridgeError("");
    setFridgeDraft({
      fridgeId: fridge.id,
      code: fridge.code,
      name: fridge.name,
      hotelName: fridge.hotelName,
      area: fridge.area === "Unmapped area" ? "" : fridge.area,
      location: fridge.location === "Guest suite" ? "" : fridge.location,
      status: fridge.status,
    });
    setIsFridgeOpen(true);
  };

  const handleSaveFridge = async () => {
    setBusyState("fridge");
    setFridgeError("");
    try {
      await saveFridge({
        fridgeId: fridgeDraft.fridgeId || undefined,
        code: fridgeDraft.code,
        name: fridgeDraft.name,
        hotelName: fridgeDraft.hotelName || undefined,
        area: fridgeDraft.area || undefined,
        location: fridgeDraft.location || undefined,
        status: fridgeDraft.status,
      });
      setIsFridgeOpen(false);
      resetFridgeDialog();
    } catch (error) {
      setFridgeError(error instanceof Error ? error.message : "We could not save this fridge.");
    } finally {
      setBusyState(null);
    }
  };

  return (
    <AppShell eyebrow="Warehouse inventory and catalog controls">
      <div className="space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              Management inventory
            </p>
            <h1 className="font-display text-5xl font-semibold tracking-tight text-slate-950">
              Inventory operations
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
              Manage minibar stock, create inventory items, and keep your fridge registry accurate
              from one operational workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {activeView === "fridges" ? (
              <Button onClick={openCreateFridge} size="sm">
                New fridge
              </Button>
            ) : (
              <>
                <Button onClick={() => setIsCatalogOpen(true)} size="sm" variant="secondary">
                  New inventory item
                </Button>
                <Button onClick={() => setIsStockOpen(true)} size="sm">
                  Increase stock
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Fridges
            </p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">
              {fridges.length}
            </p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Stock rows
            </p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">
              {totalRows}
            </p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Low stock rows
            </p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">
              {lowStockCount}
            </p>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Total quantity
            </p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">
              {totalQuantity}
            </p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Active fridges
            </p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">
              {activeFridgeCount}
            </p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Inactive fridges
            </p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">
              {inactiveFridgeCount}
            </p>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Inventory workspace
              </p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-950">
                {activeView === "stock" ? "Stock by fridge" : "Fridge management"}
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                {activeView === "stock"
                  ? "Review current stock levels and update inventory counts by fridge."
                  : "Create, review, and edit fridge records without the prototype testing tools."}
              </p>
            </div>
            <Tabs>
              <TabsTrigger onClick={() => setActiveView("stock")} selected={activeView === "stock"}>
                Stock
              </TabsTrigger>
              <TabsTrigger
                onClick={() => setActiveView("fridges")}
                selected={activeView === "fridges"}
              >
                Fridges
              </TabsTrigger>
            </Tabs>
          </div>

          {activeView === "stock" ? (
            <TableShell>
              <Table>
                <THead>
                  <tr>
                    <TH>Item</TH>
                    <TH>Type</TH>
                    <TH>Hotel / Warehouse</TH>
                    <TH>Area</TH>
                    <TH>Unit price</TH>
                    <TH>Available</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {(dashboard?.stockLevels ?? []).map((row) => (
                    <tr className="transition hover:bg-[rgba(238,247,242,0.88)]" key={row.id}>
                      <TD>
                        <span className="font-semibold text-slate-950">{row.name}</span>
                      </TD>
                      <TD>{row.type}</TD>
                      <TD>{row.hotelName}</TD>
                      <TD>{row.area}</TD>
                      <TD>{formatCurrency(row.priceCents / 100)}</TD>
                      <TD>{row.quantityAvailable}</TD>
                      <TD>
                        <Badge className={toneForStatus(row.lowStock)}>
                          {row.lowStock ? "low stock" : "stable"}
                        </Badge>
                      </TD>
                    </tr>
                  ))}
                  {(dashboard?.stockLevels ?? []).length === 0 && (
                    <tr>
                      <TD className="py-8 text-center text-sm text-slate-500" colSpan={7}>
                        No inventory rows found yet.
                      </TD>
                    </tr>
                  )}
                </TBody>
              </Table>
            </TableShell>
          ) : (
            <TableShell>
              <Table>
                <THead>
                  <tr>
                    <TH>Hotel</TH>
                    <TH>Fridge name</TH>
                    <TH>Code</TH>
                    <TH>Location</TH>
                    <TH>Area</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Action</TH>
                  </tr>
                </THead>
                <TBody>
                  {fridges.map((fridge) => (
                    <tr className="transition hover:bg-[rgba(238,247,242,0.88)]" key={fridge.id}>
                      <TD>
                        <span className="font-semibold text-slate-950">{fridge.hotelName}</span>
                      </TD>
                      <TD>{fridge.name}</TD>
                      <TD>
                        <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {fridge.code}
                        </span>
                      </TD>
                      <TD>{fridge.location}</TD>
                      <TD>{fridge.area}</TD>
                      <TD>
                        <Badge className={toneForFridgeStatus(fridge.status)}>{fridge.status}</Badge>
                      </TD>
                      <TD className="text-right">
                        <Button onClick={() => openEditFridge(fridge)} size="sm" variant="secondary">
                          Edit
                        </Button>
                      </TD>
                    </tr>
                  ))}
                  {fridges.length === 0 && (
                    <tr>
                      <TD className="py-8 text-center text-sm text-slate-500" colSpan={7}>
                        No fridges have been set up yet.
                      </TD>
                    </tr>
                  )}
                </TBody>
              </Table>
            </TableShell>
          )}
        </section>
      </div>

      <Dialog
        onClose={() => {
          setIsFridgeOpen(false);
          resetFridgeDialog();
        }}
        open={isFridgeOpen}
      >
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Fridge registry
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950">
              {fridgeDraft.fridgeId ? "Edit fridge" : "Create fridge"}
            </h2>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fridge code
              </label>
              <Input
                onChange={(event) =>
                  setFridgeDraft((current) => ({ ...current, code: event.target.value }))
                }
                placeholder="grand-hotel-402"
                value={fridgeDraft.code}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Status
              </label>
              <Select
                onChange={(event) =>
                  setFridgeDraft((current) => ({
                    ...current,
                    status: event.target.value as "active" | "inactive",
                  }))
                }
                value={fridgeDraft.status}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fridge name
              </label>
              <Input
                onChange={(event) =>
                  setFridgeDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Room 402 minibar"
                value={fridgeDraft.name}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Hotel
              </label>
              <Input
                onChange={(event) =>
                  setFridgeDraft((current) => ({ ...current, hotelName: event.target.value }))
                }
                placeholder="Grand Hotel"
                value={fridgeDraft.hotelName}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Area
              </label>
              <Input
                onChange={(event) =>
                  setFridgeDraft((current) => ({ ...current, area: event.target.value }))
                }
                placeholder="West wing"
                value={fridgeDraft.area}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Location
              </label>
              <Input
                onChange={(event) =>
                  setFridgeDraft((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="Guest suite 402"
                value={fridgeDraft.location}
              />
            </div>
          </div>
          {fridgeError ? <p className="text-sm font-semibold text-red-600">{fridgeError}</p> : null}
          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={() => {
                setIsFridgeOpen(false);
                resetFridgeDialog();
              }}
              size="md"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button disabled={busyState === "fridge"} onClick={handleSaveFridge} size="md">
              {busyState === "fridge" ? "Saving..." : fridgeDraft.fridgeId ? "Save fridge" : "Create fridge"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog onClose={() => setIsCatalogOpen(false)} open={isCatalogOpen}>
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Inventory catalog
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950">
              Create inventory item
            </h2>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fridge
              </label>
              <Select
                onChange={(event) =>
                  setCatalogDraft((current) => ({
                    ...current,
                    fridgeId: event.target.value as Id<"fridges"> | "",
                  }))
                }
                value={catalogDraft.fridgeId}
              >
                <option value="">Select fridge</option>
                {fridges.map((fridge) => (
                  <option key={fridge.id} value={fridge.id}>
                    {fridge.hotelName} · {fridge.location} · {fridge.code}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Type
              </label>
              <Select
                onChange={(event) =>
                  setCatalogDraft((current) => ({ ...current, type: event.target.value }))
                }
                value={catalogDraft.type}
              >
                {["Wine", "Beer", "Spirits", "Mixer", "Snack", "Water", "Soft Drink"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Name
              </label>
              <Input
                onChange={(event) =>
                  setCatalogDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Brut Rose"
                value={catalogDraft.name}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Price
              </label>
              <Input
                min="0"
                onChange={(event) =>
                  setCatalogDraft((current) => ({ ...current, price: event.target.value }))
                }
                step="0.01"
                type="number"
                value={catalogDraft.price}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Volume
              </label>
              <Input
                onChange={(event) =>
                  setCatalogDraft((current) => ({ ...current, volume: event.target.value }))
                }
                value={catalogDraft.volume}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                ABV
              </label>
              <Input
                onChange={(event) =>
                  setCatalogDraft((current) => ({ ...current, abv: event.target.value }))
                }
                placeholder="12.5%"
                value={catalogDraft.abv}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Initial stock
              </label>
              <Input
                min="1"
                onChange={(event) =>
                  setCatalogDraft((current) => ({
                    ...current,
                    initialQuantity: event.target.value,
                  }))
                }
                step="1"
                type="number"
                value={catalogDraft.initialQuantity}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Description
            </label>
            <Textarea
              onChange={(event) =>
                setCatalogDraft((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="House rose for VIP minibar refreshes."
              value={catalogDraft.description}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button onClick={() => setIsCatalogOpen(false)} size="md" variant="secondary">
              Cancel
            </Button>
            <Button disabled={busyState === "catalog"} onClick={handleCreateCatalogItem} size="md">
              {busyState === "catalog" ? "Creating..." : "Create item"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog onClose={() => setIsStockOpen(false)} open={isStockOpen}>
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Hotel stock
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950">
              Increase stock
            </h2>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Stock row
              </label>
              <Select
                onChange={(event) => {
                  const selectedRow = (dashboard?.stockLevels ?? []).find(
                    (row) => row.id === event.target.value,
                  );
                  if (!selectedRow) return;
                  setStockDraft((current) => ({
                    ...current,
                    fridgeId: selectedRow.fridgeId,
                    productId: selectedRow.productId,
                  }));
                }}
                value={selectedStockRowId}
              >
                <option value="">Select stock row</option>
                {(dashboard?.stockLevels ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.hotelName} · {row.name} · {row.quantityAvailable} available
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Add quantity
              </label>
              <Input
                min="1"
                onChange={(event) =>
                  setStockDraft((current) => ({ ...current, quantity: event.target.value }))
                }
                step="1"
                type="number"
                value={stockDraft.quantity}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Reason
            </label>
            <Input
              onChange={(event) =>
                setStockDraft((current) => ({ ...current, reason: event.target.value }))
              }
              placeholder="Fresh weekly delivery"
              value={stockDraft.reason}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button onClick={() => setIsStockOpen(false)} size="md" variant="secondary">
              Cancel
            </Button>
            <Button disabled={busyState === "stock"} onClick={handleIncreaseStock} size="md">
              {busyState === "stock" ? "Updating..." : "Increase stock"}
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
