import type { Id } from "@/convex/_generated/dataModel";
import { ManagementConsumerDetailScreen } from "@/components/screens/ManagementConsumerDetailScreen";

export default async function ConsumptionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <ManagementConsumerDetailScreen
      returnHref="/consumption"
      sessionId={sessionId as Id<"guestSessions">}
    />
  );
}
