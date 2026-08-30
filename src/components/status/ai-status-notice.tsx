export function AiStatusNotice({
  ai,
  aireason,
}: {
  ai?: string;
  aireason?: string;
}) {
  if (ai === "degraded") {
    return (
      <p
        role="status"
        className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-base text-warning-foreground"
      >
        本次解析未使用真实模型：
        {aireason ?? "真实模型调用失败，已使用演示解析"}
        ，建议稍后重试。结果仍经过相同的规则校验。
      </p>
    );
  }
  if (ai === "cached") {
    return (
      <p
        role="status"
        className="mt-4 rounded-md border border-info/30 bg-info-wash px-4 py-3 text-base text-info"
      >
        已复用之前相同输入的解析结果（缓存命中，未消耗新的模型额度）。
      </p>
    );
  }
  return null;
}
