import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepositories } from "@/server/repositories";
import { getOwnedTrip } from "@/server/page-guards";
import { getFixture } from "@/fixtures";
import { calculateTripBudget } from "@/domain/budget/calculator";
import { HandoutView } from "@/components/handout/handout-view";
import { HandoutExportActions } from "@/components/handout/handout-export-actions";
import { getExportBaseName } from "@/lib/handout-naming";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repos = getRepositories();
  const trip = await getOwnedTrip(repos, id);
  if (!trip) return { title: "旅行手账" };
  const fixture = getFixture(trip.fixtureId);
  const baseName = getExportBaseName(fixture?.destination, fixture?.days, trip.title);
  return {
    title: `${baseName} · 风来成行旅行手账`,
  };
}

export default async function HandoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repos = getRepositories();
  const trip = await getOwnedTrip(repos, id);
  if (!trip) {
    notFound();
  }
  const fixture = getFixture(trip.fixtureId);
  const versions = await repos.planVersions.listByTrip(id);
  const latest = versions[versions.length - 1] ?? null;

  if (!latest || !fixture) {
    return (
      <section className="p-6">
        <h1 className="font-display text-2xl font-semibold tracking-wide">旅行手账</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">
          暂无已生成的行程方案。请先在约束页确认硬约束并生成计划。
        </p>
        <Link
          href={`/trips/${id}/constraints`}
          className="mt-4 inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-base font-medium tracking-wide text-primary-foreground"
        >
          前往约束确认
        </Link>
      </section>
    );
  }

  const [items, constraints, tasks] = await Promise.all([
    repos.planItems.listByVersion(latest.id),
    repos.constraints.listByTrip(id),
    repos.bookingTasks.listByVersion(latest.id),
  ]);

  const peakTask = tasks.find((task) => task.title.includes("缆车"));
  const selectedTicketId = peakTask?.ticketType ?? null;

  const budget = calculateTripBudget({
    items,
    fixture,
    selectedTicketId,
    constraints,
  });

  return (
    <div className="space-y-4 -mx-5 sm:-mx-8 -my-8 print:m-0 print:space-y-0">
      <HandoutExportActions
        tripId={id}
        tripTitle={trip.title}
        destination={fixture.destination}
        days={fixture.days}
      />
      <HandoutView
        trip={trip}
        planVersion={latest}
        items={items}
        constraints={constraints}
        bookingTasks={tasks}
        budget={budget}
        places={fixture.places}
        fixture={fixture}
      />
    </div>
  );
}
