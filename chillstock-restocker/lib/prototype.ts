export const prototypeModeEnabled = process.env.NEXT_PUBLIC_PROTOTYPE_MODE !== "false";

export function buildGuestPrototypeUrl(fridgeCode: string) {
  const configuredOrigin = process.env.NEXT_PUBLIC_GUEST_APP_ORIGIN?.trim();
  const baseOrigin =
    configuredOrigin && configuredOrigin.length > 0
      ? configuredOrigin.replace(/\/+$/, "")
      : typeof window !== "undefined"
        ? (() => {
            const { hostname, protocol } = window.location;
            if (hostname === "localhost" || hostname === "127.0.0.1") {
              return `${protocol}//${hostname}:3000`;
            }
            return window.location.origin;
          })()
        : "";

  return `${baseOrigin}/auth?fridgeCode=${encodeURIComponent(fridgeCode)}&prototype=1`;
}
