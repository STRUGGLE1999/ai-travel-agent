import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { TripNav } from "@/components/layout/trip-nav";
import { getRuntimeInfo } from "@/lib/env";
import { getRepositories } from "@/server/repositories";
import { getOwnedTrip } from "@/server/page-guards";
import type { TripStatus } from "@/domain";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<TripStatus, string> = {
  DRAFT: "草稿",
  NEEDS_CONFIRMATION: "待确认约束",
  PLANNING: "规划中",
  VERIFYING: "核验中",
  BLOCKED: "存在阻断冲突",
  READY_WITH_WARNINGS: "可执行（有警示）",
  READY: "可执行",
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
        tripTitle={
          trip
            ? `${trip.title} · ${STATUS_LABEL[trip.status]}`
            : "行程不存在"
        }
      />
      <div className="mx-auto grid min-h-[calc(100vh-5.5rem)] max-w-6xl md:grid-cols-[12rem_1fr]">
        <TripNav tripId={id} />
        <div className="min-w-0 px-4 py-6">{children}</div>
      </div>
    </div>
  );
}
