import { cn } from "@/lib/cn";

/**
 * 品牌印章：方寸朱砂，舟行水上。
 * 负空间取自「风来成行」——风起、舟行、旅成。
 * 纯 SVG，无外部依赖；尺寸继承父级字体大小，可在任意上下文用 className 覆盖。
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn("h-6 w-6", className)}
    >
      {/* 印章底：朱砂 */}
      <rect
        width="24"
        height="24"
        rx="3"
        fill="currentColor"
        className="text-cinnabar"
      />
      {/* 舟：船体 + 桅杆 + 帆，纸色负空间 */}
      <g fill="none" stroke="#f7f0ea" strokeWidth="1.5" strokeLinecap="round">
        {/* 船体 */}
        <path d="M5.5 15.6 L18.5 15.6 L16.2 18 L7.8 18 Z" fill="#f7f0ea" stroke="none" />
        {/* 桅杆 */}
        <path d="M12 15.2 L12 6.8" />
        {/* 帆 */}
        <path d="M12.9 7.2 L17.4 10.6 L12.9 14 Z" fill="#f7f0ea" stroke="none" />
        {/* 两道水波 */}
        <path d="M7 20.4 L10 20.4" />
        <path d="M14 20.4 L17 20.4" />
      </g>
    </svg>
  );
}
