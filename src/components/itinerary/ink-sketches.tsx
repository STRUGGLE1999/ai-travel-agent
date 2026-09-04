import { cn } from "@/lib/cn";
import type { InkSketchType } from "@/domain/destinations/catalog";

export function InkSketch({
  type,
  className,
}: {
  type: InkSketchType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[3px] border border-[#e2ded6] bg-[#f5f1e8]",
        className,
      )}
      role="img"
      aria-label={`意境图 · ${type}`}
    >
      {/* Delicate paper texture border */}
      <div className="pointer-events-none absolute inset-0 border border-[#d5cfc2]/40" />

      {type === "peak" && (
        <svg viewBox="0 0 320 180" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          {/* Subtle mist background */}
          <rect width="320" height="180" fill="#f4efe6" />
          <path d="M0,130 Q80,110 160,125 T320,115 L320,180 L0,180 Z" fill="#e8e2d5" opacity="0.6" />
          {/* Distant mountain layers */}
          <path d="M-20,140 Q60,80 140,110 T340,90 L340,180 L-20,180 Z" fill="#c5cfc9" opacity="0.5" />
          <path d="M40,140 Q130,60 210,95 T350,75 L350,180 L40,180 Z" fill="#889c93" opacity="0.4" />
          {/* Forefront ink peaks */}
          <path d="M-10,180 L80,95 L140,150 L230,70 L330,180 Z" fill="#34584e" opacity="0.85" />
          <path d="M70,180 L160,110 L220,165 L290,105 L340,180 Z" fill="#1e2d29" opacity="0.95" />
          {/* Distant birds */}
          <path d="M70,45 Q75,40 80,45 Q85,40 90,45" fill="none" stroke="#52635e" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M88,52 Q92,48 96,52 Q100,48 104,52" fill="none" stroke="#52635e" strokeWidth="1" strokeLinecap="round" />
          {/* Cinnabar seal */}
          <rect x="272" y="18" width="26" height="26" rx="2" fill="#a63a2f" />
          <text x="285" y="35" fill="#faf8f4" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="serif">登高</text>
        </svg>
      )}

      {type === "palace" && (
        <svg viewBox="0 0 320 180" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="320" height="180" fill="#f4efe6" />
          {/* Sky mist */}
          <path d="M0,140 Q160,120 320,140 L320,180 L0,180 Z" fill="#e8e2d5" opacity="0.5" />
          {/* Cloud ribbon */}
          <path d="M20,60 Q80,50 140,65 T260,55" fill="none" stroke="#d5cfc2" strokeWidth="1.5" opacity="0.7" />
          {/* Imperial hall roof silhouette */}
          <g transform="translate(160, 105)">
            {/* Top roof */}
            <path d="M-80,-25 Q-40,-35 0,-38 Q40,-35 80,-25 Q65,-18 55,-12 L-55,-12 Q-65,-18 -80,-25 Z" fill="#1e2d29" />
            <circle cx="0" cy="-40" r="3" fill="#a63a2f" />
            {/* Upturned eaves details */}
            <path d="M-85,-23 Q-75,-25 -60,-22 M85,-23 Q75,-25 60,-22" stroke="#1e2d29" strokeWidth="2" fill="none" />
            {/* Second tier roof */}
            <path d="M-105,5 Q-55,-10 0,-12 Q55,-10 105,5 Q88,14 75,20 L-75,20 Q-88,14 -105,5 Z" fill="#34584e" />
            {/* Main pillars & balustrades */}
            <rect x="-70" y="20" width="140" height="35" fill="#e2ded6" />
            <line x1="-55" y1="20" x2="-55" y2="55" stroke="#1e2d29" strokeWidth="3" />
            <line x1="-20" y1="20" x2="-20" y2="55" stroke="#1e2d29" strokeWidth="3" />
            <line x1="20" y1="20" x2="20" y2="55" stroke="#1e2d29" strokeWidth="3" />
            <line x1="55" y1="20" x2="55" y2="55" stroke="#1e2d29" strokeWidth="3" />
            {/* Base platform */}
            <rect x="-95" y="55" width="190" height="15" fill="#1e2d29" />
          </g>
          {/* Seal */}
          <rect x="272" y="18" width="26" height="26" rx="2" fill="#a63a2f" />
          <text x="285" y="35" fill="#faf8f4" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="serif">华堂</text>
        </svg>
      )}

      {type === "wall" && (
        <svg viewBox="0 0 320 180" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="320" height="180" fill="#f4efe6" />
          {/* Mountain ridges */}
          <path d="M0,120 Q90,60 180,95 T320,65 L320,180 L0,180 Z" fill="#a4b3ac" opacity="0.4" />
          <path d="M-20,150 Q110,90 220,120 T340,90 L340,180 L-20,180 Z" fill="#587067" opacity="0.5" />
          {/* Great Wall battlements snaking across */}
          <path d="M-10,135 Q70,95 140,105 T250,75 L280,120 L240,125 Q160,115 100,125 T-10,170 Z" fill="#34584e" />
          {/* Watchtower */}
          <g transform="translate(195, 78)">
            <rect x="-16" y="-18" width="32" height="24" fill="#1e2d29" />
            {/* Tower crenels */}
            <rect x="-16" y="-22" width="6" height="4" fill="#1e2d29" />
            <rect x="-3" y="-22" width="6" height="4" fill="#1e2d29" />
            <rect x="10" y="-22" width="6" height="4" fill="#1e2d29" />
            {/* Arched windows */}
            <rect x="-8" y="-12" width="6" height="10" rx="3" fill="#f4efe6" />
            <rect x="2" y="-12" width="6" height="10" rx="3" fill="#f4efe6" />
          </g>
          {/* Birds */}
          <path d="M110,45 Q115,40 120,45 Q125,40 130,45" fill="none" stroke="#52635e" strokeWidth="1" strokeLinecap="round" />
          {/* Seal */}
          <rect x="272" y="18" width="26" height="26" rx="2" fill="#a63a2f" />
          <text x="285" y="35" fill="#faf8f4" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="serif">雄关</text>
        </svg>
      )}

      {type === "ferry" && (
        <svg viewBox="0 0 320 180" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="320" height="180" fill="#f4efe6" />
          {/* Victoria harbour distant skyline */}
          <g opacity="0.35" fill="#889c93">
            <rect x="40" y="70" width="14" height="60" />
            <rect x="60" y="55" width="22" height="75" />
            <rect x="90" y="45" width="16" height="85" />
            <rect x="120" y="65" width="20" height="65" />
            <rect x="190" y="50" width="26" height="80" />
            <rect x="230" y="60" width="18" height="70" />
          </g>
          {/* Gentle sea water waves */}
          <path d="M0,135 C50,132 90,138 140,135 C190,132 230,138 320,134" fill="none" stroke="#a4b3ac" strokeWidth="1.2" />
          <path d="M0,150 C60,147 110,153 170,150 C230,147 270,153 320,149" fill="none" stroke="#889c93" strokeWidth="1.4" />
          <path d="M0,165 C40,163 100,167 160,164 C220,161 280,167 320,165" fill="none" stroke="#34584e" strokeWidth="1.5" />
          {/* Star ferry boat silhouette */}
          <g transform="translate(150, 125)">
            {/* Hull */}
            <path d="M-45,5 L45,5 L35,16 L-35,16 Z" fill="#1e2d29" />
            {/* Upper deck */}
            <rect x="-35" y="-6" width="70" height="11" fill="#34584e" rx="1" />
            {/* Funnel / chimney */}
            <rect x="-4" y="-15" width="8" height="9" fill="#1e2d29" />
            <line x1="0" y1="-18" x2="0" y2="-25" stroke="#1e2d29" strokeWidth="1.2" />
            {/* White band */}
            <rect x="-33" y="-2" width="66" height="3" fill="#f4efe6" />
          </g>
          {/* Seal */}
          <rect x="272" y="18" width="26" height="26" rx="2" fill="#a63a2f" />
          <text x="285" y="35" fill="#faf8f4" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="serif">行舟</text>
        </svg>
      )}

      {type === "tram" && (
        <svg viewBox="0 0 320 180" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="320" height="180" fill="#f4efe6" />
          {/* Forest hill incline */}
          <path d="M-20,180 L180,60 L340,30 L340,180 Z" fill="#889c93" opacity="0.35" />
          <path d="M-20,180 L220,80 L340,50 L340,180 Z" fill="#587067" opacity="0.5" />
          {/* Cable rails */}
          <line x1="-20" y1="170" x2="340" y2="45" stroke="#1e2d29" strokeWidth="3" strokeDasharray="8 4" />
          <line x1="-20" y1="176" x2="340" y2="51" stroke="#34584e" strokeWidth="1.5" />
          {/* Historic Tram Car climbing up at an angle */}
          <g transform="translate(150, 100) rotate(-19)">
            {/* Car body */}
            <rect x="-40" y="-18" width="80" height="30" rx="3" fill="#1e2d29" />
            <rect x="-38" y="-16" width="76" height="16" fill="#34584e" rx="2" />
            {/* Glass windows */}
            <rect x="-34" y="-12" width="12" height="10" rx="1" fill="#f4efe6" opacity="0.85" />
            <rect x="-18" y="-12" width="12" height="10" rx="1" fill="#f4efe6" opacity="0.85" />
            <rect x="-2" y="-12" width="12" height="10" rx="1" fill="#f4efe6" opacity="0.85" />
            <rect x="14" y="-12" width="12" height="10" rx="1" fill="#f4efe6" opacity="0.85" />
            {/* Cinnabar trim */}
            <rect x="-38" y="1" width="76" height="3" fill="#a63a2f" />
            {/* Wheels */}
            <circle cx="-25" cy="14" r="5" fill="#1e2d29" />
            <circle cx="25" cy="14" r="5" fill="#1e2d29" />
          </g>
          {/* Seal */}
          <rect x="272" y="18" width="26" height="26" rx="2" fill="#a63a2f" />
          <text x="285" y="35" fill="#faf8f4" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="serif">穿云</text>
        </svg>
      )}

      {type === "dining" && (
        <svg viewBox="0 0 320 180" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="320" height="180" fill="#f4efe6" />
          {/* Table surface line */}
          <line x1="20" y1="145" x2="300" y2="145" stroke="#1e2d29" strokeWidth="2.5" />
          {/* Dim sum steamer baskets stacked */}
          <g transform="translate(110, 105)">
            {/* Bottom basket */}
            <rect x="-35" y="10" width="70" height="26" rx="2" fill="#c5cfc9" stroke="#1e2d29" strokeWidth="2" />
            <line x1="-35" y1="23" x2="35" y2="23" stroke="#889c93" strokeWidth="1" />
            {/* Top basket */}
            <rect x="-32" y="-16" width="64" height="26" rx="2" fill="#e8e2d5" stroke="#1e2d29" strokeWidth="2" />
            {/* Steamer lid handle */}
            <rect x="-8" y="-22" width="16" height="6" rx="1" fill="#1e2d29" />
            {/* Warm steam rising */}
            <path d="M-15,-26 Q-20,-38 -12,-48 T-16,-62" fill="none" stroke="#889c93" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <path d="M0,-26 Q5,-36 -2,-48 T2,-62" fill="none" stroke="#889c93" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
            <path d="M15,-26 Q10,-38 18,-48 T14,-62" fill="none" stroke="#889c93" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          </g>
          {/* Teapot & teacup */}
          <g transform="translate(210, 115)">
            {/* Teapot body */}
            <ellipse cx="0" cy="12" rx="22" ry="16" fill="#34584e" stroke="#1e2d29" strokeWidth="2" />
            {/* Spout */}
            <path d="M18,6 Q26,0 28,-4 L28,2 Q22,8 18,12 Z" fill="#34584e" stroke="#1e2d29" strokeWidth="1.5" />
            {/* Handle */}
            <path d="M-18,6 Q-30,6 -28,18 Q-26,24 -18,22" fill="none" stroke="#1e2d29" strokeWidth="2.5" />
            {/* Lid */}
            <ellipse cx="0" cy="-2" rx="10" ry="3" fill="#1e2d29" />
            <circle cx="0" cy="-6" r="2.5" fill="#a63a2f" />
            {/* Small teacup */}
            <path d="M38,20 L48,20 L46,29 L40,29 Z" fill="#e8e2d5" stroke="#1e2d29" strokeWidth="1.5" />
          </g>
          {/* Seal */}
          <rect x="272" y="18" width="26" height="26" rx="2" fill="#a63a2f" />
          <text x="285" y="35" fill="#faf8f4" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="serif">寻味</text>
        </svg>
      )}

      {type === "museum" && (
        <svg viewBox="0 0 320 180" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="320" height="180" fill="#f4efe6" />
          {/* Exhibition pedestal */}
          <g transform="translate(160, 125)">
            <rect x="-55" y="0" width="110" height="35" fill="#e2ded6" stroke="#1e2d29" strokeWidth="2" />
            <rect x="-60" y="-4" width="120" height="6" fill="#34584e" stroke="#1e2d29" strokeWidth="1.5" />
            {/* Ancient Bronze Ding / Vessel */}
            <path d="M-28,-36 L28,-36 L22,-8 L-22,-8 Z" fill="#34584e" stroke="#1e2d29" strokeWidth="2" />
            {/* Ding handles */}
            <path d="M-26,-36 L-26,-46 L-18,-46 L-18,-36" fill="none" stroke="#1e2d29" strokeWidth="2" />
            <path d="M18,-36 L18,-46 L26,-46 L26,-36" fill="none" stroke="#1e2d29" strokeWidth="2" />
            {/* Ding legs */}
            <rect x="-18" y="-8" width="6" height="14" fill="#1e2d29" rx="1" />
            <rect x="12" y="-8" width="6" height="14" fill="#1e2d29" rx="1" />
            {/* Ancient Greek / Chinese key pattern band */}
            <line x1="-20" y1="-22" x2="20" y2="-22" stroke="#a63a2f" strokeWidth="2" strokeDasharray="3 2" />
          </g>
          {/* Ambient Museum spotlight glow */}
          <ellipse cx="160" cy="85" rx="55" ry="30" fill="#ffffff" opacity="0.25" />
          {/* Seal */}
          <rect x="272" y="18" width="26" height="26" rx="2" fill="#a63a2f" />
          <text x="285" y="35" fill="#faf8f4" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="serif">博雅</text>
        </svg>
      )}

      {type === "garden" && (
        <svg viewBox="0 0 320 180" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="320" height="180" fill="#f4efe6" />
          {/* Classical Moon Gate Wall */}
          <rect x="0" y="10" width="320" height="170" fill="#ece6da" opacity="0.6" />
          {/* Moon Gate opening */}
          <circle cx="160" cy="115" r="62" fill="#f4efe6" stroke="#1e2d29" strokeWidth="4" />
          {/* Through the moon gate: Bamboo & Scholar rock */}
          <g transform="translate(160, 115)">
            {/* Distant garden pavilion */}
            <path d="M-15,-20 Q0,-25 15,-20 L10,-12 L-10,-12 Z" fill="#889c93" />
            {/* Taihu scholar rock */}
            <path d="M-30,40 Q-35,10 -25,-5 Q-15,5 -18,25 Q-10,15 -8,40 Z" fill="#587067" />
            {/* Bamboo stalks */}
            <line x1="12" y1="-35" x2="12" y2="45" stroke="#34584e" strokeWidth="2" strokeDasharray="14 1.5" />
            <line x1="22" y1="-45" x2="22" y2="45" stroke="#1e2d29" strokeWidth="2.5" strokeDasharray="16 1.5" />
            {/* Bamboo leaves */}
            <path d="M12,-20 L2,-25 M12,-20 L4,-15 M22,-30 L32,-35 M22,-30 L34,-25 M22,-15 L12,-18" stroke="#34584e" strokeWidth="1.8" strokeLinecap="round" />
          </g>
          {/* Seal */}
          <rect x="272" y="18" width="26" height="26" rx="2" fill="#a63a2f" />
          <text x="285" y="35" fill="#faf8f4" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="serif">怡园</text>
        </svg>
      )}
    </div>
  );
}
