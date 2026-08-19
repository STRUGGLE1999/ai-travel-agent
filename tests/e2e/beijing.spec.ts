import { test, expect, type Page } from "@playwright/test";

async function selectDay(page: Page, day: number): Promise<void> {
  // Retry the click: the first attempt can land before React hydration.
  await expect(async () => {
    const tab = page.getByRole("tab", { name: `Day ${day}` });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true", {
      timeout: 1000,
    });
  }).toPass({ timeout: 15000 });
}

async function confirmAllConstraints(page: Page): Promise<void> {
  // Click "确认并锁定" one at a time, waiting for each server action
  // to re-render before the next click.
  for (let i = 0; i < 12; i += 1) {
    const buttons = page.getByRole("button", { name: "确认并锁定" });
    const count = await buttons.count();
    if (count === 0) {
      break;
    }
    await buttons.first().click();
    await expect(buttons).toHaveCount(count - 1, { timeout: 15000 });
  }
  await expect(page.getByText("所有硬约束已确认")).toBeVisible();
}

test("beijing: injected instructions ignored, flight change only touches day 5", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "体验北京预约旅行" }).click();

  // Prompt-injection blocks from the transcript are surfaced as ignored.
  await expect(page).toHaveURL(/\/constraints$/);
  await expect(page.getByText(/已忽略 \d+ 段导入文本中的指令内容/)).toBeVisible();
  await expect(page.getByText(/IGNORED_INSTRUCTION/).first()).toBeVisible();
  // The injected content did not become a travel constraint.
  await expect(page.getByText("developer mode")).toHaveCount(1); // only inside ignored list

  await confirmAllConstraints(page);
  await page
    .getByRole("button", { name: "确认约束并生成候选计划" })
    .click();
  await expect(page).toHaveURL(/\/plan$/);

  // Baseline day 5 timeline.
  await selectDay(page, 5);
  await expect(page.getByText("17:30–18:00")).toBeVisible();
  await expect(page.getByText("12:30–13:25")).toBeVisible();

  // Day 2 baseline for stability comparison.
  await selectDay(page, 2);
  await expect(page.getByText("08:30–12:30")).toBeVisible();

  // Change the return flight to 16:15.
  await page.getByPlaceholder("输入变更请求…").fill("返程航班改成16:15");
  await page.getByRole("button", { name: "预览影响" }).click();
  await expect(page.getByText("变更影响预览")).toBeVisible();
  await expect(page.getByText(/修改 \d+ 项/)).toBeVisible();
  await page.getByRole("button", { name: "确认并创建新版本" }).click();
  await expect(page.getByText(/版本 v2/)).toBeVisible();

  // Day 5 recomputed: flight 16:15, taxi 13:20-14:15, luggage 12:50.
  await selectDay(page, 5);
  await expect(page.getByText("16:15–16:45")).toBeVisible();
  await expect(page.getByText("13:20–14:15")).toBeVisible();
  await expect(page.getByText("12:50–13:20")).toBeVisible();

  // Other days untouched.
  await selectDay(page, 2);
  await expect(page.getByText("08:30–12:30")).toBeVisible();

  // Reservation checklist for the five attractions.
  await page.getByRole("link", { name: "清单" }).click();
  for (const name of [
    "预约故宫博物院门票",
    "预约中国国家博物馆",
    "预约天坛公园联票",
    "预约八达岭长城门票",
    "预约恭王府门票",
  ]) {
    await expect(page.getByText(name)).toBeVisible();
  }
  await expect(page.getByText("演示数据").first()).toBeVisible();
});
