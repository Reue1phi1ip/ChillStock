import type { Id } from "@/convex/_generated/dataModel";
import { ManagementTicketDetailScreen } from "@/components/screens/ManagementTicketDetailScreen";
import {
  toFlatSearchParams,
  toQueryString,
  type RouteSearchParams,
} from "@/lib/searchParams";

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<RouteSearchParams>;
}) {
  const [{ ticketId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const flatSearchParams = toFlatSearchParams(resolvedSearchParams);
  const queryString = toQueryString(flatSearchParams);

  return (
    <ManagementTicketDetailScreen
      returnHref={queryString ? `/?${queryString}` : "/"}
      ticketId={ticketId as Id<"tickets">}
    />
  );
}
