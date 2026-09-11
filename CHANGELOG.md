# Changelog

## 0.1.6

- Add exact source-seam certification for DSH Core `0.1.5-rc.2` at commit `fb2c4b9e698e30edb738bca4cf0618587db7d203` and DSH Core `0.1.5-rc.1` at commit `183f08e9c6dde7e36cd2318eaee70b0da08fb35e`, retaining all four earlier certified commit/version pairs (`0.1.2-rc.1`, `0.1.3-alpha.1`, `0.1.5-alpha.1`, and `0.1.5-alpha.2`).
- The `0.1.5-alpha.2` → `0.1.5-rc.1` → `0.1.5-rc.2` `@deepseek-ai/dsh-mcp-client` production source diff is empty: `src/index.ts`, `src/transport.ts`, `src/connection.ts`, and `src/tools.ts` are byte-identical across the three sources, and only the package version string changes. The config and lifecycle markers consumed by `cordis.patch.yml` are therefore unchanged, and the alpha.2 repeated-cursor guard marker check now applies to all three sources.
- Require all six exact commit/version pairs in the test and release workflow gates.
- Preserve `cordis.patch.yml`, the Microsoft Playwright MCP pin at `@playwright/mcp@0.0.80`, all isolation flags, and the shared-process caveat. No live Host/browser/MCP verification is implied.
- `v0.1.5` is the latest published release; `v0.1.6` requires a separately authorized annotated tag and release.

## 0.1.5

- Add exact source-seam certification for DSH Core `0.1.5-alpha.2` at commit `b2e3b2a0125854567a4a5fcba75782e42fe84901`, retaining all three earlier certified commit/version pairs (`0.1.2-rc.1`, `0.1.3-alpha.1`, and `0.1.5-alpha.1`).
- Require all four exact sources in test and release workflow gates. Add optional read-only `DSH_CORE_REF` testing of certified Git objects in an existing repository without switching or creating Core worktrees.
- The alpha.1 → alpha.2 MCP production source diff adds repeated non-empty `tools/list` continuation-cursor rejection in `syncTools`; it does not change the config/API consumed by this bundle. Check the new guard's source markers only for alpha.2; this is not a functional pagination test.
- Preserve `cordis.patch.yml`, the Microsoft Playwright MCP pin at `@playwright/mcp@0.0.80`, all isolation flags, and the shared-process caveat. No live Host/browser/MCP verification is implied.
- `0.1.3` and `0.1.4` are source certification history, not evidence of published releases. The latest published release at this change's preparation is `v0.1.2`; `v0.1.5` requires a separately authorized annotated tag and release.

## 0.1.4

- Add exact source-seam certification for DSH Core `0.1.5-alpha.1` at commit `5dda764ed3aa172535a7967b06ff95d9cbfe536a`, retaining the `0.1.2-rc.1` and `0.1.3-alpha.1` certifications.
- Require all three exact commit/version pairs in test and release workflow gates; source-marker certification is not a behavioral Core runtime test.
- Preserve the Host composition, shared-process isolation caveat, and Microsoft Playwright MCP pin at `@playwright/mcp@0.0.80`.
- Core 0.1.5 removes `ctx.agent` and changes Inbox and session persistence APIs; this composition-only bundle does not call those APIs. Full target Host/browser activation remains a separate, explicitly authorized verification step.

## 0.1.3

- Add exact source-seam certification for DSH Core `0.1.3-alpha.1` at commit `d347e703908d0406b7a7ef80e3a0e594d86b2215` while retaining the `0.1.2-rc.1` certification.
- Check the alpha.1 `@deepseek-ai/dsh-mcp-client` config and lifecycle source markers consumed by `cordis.patch.yml`, including stdio command/args/env/cwd forwarding, startup readiness and failure branches, reconnect supervision, effect-owned disposal, tool replacement, and per-call timeout. These checks certify source seams, not runtime behavior.
- Require both certified DSH commits in test and release workflow gates.
- Keep the Microsoft Playwright MCP pin unchanged at `@playwright/mcp@0.0.80`.

## 0.1.2

- Republish the rc.1 certification after enabling repository-level immutable GitHub Releases.
- Preserve the reviewed 0.1.1 bundle behavior; only release provenance metadata changes.

## 0.1.1

- Certify the bundle's static composition against official DeepSeek Harness `0.1.2-rc.1` at commit `a66e4702047846cdaa10c66c9d3df3951f5ea70d`.
- Verify the rc.1 `@deepseek-ai/dsh-mcp-client` stdio configuration consumed by `cordis.patch.yml`: server namespace, command and argument forwarding, environment and working directory, tool-call timeout, and startup-failure policy.
- Verify rc.1 lifecycle seams for initial readiness, fail-loud startup, effect-owned disposal, reconnect supervision, tool registration replacement, and per-call timeout.
- Keep runtime support Windows-only; Linux CI validates the platform-neutral official source seam only.
