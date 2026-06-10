export type RouteSearchParams = Record<string, string | string[] | undefined>;
export type FlatSearchParams = Record<string, string | undefined>;

export function toFlatSearchParams(searchParams: RouteSearchParams): FlatSearchParams {
  return Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}

export function toQueryString(searchParams: FlatSearchParams) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (!value) continue;
    params.set(key, value);
  }

  return params.toString();
}
