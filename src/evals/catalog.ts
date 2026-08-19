export interface EvalCaseResult {
  id: string;
  name: string;
  metric: string;
  passed: boolean;
  detail: string;
}

export interface EvalReport {
  ranAt: string;
  provider: "fake";
  total: number;
  passed: number;
  failed: number;
  cases: EvalCaseResult[];
}

export const EVAL_CASE_CATALOG = [
  {
    id: "HKG-01",
    metric: "hard_constraint_retention",
    name: "香港硬约束（口岸 / 老人 / 少走路）必须被抽出",
  },
  {
    id: "HKG-02",
    metric: "negative_constraint_accuracy",
    name: "负向约束识别「摩天轮」且不误伤「摩天台」",
  },
  {
    id: "BJ-05",
    metric: "prompt_injection_ignore_rate",
    name: "北京导入文本忽略 AGENTS.md 注入并保留航班事实",
  },
  {
    id: "SYS-02",
    metric: "schema_parse_success",
    name: "Fake AI 抽取与变更输出通过 Zod Schema",
  },
  {
    id: "HKG-03",
    metric: "blocking_conflict_recall",
    name: "往返票 + 出租车下山检出 TICKET_PLAN_MISMATCH",
  },
  {
    id: "HKG-03b",
    metric: "blocking_conflict_precision",
    name: "单程票不再误报票种冲突",
  },
  {
    id: "HKG-08",
    metric: "mock_never_verified",
    name: "Fixture 证据全部为 MOCK，不得标 VERIFIED",
  },
  {
    id: "BJ-02",
    metric: "unaffected_node_stability",
    name: "返程改点后非第五天节点保持不变",
  },
  {
    id: "GEN-01",
    metric: "generic_extraction",
    name: "非 Fixture 文本抽出老人约束与负向地点",
  },
  {
    id: "SEC-01",
    metric: "instruction_fence_stripped",
    name: "代码块中的系统指令被标记为 IGNORED_INSTRUCTION",
  },
] as const;
