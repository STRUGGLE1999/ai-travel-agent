# 风来成行

> 懂变化的 AI 旅行搭子

面向高约束中文自由行的验证优先型 AI 旅行决策 Agent。先把自然语言需求转成可确认、可锁定的约束，再生成经过确定性检查的可执行行程；条件变化时只调整受影响部分，并展示 Diff 后才创建新版本。

应用代码在本目录（`web/`）。仓库根目录的 `docs/` 与原始研究材料是产品输入，请勿修改。

## 品牌说明

「行有据 TripProof」为项目早期工作名。当前正式品牌为「风来成行｜懂变化的 AI 旅行搭子」。技术项目名 `ai-travel-agent` 和现有 Vercel 域名保持不变。

## 数据模式

| 模式 | 触发条件 | 行为 |
|---|---|---|
| `DEMO` | 缺少下列五项中的任意一项 | 约束提取和变更理解使用确定性 Fake AI，绝不发起真实模型请求；UI 显示「演示模式」及具体原因 |
| `LIVE_PARTIAL` | `ANTHROPIC_API_KEY`、`ANTHROPIC_BASE_URL`、`ANTHROPIC_MODEL`、`DATABASE_URL`、`RATE_LIMIT_SALT` 五项齐全 | 约束提取和变更理解调用真实模型；地图、票务、营业时间、天气、库存仍为 Fixture 并标 `MOCK` |

`DATABASE_URL` 和 `RATE_LIMIT_SALT` 是启用真实模型的硬前提：内存计数无法跨实例/重启可靠限流，因此没有 PostgreSQL 或盐值时应用会保护性降级为 `DEMO`（首页徽章会显示「演示模式：缺少 PostgreSQL / RATE_LIMIT_SALT，已保护性降级」）。

任何 Fixture 事实都不会显示为 `VERIFIED`。模型失败、额度耗尽或数据库不可用时自动降级为 Fake AI，且 UI 明确提示降级。

## 本地启动（无密钥 / DEMO）

```bash
cd web
cp .env.example .env   # 留空即为 DEMO 模式
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，从首页进入香港/北京演示场景即可完整体验闭环。无 `DATABASE_URL` 时使用显式标记的内存仓储（重启后数据丢失，仅用于本地演示）。

## 环境变量

```bash
DATABASE_URL=                       # Neon PostgreSQL 连接串（LIVE_PARTIAL 必填）
ANTHROPIC_API_KEY=                  # Anthropic 兼容网关密钥（LIVE_PARTIAL 必填）
ANTHROPIC_BASE_URL=                 # 网关 Base URL（LIVE_PARTIAL 必填）
ANTHROPIC_MODEL=                    # 模型名，如 claude-opus-5（LIVE_PARTIAL 必填）
RATE_LIMIT_SALT=                    # IP 哈希盐（LIVE_PARTIAL 必填）
MAX_LLM_CALLS_PER_SESSION_PER_DAY=3
MAX_LLM_CALLS_PER_IP_PER_DAY=3
MAX_LLM_CALLS_GLOBAL_PER_DAY=100
MAX_SOURCE_INPUT_CHARS=20000
LLM_CACHE_TTL_SECONDS=86400
```

密钥只在服务端使用，绝不提交进仓库、不打进客户端包。

**真实模型连通性验证**：`/api/ai/smoke` 仅在本地开发环境（`NODE_ENV !== "production"`）可用，用低 Token 上限验证认证头、模型名与响应格式，不返回任何密钥；生产部署中该路径返回 404，公开环境不存在可绕过限流门的模型调用入口。本地验证方式：`npm run dev` 后访问 `http://localhost:3000/api/ai/smoke`。

## 成本保护

- 只有 `ANTHROPIC_*` 三项、`DATABASE_URL`、`RATE_LIMIT_SALT` 全部配置时才会调用真实模型；缺任何一项都强制 `DEMO`，不发起任何模型请求；
- 每匿名会话、每（加盐哈希的）IP 每日各 3 次真实模型调用，全站每日 100 次，均可用环境变量调整；
- 额度使用 PostgreSQL `ON CONFLICT` 原子计数，跨实例可靠；额度存储不可用时直接拒绝调用并降级 Fake AI；
- 相同规范化输入命中缓存，不重复扣额度；缓存带 TTL（默认 24 小时，`LLM_CACHE_TTL_SECONDS` 可调），过期条目视为未命中；
- 输入有字符上限，输出有 Token 上限；
- 降级和缓存命中都会在 UI 明确提示，不冒充实时模型结果。

## 隐私边界

- 导入的原始文本与结构化解析结果保存在你部署的数据库（或本地内存仓储）中，仅当前匿名会话可访问；每个行程通过 HttpOnly 会话 Cookie 做属主校验，清除 Cookie 或换浏览器即获得全新的隔离会话；
- 写操作（Server Actions）在框架自带 Origin 校验之外，再显式核对 `Origin` / `Referer` 与 `Host` / `X-Forwarded-Host`，跨站带 Cookie 提交会被拒绝；
- 不保存原始 IP：仅在配置 `RATE_LIMIT_SALT` 时保存加盐哈希用于限流；没有盐值时完全不生成 IP 哈希；
- API Key、Base URL、认证头不写入日志、缓存或任何持久化记录；
- LLM 缓存只存放规范化输入的哈希与通过 Zod 校验后的输出，且会按 TTL 过期。

## 常用命令

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建（离线可用，无外网字体依赖）
npm run lint         # ESLint
npm test             # Vitest 单元测试（含离线 AI Eval；无 TEST_DATABASE_URL 时跳过 Postgres 集成测试）
npm run eval         # 固定数据集上的可重复离线评测（Fake AI + 确定性规则，不打真实模型）
npm run test:pg      # 可选 PostgreSQL 集成测试（需要 TEST_DATABASE_URL，勿指向生产库）
npm run e2e          # Playwright E2E（自动以 DEMO 模式启动，不消耗模型额度）
npm run db:generate  # 由 Drizzle Schema 生成 migration
npm run db:migrate   # 执行 migration（需 DATABASE_URL）
```

## Neon + Vercel 部署

请按照 [DEPLOYMENT.md](./DEPLOYMENT.md) 完成 Neon 连接串、随机盐值、Drizzle migration、Vercel 五项环境变量和上线验收。真实模型的公开部署必须配置 `DATABASE_URL` 与 `RATE_LIMIT_SALT`；五项缺一即为 `DEMO`。

## 3 分钟演示脚本

1. 打开首页，点「体验香港老人一日游」；
2. 约束页：展示自动提取的口岸、老人、少走路硬约束与「不坐摩天轮」负向约束，逐条确认并锁定；
3. 生成候选计划：工作台出现 `TICKET_PLAN_MISMATCH` 阻断——默认缆车往返票与「出租车下山」冲突，状态为「存在阻断冲突」；
4. 在决策卡改选「缆车单程票」，冲突消失，状态变为「可执行（有警示）」（Fixture 数据永远不是已核验）；
5. 输入变更：「加入香港历史博物馆，如果暴雨就不要去山顶」，展示影响预览：新增节点、暴雨室内替代、保留的锁定口岸与午餐；
6. 确认创建 v2，打开「版本」页查看 Diff 摘要；
7. 打开「清单」页展示票种、日期、来源和 `MOCK` 标识；
8. 返回首页切换北京场景：约束页展示被忽略的 `AGENTS.md instructions` 注入内容；生成计划后输入「返程航班改成16:15」，确认后仅第五天时间线（恭王府、取行李、去机场）被重算，其余日期不变。

## 架构速览

```text
UI（App Router 页面 + Server Actions）
  → application/use-cases（业务编排）
  → domain（Zod Schema、状态机、确定性规划/可行性/变更引擎）
  → services/ai（Sanitizer、Fake AI、Anthropic 兼容 Adapter、限流缓存降级门）
  → evals（离线金标集，`npm run eval`，不调用真实模型）
  → server/repositories（内存 / Neon PostgreSQL，接口一致）
  → fixtures（香港/北京确定性演示数据）
```

LLM 只负责两件事：`extractConstraints` 与 `parseChangeRequest`，输出必须通过 Zod 校验；路线、票价、营业时间、冲突和版本全部由确定性代码计算。
