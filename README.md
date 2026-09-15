# dsh-playwright-host

Optional Windows Profile Bundle that mounts DeepSeek Harness's built-in `@deepseek-ai/dsh-mcp-client` at **Host scope** and launches pinned Microsoft Playwright MCP with installed Microsoft Edge. The Host tool-registry layer makes tools such as `mcp__playwright__browser_navigate`, `mcp__playwright__browser_snapshot`, `mcp__playwright__browser_click`, `mcp__playwright__browser_type`, `mcp__playwright__browser_take_screenshot`, `mcp__playwright__browser_console_messages`, and `mcp__playwright__browser_network_requests` visible regardless of Agent Preset.

This repository is a thin, reviewable composition bundle. Browser automation comes from [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp), and MCP bridging comes from DSH's `@deepseek-ai/dsh-mcp-client`.

## Install without activation

The latest published release at preparation of this change is **`v0.1.6`**. Version `0.1.7` is the blocked compatibility candidate for upstream DSH `0.1.6-alpha.1`. The fork interface tracked by cloga/deepseek-harness#33 has merged with green CI, and the `0.1.5` Desktop Release is now accepted immutable with its remote managed Check passing. This bundle must not merge or publish until Windows Ops `0.1.5` is repinned and the coordinator explicitly clears [cloga/dsh-windows-ops#161](https://github.com/cloga/dsh-windows-ops/issues/161). After that clearance, a `main` merge whose declared version has no tag will run the full certification gate and create the annotated tag and Release itself. The command below is for use **only after that Release and its checksum manifest exist and verify**:

```powershell
dsh plugin --profile web add github:cloga/dsh-playwright-host#v0.1.7
```

The previous reviewed release remains available as `github:cloga/dsh-playwright-host#v0.1.6`. An unpinned `github:cloga/dsh-playwright-host` install follows the moving default branch and is development-only, not reviewed deployment evidence.

This stages the bundle in the Web Profile. **Do not restart or replace a running DSH Host while other Sessions are live.** Before restart, enumerate the current running Sessions and obtain explicit user acceptance of that exact interruption list; if the set changes, ask again. A Host restart is required before the global tools appear.

Inspect the composed configuration before activation:

```powershell
dsh --profile web --dump-config
```

The composed tree must contain one `mcp-playwright` row using `@deepseek-ai/dsh-mcp-client`, exact `@playwright/mcp@0.0.80`, `--isolated`, and `--browser msedge`. On the reviewed 0.1.6 line, the Base Profile also owns exactly one `@deepseek-ai/dsh-mcp-resources` row and one system-prompt service; this bundle must not add duplicates.

## Compatibility certification

Version `0.1.7` adds certification against upstream DSH [`0.1.6-alpha.1`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.6-alpha.1) at immutable commit `0a15e36e7f82b6ed45af6fa9759f29b40dcd965d` and release tree `66c4c9c2053c6fcf91ad4e47d85bd77539c0b101`. It preserves every previously certified source:

| Core version | Exact certified source commit |
| --- | --- |
| `0.1.6-alpha.1` | `0a15e36e7f82b6ed45af6fa9759f29b40dcd965d` |
| `0.1.5-rc.2` | `fb2c4b9e698e30edb738bca4cf0618587db7d203` |
| `0.1.5-rc.1` | `183f08e9c6dde7e36cd2318eaee70b0da08fb35e` |
| `0.1.5-alpha.2` | `b2e3b2a0125854567a4a5fcba75782e42fe84901` |
| `0.1.5-alpha.1` | `5dda764ed3aa172535a7967b06ff95d9cbfe536a` |
| `0.1.3-alpha.1` | `d347e703908d0406b7a7ef80e3a0e594d86b2215` |
| `0.1.2-rc.1` | `a66e4702047846cdaa10c66c9d3df3951f5ea70d` |

The source-seam test accepts only those exact commit/version pairs. For each certified source, it checks that `@deepseek-ai/dsh-mcp-client` contains the stdio config and lifecycle source markers relied on by `cordis.patch.yml`, including startup readiness, fail-loud activation, effect-owned disposal, reconnect supervision, tool replacement, and per-call timeout markers. For `0.1.6-alpha.1`, it additionally locks the release tree, MCP SDK v2 dependency, Base Profile resource composition, optional resource/prompt peers, resource tools and fixtures, protocol negotiation, list-change subscription, caller cancellation, pagination-limit fixture, attributed instructions, and transport-quiescence seams.

Markers remain source certification rather than runtime behavior. A Windows contract job installs the exact upstream test closure, including the Typert generator's frozen dependency closure, compiles only the six Typert contributors used by the healthy default headless profile and their recursive TypeScript references, and uses filtered `tsdown` builds to produce their `typert.host.js` outputs. It executes the upstream MCP client/resource tests for SDK v2 initialization, capability-aware no-tools startup, tool calls, list changes, cancellation, resource listing/reading/cursors, reconnect recovery, provider and PTC cleanup, probe/child-process quiescence, and optional pagination-failure isolation. A separate Ubuntu job builds the exact upstream native system host addon, installs the session-snapshot closure, and executes the canonical recorded native/PTC resource scenarios for URI-template discovery and expansion; those upstream snapshots intentionally include Linux bash/system-prompt text and are not byte-compared on Windows. Linux release certification repeats both evidence sets before packaging.

The `0.1.5-alpha.1` → `0.1.5-alpha.2` MCP production source diff only added repeated non-empty `tools/list` continuation-cursor rejection in `syncTools`. The alpha.2/rc source tests retain those historical guard markers without describing them as runtime pagination evidence.

The `0.1.5-alpha.2` → `0.1.5-rc.1` → `0.1.5-rc.2` MCP production source diff is empty. DSH `0.1.6-alpha.1` is a real contract change: it moves to `@modelcontextprotocol/client` v2, delegates tool pagination and list-change handling to the SDK, keeps resource-only and tools-only servers connected, publishes scoped resource operations and literal server instructions through Base services, passes call cancellation through the SDK, and tightens async startup/disposal so a failed or interrupted probe cannot overlap a replacement child.

The bundle now declares reviewed `0.1.6`-line peers for the MCP client, MCP resources, and system prompt, and explicitly fixes the instruction budget and reconnect policy consumed by the Host-wide connection. It does not mount the experimental browser-use or computer-use providers, does not consume Sandbox/Shell APIs, and does not create a per-Session browser process. The upstream generic MCP bridge owns registration, route recovery, cancellation, and cleanup for the `mcp__playwright__*` tools.

## Requirements

- Upstream DSH `0.1.6-alpha.1` at the exact commit and tree above for this candidate. Earlier Host releases retain the six historical source certifications; any other version or fork must be separately verified and must satisfy the declared peer range.
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

Run all seven official source-seam certifications from an **existing** Git repository containing the exact objects, without changing its checkout:

```powershell
$env:DSH_CORE_PATH = 'C:\path\to\deepseek-harness'
try {
  foreach ($commit in @(
    '0a15e36e7f82b6ed45af6fa9759f29b40dcd965d', # 0.1.6-alpha.1
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

Both modes require matching root and mcp-client package versions. The `0.1.6-alpha.1` seam additionally requires the exact tree and matching MCP resources/Base package versions. An uncertified commit, mismatched version, incomplete source, or invalid ref configuration fails rather than falling back to the static-only test. No dependencies or Core build are needed for source-marker checks; CI separately installs and runs the exact upstream behavioral tests.

Separately, when package execution/download is authorized, Windows CI runs `npx -y @playwright/mcp@0.0.80 --version`. This reports only the pinned executable version; it is not a browser or target Host functional test.

## Release mechanics and evidence limits

`.github/workflows/test.yml` runs all seven exact Core refs on Windows and Linux, the exact `0.1.6-alpha.1` Windows behavior contract, and the canonical Ubuntu MCP resource snapshot; `release-ready` requires all three evidence sets. On a later authorized `main` push, `release-ready` invokes the reusable `.github/workflows/release.yml`: its `plan` job reads `package.json` and, when `v<version>` has no tag yet, the `release` job checks out and certifies all seven exact Core refs, repeats the `0.1.6-alpha.1` behavior and resource contracts on Linux, runs `npm pack`, writes and verifies `SHA256SUMS`, creates the **annotated** tag on that verified revision, and uses `gh release create --verify-tag` to attach the tarball and checksum manifest. A version that is already tagged publishes nothing.

The tag is created with `GITHUB_TOKEN`, which by design starts no further workflow run. A run that fails after the tag exists leaves that tag without a Release: `plan` then emits a warning instead of publishing, and that tag must be deleted before the version can be published again. The workflow never enforces repository-level release immutability: verify that setting and the resulting Release's immutable status, exact annotated tag/commit, tarball, and checksums separately before deployment. Static/local source tests do not prove hosted CI passed, a release exists, target fork compatibility, target Core Host activation, browser isolation across Sessions, or model-visible screenshots. This candidate remains blocked by [cloga/dsh-windows-ops#161](https://github.com/cloga/dsh-windows-ops/issues/161) and its [compatibility inventory](https://github.com/cloga/dsh-windows-ops/issues/161#issuecomment-5681515615). Do not call live user browser/MCP tools or restart the Host merely to establish source certification.

## Remove

```powershell
dsh plugin --profile web remove dsh-playwright-host
```

Removal is staged until the next authorized Host restart. The npm/npx cache and any separately installed Python Playwright binding are not removed by this command.

## Windows operations practice

Operational installation, fallback, and verification guidance is maintained in [`cloga/dsh-windows-ops`](https://github.com/cloga/dsh-windows-ops), especially `docs/plugins/computer-use.md` and `tools/dsh-web-smoke.py`.
