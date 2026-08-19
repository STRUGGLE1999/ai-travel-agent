import type { IgnoredBlock } from "@/domain";

const INSTRUCTION_PATTERNS = [
  /agents\.md instructions/i,
  /ignore (all )?(previous|prior) (rules|instructions)/i,
  /system prompt/i,
  /developer mode/i,
  /reveal .*(prompt|key|secret)/i,
  /you are now/i,
  /mark all facts as verified/i,
  /执行以下代码/,
  /忽略(之前|以上)(所有)?(规则|指令)/,
];

export interface SanitizeResult {
  sanitizedText: string;
  ignoredBlocks: IgnoredBlock[];
}

/**
 * Imported text is untrusted data. Code fences and lines that look like
 * agent instructions are removed from the text sent to the extractor and
 * surfaced to the user as IGNORED_INSTRUCTION blocks.
 */
export function sanitizeImportedText(raw: string): SanitizeResult {
  const ignoredBlocks: IgnoredBlock[] = [];
  let text = raw;

  // Strip script/style tags entirely.
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Inspect fenced code blocks.
  text = text.replace(/```[\s\S]*?```/g, (block) => {
    const inner = block.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "");
    const isInstruction = INSTRUCTION_PATTERNS.some((pattern) =>
      pattern.test(inner),
    );
    if (isInstruction) {
      ignoredBlocks.push({
        reason: "IGNORED_INSTRUCTION",
        quote: inner.trim().slice(0, 500),
      });
      return "";
    }
    // Travel facts inside code blocks stay available as plain text.
    return inner;
  });

  // Inspect remaining suspicious lines outside fences.
  const lines = text.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    if (INSTRUCTION_PATTERNS.some((pattern) => pattern.test(line))) {
      ignoredBlocks.push({
        reason: "IGNORED_INSTRUCTION",
        quote: line.trim().slice(0, 500),
      });
      continue;
    }
    kept.push(line);
  }

  return {
    sanitizedText: kept.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    ignoredBlocks,
  };
}
