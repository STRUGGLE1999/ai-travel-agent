"use client";

import { useState } from "react";
import type { BudgetSummary } from "@/domain/budget/types";
import { cn } from "@/lib/cn";
import { VerificationBadge } from "@/components/status/verification-badge";

interface BudgetCardProps {
  budget: BudgetSummary;
  className?: string;
}

export function BudgetCard({ budget, className }: BudgetCardProps) {
  const [expanded, setExpanded] = useState(false);

  const confirmedPercent =
    budget.totalAmount > 0
      ? Math.round((budget.totalConfirmed / budget.totalAmount) * 100)
      : 0;
  const estimatedPercent = 100 - confirmedPercent;

  const budgetUsagePercent =
    budget.budgetLimit && budget.budgetLimit > 0
      ? Math.min(100, Math.round((budget.totalAmount / budget.budgetLimit) * 100))
      : null;

  return (
    <div
      className={cn(
        "rounded-[3px] border border-border bg-surface p-5 transition-shadow",
        className,
      )}
    >
      {/* Header & Overview */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-medium tracking-wide text-foreground">
              费用与预算看板
            </h2>
            <span className="rounded bg-surface-muted px-2 py-0.5 text-xs text-muted tabular-nums">
              同行 {budget.partySize} 人
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            确定性门票与行程交通餐饮核算 · 区分已选定与预估项
          </p>
        </div>

        {/* Total Cost Display */}
        <div className="text-right">
          <p className="text-xs text-muted">总计预估费用</p>
          <p className="text-2xl font-bold tracking-tight text-primary tabular-nums">
            {budget.totalAmount.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-muted">
              {budget.currency}
            </span>
          </p>
        </div>
      </div>

      {/* Confirmed vs Estimated Ratio Bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            已确定（已选票券）: <span className="tabular-nums font-medium text-foreground">{budget.totalConfirmed.toLocaleString()} {budget.currency}</span> (<span className="tabular-nums">{confirmedPercent}%</span>)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-600/70" />
            预估待定（交通/餐饮）: <span className="tabular-nums font-medium text-foreground">{budget.totalEstimated.toLocaleString()} {budget.currency}</span> (<span className="tabular-nums">{estimatedPercent}%</span>)
          </span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            style={{ width: `${confirmedPercent}%` }}
            className="bg-primary transition-all duration-300"
            title={`已确定: ${confirmedPercent}%`}
          />
          <div
            style={{ width: `${estimatedPercent}%` }}
            className="bg-amber-600/60 transition-all duration-300"
            title={`预估待定: ${estimatedPercent}%`}
          />
        </div>
      </div>

      {/* Budget Limit & Alert if specified */}
      {budget.budgetLimit !== null ? (
        <div
          className={cn(
            "mt-4 rounded-[3px] border p-3 text-sm",
            budget.isOverBudget
              ? "border-cinnabar/40 bg-cinnabar/10 text-cinnabar"
              : "border-primary/20 bg-primary/5 text-primary",
          )}
        >
          <div className="flex items-center justify-between font-medium">
            <span>
              {budget.isOverBudget ? "⚠️ 超出预算约束警示" : "✓ 符合预算约束"}
            </span>
            <span className="tabular-nums">
              预算上限: {budget.budgetLimit.toLocaleString()} {budget.currency}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-90">
            {budget.isOverBudget
              ? `当前预估总费用超出预算上限 ${budget.overBudgetAmount.toLocaleString()} ${budget.currency}。建议优化出行方式或更换门票/餐饮计划。`
              : `当前预算使用率约 ${budgetUsagePercent}%，尚余 ${(
                  budget.budgetLimit - budget.totalAmount
                ).toLocaleString()} ${budget.currency} 缓冲空间。`}
          </p>
        </div>
      ) : null}

      {/* Toggle Details Button */}
      <div className="mt-4 pt-2 border-t border-border/60 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80 focus:outline-none"
        >
          <span>{expanded ? "收起明细账单" : "查看费用明细账单"}</span>
          <span className="text-xs">{expanded ? "▲" : "▼"}</span>
        </button>
        <span className="text-xs text-muted">
          票务为 MOCK 演示 · 交通餐饮为城市经验预估
        </span>
      </div>

      {/* Expandable Breakdown Table */}
      {expanded ? (
        <div className="mt-3 space-y-4 pt-2">
          {budget.categories.map((cat) => (
            <div key={cat.category} className="rounded-[3px] border border-border/70 bg-surface-muted/30 p-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="font-display text-sm font-medium text-foreground">
                  {cat.label}
                </span>
                <span className="text-sm font-semibold text-primary tabular-nums">
                  {cat.total.toLocaleString()} {budget.currency}
                </span>
              </div>
              <ul className="mt-2 divide-y divide-border/30 text-xs">
                {cat.items.map((item) => (
                  <li key={item.id} className="py-2 first:pt-1 last:pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {item.name}
                          </span>
                          {item.isConfirmed && (item.source === "MOCK" || item.source === "VERIFIED") ? (
                            <VerificationBadge status={item.source} />
                          ) : (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-700">
                              预估
                            </span>
                          )}
                        </div>
                        {item.notes ? (
                          <p className="mt-0.5 text-muted">{item.notes}</p>
                        ) : null}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-medium text-foreground tabular-nums">
                          {item.amount.toLocaleString()} {item.currency}
                        </span>
                        {item.unitPrice !== null && item.quantity !== null && item.quantity > 1 ? (
                          <p className="text-[10px] text-muted tabular-nums">
                            {item.unitPrice} × {item.quantity}{item.unitLabel ?? ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
