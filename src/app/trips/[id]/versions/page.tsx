import { notFound } from "next/navigation";
import { getRepositories } from "@/server/repositories";
import { getOwnedTrip } from "@/server/page-guards";

export const dynamic = "force-dynamic";

export default async function VersionsPage({
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
  const versions = await repos.planVersions.listByTrip(id);

  const rows = await Promise.all(
    versions.map(async (version) => {
      const request = version.changeRequestId
        ? await repos.changeRequests.getById(version.changeRequestId)
        : null;
      const impact = version.changeRequestId
        ? await repos.changeImpacts.getByRequestId(version.changeRequestId)
        : null;
      const items = await repos.planItems.listByVersion(version.id);
      return { version, request, impact, itemCount: items.length };
    }),
  );

  return (
    <section>
      <h1 className="font-display text-2xl font-semibold tracking-wide">版本与 Diff</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        已确认的版本不可原地修改；每次变更先预览影响，确认后才创建新版本。
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-[3px] border border-border bg-surface p-6 text-base text-muted">
          还没有计划版本。请先在约束页生成候选计划。
        </p>
      ) : (
        <ol className="mt-6 space-y-4">
          {[...rows].reverse().map(({ version, request, impact, itemCount }) => (
            <li
              key={version.id}
              className="rounded-[3px] border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-semibold tracking-wide">
                  v{version.versionNumber}
                </span>
                <span className="rounded-[2px] bg-surface-muted px-2 py-0.5 text-sm text-muted">
                  {version.status}
                </span>
                {version.confirmedAt ? (
                  <span className="rounded-[2px] bg-primary/10 px-2 py-0.5 text-sm text-primary">
                    已确认 · 不可修改
                  </span>
                ) : (
                  <span className="rounded-[2px] bg-warning/10 px-2 py-0.5 text-sm text-warning-foreground">
                    候选
                  </span>
                )}
                <span className="text-sm text-muted">{itemCount} 个节点</span>
              </div>
              {request ? (
                <p className="mt-2 text-base">
                  变更原因：“{request.rawText}”
                </p>
              ) : (
                <p className="mt-2 text-base text-muted">初始候选计划</p>
              )}
              {impact ? (
                <ul className="mt-2 grid gap-1 text-sm text-muted sm:grid-cols-2">
                  <li>新增 {impact.impact.additions.length} 项</li>
                  <li>删除 {impact.impact.removals.length} 项</li>
                  <li>修改 {impact.impact.updates.length} 项</li>
                  <li>
                    保留锁定 {impact.impact.preservedLockedItemIds.length} 项
                  </li>
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
