"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getRepositories } from "@/server/repositories";
import { getOrCreateSession } from "@/server/session";
import {
  applyChange,
  confirmAllHardConstraints,
  confirmConstraintsAndPlan,
  confirmVersion,
  createDemoTrip,
  createTrip,
  deleteConstraint,
  importTextAndExtract,
  previewChange,
  selectTicket,
  updateBookingTaskStatus,
  updateConstraint,
} from "@/application/use-cases";
import { getEnv } from "@/lib/env";
import { CsrfOriginError } from "@/server/csrf";
import { assertSameOriginRequest } from "@/server/csrf-request";
import type { ActorContext } from "@/application/use-cases";
import type { BookingTask } from "@/domain";

async function actor(): Promise<ActorContext> {
  try {
    await assertSameOriginRequest();
  } catch (error) {
    if (error instanceof CsrfOriginError) {
      redirect(`/?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  const repos = getRepositories();
  const { sessionId, ipHash } = await getOrCreateSession(repos);
  return { repos, sessionId, ipHash };
}

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message.slice(0, 200))}`);
}

export async function startDemoTripAction(formData: FormData): Promise<void> {
  const fixtureId = formData.get("fixtureId");
  if (fixtureId !== "hong-kong" && fixtureId !== "beijing") {
    redirect("/");
  }
  const ctx = await actor();
  const trip = await createDemoTrip(ctx, fixtureId);
  redirect(`/trips/${trip.id}/constraints`);
}

export async function createTripFromTextAction(
  formData: FormData,
): Promise<void> {
  const text = String(formData.get("source") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();

  if (!text) {
    errorRedirect("/trips/new", "请先粘贴需求或聊天记录");
  }
  const maxChars = getEnv().MAX_SOURCE_INPUT_CHARS;
  if (text.length > maxChars) {
    errorRedirect("/trips/new", `输入超过 ${maxChars} 字符上限`);
  }

  const ctx = await actor();
  // Detect demo scenarios so pasted fixture text still goes down the
  // fully deterministic path.
  const fixtureId = text.includes("福田口岸")
    ? ("hong-kong" as const)
    : text.includes("恭王府") || text.includes("CA18")
      ? ("beijing" as const)
      : undefined;

  const trip = await createTrip(ctx, {
    fixtureId,
    title: title || "导入的行程",
    destination: destination || "未指定",
  });

  let aiQuery = "";
  try {
    const summary = await importTextAndExtract(ctx, {
      tripId: trip.id,
      text,
    });
    if (summary.degraded) {
      aiQuery = `?ai=degraded&aireason=${encodeURIComponent(
        (summary.degradeReason ?? "真实模型暂不可用，已使用演示解析").slice(0, 120),
      )}`;
    } else if (summary.cached) {
      aiQuery = "?ai=cached";
    }
  } catch {
    errorRedirect("/trips/new", "约束提取失败，原始输入未写入计划，请重试");
  }
  redirect(`/trips/${trip.id}/constraints${aiQuery}`);
}

export async function toggleConstraintLockAction(
  formData: FormData,
): Promise<void> {
  const tripId = String(formData.get("tripId"));
  const constraintId = String(formData.get("constraintId"));
  const locked = formData.get("locked") === "true";
  const ctx = await actor();
  await updateConstraint(ctx, {
    tripId,
    constraintId,
    patch: { locked, needsConfirmation: false },
  });
  revalidatePath(`/trips/${tripId}/constraints`);
}

export async function confirmConstraintAction(
  formData: FormData,
): Promise<void> {
  const tripId = String(formData.get("tripId"));
  const constraintId = String(formData.get("constraintId"));
  const ctx = await actor();
  await updateConstraint(ctx, {
    tripId,
    constraintId,
    patch: { needsConfirmation: false, locked: true },
  });
  revalidatePath(`/trips/${tripId}/constraints`);
}

export async function deleteConstraintAction(
  formData: FormData,
): Promise<void> {
  const tripId = String(formData.get("tripId"));
  const constraintId = String(formData.get("constraintId"));
  const ctx = await actor();
  await deleteConstraint(ctx, { tripId, constraintId });
  revalidatePath(`/trips/${tripId}/constraints`);
}

export async function confirmAllHardConstraintsAction(
  formData: FormData,
): Promise<void> {
  const tripId = String(formData.get("tripId"));
  const ctx = await actor();
  await confirmAllHardConstraints(ctx, tripId);
  revalidatePath(`/trips/${tripId}/constraints`);
}

export async function generatePlanAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId"));
  const ctx = await actor();
  try {
    await confirmConstraintsAndPlan(ctx, tripId);
  } catch (error) {
    errorRedirect(
      `/trips/${tripId}/constraints`,
      error instanceof Error ? error.message : "生成计划失败",
    );
  }
  revalidatePath(`/trips/${tripId}`, "layout");
  redirect(`/trips/${tripId}/plan`);
}

export async function selectTicketAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId"));
  const planVersionId = String(formData.get("planVersionId"));
  const ticketId = String(formData.get("ticketId"));
  const ctx = await actor();
  try {
    await selectTicket(ctx, { tripId, planVersionId, ticketId });
  } catch (error) {
    errorRedirect(
      `/trips/${tripId}/plan`,
      error instanceof Error ? error.message : "票种更新失败",
    );
  }
  revalidatePath(`/trips/${tripId}`, "layout");
  redirect(`/trips/${tripId}/plan`);
}

export async function confirmVersionAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId"));
  const planVersionId = String(formData.get("planVersionId"));
  const ctx = await actor();
  try {
    await confirmVersion(ctx, { tripId, planVersionId });
  } catch (error) {
    errorRedirect(
      `/trips/${tripId}/plan`,
      error instanceof Error ? error.message : "确认版本失败",
    );
  }
  revalidatePath(`/trips/${tripId}`, "layout");
  redirect(`/trips/${tripId}/plan`);
}

export async function previewChangeAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId"));
  const text = String(formData.get("changeText") ?? "").trim();
  if (!text) {
    errorRedirect(`/trips/${tripId}/plan`, "请先输入变更内容");
  }
  const ctx = await actor();
  let changeRequestId: string;
  let aiQuery = "";
  try {
    const preview = await previewChange(ctx, { tripId, text });
    changeRequestId = preview.changeRequestId;
    if (preview.degraded) {
      aiQuery = `&ai=degraded&aireason=${encodeURIComponent(
        (preview.degradeReason ?? "真实模型暂不可用，已使用演示解析").slice(0, 120),
      )}`;
    } else if (preview.cached) {
      // Cache hits are surfaced as reuse, not as a fresh live result.
      aiQuery = "&ai=cached";
    }
  } catch (error) {
    errorRedirect(
      `/trips/${tripId}/plan`,
      error instanceof Error ? error.message : "变更解析失败",
    );
  }
  redirect(`/trips/${tripId}/plan?preview=${changeRequestId}${aiQuery}`);
}

export async function applyChangeAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId"));
  const changeRequestId = String(formData.get("changeRequestId"));
  const ctx = await actor();
  try {
    await applyChange(ctx, { tripId, changeRequestId });
  } catch (error) {
    errorRedirect(
      `/trips/${tripId}/plan`,
      error instanceof Error ? error.message : "应用变更失败",
    );
  }
  revalidatePath(`/trips/${tripId}`, "layout");
  redirect(`/trips/${tripId}/plan`);
}

export async function updateBookingTaskAction(
  formData: FormData,
): Promise<void> {
  const tripId = String(formData.get("tripId"));
  const taskId = String(formData.get("taskId"));
  const planVersionId = String(formData.get("planVersionId"));
  const status = String(formData.get("status")) as BookingTask["status"];
  const ctx = await actor();
  await updateBookingTaskStatus(ctx, {
    tripId,
    taskId,
    planVersionId,
    status,
  });
  revalidatePath(`/trips/${tripId}/checklist`);
}
