# dsh-playwright-host

Optional Windows Profile Bundle that mounts DeepSeek Harness's built-in
`@deepseek-ai/dsh-mcp-client` at **Host scope** and launches pinned Microsoft
Playwright MCP with installed Microsoft Edge. It is a thin composition, not
another browser/MCP implementation. Tools use the `mcp__playwright__*` namespace.

## Official-first decision for 0.1.8

The preferred future replacement is official DSH Browser Use's Playwright MCP
provider: it owns resources by exact live Agent, unlike this shared Host process.
However, the exact official `0.1.6-alpha.2` provider does not expose this bundle's
`--caps testing,devtools,vision` or `--viewport-size 1440x900`. A real isolated
headless Edge comparison verifies the testing/coordinate-tool and viewport gaps.
We **retain-temporarily** the unchanged thin composition rather than silently
drop required behavior. See the [evidence, decisions and retirement conditions](docs/official-first-016-alpha2.md).

This does not claim equivalent safety: **concurrent Sessions can affect the same browser state**,
tabs, cookies, references and close operations. Use one Session at a time. Never
mount the shared bundle and official Agent-owned provider simultaneously.

## Install without activation

The previous published release is **`v0.1.7`**. Version `0.1.8` is the current
compatibility candidate; use its installation command only after the immutable
Release tarball and `SHA256SUMS` exist and their bytes verify:

```powershell
dsh plugin --profile web add https://github.com/cloga/dsh-playwright-host/releases/download/v0.1.8/dsh-playwright-host-0.1.8.tgz
```

Historical source selectors `github:cloga/dsh-playwright-host#v0.1.7` and
`github:cloga/dsh-playwright-host#v0.1.6` identify earlier reviews; prefer a verified
Release tarball for repeatable installation. Unpinned Git source is development-only.
No npm publication channel is declared by this private bundle.

The old preparation hold involving cloga/deepseek-harness#33 and
[cloga/dsh-windows-ops#161](https://github.com/cloga/dsh-windows-ops/issues/161)
was historical v0.1.7 coordination, not proof that its now-published Release is
unavailable. Current alpha.2 qualification is tracked by
[issue #20](https://github.com/cloga/dsh-playwright-host/issues/20) and
[Windows Ops #181](https://github.com/cloga/dsh-windows-ops/issues/181).

**Do not restart or replace a running DSH Host while other Sessions are live.**
Before any interrupting restart, enumerate current Sessions and obtain explicit
approval for that exact interruption list. Installation is not activation or
permission to interrupt. Desktop-owned profiles use their native supported package
manager; do not bypass a reserved-profile CLI refusal or copy node_modules.

For the legacy CLI profile, inspect composition using the installed Core's documented
config-dump command before activation. Alpha.2 supports `dsh web`; older supported
CLI syntax is `dsh --profile web --dump-config`. The resulting composition must
contain one `mcp-playwright` row, MCP `0.0.80`, `--isolated`, `--browser msedge`,
all reviewed caps/viewport flags and timeout/reconnect settings. Base owns MCP
resources, tools and systemPrompt; do not add duplicate services.

## Exact source certification

Version `0.1.8` adds official `0.1.6-alpha.2` commit
`ddefc45fbc7f8e46dd73185e68295696d1297887`, tree
`5aca5ee6f8dfd110dc3ae199fbddf8a0f606625f`, retaining all earlier certified sources.
The seven legacy source qualifications remain historical; dependency peers admit
the reviewed `0.1.6` line, not an arbitrary older runtime.

| Core version | Exact certified source commit |
| --- | --- |
| `0.1.6-alpha.2` | `ddefc45fbc7f8e46dd73185e68295696d1297887` |
| `0.1.6-alpha.1` | `0a15e36e7f82b6ed45af6fa9759f29b40dcd965d` (tree `66c4c9c2053c6fcf91ad4e47d85bd77539c0b101`) |
| `0.1.5-rc.2` | `fb2c4b9e698e30edb738bca4cf0618587db7d203` |
| `0.1.5-rc.1` | `183f08e9c6dde7e36cd2318eaee70b0da08fb35e` |
| `0.1.5-alpha.2` | `b2e3b2a0125854567a4a5fcba75782e42fe84901` |
| `0.1.5-alpha.1` | `5dda764ed3aa172535a7967b06ff95d9cbfe536a` |
| `0.1.3-alpha.1` | `d347e703908d0406b7a7ef80e3a0e594d86b2215` |
| `0.1.2-rc.1` | `a66e4702047846cdaa10c66c9d3df3951f5ea70d` |

The consumed generic MCP production files (`index`, `transport`, `connection`,
`tools`, `server-context`) are byte-identical from 0.1.6-alpha.1 to alpha.2;
package versions and an HTTP test fixture changed. Alpha.2's new runtime dependency
resolution and plugin-manager unloading still require real lifecycle qualification;
unchanged bridge source is not a blanket compatibility claim.

The 0.1.6 contract checks lock MCP SDK v2, Base resource composition, startup
readiness, cancellation, pagination and resources, attributed instructions,
reconnect/tool replacement and transport quiescence. Earlier repeated-cursor source
guards landed in 0.1.5-alpha.2 and remained in rc.1/rc.2. Those marker checks
are not behavioral tests.

## Local and CI verification

```powershell
$env:DSH_CORE_PATH = 'C:\path\to\deepseek-harness'
$env:DSH_CORE_REF = 'ddefc45fbc7f8e46dd73185e68295696d1297887'
npm test
```

Repeat for all eight exact sources above. Optional `DSH_CORE_REF` reads immutable
Git objects only; it does not fetch/checkout/reset/write Core. Without it, checkout
mode requires a clean exact-commit source checkout. Blank refs, unsupported commits,
missing objects and version/tree mismatches fail rather than become a skipped test.
Unset both variables runs local static tests only, with source tests marked skipped.

Real isolated browser qualification (uses an already installed exact MCP/Edge):

```powershell
$env:PLAYWRIGHT_MCP_CLI = 'C:\approved\mcp\cli.js'
$env:DSH_BROWSER_EXECUTABLE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:REQUIRE_BROWSER_TEST = '1'
npm run test:browser
```

The test does not download, launch a DSH server, access a personal browser profile,
or exercise real accounts. It starts its own pinned MCP/Edge processes and removes
only its scratch output. Both argv comparisons are headless; they do not certify
headed Desktop UI or real per-Session DSH browser mounts. Screenshot content is
asserted as PNG image data, not displayed as private content in logs.

CI preserves all eight Windows/Linux source checks, both 0.1.6 MCP behavior and
Ubuntu native/PTC resource snapshots. The exact alpha.2 official Browser Use
provider/runtime/registry suites run on Windows and Linux. A separate required
Windows job performs the real Edge comparison; missing browser requirements fail,
not skip. The release caller requires every job. Linux source tests alone do not
establish Windows browser acceptance; MCP `--version` is only executable evidence.

Alpha.2 headless process tests need the **built Host package exports**, not only
selected Typert contributors: its runtime dependency resolver no longer obtains
all dynamically loaded profile packages from the source aliases used by alpha.1.
CI installs the exact frozen workspace with lifecycle scripts disabled, then runs
the official `build:lib:host` script without modifying upstream source, and uses
`DSH_EXAMPLE_MODE=lib` like the official recorded-process gates. Linux
persisted-resume and snapshot tests also run `build:native-system` for file locking.
Native PowerShell commands fail immediately before subsequent build/file checks.

## Isolation, management and migration limits

`--isolated` protects the everyday browser profile, not concurrent DSH Sessions.
Official Browser Use uses exact live Agent-owned scopes/processes and serializes
operations; that is the retirement foundation, not a future private session-id map.
It initializes future Agents, changes the tool namespace to `mcp__playwright-mcp__*`,
and deliberately disables silent reconnect. Preserve explicit user testing/browser
requirements before switching; the migration must revise tool filters/references,
remove the shared row, verify one-owner disposal and multi-Session independence,
and retain rollback. No live Sessions are adopted by this release.

After separately approved installation/activation, inspect the existing Harness GUI
(usually `http://127.0.0.1:3080` for Web) with harmless interaction, screenshot,
console and network checks. Do not start a replacement server for GUI evidence.
A successful source test, browser fixture or import does not prove live Host activation.

## Release mechanics

A qualified main merge invokes `.github/workflows/release.yml`; no manual tag push
bypasses the matrix. The workflow rechecks exact source/runtime contracts, packs,
verifies checksums, creates an annotated tag, uploads a draft Release, downloads
and verifies its bytes, then publishes and requires immutable status. The workflow
is serialized across versions. A pre-existing tag without a published Release is a
hard failure for reviewed recovery, not permission to delete/move/reuse an immutable
tag. Already-published versions are not republished. Never rewrite old Releases.

## Remove

```powershell
dsh plugin --profile web remove dsh-playwright-host
```

Use the manager appropriate to the actual profile. Alpha.2 runtime unload requires
an active HMR/profile-management service; package replacement may still need a
restart to load a new code generation. Removal does not delete npm/npx caches or
separately installed Python Playwright. No automatic restart is authorized.

## Windows operations practice

[`cloga/dsh-windows-ops`](https://github.com/cloga/dsh-windows-ops) owns deployment
qualification and install/recovery guidance. Its official-first upgrade inventory
tracks when this temporary shared entry can safely retire; installation, release,
source compatibility and runtime acceptance are separate evidence layers.
