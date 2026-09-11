# dsh-playwright-host

Optional Windows Profile Bundle that mounts DeepSeek Harness's built-in `@deepseek-ai/dsh-mcp-client` at **Host scope** and launches pinned Microsoft Playwright MCP with installed Microsoft Edge. The Host tool-registry layer makes tools such as `mcp__playwright__browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_take_screenshot`, `browser_console_messages`, and `browser_network_requests` visible regardless of Agent Preset.

This repository is a thin, reviewable composition bundle. Browser automation comes from [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp), and MCP bridging comes from DSH's `@deepseek-ai/dsh-mcp-client`.

## Install without activation

The latest published release at preparation of this change is **`v0.1.5`**. Version `0.1.6` is the next compatibility release; the command below is for use **only after its annotated tag and release artifact are published and verified**. A certification PR or a version in source is not publication evidence:

```powershell
dsh plugin --profile web add github:cloga/dsh-playwright-host#v0.1.6
```

An unpinned `github:cloga/dsh-playwright-host` install follows the moving default branch and is development-only, not reviewed deployment evidence.

This stages the bundle in the Web Profile. **Do not restart or replace a running DSH Host while other Sessions are live.** Before restart, enumerate the current running Sessions and obtain explicit user acceptance of that exact interruption list; if the set changes, ask again. A Host restart is required before the global tools appear.

Inspect the composed configuration before activation:

```powershell
dsh --profile web --dump-config
```

The composed tree must contain one `mcp-playwright` row using `@deepseek-ai/dsh-mcp-client`, exact `@playwright/mcp@0.0.80`, `--isolated`, and `--browser msedge`.

## Compatibility certification

Version `0.1.6` adds source-seam certification against official DSH Core [`0.1.5-rc.2`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.5-rc.2) at immutable source commit `fb2c4b9e698e30edb738bca4cf0618587db7d203` and [`0.1.5-rc.1`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.5-rc.1) at immutable source commit `183f08e9c6dde7e36cd2318eaee70b0da08fb35e`. It preserves every previously certified source:

| Core version | Exact certified source commit |
| --- | --- |
| `0.1.5-rc.2` | `fb2c4b9e698e30edb738bca4cf0618587db7d203` |
| `0.1.5-rc.1` | `183f08e9c6dde7e36cd2318eaee70b0da08fb35e` |
| `0.1.5-alpha.2` | `b2e3b2a0125854567a4a5fcba75782e42fe84901` |
| `0.1.5-alpha.1` | `5dda764ed3aa172535a7967b06ff95d9cbfe536a` |
| `0.1.3-alpha.1` | `d347e703908d0406b7a7ef80e3a0e594d86b2215` |
| `0.1.2-rc.1` | `a66e4702047846cdaa10c66c9d3df3951f5ea70d` |

The source-seam test accepts only those exact commit/version pairs. For each certified source, it checks that `@deepseek-ai/dsh-mcp-client` contains the stdio config and lifecycle source markers relied on by `cordis.patch.yml`, including startup readiness, fail-loud activation, effect-owned disposal, reconnect supervision, tool replacement, and per-call timeout markers. This marker certification is not a behavioral runtime test.

The bundle runtime remains Windows-specific because it launches installed Microsoft Edge. Linux CI validates only the platform-neutral official DSH source seam; it does not claim Linux runtime support. Windows CI additionally checks the pinned MCP command's version, not full browser behavior inside a running target Core Host.

The actual Core `0.1.5-alpha.1` → `0.1.5-alpha.2` MCP production source diff only adds repeated non-empty `tools/list` continuation-cursor rejection in `syncTools`, before the previous tool generation is replaced. The MCP config/API consumed here is unchanged; related upstream docs, tests, and package versions also change. The alpha.2 source test checks the cursor-guard markers, not the guard's functional behavior, retention of callable tools, or later recovery. No change to `cordis.patch.yml`, isolation flags, or the MCP pin is needed.

The `0.1.5-alpha.2` → `0.1.5-rc.1` → `0.1.5-rc.2` MCP production source diff is empty: `src/index.ts`, `src/transport.ts`, `src/connection.ts`, and `src/tools.ts` are byte-identical across the three sources, and only `packages/mcp/mcp-client/package.json` changes its version string. The same cursor-guard marker check therefore also applies to the two rc sources; it remains a marker check, not a functional pagination test.

Core `0.1.5-alpha.1` had removed `ctx.agent`, made Inbox a type-only interface, and upgraded session logs to V3; this composition-only bundle does not directly consume those APIs or read session logs. An isolated MCP/Edge smoke test is separate evidence and does not prove Core Host startup, tool-registry disposal, or model-visible image admission. Full target Host activation remains a separate verification step, subject to the restart safety rule above.

## Requirements

- DSH Core `0.1.5-rc.2`, DSH Core `0.1.5-rc.1`, DSH Core `0.1.5-alpha.2`, DSH Core `0.1.5-alpha.1`, DSH Core `0.1.3-alpha.1`, or DeepSeek Harness `0.1.2-rc.1`, using the exact certified commits above; any other version must be separately verified to provide the same `@deepseek-ai/dsh-mcp-client` seams.
- Node.js and `npx` on the Host.
- Microsoft Edge installed.
- A DSH model route with image input plus Attachment support for model-visible screenshots; accessibility snapshots work without vision.

## Scope and isolation boundary

`--isolated` prevents reuse of the user's everyday Edge profile. It does **not** create a separate MCP process for every DSH Session. One Host bundle instance owns one Playwright MCP stdio process, so concurrent Sessions can affect the same browser state, tabs, snapshot references, cookies, and close operations. Use browser tools from one Session at a time. Do not use authenticated personal profiles or consequential real-account flows.

A future Session-aware Host provider should key one BrowserContext or MCP process by `exec.agent.session.id` before concurrent use can be considered isolated. Until then, Python Playwright is the per-invocation fallback for independent verification.

## Verification

After an authorized restart, create a new Session with any Preset and confirm `mcp__playwright__browser_navigate` and related tools are present. Navigate to the existing `http://127.0.0.1:3080`, capture an accessibility snapshot and screenshot, exercise a harmless interaction, and inspect Console and failed Network requests. Do not start a replacement DSH server.

Run the static bundle test on Windows (no install or MCP/browser launch):

```powershell
Remove-Item Env:DSH_CORE_PATH, Env:DSH_CORE_REF -ErrorAction SilentlyContinue
node --check test.mjs
npm test
```

Run all six official source-seam certifications from an **existing** Git repository containing the exact objects, without changing its checkout:

```powershell
$env:DSH_CORE_PATH = 'C:\path\to\deepseek-harness'
try {
  foreach ($commit in @(
    'fb2c4b9e698e30edb738bca4cf0618587db7d203', # 0.1.5-rc.2
    '183f08e9c6dde7e36cd2318eaee70b0da08fb35e', # 0.1.5-rc.1
    'b2e3b2a0125854567a4a5fcba75782e42fe84901', # 0.1.5-alpha.2
    '5dda764ed3aa172535a7967b06ff95d9cbfe536a', # 0.1.5-alpha.1
    'd347e703908d0406b7a7ef80e3a0e594d86b2215', # 0.1.3-alpha.1
    'a66e4702047846cdaa10c66c9d3df3951f5ea70d'  # 0.1.2-rc.1
  )) {
    $env:DSH_CORE_REF = $commit
    npm test
    if ($LASTEXITCODE -ne 0) { throw "Source certification failed: $commit" }
  }
} finally {
  Remove-Item Env:DSH_CORE_PATH, Env:DSH_CORE_REF -ErrorAction SilentlyContinue
}
```

Optional `DSH_CORE_REF` must be a full certified commit SHA, not a branch, tag, or abbreviated hash. It requires `DSH_CORE_PATH` and reads source blobs via read-only `git --no-replace-objects show`; it does not fetch, checkout, reset, create a worktree, or read the current worktree's source. Missing objects fail. The existing checkout mode remains supported: omit `DSH_CORE_REF`, set `DSH_CORE_PATH` to a clean exact-commit source checkout, and run `npm test` (as CI does). That mode checks `HEAD`, rejects tracked working-tree or index modifications, and reads working-tree files. Explicitly blank source environment variables are invalid rather than a request to skip certification.

Both modes require matching root and mcp-client package versions. They check the config, stdio transport, startup, timeout, tool registration, reconnect, and disposal source markers used by `cordis.patch.yml`. An uncertified commit, mismatched version, incomplete source, or invalid ref configuration fails rather than falling back to the static-only test. No dependencies or Core build are needed for source-marker checks.

Separately, when package execution/download is authorized, Windows CI runs `npx -y @playwright/mcp@0.0.80 --version`. This reports only the pinned executable version; it is not a browser or target Host functional test.

## Release mechanics and evidence limits

`.github/workflows/test.yml` runs all six exact Core refs on Windows and Linux. `.github/workflows/release.yml` runs on a pushed `v*` tag, requires an **annotated** tag matching `package.json` (`v0.1.6` for this source), checks out and certifies all six exact Core refs, runs `npm pack`, writes and verifies `SHA256SUMS`, and uses `gh release create --verify-tag` to attach the tarball and checksum manifest. A merge to `main` alone does not publish anything; this private composition package is distributed by GitHub Release, not an npm publish step.

The workflow's "immutable" step name does not enforce repository-level release immutability. Verify that setting and the resulting release's immutable status, exact annotated tag/commit, tarball, and checksums separately before deployment. Static/local source tests do not prove hosted CI passed, a release exists, functional cursor rejection/recovery, target Core Host activation/disposal, browser isolation across Sessions, or model-visible screenshots. Do not call live user browser/MCP tools or restart the Host merely to establish source certification.

## Remove

```powershell
dsh plugin --profile web remove dsh-playwright-host
```

Removal is staged until the next authorized Host restart. The npm/npx cache and any separately installed Python Playwright binding are not removed by this command.

## Windows operations practice

Operational installation, fallback, and verification guidance is maintained in [`cloga/dsh-windows-ops`](https://github.com/cloga/dsh-windows-ops), especially `docs/plugins/computer-use.md` and `tools/dsh-web-smoke.py`.
