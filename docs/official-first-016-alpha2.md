# Official-first review: DSH 0.1.6-alpha.2

Target: official `dsh-v0.1.6-alpha.2`, commit
`ddefc45fbc7f8e46dd73185e68295696d1297887`, tree
`5aca5ee6f8dfd110dc3ae199fbddf8a0f606625f`.

## Decision

**retain-temporarily** the current thin Host-scope generic MCP composition.
Do not substitute a new private browser implementation. The official Browser Use
provider is the preferred future isolation foundation, but its exact configuration
cannot yet preserve all of this bundle's testing requirements. The version 0.1.8
composition remains byte-identical to v0.1.7, including pinned MCP, installed Edge,
`--caps testing,devtools,vision`, `--viewport-size 1440x900`, timeouts and reconnect.

This is not a claim that the legacy shared browser is as safe as the official
Agent-owned provider. Use it from one Session at a time. Do not mount both models
of browser ownership together. Personal/account flows remain outside test scope.

## Evidence and retirement matrix

Official source links below are pinned to the target SHA, not `master`.

| Customization / purpose | Exact official evidence | Parity | Decision / gap / retirement condition |
| --- | --- | --- | --- |
| Pinned upstream MCP | [provider package](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/experimental/browser-use-playwright-mcp/package.json) pins the same `@playwright/mcp@0.0.80` | complete for pin | Prefer dependency-resolved official executable; the retained npx entry is not an advantage. |
| Protect personal browser profile | [provider source](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/experimental/browser-use-playwright-mcp/src/index.ts) launches `--isolated` | complete for launch isolation | Retain this requirement through migration; neither flag alone proves cross-Session isolation. |
| Cross-Session browser ownership | [Session runtime](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/experimental/browser-use-runtime/src/index.ts), [scoped MCP](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/experimental/browser-use-runtime/src/mcp.ts) use exact live Agent identity and per-Agent resources | official source is stronger; full installed acceptance unverified | Prefer official ownership. Retire shared MCP when capability requirements below are satisfied and concurrent real-Agent browser acceptance passes. Never implement isolation keyed only by a Session-id string. |
| Testing and coordinate vision tools | Provider source above passes no `--caps`; [BrowserMcpConfig](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/experimental/browser-use-runtime/src/mcp.ts) has no caps field and provider clears `PLAYWRIGHT_MCP_*` env | absent configuration parity | Retain reviewed capability flags until official options expose them or the user explicitly accepts the reduced catalog. Do not smuggle them in through inherited environment. |
| Fixed viewport | Same exact provider/config source exposes no `--viewport-size` | absent configuration parity | Retain 1440x900 requirement until official configuration supports it or the user accepts a changed viewport. |
| Edge/headed launch | Official exposes `executablePath` / `headless`, uses `--browser chromium`; retained bundle uses `--browser msedge` headed by default | partial | Same installed Edge can be used through explicit executable; real Windows tests must distinguish headless acceptance from a headed user Desktop. |
| Tool namespaces | Official scoped MCP name `playwright-mcp` vs retained `playwright` | partial | Migrate `mcp__playwright__*` references to `mcp__playwright-mcp__*`, tool filters and `<unlisted-tools>` ordering explicitly; do not add global aliases. |
| Reconnection | Official scoped runtime sets `reconnect: { enabled: false }` | intentionally different | Prefer official failure transparency when migrating; reconnecting a new process does not restore lost browser state. Retained reconnect remains documented legacy behavior, not a parity goal. |
| Enable/disable and unload | [official HMR](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/boot/hmr/src/index.ts), [MCP apply](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/mcp/mcp-client/src/index.ts) | reusable official mechanisms | Use official manager/lifecycle rather than custom restarts. Generic MCP cleanup is inherited, not reimplemented here; replacing code may still require a new module generation/restart. |

## Executable comparison

`browser.test.mjs` runs the same pinned upstream MCP in two private, sequential
headless Edge processes, with scratch output outside the repository:

1. Retained argv: `--isolated --browser msedge --caps testing,devtools,vision --viewport-size 1440x900`.
2. Official-provider default argv: `--browser chromium --isolated`, with the same
   explicit Edge executable, headless setting and scrubbed MCP option environment.

Both runs assert navigation, snapshot, harmless button interaction, screenshot
image content, console and network tools. The retained run asserts testing
`browser_verify_*`, coordinate `browser_mouse_*`, and 1440x900 viewport; the official
argument run asserts that those extra tool families and fixed viewport are absent.
The comparison demonstrates an actual upstream capability gap, not just missing
option names. It is **not a live DSH** activation or a full official-provider
mount: the separate upstream contract suites cover that provider's mounting and
Agent lifecycle. No user credentials, sessions or existing browsers are used.

`npm test` exact-source checks preserve version/tree identities and source seam
markers; they do not prove browser functionality. Windows/Linux CI additionally
executes pinned official MCP client/resources and official Browser Use provider,
resource, cancellation and disposal tests; a mandatory Windows browser job runs
the real Edge comparison (`REQUIRE_BROWSER_TEST=1`, no skip-as-pass).

## Migration / rollback

No stored tasks, credentials, history, profile or user settings are migrated by
this compatibility release. The ordinary shared MCP bundle remains available to
avoid silently dropping capabilities. A future reviewed migration must remove
that row before mounting the official browser-use registry/provider, use future
Agent activation rather than adopting live old Sessions, preserve explicit Edge
and timeout choices, and verify two simultaneous real Sessions, one-owner disposal,
fork/resume isolation, required tools/images and failure visibility. Keep the
verified v0.1.7/v0.1.8 artifact for separately authorized rollback; never rewrite
published tags or blindly replay an interrupted installation.

中文摘要：本次优先审视官方 Browser Use。官方按实际 Agent 隔离浏览器，是未来应复用的基础；
但 alpha.2 没有开放 testing/devtools/vision caps 与固定 viewport 配置。真实隔离 Edge 对照测试
验证了工具集和 viewport 差异，因此本版暂留现有薄 MCP 组合，不偷偷移除测试能力，也不声称它具备
跨会话隔离。只有补齐能力或用户明确接受差异、完成迁移验收后，才退役共享入口。安装与重启仍需单独授权。
