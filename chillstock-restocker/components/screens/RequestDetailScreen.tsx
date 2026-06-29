"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Icon } from "@/components/icons/Icon";
import { type ChangeEvent, type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/layout/AppShell";
import { PhotoEvidenceGallery, type PhotoEvidenceItem } from "@/components/shared/PhotoEvidenceGallery";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { buildGuestPrototypeUrl, prototypeModeEnabled } from "@/lib/prototype";
import { formatCurrency } from "@/lib/utils";

type SelectionMap = Record<string, number>;

type InventoryProduct = {
  id: Id<"products">;
  name: string;
  type: string;
  priceCents: number;
  description: string;
  volume: string;
  availableQuantity: number;
};

type UploadedPhoto = PhotoEvidenceItem & {
  contentType: string;
  localPreviewUrl?: string;
  storageId: Id<"_storage">;
};

type PendingCameraPhoto = {
  contentType: string;
  file: File;
  fileName: string;
  previewUrl: string;
};

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function labelForNeed(need: string) {
  if (need === "beer") return "Beer";
  if (need === "wine") return "Wine";
  if (need === "water_mixers") return "Water & mixers";
  if (need === "general_refresh") return "General refresh";
  return need;
}

function requestTitle(type: string) {
  if (type === "add_on") return "Add-On request";
  if (type === "checkout") return "Checkout reconciliation";
  return "Restock request";
}

function normalizeSelectionMap(map: SelectionMap, products: InventoryProduct[]) {
  const knownProducts = new Set(products.map((product) => product.id));

  return Object.entries(map)
    .map(([productId, quantity]) => ({
      productId: productId as Id<"products">,
      quantity: Math.max(0, Math.floor(Number(quantity) || 0)),
    }))
    .filter((entry) => knownProducts.has(entry.productId) && entry.quantity > 0);
}

function calculateSelectedTotal(products: InventoryProduct[], selections: SelectionMap) {
  return products.reduce((sum, product) => {
    const quantity = Math.max(0, Math.floor(selections[product.id] ?? 0));
    return sum + quantity * product.priceCents;
  }, 0);
}

function calculateAvailableAddedTotal(products: InventoryProduct[], selections: SelectionMap) {
  return products.reduce((sum, product) => {
    const requested = Math.max(0, Math.floor(selections[product.id] ?? 0));
    const allowed = Math.min(requested, product.availableQuantity);
    return sum + allowed * product.priceCents;
  }, 0);
}

function ProductSelector({
  emptyMessage,
  products,
  selections,
  showAvailability,
  title,
  showSelectedOnly,
  onQuantityChange,
  onShowSelectedOnlyChange,
}: {
  emptyMessage: string;
  products: InventoryProduct[];
  selections: SelectionMap;
  showAvailability: boolean;
  title: string;
  showSelectedOnly: boolean;
  onQuantityChange: (productId: Id<"products">, quantity: number) => void;
  onShowSelectedOnlyChange: (value: boolean) => void;
}) {
  const groupedProducts = useMemo(() => {
    const grouped = new Map<string, InventoryProduct[]>();
    for (const product of products) {
      const key = product.type || "other";
      const current = grouped.get(key) ?? [];
      current.push(product);
      grouped.set(key, current);
    }
    return Array.from(grouped.entries());
  }, [products]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    groupedProducts.forEach(([groupName], index) => {
      next[groupName] = openGroups[groupName] ?? index === 0;
    });
    setOpenGroups(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedProducts.length]);

  return (
    <Card className="rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight text-slate-950">{title}</h2>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <input
            checked={showSelectedOnly}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            onChange={(event) => onShowSelectedOnlyChange(event.target.checked)}
            type="checkbox"
          />
          Show selected
        </label>
      </div>

      {products.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {groupedProducts.map(([groupName, groupItems]) => {
            const filteredItems = showSelectedOnly
              ? groupItems.filter((product) => (selections[product.id] ?? 0) > 0)
              : groupItems;
            if (filteredItems.length === 0) return null;

            const selectedCount = filteredItems.filter((product) => (selections[product.id] ?? 0) > 0).length;
            const isOpen = openGroups[groupName] ?? false;

            return (
              <div className="rounded-xl border border-slate-200 bg-slate-50" key={groupName}>
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                  onClick={() =>
                    setOpenGroups((current) => ({
                      ...current,
                      [groupName]: !isOpen,
                    }))
                  }
                  type="button"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {groupName} <span className="text-xs text-slate-500">({selectedCount}/{filteredItems.length})</span>
                  </p>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {isOpen ? "Hide" : "Show"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="space-y-2 border-t border-slate-200 p-2">
                    {filteredItems.map((product) => {
                      const quantity = selections[product.id] ?? 0;
                      const requestedMoreThanAvailable = quantity > product.availableQuantity;

                      return (
                        <div
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2"
                          key={product.id}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{product.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {formatCurrency(product.priceCents / 100)} each{product.volume ? ` · ${product.volume}` : ""}
                            </p>
                            {showAvailability ? (
                              <p className="text-[11px] text-slate-500">Available: {product.availableQuantity}</p>
                            ) : null}
                            {showAvailability && requestedMoreThanAvailable ? (
                              <p className="text-[11px] font-semibold text-amber-700">Caps to available stock</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                              <button
                                className="h-8 w-8 text-base font-bold text-slate-700"
                                onClick={() => onQuantityChange(product.id, Math.max(0, quantity - 1))}
                                type="button"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-sm font-semibold text-slate-900">{quantity}</span>
                              <button
                                className="h-8 w-8 text-base font-bold text-slate-700"
                                onClick={() => onQuantityChange(product.id, quantity + 1)}
                                type="button"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function LoggedItemsSection({
  title,
  items,
}: {
  title: string;
  items: Array<{
    _id: string;
    name: string;
    type: string;
    unitPriceCents: number;
    quantity: number;
  }>;
}) {
  return (
    <Card className="rounded-2xl">
      <h2 className="font-display text-xl font-bold tracking-tight text-slate-950">{title}</h2>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          No items were logged here.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              key={item._id}
            >
              <div>
                <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                <p className="text-xs text-slate-500">{item.type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-950">
                  {formatCurrency((item.unitPriceCents * item.quantity) / 100)}
                </p>
                <p className="text-xs text-slate-500">x{item.quantity}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function RequestDetailScreen() {
  const params = useParams<{ id: string }>();
  const requestId = params.id as Id<"reconciliationRequests">;
  const current = useQuery(api.sessions.getRestockerRequest, { requestId });
  const requestInventory = useQuery(api.inventory.getRequestInventory, { requestId });
  const markEnroute = useMutation(api.sessions.markEnroute);
  const logRestockReconciliation = useMutation(api.sessions.logRestockReconciliation);
  const logCheckoutReconciliation = useMutation(api.sessions.logCheckoutReconciliation);
  const generateRestockerPhotoUploadUrl = useMutation(api.sessions.generateRestockerPhotoUploadUrl);
  const [restockerName, setRestockerName] = useState("");
  const [consumedSelections, setConsumedSelections] = useState<SelectionMap>({});
  const [addedSelections, setAddedSelections] = useState<SelectionMap>({});
  const [restockChargeMode, setRestockChargeMode] = useState<"added_items" | "full_restock">(
    "added_items",
  );
  const [activeStep, setActiveStep] = useState<"consumed" | "added">("consumed");
  const [confirmNoCheckoutConsumption, setConfirmNoCheckoutConsumption] = useState(false);
  const [showSelectedOnlyConsumed, setShowSelectedOnlyConsumed] = useState(false);
  const [showSelectedOnlyAdded, setShowSelectedOnlyAdded] = useState(false);
  const [busy, setBusy] = useState<"enroute" | "submit" | null>(null);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [previewPhotoId, setPreviewPhotoId] = useState<string | null>(null);
  const [pendingCameraPhoto, setPendingCameraPhoto] = useState<PendingCameraPhoto | null>(null);
  const [prototypeFeedback, setPrototypeFeedback] = useState("");
  const [success, setSuccess] = useState("");

  const request = current?.request;
  const session = current?.session;
  const fridge = current?.fridge;
  const products = requestInventory?.products ?? [];
  const isRestockRequest = request?.type === "restock";
  const isAddOnRequest = request?.type === "add_on";
  const isCheckoutRequest = request?.type === "checkout";
  const effectiveRestockerName =
    restockerName.trim() || request?.assignedRestockerName || request?.restockerName || "";
  const canEdit = request?.status === "requested" || request?.status === "enroute";
  const normalizedConsumedSelections = useMemo(
    () => normalizeSelectionMap(consumedSelections, products),
    [consumedSelections, products],
  );
  const normalizedAddedSelections = useMemo(
    () => normalizeSelectionMap(addedSelections, products),
    [addedSelections, products],
  );
  const effectiveRestockChargeMode =
    isRestockRequest && !canEdit
      ? (request.restockChargeMode ?? "added_items")
      : restockChargeMode;
  const consumedTotal = useMemo(
    () => calculateSelectedTotal(products, consumedSelections),
    [consumedSelections, products],
  );
  const requestedAddedTotal = useMemo(
    () => calculateSelectedTotal(products, addedSelections),
    [addedSelections, products],
  );
  const availableAddedTotal = useMemo(
    () => calculateAvailableAddedTotal(products, addedSelections),
    [addedSelections, products],
  );
  const previewChargeCents =
    isRestockRequest
      ? canEdit
        ? effectiveRestockChargeMode === "full_restock"
          ? 4000
          : availableAddedTotal
        : request.restockChargeMode === "full_restock"
          ? 4000
          : (request.topUpRequiredCents ?? 0) > 0
            ? request.topUpRequiredCents ?? 0
            : request.addedValueCents ?? 0
      : isAddOnRequest
        ? canEdit
          ? availableAddedTotal
          : (request?.topUpRequiredCents ?? 0) > 0
            ? request?.topUpRequiredCents ?? 0
            : request?.addedValueCents ?? 0
      : consumedTotal;
  const shortagePreview = useMemo(
    () =>
      products
        .map((product) => {
          const requestedQuantity = Math.max(0, Math.floor(addedSelections[product.id] ?? 0));
          if (requestedQuantity <= product.availableQuantity) return null;

          return {
            id: product.id,
            name: product.name,
            available: product.availableQuantity,
            requested: requestedQuantity,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [addedSelections, products],
  );
  const checkoutNoConsumptionSelected =
    isCheckoutRequest && confirmNoCheckoutConsumption;
  const guestPrototypeUrl = fridge?.code ? buildGuestPrototypeUrl(fridge.code) : "";

  useEffect(() => {
    if (!request || restockerName.trim()) return;
    const suggestedName = request.assignedRestockerName ?? request.restockerName ?? "";
    if (suggestedName) {
      setRestockerName(suggestedName);
    }
  }, [request, restockerName]);

  useEffect(() => {
    clearPendingCameraPhoto();
    setConsumedSelections({});
    setAddedSelections({});
    setConfirmNoCheckoutConsumption(false);
    setActiveStep("consumed");
  }, [requestId]);

  useEffect(() => {
    if (!request) return;

    setUploadedPhotos(
      (request.photos ?? []).map((photo) => ({
        id: photo.storageId,
        storageId: photo.storageId,
        fileName: photo.fileName,
        uploadedAt: photo.uploadedAt,
        url: photo.url,
        contentType: photo.contentType,
      })),
    );
    setPhotoError("");
    setPreviewPhotoId(null);
  }, [request?._id, request?.photos]);

  useEffect(() => {
    return () => {
      if (pendingCameraPhoto?.previewUrl) {
        URL.revokeObjectURL(pendingCameraPhoto.previewUrl);
      }
    };
  }, [pendingCameraPhoto]);

  const clearPendingCameraPhoto = () => {
    setPendingCameraPhoto((currentPhoto) => {
      if (currentPhoto?.previewUrl) {
        URL.revokeObjectURL(currentPhoto.previewUrl);
      }
      return null;
    });
  };

  const updateSelection =
    (setter: Dispatch<SetStateAction<SelectionMap>>) =>
    (productId: Id<"products">, quantity: number) => {
      setter((currentSelections) => {
        const normalizedQuantity = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
        if (normalizedQuantity === 0) {
          const nextSelections = { ...currentSelections };
          delete nextSelections[productId];
          return nextSelections;
        }

        return {
          ...currentSelections,
          [productId]: normalizedQuantity,
        };
      });
    };

  const handleMarkEnroute = async () => {
    if (!request) return;
    setBusy("enroute");
    setError("");
    setSuccess("");

    try {
      await markEnroute({ requestId: request._id, restockerName: effectiveRestockerName });
      setSuccess("Request marked en route.");
    } catch (markError) {
      console.error(markError);
      setError("Unable to mark this request en route right now.");
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async () => {
    if (!request) return;
    setBusy("submit");
    setError("");
    setSuccess("");

    try {
      if (!effectiveRestockerName.trim()) {
        setError("Add the restocker name before submitting.");
        return;
      }

      if (pendingCameraPhoto) {
        setPhotoError("Upload or discard the captured image before submitting.");
        return;
      }

      if (uploadingCount > 0) {
        setPhotoError("Finish uploading photos before submitting.");
        return;
      }

      if (request.type === "restock" || request.type === "add_on") {
        await logRestockReconciliation({
          requestId: request._id,
          restockerName: effectiveRestockerName,
          consumedItems: request.type === "restock" ? normalizedConsumedSelections : [],
          addedItems: normalizedAddedSelections,
          restockChargeMode: request.type === "restock" ? restockChargeMode : "added_items",
          photos: uploadedPhotos.map((photo) => ({
            storageId: photo.storageId,
            url: photo.localPreviewUrl ? "" : photo.url,
            contentType: photo.contentType,
            fileName: photo.fileName,
            uploadedAt: photo.uploadedAt ?? Date.now(),
          })),
        });

        setSuccess(
          request.type === "add_on"
            ? shortagePreview.length > 0
              ? "Add-ons submitted. Available stock was capped and a management escalation was created."
              : previewChargeCents > 0
                ? "Add-ons submitted and waiting on guest top-up."
                : "Add-ons submitted with no guest charge required."
            : restockChargeMode === "full_restock"
            ? "Full fridge refresh submitted. Guest top-up stays attached to this request."
            : shortagePreview.length > 0
              ? "Restock submitted. Available stock was capped and a management escalation was created."
              : previewChargeCents > 0
                ? "Restock submitted and waiting on guest top-up."
                : "Restock submitted with no guest charge required.",
        );
        return;
      }

      if (!checkoutNoConsumptionSelected && normalizedConsumedSelections.length === 0) {
        setError("Select at least one consumed item, or confirm there is no consumption to log.");
        return;
      }

      await logCheckoutReconciliation({
        requestId: request._id,
        restockerName: effectiveRestockerName,
        items: normalizedConsumedSelections,
        photos: uploadedPhotos.map((photo) => ({
          storageId: photo.storageId,
          url: photo.localPreviewUrl ? "" : photo.url,
          contentType: photo.contentType,
          fileName: photo.fileName,
          uploadedAt: photo.uploadedAt ?? Date.now(),
        })),
      });
      setSuccess("Checkout reconciliation submitted.");
    } catch (submitError) {
      console.error(submitError);
      setError("Reconciliation could not be submitted. Check the selected items and try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleCopyGuestLink = async () => {
    if (!guestPrototypeUrl) return;
    await navigator.clipboard.writeText(guestPrototypeUrl);
    setPrototypeFeedback("Copied guest prototype link.");
    window.setTimeout(() => setPrototypeFeedback(""), 1800);
  };

  const validatePhotoFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      return "Only image files can be uploaded.";
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      return "Each image must be 10 MB or smaller.";
    }

    return null;
  };

  const uploadPhotoFile = async (file: File) => {
    setUploadingCount((currentCount) => currentCount + 1);

    try {
      const uploadUrl = await generateRestockerPhotoUploadUrl({});
      const uploadResult = await fetch(uploadUrl, {
        body: file,
        headers: {
          "Content-Type": file.type,
        },
        method: "POST",
      });

      if (!uploadResult.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = (await uploadResult.json()) as { storageId: Id<"_storage"> };
      const localPreviewUrl = URL.createObjectURL(file);

      setUploadedPhotos((currentPhotos) => [
        ...currentPhotos,
        {
          id: storageId,
          storageId,
          fileName: file.name,
          uploadedAt: Date.now(),
          url: localPreviewUrl,
          localPreviewUrl,
          contentType: file.type,
        },
      ]);
    } finally {
      setUploadingCount((currentCount) => Math.max(0, currentCount - 1));
    }
  };

  const handleLibraryPhotoSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    setPhotoError("");

    for (const file of selectedFiles) {
      const validationError = validatePhotoFile(file);
      if (validationError) {
        setPhotoError(validationError);
        continue;
      }

      try {
        await uploadPhotoFile(file);
      } catch (uploadError) {
        console.error(uploadError);
        setPhotoError("One or more images could not be uploaded.");
      }
    }
  };

  const handleCameraPhotoSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) return;

    const validationError = validatePhotoFile(selectedFile);

    if (validationError) {
      setPhotoError(validationError);
      return;
    }

    clearPendingCameraPhoto();
    setPhotoError("");
    setPendingCameraPhoto({
      file: selectedFile,
      fileName: selectedFile.name,
      contentType: selectedFile.type,
      previewUrl: URL.createObjectURL(selectedFile),
    });
  };

  const handleDiscardPendingCameraPhoto = () => {
    if (!pendingCameraPhoto) return;

    clearPendingCameraPhoto();
  };

  const handleUploadPendingCameraPhoto = async () => {
    if (!pendingCameraPhoto) return;

    setPhotoError("");
    try {
      await uploadPhotoFile(pendingCameraPhoto.file);
      clearPendingCameraPhoto();
    } catch (uploadError) {
      console.error(uploadError);
      setPhotoError("The captured image could not be uploaded.");
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setUploadedPhotos((currentPhotos) => {
      const photoToRemove = currentPhotos.find((photo) => photo.id === photoId);
      if (photoToRemove?.localPreviewUrl) {
        URL.revokeObjectURL(photoToRemove.localPreviewUrl);
      }
      return currentPhotos.filter((photo) => photo.id !== photoId);
    });
    if (previewPhotoId === photoId) {
      setPreviewPhotoId(null);
    }
  };
  const photoActionsDisabled = busy !== null || uploadingCount > 0 || pendingCameraPhoto !== null;

  return (
    <AppShell eyebrow="Request detail">
      <div className="space-y-4 pb-20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link className="text-sm font-semibold text-emerald-700" href="/">
              Back to queue
            </Link>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
              {request ? requestTitle(request.type) : "Request detail"}
            </h1>
          </div>
          {request && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
              {request.status.replaceAll("_", " ")}
            </span>
          )}
        </div>

        {current === undefined ? (
          <Card className="rounded-2xl border-dashed">
            <p className="text-sm text-slate-500">Loading request...</p>
          </Card>
        ) : !request ? (
          <Card className="rounded-2xl border-dashed">
            <p className="text-sm font-semibold text-slate-900">Request not available</p>
          </Card>
        ) : (
          <>
            <section className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
              <Card className="rounded-2xl">
                <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Fridge</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{fridge?.name ?? "Unknown fridge"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Fridge QR</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{fridge?.code ?? "No QR"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Location</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{fridge?.location ?? "Guest suite"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Requested</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{formatTimestamp(request.requestedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Session</dt>
                    <dd className="mt-1 font-semibold capitalize text-slate-950">{session?.status ?? "unknown"}</dd>
                  </div>
                </dl>

                {prototypeModeEnabled && fridge?.code ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button onClick={handleCopyGuestLink} size="sm" variant="secondary">
                        Copy guest link
                      </Button>
                      <Button
                        onClick={() => window.open(guestPrototypeUrl, "_blank", "noopener,noreferrer")}
                        size="sm"
                      >
                        Launch guest flow
                      </Button>
                    </div>
                    <p className="text-xs text-emerald-800">
                      {prototypeFeedback ||
                        "Prototype mode launches the guest app with this fridge QR before printed QR labels exist."}
                    </p>
                  </div>
                ) : null}

                {(request.type === "restock" || request.type === "add_on") && (
                  <div className="mt-4 space-y-3">
                    {request.requestedItems?.length ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Requested items
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {request.requestedItems.map((item) => {
                            const product = products.find((entry) => entry.id === item.productId);
                            return (
                              <span
                                className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                                key={`${item.productId}-${item.quantity}`}
                              >
                                {item.quantity}x {product?.name ?? "Requested item"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {request.type === "restock" && request.generalRefresh ? (
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-800">
                          General refresh
                        </span>
                      </div>
                    ) : null}

                    {request.type === "restock" && request.requestedNeeds?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {request.requestedNeeds.map((need) => (
                          <span
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                            key={need}
                          >
                            {labelForNeed(need)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </Card>

              <Card className="rounded-2xl border-emerald-200 bg-emerald-50">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Billing preview</p>
                <p className="mt-1 font-display text-3xl font-bold tracking-tight text-emerald-900">
                  {formatCurrency(previewChargeCents / 100)}
                </p>
                {isRestockRequest ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Consumed</p>
                      <p className="mt-1 text-base font-semibold text-slate-950">{formatCurrency(consumedTotal / 100)}</p>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Added requested</p>
                      <p className="mt-1 text-base font-semibold text-slate-950">{formatCurrency(requestedAddedTotal / 100)}</p>
                    </div>
                  </div>
                ) : isAddOnRequest ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Requested added</p>
                      <p className="mt-1 text-base font-semibold text-slate-950">{formatCurrency(requestedAddedTotal / 100)}</p>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Available now</p>
                      <p className="mt-1 text-base font-semibold text-slate-950">{formatCurrency(availableAddedTotal / 100)}</p>
                    </div>
                  </div>
                ) : null}
              </Card>
            </section>

            <Card className="rounded-2xl">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Restocker name</label>
                  <Input
                    onChange={(event) => setRestockerName(event.target.value)}
                    placeholder="Alex from South Shore"
                    value={restockerName}
                  />
                </div>
                {isRestockRequest && canEdit ? (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Charge mode</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                      onChange={(event) =>
                        setRestockChargeMode(event.target.value as "added_items" | "full_restock")
                      }
                      value={restockChargeMode}
                    >
                      <option value="added_items">Charge only added items</option>
                      <option value="full_restock">Charge fixed full refresh</option>
                    </select>
                  </div>
                ) : null}
              </div>

              {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
              {success ? <p className="mt-3 text-sm font-semibold text-emerald-700">{success}</p> : null}
            </Card>

            {canEdit ? (
              <>
                <Card className="rounded-2xl">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Optional evidence
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Add minibar photos before you submit this reconciliation.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 ${
                          photoActionsDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        }`}
                      >
                        <Icon name="scan" size={16} />
                        <span>Take Image</span>
                        <input
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          disabled={photoActionsDisabled}
                          onChange={handleCameraPhotoSelection}
                          type="file"
                        />
                      </label>
                      <label
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 ${
                          photoActionsDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        }`}
                      >
                        <Icon name="send" size={16} />
                        <span>Upload Image</span>
                        <input
                          accept="image/*"
                          className="sr-only"
                          disabled={photoActionsDisabled}
                          multiple
                          onChange={handleLibraryPhotoSelection}
                          type="file"
                        />
                      </label>
                    </div>

                    <button
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left"
                      disabled={uploadedPhotos.length === 0}
                      onClick={() => {
                        if (uploadedPhotos.length > 0) {
                          setPreviewPhotoId(uploadedPhotos[0]?.id ?? null);
                        }
                      }}
                      type="button"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {uploadedPhotos.length} {uploadedPhotos.length === 1 ? "image" : "images"} uploaded
                        </p>
                        <p className="text-xs text-slate-500">
                          {uploadedPhotos.length > 0 ? "Tap to preview and remove images." : "No images attached yet."}
                        </p>
                      </div>
                      <Icon
                        className={uploadedPhotos.length > 0 ? "text-slate-500" : "text-slate-300"}
                        name="arrow-right"
                        size={16}
                      />
                    </button>

                    {pendingCameraPhoto ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start gap-3">
                          <img
                            alt={pendingCameraPhoto.fileName}
                            className="h-20 w-20 rounded-xl border border-slate-200 object-cover"
                            src={pendingCameraPhoto.previewUrl}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">{pendingCameraPhoto.fileName}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Review the captured image, then upload it or discard it.
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <Button
                            disabled={uploadingCount > 0}
                            onClick={handleDiscardPendingCameraPhoto}
                            size="sm"
                            variant="secondary"
                          >
                            Discard
                          </Button>
                          <Button
                            disabled={uploadingCount > 0}
                            onClick={() => void handleUploadPendingCameraPhoto()}
                            size="sm"
                          >
                            {uploadingCount > 0 ? "Uploading..." : "Upload"}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {photoError ? <p className="text-sm font-semibold text-red-600">{photoError}</p> : null}
                    {uploadingCount > 0 ? (
                      <p className="text-sm font-semibold text-teal-700">
                        Uploading {uploadingCount} {uploadingCount === 1 ? "image" : "images"}...
                      </p>
                    ) : null}

                    <PhotoEvidenceGallery
                      onRemove={handleRemovePhoto}
                      photos={uploadedPhotos.map((photo) => ({
                        ...photo,
                        url: photo.localPreviewUrl ?? photo.url,
                      }))}
                      previewPhotoId={previewPhotoId}
                      setPreviewPhotoId={setPreviewPhotoId}
                    />
                  </div>
                </Card>

                {isRestockRequest ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className={activeStep === "consumed" ? "" : "shadow-none"}
                        onClick={() => setActiveStep("consumed")}
                        size="sm"
                        variant={activeStep === "consumed" ? "primary" : "secondary"}
                      >
                        1. Consumed
                      </Button>
                      <Button
                        className={activeStep === "added" ? "" : "shadow-none"}
                        onClick={() => setActiveStep("added")}
                        size="sm"
                        variant={activeStep === "added" ? "primary" : "secondary"}
                      >
                        2. Added
                      </Button>
                    </div>

                    {activeStep === "consumed" ? (
                      <ProductSelector
                        emptyMessage="No preset inventory is available yet for this hotel."
                        onQuantityChange={updateSelection(setConsumedSelections)}
                        onShowSelectedOnlyChange={setShowSelectedOnlyConsumed}
                        products={products}
                        selections={consumedSelections}
                        showAvailability={false}
                        showSelectedOnly={showSelectedOnlyConsumed}
                        title="Consumed items"
                      />
                    ) : (
                      <ProductSelector
                        emptyMessage="No stock catalog has been configured for this hotel yet."
                        onQuantityChange={updateSelection(setAddedSelections)}
                        onShowSelectedOnlyChange={setShowSelectedOnlyAdded}
                        products={products}
                        selections={addedSelections}
                        showAvailability
                        showSelectedOnly={showSelectedOnlyAdded}
                        title="Added items"
                      />
                    )}

                    {activeStep === "added" && shortagePreview.length > 0 ? (
                      <Card className="rounded-2xl border-amber-200 bg-amber-50">
                        <p className="text-sm font-semibold text-amber-800">Stock short on requested items.</p>
                        <div className="mt-2 space-y-1 text-xs text-amber-900">
                          {shortagePreview.map((shortage) => (
                            <p key={shortage.id}>
                              {shortage.name}: requested {shortage.requested}, available {shortage.available}
                            </p>
                          ))}
                        </div>
                      </Card>
                    ) : null}
                  </>
                ) : isAddOnRequest ? (
                  <>
                    <ProductSelector
                      emptyMessage="No stock catalog has been configured for this hotel yet."
                      onQuantityChange={updateSelection(setAddedSelections)}
                      onShowSelectedOnlyChange={setShowSelectedOnlyAdded}
                      products={products}
                      selections={addedSelections}
                      showAvailability
                      showSelectedOnly={showSelectedOnlyAdded}
                      title="Added items"
                    />

                    {shortagePreview.length > 0 ? (
                      <Card className="rounded-2xl border-amber-200 bg-amber-50">
                        <p className="text-sm font-semibold text-amber-800">Stock short on requested items.</p>
                        <div className="mt-2 space-y-1 text-xs text-amber-900">
                          {shortagePreview.map((shortage) => (
                            <p key={shortage.id}>
                              {shortage.name}: requested {shortage.requested}, available {shortage.available}
                            </p>
                          ))}
                        </div>
                      </Card>
                    ) : null}
                  </>
                ) : (
                  <>
                    <ProductSelector
                      emptyMessage="No preset inventory is available yet for this hotel."
                      onQuantityChange={updateSelection(setConsumedSelections)}
                      onShowSelectedOnlyChange={setShowSelectedOnlyConsumed}
                      products={products}
                      selections={consumedSelections}
                      showAvailability={false}
                      showSelectedOnly={showSelectedOnlyConsumed}
                      title="Final consumed items"
                    />
                    <Card className="rounded-2xl border-slate-200 bg-slate-50">
                      <label className="flex items-start gap-3 text-sm text-slate-700">
                        <input
                          checked={confirmNoCheckoutConsumption}
                          className="mt-1 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          onChange={(event) => setConfirmNoCheckoutConsumption(event.target.checked)}
                          type="checkbox"
                        />
                        <span>Confirm no additional checkout consumption if the fridge was untouched.</span>
                      </label>
                    </Card>
                  </>
                )}
              </>
            ) : (
              <>
                {uploadedPhotos.length > 0 ? (
                  <Card className="rounded-2xl">
                    <PhotoEvidenceGallery
                      photos={uploadedPhotos.map((photo) => ({
                        ...photo,
                        url: photo.localPreviewUrl ?? photo.url,
                      }))}
                      previewPhotoId={previewPhotoId}
                      setPreviewPhotoId={setPreviewPhotoId}
                    />
                  </Card>
                ) : null}
                <section className="grid gap-4 lg:grid-cols-2">
                  <LoggedItemsSection items={current?.consumedItems ?? []} title="Consumed items" />
                  <LoggedItemsSection items={current?.addedItems ?? []} title="Added items" />
                </section>
              </>
            )}
          </>
        )}
      </div>

      {canEdit && request ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Preview</p>
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(previewChargeCents / 100)}</p>
            </div>
            <div className="flex items-center gap-2">
              {request.status === "requested" ? (
                <Button
                  disabled={busy !== null || uploadingCount > 0 || pendingCameraPhoto !== null}
                  onClick={handleMarkEnroute}
                  size="sm"
                  variant="secondary"
                >
                  {busy === "enroute" ? "..." : "En route"}
                </Button>
              ) : null}
              <Button
                disabled={busy !== null || uploadingCount > 0 || pendingCameraPhoto !== null}
                onClick={handleSubmit}
                size="sm"
              >
                {busy === "submit" ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

    </AppShell>
  );
}
