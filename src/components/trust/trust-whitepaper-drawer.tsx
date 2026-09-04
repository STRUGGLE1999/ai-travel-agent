"use client";

import { useState, useEffect } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import type { DataMode } from "@/domain";

export function TrustWhitepaperDrawer({
  dataMode,
  persistenceLabel,
}: {
  dataMode?: DataMode;
  persistenceLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-[3px] border border-[#c2cdca] bg-[#f2eee6]/60 px-2.5 py-1 text-xs font-medium text-[#52635e] transition-colors hover:border-[#34584e] hover:bg-[#faf8f4] hover:text-[#1e2d29]"
        title="点击查看风来成行规划逻辑与可信规范白皮书"
      >
        <span aria-hidden="true" className="text-xs">🛡️</span>
        <span>可信规划规范</span>
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trust-whitepaper-title"
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-xl flex-col bg-[#faf8f4] text-[#22302c] shadow-2xl border-l border-[#d8d3c8] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily:
                "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
            }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e2ded6] bg-[#faf8f4]/95 px-6 py-4 backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <BrandMark className="h-5 w-5 text-[#a63a2f]" />
                <div>
                  <h2
                    id="trust-whitepaper-title"
                    className="font-display text-base font-bold text-[#1e2d29] tracking-wide"
                  >
                    风来成行 · 可信出行设计白皮书
                  </h2>
                  <p className="text-xs text-[#70807b]">
                    为什么复杂自由行不能单凭大模型自由生成？
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-[3px] p-1.5 text-[#70807b] hover:bg-[#ece8df] hover:text-[#22302c]"
                aria-label="关闭白皮书"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="space-y-6 px-6 py-6 text-sm leading-relaxed text-[#40504b]">
              {/* Pillar 1: Industry Insight */}
              <section className="rounded-[4px] border border-[#e2ded6] bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#a63a2f]">
                  <span>01 / 行业痛点洞察</span>
                </div>
                <h3 className="mt-1 font-display text-base font-bold text-[#1e2d29]">
                  传统生成式 AI 在自由行场景的三大死穴
                </h3>
                <ul className="mt-2.5 space-y-2 text-xs text-[#52635e]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#a63a2f]">•</span>
                    <span><strong>时空幻觉</strong>：大模型擅长写优美攻略，但无法准确计算真实换乘耗时、口岸通关排队与景点营业时段。</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#a63a2f]">•</span>
                    <span><strong>体力不可知</strong>：对老人与儿童出行缺乏物理感知，极易排布单日步行超 20,000 步的疲惫行程。</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#a63a2f]">•</span>
                    <span><strong>计划过早固化与全盘推翻</strong>：一旦用户提出细微变更，传统聊天机器人会重新洗牌全部行程，打乱既有确认。</span>
                  </li>
                </ul>
              </section>

              {/* Pillar 2: Deterministic Feasibility */}
              <section className="rounded-[4px] border border-[#e2ded6] bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#34584e]">
                  <span>02 / 核心防御</span>
                </div>
                <h3 className="mt-1 font-display text-base font-bold text-[#1e2d29]">
                  确定性可行性引擎（Deterministic Engine）
                </h3>
                <p className="mt-1.5 text-xs text-[#52635e]">
                  模型只负责理解语言与提取意图；时间线重排、可行性校验与动线排他性 100% 由确定性算法把控：
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="rounded-[3px] bg-[#f7f5f0] p-2.5">
                    <p className="font-semibold text-[#1e2d29]">🛡️ 动线冲突主动拦截</p>
                    <p className="text-[#70807b] mt-0.5">自动排查往返票与下山交通不一致等隐形矛盾，杜绝浪费。</p>
                  </div>
                  <div className="rounded-[3px] bg-[#f7f5f0] p-2.5">
                    <p className="font-semibold text-[#1e2d29]">⏱️ 缓冲时间硬性保护</p>
                    <p className="text-[#70807b] mt-0.5">口岸通关 45min、起飞前 120min 到场缓冲作为刚性约束。</p>
                  </div>
                </div>
              </section>

              {/* Pillar 3: Change Philosophy */}
              <section className="rounded-[4px] border border-[#e2ded6] bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#34584e]">
                  <span>03 / 变更哲学</span>
                </div>
                <h3 className="mt-1 font-display text-base font-bold text-[#1e2d29]">
                  最小扰动 Diff 原则与不可变版本链
                </h3>
                <p className="mt-1.5 text-xs text-[#52635e]">
                  当行程发生变动（如返程航班提前、遇暴雨预警），系统采用最小影响算法：
                </p>
                <div className="mt-2.5 space-y-1.5 text-xs text-[#52635e]">
                  <p>• <strong>只动受影响链路</strong>：例如调整第 5 天送机，前 4 天已确认行程完全冻结保持稳定。</p>
                  <p>• <strong>不可变历史追溯</strong>：旧版本只读归档，生成 v2、v3 每次变动均提供直观 Diff 比对，随时可回退。</p>
                </div>
              </section>

              {/* Pillar 4: Fact Transparency */}
              <section className="rounded-[4px] border border-[#e2ded6] bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#34584e]">
                  <span>04 / 事实透明度</span>
                </div>
                <h3 className="mt-1 font-display text-base font-bold text-[#1e2d29]">
                  真实外部核验与数据诚信承诺
                </h3>
                <div className="mt-2.5 space-y-2 text-xs text-[#52635e]">
                  <p>
                    • <strong>高德 Web 服务接入</strong>：接入真实步行、公交与驾车路径规划，以及官方天气预警；核验通过打上 24h 有效期。
                  </p>
                  <p>
                    • <strong>绝不虚构实时数据</strong>：未接入实时外部 API 的数据，诚实标记为「基准参考数据」，不把预估伪装成已核验事实。
                  </p>
                  <p>
                    • <strong>系统韧性兜底</strong>：外部网络或数据库受限时，全自动平滑回退至高可用内存仓储，杜绝白屏崩溃。
                  </p>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-[#e2ded6] bg-[#f7f5f0] px-6 py-4">
              <div className="flex flex-col items-center justify-between gap-2 text-xs text-[#70807b] sm:flex-row">
                <span>风来成行 ｜ 懂变化的 AI 旅行搭子 · 产品架构规范</span>
                {dataMode ? (
                  <span className="rounded bg-[#e8e4dc] px-2 py-0.5 font-mono text-[11px] text-[#52635e]">
                    环境: {dataMode === "LIVE_PARTIAL" ? "高德实时核验" : "基准沙盒"} · {persistenceLabel ?? "内存仓储"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
