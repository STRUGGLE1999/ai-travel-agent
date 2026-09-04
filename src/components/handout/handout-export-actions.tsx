"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export interface HandoutExportActionsProps {
  tripId: string;
  tripTitle: string;
  destination?: string;
  days?: number;
  className?: string;
}

import {
  getExportBaseName,
  getFormattedDate,
  consumeNextExportSeq,
} from "@/lib/handout-naming";

export {
  toChineseNumber,
  getExportBaseName,
  getFormattedDate,
  consumeNextExportSeq,
} from "@/lib/handout-naming";

async function rasterizeSvgToDataUrl(
  svgEl: SVGSVGElement,
  width: number,
  height: number,
  scale: number = 2,
): Promise<string> {
  try {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", `${width}`);
    clone.setAttribute("height", `${height}`);
    if (!clone.getAttribute("xmlns")) {
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }

    // Replace currentColor in BrandMark if present
    const rects = clone.querySelectorAll("rect");
    for (const r of Array.from(rects)) {
      if (r.getAttribute("fill") === "currentColor") {
        r.setAttribute("fill", "#a63a2f");
      }
    }

    const xml = new XMLSerializer().serializeToString(clone);
    const dataUri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);

    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/png"));
          } else {
            resolve(dataUri);
          }
        } catch {
          resolve(dataUri);
        }
      };
      img.onerror = () => resolve(dataUri);
      img.src = dataUri;
    });
  } catch {
    return "";
  }
}

export function HandoutExportActions({
  tripId,
  tripTitle,
  destination,
  days,
  className,
}: HandoutExportActionsProps) {
  const [generatingImage, setGeneratingImage] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const baseName = getExportBaseName(destination, days, tripTitle);
  const dateStr = getFormattedDate();

  const handlePrint = () => {
    const origTitle = document.title;
    const seq = consumeNextExportSeq(tripId, dateStr);
    const filename = `${baseName}-${dateStr}-${seq}`;

    document.title = filename;
    setFeedbackMessage(`已将导出文件名设为：${filename}.pdf`);

    const restoreTitle = () => {
      window.removeEventListener("afterprint", restoreTitle);
      setTimeout(() => {
        document.title = origTitle;
      }, 1000);
    };
    window.addEventListener("afterprint", restoreTitle);

    window.print();

    setTimeout(() => {
      setFeedbackMessage(null);
    }, 6000);
  };

  const handleExportImage = async () => {
    setGeneratingImage(true);
    const seq = consumeNextExportSeq(tripId, dateStr);
    const filename = `${baseName}-${dateStr}-${seq}`;

    setFeedbackMessage(`正在排版并生成 ${filename}.png …`);

    let origScrollX = 0;
    let origScrollY = 0;

    try {
      if (!window.html2canvas) {
        const cdnUrls = [
          "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
        ];

        let loaded = false;
        for (const url of cdnUrls) {
          try {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement("script");
              script.src = url;
              script.async = true;
              script.onload = () => resolve();
              script.onerror = () => reject(new Error(`加载脚本失败: ${url}`));
              document.head.appendChild(script);
            });
            if (window.html2canvas) {
              loaded = true;
              break;
            }
          } catch {
            // try next CDN
          }
        }

        if (!loaded || !window.html2canvas) {
          throw new Error("无法从 CDN 载入长图排版脚本，请检查网络或点击「存为 A4 PDF」无损保存");
        }
      }

      const container = document.getElementById("trip-handout-content");
      if (!container) {
        throw new Error("未找到手账排版内容");
      }

      const html2canvas = window.html2canvas;
      if (!html2canvas) {
        throw new Error("html2canvas 未能成功载入");
      }

      // Pre-rasterize all SVGs using native browser graphics engine to avoid html2canvas SVG text parsing and scaling bugs
      const originalSvgs = Array.from(container.querySelectorAll("svg"));
      const svgRasterData = await Promise.all(
        originalSvgs.map(async (svg) => {
          const rect = svg.getBoundingClientRect();
          const width = Math.round(rect.width) || 800;
          const height = Math.round(rect.height) || 200;
          const pngUrl = await rasterizeSvgToDataUrl(svg, width, height, 2);
          return { width, height, pngUrl };
        }),
      );

      origScrollX = window.scrollX;
      origScrollY = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(container, {
        scale: 2, // 2x high resolution
        useCORS: true,
        logging: false,
        backgroundColor: "#faf8f4",
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        width: container.offsetWidth,
        height: container.offsetHeight,
        onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
          // Replace cloned SVGs with high-res PNG images
          const clonedSvgs = Array.from(clonedElement.querySelectorAll("svg"));
          for (let i = 0; i < clonedSvgs.length; i++) {
            const data = svgRasterData[i];
            const clonedSvg = clonedSvgs[i];
            if (data && data.pngUrl && clonedSvg && clonedSvg.parentNode) {
              const img = clonedDoc.createElement("img");
              img.src = data.pngUrl;
              img.style.width = `${data.width}px`;
              img.style.height = `${data.height}px`;
              img.style.display = "block";
              img.style.margin = "0 auto";
              img.setAttribute("aria-hidden", "true");
              clonedSvg.parentNode.replaceChild(img, clonedSvg);
            }
          }

          const clonedWin = (clonedDoc.defaultView || window) as Window;
          const origGetComputedStyle = clonedWin.getComputedStyle.bind(clonedWin);

          // Offscreen canvas context to convert any modern CSS colors (oklab, oklch, color-mix) to rgb/rgba
          const dummyCanvas = clonedDoc.createElement("canvas");
          dummyCanvas.width = 1;
          dummyCanvas.height = 1;
          const ctx = dummyCanvas.getContext("2d");

          const sanitizeColor = (val: string): string => {
            if (!val || typeof val !== "string") return val;
            if (
              val.includes("oklab") ||
              val.includes("oklch") ||
              val.includes("color-mix") ||
              val.includes("lab(")
            ) {
              if (ctx) {
                try {
                  ctx.fillStyle = "#000000";
                  ctx.fillStyle = val;
                  return ctx.fillStyle;
                } catch {
                  return "#22302c";
                }
              }
              return "#22302c";
            }
            return val;
          };

          // Override getComputedStyle on the cloned window so html2canvas color parser never encounters oklab
          clonedWin.getComputedStyle = function (
            el: Element,
            pseudoElt?: string | null,
          ) {
            const style = origGetComputedStyle(el, pseudoElt);
            return new Proxy(style, {
              get(target, prop, receiver) {
                const origVal = Reflect.get(target, prop, receiver);
                if (typeof origVal === "string") {
                  return sanitizeColor(origVal);
                }
                if (typeof origVal === "function") {
                  return origVal.bind(target);
                }
                return origVal;
              },
            });
          };

          // Sanitize any remaining box-shadow or inline styles that might have oklab
          const allElements = [clonedElement, ...clonedElement.querySelectorAll("*")];
          for (const el of allElements) {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style) {
              if (htmlEl.style.boxShadow && htmlEl.style.boxShadow.includes("okl")) {
                htmlEl.style.boxShadow = "none";
              }
            }
          }
        },
      });

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setFeedbackMessage(`✓ 高清长图已保存：${filename}.png`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      console.warn("Export image failed:", err);
      const msg = err instanceof Error ? err.message : "导出失败";
      setFeedbackMessage(
        `长图导出受限（${msg}），推荐点击「存为 A4 PDF / 打印」无损保存！`,
      );
      setTimeout(() => setFeedbackMessage(null), 8000);
    } finally {
      window.scrollTo(origScrollX, origScrollY);
      setGeneratingImage(false);
    }
  };

  return (
    <div
      className={cn(
        "no-print flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Link
          href={`/trips/${tripId}/plan`}
          className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <span>← 返回工作台</span>
        </Link>
        <span className="text-border">|</span>
        <span className="text-xs text-muted">
          导出格式：<code className="font-mono text-primary font-medium">{baseName}-{dateStr}-[序号]</code>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {feedbackMessage ? (
          <span className="text-xs text-primary transition-opacity animate-pulse">
            {feedbackMessage}
          </span>
        ) : null}

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex min-h-10 items-center justify-center rounded-[3px] border border-primary bg-primary px-4 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
        >
          🖨️ 存为 A4 PDF / 打印
        </button>

        <button
          type="button"
          onClick={handleExportImage}
          disabled={generatingImage}
          className="inline-flex min-h-10 items-center justify-center rounded-[3px] border border-border bg-surface px-4 text-sm font-medium tracking-wide text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
        >
          {generatingImage ? "正在生成…" : "📱 保存手机便携长图"}
        </button>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: Record<string, unknown>,
    ) => Promise<HTMLCanvasElement>;
  }
}
