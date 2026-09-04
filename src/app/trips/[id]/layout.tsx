import type { ReactNode } from "react";
import { SiteHeader, type StatusTone } from "@/components/layout/site-header";
import { TripNav } from "@/components/layout/trip-nav";
import { getRuntimeInfo } from "@/lib/env";
import { getRepositories } from "@/server/repositories";
import { getOwnedTrip } from "@/server/page-guards";
import type { TripStatus } from "@/domain";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<TripStatus, string> = {
  DRAFT: "草案",
  NEEDS_CONFIRMATION: "待把关底线",
  PLANNING: "规划中",
  VERIFYING: "核验中",
  BLOCKED: "有动线待协调",
  READY_WITH_WARNINGS: "已就绪 · 附温馨提示",
  READY: "已就绪 · 可安心成行",
};

const STATUS_TONE: Record<TripStatus, StatusTone> = {
  DRAFT: "neutral",
  NEEDS_CONFIRMATION: "warning",
  PLANNING: "neutral",
  VERIFYING: "info",
  BLOCKED: "cinnabar",
  READY_WITH_WARNINGS: "warning",
  READY: "primary",
};

export default async function TripLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const runtime = getRuntimeInfo();
  const repos = getRepositories();
  const trip = await getOwnedTrip(repos, id);

  return (
    <div className="min-h-full">
      <SiteHeader
        dataMode={runtime.dataMode}
        persistenceLabel={runtime.persistenceLabel}
        demoReason={runtime.demoReason}
        tripTitle={trip ? trip.title : undefined}
        statusLabel={trip ? STATUS_LABEL[trip.status] : undefined}
        statusTone={trip ? STATUS_TONE[trip.status] : "neutral"}
      />
      <div className="mx-auto grid min-h-[calc(100vh-5.5rem)] max-w-6xl md:grid-cols-[11rem_1fr] print:block print:max-w-none print:min-h-0">
        <TripNav tripId={id} />
        <div className="min-w-0 px-5 py-8 md:px-8 print:p-0">{children}</div>
      </div>
    </div>
  );
}
