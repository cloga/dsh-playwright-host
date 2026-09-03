# dsh-playwright-host

Optional Windows Profile Bundle that mounts DeepSeek Harness's built-in `@deepseek-ai/dsh-mcp-client` at **Host scope** and launches pinned Microsoft Playwright MCP with installed Microsoft Edge. The Host tool-registry layer makes tools such as `mcp__playwright__browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_take_screenshot`, `browser_console_messages`, and `browser_network_requests` visible regardless of Agent Preset.

This repository is a thin, reviewable composition bundle. Browser automation comes from [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp), and MCP bridging comes from DSH's `@deepseek-ai/dsh-mcp-client`.

## Install without activation

```powershell
dsh plugin --profile web add github:cloga/dsh-playwright-host
```

For a reviewed immutable installation, append a commit after the first release is merged:

```powershell
dsh plugin --profile web add github:cloga/dsh-playwright-host#<commit>
```

This stages the bundle in the Web Profile. **Do not restart or replace a running DSH Host while other Sessions are live.** A Host restart is required before the global tools appear; perform it only after the user explicitly accepts interruption and no protected work remains.

Inspect the composed configuration before activation:

```powershell
dsh --profile web --dump-config
```

The composed tree must contain one `mcp-playwright` row using `@deepseek-ai/dsh-mcp-client`, exact `@playwright/mcp@0.0.80`, `--isolated`, and `--browser msedge`.

## Requirements

- DeepSeek Harness with `@deepseek-ai/dsh-mcp-client` available.
- Node.js and `npx` on the Host.
- Microsoft Edge installed.
- A DSH model route with image input plus Attachment support for model-visible screenshots; accessibility snapshots work without vision.

## Scope and isolation boundary

`--isolated` prevents reuse of the user's everyday Edge profile. It does **not** create a separate MCP process for every DSH Session. One Host bundle instance owns one Playwright MCP stdio process, so concurrent Sessions can affect the same browser state, tabs, snapshot references, cookies, and close operations. Use browser tools from one Session at a time. Do not use authenticated personal profiles or consequential real-account flows.

A future Session-aware Host provider should key one BrowserContext or MCP process by `exec.agent.session.id` before concurrent use can be considered isolated. Until then, Python Playwright is the per-invocation fallback for independent verification.

## Verification

After an authorized restart, create a new Session with any Preset and confirm `mcp__playwright__browser_navigate` and related tools are present. Navigate to the existing `http://127.0.0.1:3080`, capture an accessibility snapshot and screenshot, exercise a harmless interaction, and inspect Console and failed Network requests. Do not start a replacement DSH server.

Run the static bundle contract test with:

```powershell
npm test
npx -y @playwright/mcp@0.0.80 --version
```

## Remove

```powershell
dsh plugin --profile web remove dsh-playwright-host
```

Removal is staged until the next authorized Host restart. The npm/npx cache and any separately installed Python Playwright binding are not removed by this command.

## Windows operations practice

Operational installation, fallback, and verification guidance is maintained in [`cloga/dsh-windows-ops`](https://github.com/cloga/dsh-windows-ops), especially `docs/plugins/computer-use.md` and `tools/dsh-web-smoke.py`.
