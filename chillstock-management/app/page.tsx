import { ManagementDashboardScreen } from "@/components/screens/ManagementDashboardScreen";
import { toFlatSearchParams, type RouteSearchParams } from "@/lib/searchParams";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  const resolvedSearchParams = toFlatSearchParams(await searchParams);

  return <ManagementDashboardScreen searchParams={resolvedSearchParams} />;
}
