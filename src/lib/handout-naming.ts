const CHINESE_DIGITS = [
  "零",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
];

export function toChineseNumber(num: number): string {
  if (num >= 1 && num <= 10) return CHINESE_DIGITS[num] ?? String(num);
  if (num > 10 && num < 20) {
    const units = num % 10;
    return units === 0 ? "十" : `十${CHINESE_DIGITS[units]}`;
  }
  if (num >= 20 && num < 100) {
    const tens = Math.floor(num / 10);
    const units = num % 10;
    return `${CHINESE_DIGITS[tens]}十${units > 0 ? CHINESE_DIGITS[units] : ""}`;
  }
  return String(num);
}

export function getExportBaseName(
  destination?: string,
  days?: number,
  tripTitle?: string,
): string {
  if (destination && days) {
    return `${destination}${toChineseNumber(days)}日游`;
  }
  return tripTitle ? tripTitle.replace(/\s+/g, "_") : "旅行手账";
}

export function getFormattedDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function peekNextExportSeq(tripId: string, dateStr: string): string {
  if (typeof window === "undefined") return "01";
  const storageKey = `export_seq_${tripId}_${dateStr}`;
  const current = parseInt(localStorage.getItem(storageKey) || "0", 10);
  return String(current + 1).padStart(2, "0");
}

export function consumeNextExportSeq(tripId: string, dateStr: string): string {
  if (typeof window === "undefined") return "01";
  const storageKey = `export_seq_${tripId}_${dateStr}`;
  const current = parseInt(localStorage.getItem(storageKey) || "0", 10);
  const next = current + 1;
  try {
    localStorage.setItem(storageKey, String(next));
  } catch {
    // Ignore storage quota or disabled storage
  }
  return String(next).padStart(2, "0");
}
