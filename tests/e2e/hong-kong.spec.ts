import { test, expect, type Page } from "@playwright/test";

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

test("home page loads in demo mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("风来成行").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "懂变化的 AI 旅行搭子。" }),
  ).toBeVisible();
  await expect(page.getByText("演示模式")).toBeVisible();
});

test("hong kong main loop: constraints → conflict → ticket fix → change → new version", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "体验香港老人一日游" }).click();

  // Constraint confirmation page.
  await expect(page).toHaveURL(/\/constraints$/);
  await expect(page.getByText("福田口岸进入香港")).toBeVisible();
  await expect(page.getByText("不坐摩天轮", { exact: true })).toBeVisible();
  await confirmAllConstraints(page);

  await page
    .getByRole("button", { name: "确认约束并生成候选计划" })
    .click();

  // Plan workbench: the round-trip ticket default conflicts with the
  // taxi descent and blocks READY.
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByText("票种与下山方式不一致")).toBeVisible();
  await expect(page.getByText("存在阻断冲突")).toBeVisible();

  // Decision card: switch to the single ticket.
  const singleCard = page
    .locator("form")
    .filter({ hasText: "山顶缆车单程票" })
    .filter({ hasText: "选择此票种" });
  await singleCard.getByRole("button", { name: "选择此票种" }).click();
  await expect(page.getByText("票种与下山方式不一致")).toHaveCount(0);
  await expect(page.getByText("可执行（有警示）")).toBeVisible();

  // Timeline / map interaction and MOCK sources.
  await expect(page.getByText("路线为演示数据", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /太平山顶观景/ }).click();
  await expect(page.getByText("演示数据").first()).toBeVisible();

  // Natural-language change with storm fallback.
  await page
    .getByPlaceholder("输入变更请求…")
    .fill("加入香港历史博物馆，如果暴雨就不要去山顶");
  await page.getByRole("button", { name: "预览影响" }).click();

  await expect(page.getByText("变更影响预览")).toBeVisible();
  await expect(page.getByText(/新增 \d+ 项/)).toBeVisible();
  await expect(page.getByText("保留的锁定决定")).toBeVisible();
  await expect(page.getByText("暴雨室内替代").first()).toBeVisible();

  await page.getByRole("button", { name: "确认并创建新版本" }).click();
  await expect(page.getByText(/版本 v2/)).toBeVisible();

  // Versions page shows both versions with diff summary.
  await page.getByRole("link", { name: "版本" }).click();
  await expect(page.getByText("v2")).toBeVisible();
  await expect(page.getByText("初始候选计划")).toBeVisible();
  await expect(page.getByText(/变更原因/)).toBeVisible();

  // Checklist keeps ticket type, dates and MOCK labels.
  await page.getByRole("link", { name: "清单" }).click();
  await expect(page.getByText("购买山顶缆车车票")).toBeVisible();
  await expect(page.getByText("演示数据").first()).toBeVisible();
});

test("mobile 390px: constraints and plan pages have no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "体验香港老人一日游" }).click();
  await expect(page).toHaveURL(/\/constraints$/);

  const overflowX = await page.evaluate(
    () =>
      (document.scrollingElement?.scrollWidth ?? 0) -
      (document.scrollingElement?.clientWidth ?? 0),
  );
  expect(overflowX).toBeLessThanOrEqual(0);

  await confirmAllConstraints(page);
  await page
    .getByRole("button", { name: "确认约束并生成候选计划" })
    .click();
  await expect(page).toHaveURL(/\/plan$/);

  const planOverflowX = await page.evaluate(
    () =>
      (document.scrollingElement?.scrollWidth ?? 0) -
      (document.scrollingElement?.clientWidth ?? 0),
  );
  expect(planOverflowX).toBeLessThanOrEqual(0);

  // Mobile tabs switch between timeline and map.
  await expect(page.getByRole("tab", { name: "地图" })).toBeVisible();
});
