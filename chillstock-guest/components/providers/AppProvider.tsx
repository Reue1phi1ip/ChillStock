"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthBootstrap } from "@/components/providers/AuthBootstrap";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isAddOnProduct, isMainMenuProduct } from "@/lib/catalog";

export type Product = {
  id: string;
  name: string;
  type: string;
  price: number;
  imageColor: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type LoggedInventoryItem = {
  id: string;
  reconciliationRequestId?: string;
  name: string;
  type: string;
  price: number;
  quantity: number;
  createdAt: number;
};

export type ConsumptionItem = LoggedInventoryItem;
export type RestockedItem = LoggedInventoryItem;

export type RestockChargeMode = "added_items" | "full_restock";
export type GuestSessionStatus =
  | "deposit_pending"
  | "active"
  | "checkout_pending"
  | "checked_out";

export type RestockLog = {
  id: string;
  timestamp: number;
  consumedItems: ConsumptionItem[];
  addedItems: RestockedItem[];
  restockerName: string;
  type: "restock" | "add_on" | "checkout";
  status: ReconciliationStatus;
  restockChargeMode?: RestockChargeMode;
  addedValue: number;
};

export type NotificationType =
  | "over_deposit"
  | "restock_requested"
  | "restock_enroute"
  | "restock_complete"
  | "top_up_required"
  | "checkout_pending"
  | "checkout_reconciled"
  | "info";

export type RestockNeed =
  | "beer"
  | "wine"
  | "water_mixers"
  | "general_refresh";

export type AppNotification = {
  id: Id<"notifications">;
  type: NotificationType;
  title: string;
  message: string;
  messageHtml?: string;
  timestamp: number;
  read: boolean;
};

export type ReconciliationStatus =
  | "requested"
  | "enroute"
  | "reconciled"
  | "top_up_required"
  | "completed"
  | "cancelled";

export type ReconciliationRequest = {
  id: Id<"reconciliationRequests">;
  type: "restock" | "add_on" | "checkout";
  status: ReconciliationStatus;
  requestedAt: number;
  enrouteAt?: number;
  reconciledAt?: number;
  completedAt?: number;
  restockerName?: string;
  consumedDeltaCents: number;
  addedValueCents: number;
  topUpRequiredCents: number;
  refundEstimateCents: number;
  restockChargeMode?: RestockChargeMode;
  requestedNeeds: RestockNeed[];
  requestedItems: CartItem[];
  generalRefresh: boolean;
  guestNote?: string;
};

export type SessionHistoryEntry = {
  sessionId: string;
  unlockCode: string;
  hotelName: string;
  location: string;
  status: GuestSessionStatus;
  createdAt: number;
  checkedOutAt?: number;
  totalAuthorized: number;
  totalConsumed: number;
  consumptionItems: ConsumptionItem[];
  checkoutRequest: ReconciliationRequest | null;
};

type AppContextValue = {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isLoading: boolean;
  sessionBootstrapError: string | null;
  isSessionBootstrapping: boolean;
  isSessionPreparing: boolean;
  canAuthorizeDeposit: boolean;
  isReturningUser: boolean;
  guestDisplayName: string | null;
  user: { id: string; method: string; email?: string } | null;
  sessionStatus: "deposit_pending" | "active" | "checkout_pending" | "checked_out" | null;
  unlockCode: string | null;
  deposit: number;
  availableBalance: number;
  requiredTopUp: number;
  finalRefundEstimate: number;
  authorizedTotal: number;
  consumedTotal: number;
  inventory: Product[];
  mainMenuInventory: Product[];
  addOnInventory: Product[];
  cartItems: CartItem[];
  cartCount: number;
  addOnCartItems: CartItem[];
  addOnCartCount: number;
  generalRefreshSelection: boolean;
  setGeneralRefreshSelection: (value: boolean) => void;
  restockLogs: RestockLog[];
  consumption: ConsumptionItem[];
  restockedItems: RestockedItem[];
  notifications: AppNotification[];
  reconciliationRequest: ReconciliationRequest | null;
  latestReconciliationRequest: ReconciliationRequest | null;
  activeRestockRequest: ReconciliationRequest | null;
  activeAddOnRequest: ReconciliationRequest | null;
  activeCheckoutRequest: ReconciliationRequest | null;
  latestRestockRequest: ReconciliationRequest | null;
  latestAddOnRequest: ReconciliationRequest | null;
  topUpRequest: ReconciliationRequest | null;
  sessionHistory: SessionHistoryEntry[];
  totalBill: number;
  showOverDepositModal: boolean;
  addDeposit: (amount: number) => Promise<void>;
  topUpDeposit: () => Promise<void>;
  requestRestock: (input: {
    requestedItems: CartItem[];
    generalRefresh: boolean;
    note?: string;
  }) => Promise<void>;
  requestAddOn: (input: {
    requestedItems: CartItem[];
  }) => Promise<void>;
  addToCart: (productId: string) => void;
  setCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  addToAddOnCart: (productId: string) => void;
  setAddOnCartQuantity: (productId: string, quantity: number) => void;
  clearAddOnCart: () => void;
  requestCheckout: () => Promise<void>;
  login: (user: { id: string; method: string; email?: string }) => void;
  loginReturning: (user: { id: string; method: string; email?: string }) => void;
  logout: () => Promise<void>;
  checkout: () => Promise<void>;
  dismissNotification: (id: Id<"notifications">) => Promise<void>;
  setShowOverDepositModal: (value: boolean) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

const centsToEuros = (cents: number | undefined) => (cents ?? 0) / 100;
const eurosToCents = (amount: number) => Math.round(amount * 100);

const emptyProducts: Product[] = [];
const CART_STORAGE_PREFIX = "chillstock:restock-cart:";
const ADD_ON_CART_STORAGE_PREFIX = "chillstock:add-on-cart:";
const GENERAL_REFRESH_STORAGE_PREFIX = "chillstock:general-refresh:";

function mapRequest(request: unknown): ReconciliationRequest | null {
  if (!request || typeof request !== "object") return null;
  const value = request as {
    _id: Id<"reconciliationRequests">;
    type: "restock" | "add_on" | "checkout";
    status: ReconciliationStatus;
    requestedAt: number;
    enrouteAt?: number;
    reconciledAt?: number;
    completedAt?: number;
    restockerName?: string;
    consumedDeltaCents?: number;
    addedValueCents?: number;
    topUpRequiredCents?: number;
    refundEstimateCents?: number;
    restockChargeMode?: RestockChargeMode;
    requestedNeeds?: RestockNeed[];
    requestedItems?: CartItem[];
    generalRefresh?: boolean;
    guestNote?: string;
  };

  return {
    id: value._id,
    type: value.type,
    status: value.status,
    requestedAt: value.requestedAt,
    enrouteAt: value.enrouteAt,
    reconciledAt: value.reconciledAt,
    completedAt: value.completedAt,
    restockerName: value.restockerName,
    consumedDeltaCents: value.consumedDeltaCents ?? 0,
    addedValueCents: value.addedValueCents ?? 0,
    topUpRequiredCents: value.topUpRequiredCents ?? 0,
    refundEstimateCents: value.refundEstimateCents ?? 0,
    restockChargeMode: value.restockChargeMode,
    requestedNeeds: value.requestedNeeds ?? [],
    requestedItems: (value as { requestedItems?: CartItem[] }).requestedItems ?? [],
    generalRefresh: (value as { generalRefresh?: boolean }).generalRefresh ?? false,
    guestNote: value.guestNote,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const {
    bootstrappedSessionId,
    hasAttemptedSessionBootstrap,
    isSessionBootstrapping: isBootstrapRunning,
    sessionBootstrapError,
  } = useAuthBootstrap();
  const { signOut } = useAuthActions();
  const sessionState = useQuery(api.sessions.getCurrent);
  const sessionHistoryState = useQuery(api.history.listCurrentUserHistory);
  const currentUserState = useQuery(api.users.current);
  const authorizeDepositHold = useMutation(api.sessions.authorizeDepositHold);
  const requestRestockMutation = useMutation(api.sessions.requestRestock);
  const requestAddOnMutation = useMutation(api.sessions.requestAddOn);
  const requestCheckoutMutation = useMutation(api.sessions.requestCheckout);
  const payRequiredTopUpMutation = useMutation(api.sessions.payRequiredTopUp);
  const dismissNotificationMutation = useMutation(api.notifications.dismiss);

  const session = sessionState?.session ?? null;
  const inventoryState = useQuery(
    api.inventory.getGuestCatalog,
    session ? { fridgeId: session.fridgeId } : "skip",
  );
  const cartStorageKey = session ? `${CART_STORAGE_PREFIX}${session.fridgeId}` : null;
  const addOnCartStorageKey = session ? `${ADD_ON_CART_STORAGE_PREFIX}${session.fridgeId}` : null;
  const generalRefreshStorageKey = session ? `${GENERAL_REFRESH_STORAGE_PREFIX}${session.fridgeId}` : null;
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addOnCartItems, setAddOnCartItems] = useState<CartItem[]>([]);
  const [generalRefreshSelection, setGeneralRefreshSelectionState] = useState(false);
  const guestDisplayName =
    currentUserState?.profile?.displayName ?? currentUserState?.user?.name ?? null;
  const latestReconciliationRequest = mapRequest(sessionState?.latestRequest ?? null);
  const isSessionBootstrapping =
    isAuthenticated &&
    !isAuthLoading &&
    (isBootstrapRunning ||
      (bootstrappedSessionId !== null && session?._id !== bootstrappedSessionId));
  const isSessionPreparing =
    isAuthenticated && !isAuthLoading && !hasAttemptedSessionBootstrap;
  const isLoading = isAuthLoading || isSessionPreparing || isSessionBootstrapping;
  const totalAuthorizedCents = sessionState?.totalAuthorizedCents ?? 0;
  const canAuthorizeDeposit =
    isAuthenticated &&
    session !== null &&
    (session.status === "deposit_pending" ||
      (session.status !== "checked_out" && totalAuthorizedCents <= 0));

  const consumption = useMemo<ConsumptionItem[]>(() => {
    return (sessionState?.consumptionItems ?? []).map((item) => ({
      id: item._id,
      reconciliationRequestId: item.reconciliationRequestId,
      name: item.name,
      type: item.type,
      price: centsToEuros(item.unitPriceCents),
      quantity: item.quantity,
      createdAt: item.createdAt,
    }));
  }, [sessionState?.consumptionItems]);
  const restockedItems = useMemo<RestockedItem[]>(() => {
    return (sessionState?.restockedItems ?? []).map((item) => ({
      id: item._id,
      reconciliationRequestId: item.reconciliationRequestId,
      name: item.name,
      type: item.type,
      price: centsToEuros(item.unitPriceCents),
      quantity: item.quantity,
      createdAt: item.createdAt,
    }));
  }, [sessionState?.restockedItems]);

  const notifications = useMemo<AppNotification[]>(() => {
    return (sessionState?.notifications ?? []).map((notification) => ({
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      messageHtml: notification.messageHtml,
      timestamp: notification.createdAt,
      read: notification.read,
    }));
  }, [sessionState?.notifications]);

  const requests = useMemo(() => {
    return (sessionState?.requests ?? []).map(mapRequest).filter(Boolean) as ReconciliationRequest[];
  }, [sessionState?.requests]);
  const inventory = useMemo<Product[]>(() => {
    return (inventoryState ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      price: centsToEuros(item.priceCents),
      imageColor: item.imageColor,
    }));
  }, [inventoryState]);
  const mainMenuInventory = useMemo(
    () => inventory.filter(isMainMenuProduct),
    [inventory],
  );
  const addOnInventory = useMemo(
    () => inventory.filter(isAddOnProduct),
    [inventory],
  );
  const activeRestockRequest = useMemo(
    () =>
      requests.find(
        (request) =>
          request.type === "restock" &&
          request.status !== "completed" &&
          request.status !== "cancelled",
      ) ?? null,
    [requests],
  );
  const activeAddOnRequest = useMemo(
    () =>
      requests.find(
        (request) =>
          request.type === "add_on" &&
          request.status !== "completed" &&
          request.status !== "cancelled",
      ) ?? null,
    [requests],
  );
  const activeCheckoutRequest = useMemo(
    () =>
      requests.find(
        (request) =>
          request.type === "checkout" &&
          request.status !== "completed" &&
          request.status !== "cancelled",
      ) ?? null,
    [requests],
  );
  const topUpRequest = useMemo(
    () => requests.find((request) => request.status === "top_up_required") ?? null,
    [requests],
  );
  const reconciliationRequest = topUpRequest ?? activeCheckoutRequest ?? activeRestockRequest ?? activeAddOnRequest;
  const latestRestockRequest = useMemo(
    () => requests.find((request) => request.type === "restock") ?? null,
    [requests],
  );
  const latestAddOnRequest = useMemo(
    () => requests.find((request) => request.type === "add_on") ?? null,
    [requests],
  );

  const restockLogs = useMemo<RestockLog[]>(() => {
    return requests
      .filter(
        (request) =>
          request.type === "restock" &&
          request.status !== "requested" &&
          request.status !== "enroute",
      )
      .map((request) => ({
        id: request.id,
        timestamp: request.reconciledAt ?? request.completedAt ?? request.requestedAt,
        consumedItems: consumption.filter((item) => item.reconciliationRequestId === request.id),
        addedItems: restockedItems.filter((item) => item.reconciliationRequestId === request.id),
        restockerName: request.restockerName ?? "Restocker",
        type: request.type,
        status: request.status,
        restockChargeMode: request.restockChargeMode,
        addedValue: centsToEuros(request.addedValueCents),
      }));
  }, [consumption, requests, restockedItems]);
  const sessionHistory = useMemo<SessionHistoryEntry[]>(() => {
    return (sessionHistoryState ?? []).map((entry) => ({
      sessionId: entry.session.id,
      unlockCode: entry.session.unlockCode,
      hotelName: entry.session.hotelName,
      location: entry.session.location,
      status: entry.session.status,
      createdAt: entry.session.createdAt,
      checkedOutAt: entry.session.checkedOutAt,
      totalAuthorized: centsToEuros(entry.totalAuthorizedCents),
      totalConsumed: centsToEuros(entry.totalConsumedCents),
      consumptionItems: entry.consumptionItems.map((item) => ({
        id: item._id,
        reconciliationRequestId: item.reconciliationRequestId,
        name: item.name,
        type: item.type,
        price: centsToEuros(item.unitPriceCents),
        quantity: item.quantity,
        createdAt: item.createdAt,
      })),
      checkoutRequest: mapRequest(entry.checkoutRequest),
    }));
  }, [sessionHistoryState]);

  useEffect(() => {
    if (!cartStorageKey || typeof window === "undefined") {
      setCartItems([]);
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(cartStorageKey);
      if (!rawValue) {
        setCartItems([]);
        return;
      }

      const parsed = JSON.parse(rawValue) as CartItem[];
      setCartItems(
        Array.isArray(parsed)
          ? parsed.filter((item) => typeof item.productId === "string" && item.quantity > 0)
          : [],
      );
    } catch {
      setCartItems([]);
    }
  }, [cartStorageKey]);

  useEffect(() => {
    if (!addOnCartStorageKey || typeof window === "undefined") {
      setAddOnCartItems([]);
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(addOnCartStorageKey);
      if (!rawValue) {
        setAddOnCartItems([]);
        return;
      }

      const parsed = JSON.parse(rawValue) as CartItem[];
      setAddOnCartItems(
        Array.isArray(parsed)
          ? parsed.filter((item) => typeof item.productId === "string" && item.quantity > 0)
          : [],
      );
    } catch {
      setAddOnCartItems([]);
    }
  }, [addOnCartStorageKey]);

  useEffect(() => {
    if (!generalRefreshStorageKey || typeof window === "undefined") {
      setGeneralRefreshSelectionState(false);
      return;
    }

    setGeneralRefreshSelectionState(window.localStorage.getItem(generalRefreshStorageKey) === "1");
  }, [generalRefreshStorageKey]);

  useEffect(() => {
    if (!cartStorageKey || typeof window === "undefined") return;

    if (cartItems.length === 0) {
      window.localStorage.removeItem(cartStorageKey);
      return;
    }

    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [cartItems, cartStorageKey]);

  useEffect(() => {
    if (!addOnCartStorageKey || typeof window === "undefined") return;

    if (addOnCartItems.length === 0) {
      window.localStorage.removeItem(addOnCartStorageKey);
      return;
    }

    window.localStorage.setItem(addOnCartStorageKey, JSON.stringify(addOnCartItems));
  }, [addOnCartItems, addOnCartStorageKey]);

  useEffect(() => {
    if (!generalRefreshStorageKey || typeof window === "undefined") return;

    if (!generalRefreshSelection) {
      window.localStorage.removeItem(generalRefreshStorageKey);
      return;
    }

    window.localStorage.setItem(generalRefreshStorageKey, "1");
  }, [generalRefreshSelection, generalRefreshStorageKey]);

  const addDeposit = useCallback(
    async (amount: number) => {
      await authorizeDepositHold({ amountCents: eurosToCents(amount) });
    },
    [authorizeDepositHold],
  );

  const addToCart = useCallback((productId: string) => {
    setCartItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing) {
        return [...current, { productId, quantity: 1 }];
      }

      return current.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  }, []);

  const addToAddOnCart = useCallback((productId: string) => {
    setAddOnCartItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing) {
        return [...current, { productId, quantity: 1 }];
      }

      return current.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  }, []);

  const setCartQuantity = useCallback((productId: string, quantity: number) => {
    setCartItems((current) => {
      const normalizedQuantity = Math.max(0, Math.floor(quantity));
      if (normalizedQuantity <= 0) {
        return current.filter((item) => item.productId !== productId);
      }

      const existing = current.find((item) => item.productId === productId);
      if (!existing) {
        return [...current, { productId, quantity: normalizedQuantity }];
      }

      return current.map((item) =>
        item.productId === productId ? { ...item, quantity: normalizedQuantity } : item,
      );
    });
  }, []);

  const setAddOnCartQuantity = useCallback((productId: string, quantity: number) => {
    setAddOnCartItems((current) => {
      const normalizedQuantity = Math.max(0, Math.floor(quantity));
      if (normalizedQuantity <= 0) {
        return current.filter((item) => item.productId !== productId);
      }

      const existing = current.find((item) => item.productId === productId);
      if (!existing) {
        return [...current, { productId, quantity: normalizedQuantity }];
      }

      return current.map((item) =>
        item.productId === productId ? { ...item, quantity: normalizedQuantity } : item,
      );
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const clearAddOnCart = useCallback(() => {
    setAddOnCartItems([]);
  }, []);

  const setGeneralRefreshSelection = useCallback((value: boolean) => {
    setGeneralRefreshSelectionState(value);
  }, []);

  const requestRestock = useCallback(async (input: {
    requestedItems: CartItem[];
    generalRefresh: boolean;
    note?: string;
  }) => {
    await requestRestockMutation({
      requestedItems: input.requestedItems.map((item) => ({
        productId: item.productId as Id<"products">,
        quantity: item.quantity,
      })),
      generalRefresh: input.generalRefresh,
      note: input.note?.trim() || undefined,
    } as never);
    setCartItems([]);
    setGeneralRefreshSelectionState(false);
  }, [requestRestockMutation]);

  const requestAddOn = useCallback(async (input: { requestedItems: CartItem[] }) => {
    await requestAddOnMutation({
      requestedItems: input.requestedItems.map((item) => ({
        productId: item.productId as Id<"products">,
        quantity: item.quantity,
      })),
    } as never);
    setAddOnCartItems([]);
  }, [requestAddOnMutation]);

  const requestCheckout = useCallback(async () => {
    await requestCheckoutMutation({});
  }, [requestCheckoutMutation]);

  const topUpDeposit = useCallback(async () => {
    if (!topUpRequest || topUpRequest.status !== "top_up_required") return;
    await payRequiredTopUpMutation({ requestId: topUpRequest.id });
  }, [payRequiredTopUpMutation, topUpRequest]);

  const dismissNotification = useCallback(
    async (id: Id<"notifications">) => {
      await dismissNotificationMutation({ id });
    },
    [dismissNotificationMutation],
  );

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const noop = useCallback(() => undefined, []);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const addOnCartCount = addOnCartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        isAuthLoading,
        isLoading,
        sessionBootstrapError,
        isSessionBootstrapping,
        isSessionPreparing,
        canAuthorizeDeposit,
        isReturningUser: session?.status !== undefined && session.status !== "deposit_pending",
        guestDisplayName,
        user: session ? { id: session.userId, method: "convex" } : null,
        sessionStatus: session?.status ?? null,
        unlockCode: session?.unlockCode ?? null,
        deposit: centsToEuros(sessionState?.totalAuthorizedCents),
        availableBalance: centsToEuros(sessionState?.availableBalanceCents),
        requiredTopUp: centsToEuros(topUpRequest?.topUpRequiredCents),
        finalRefundEstimate: centsToEuros(sessionState?.finalRefundEstimateCents),
        authorizedTotal: centsToEuros(sessionState?.totalAuthorizedCents),
        consumedTotal: centsToEuros(sessionState?.totalConsumedCents),
        inventory: inventory ?? emptyProducts,
        mainMenuInventory,
        addOnInventory,
        cartItems,
        cartCount,
        addOnCartItems,
        addOnCartCount,
        generalRefreshSelection,
        setGeneralRefreshSelection,
        restockLogs,
        consumption,
        restockedItems,
        notifications,
        reconciliationRequest,
        latestReconciliationRequest,
        activeRestockRequest,
        activeAddOnRequest,
        activeCheckoutRequest,
        latestRestockRequest,
        latestAddOnRequest,
        topUpRequest,
        sessionHistory,
        totalBill: centsToEuros(sessionState?.totalConsumedCents),
        showOverDepositModal: topUpRequest?.status === "top_up_required",
        addDeposit,
        topUpDeposit,
        requestRestock,
        requestAddOn,
        addToCart,
        setCartQuantity,
        clearCart,
        addToAddOnCart,
        setAddOnCartQuantity,
        clearAddOnCart,
        requestCheckout,
        login: noop,
        loginReturning: noop,
        logout,
        checkout: requestCheckout,
        dismissNotification,
        setShowOverDepositModal: noop,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}
