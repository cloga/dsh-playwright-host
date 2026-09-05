# Repository agent rules

- Use the exact `cloga` GitHub identity for every write.
- Load credentials into the current process only from a user-designated trusted `.env`; never print or commit them.
- Keep Issue → `cloga-<task-slug>` branch → verification → pull request → merge → sync.
- Never push directly to `main`.
- Keep Microsoft Playwright MCP pinned and update the Windows Ops practice in `cloga/dsh-windows-ops` whenever installation, lifecycle, security, or compatibility guidance changes.
- Version `0.1.2` retains certification for official DSH `0.1.2-rc.1` at commit `a66e4702047846cdaa10c66c9d3df3951f5ea70d` and also certifies DSH Core `0.1.3-alpha.1` at commit `d347e703908d0406b7a7ef80e3a0e594d86b2215`; run `npm test` with `DSH_CORE_PATH` set to the exact source checkout for each claim before changing it.
- Source-seam certification must accept only an explicitly certified commit/version pair and assert the root and `@deepseek-ai/dsh-mcp-client` versions plus every stdio config and lifecycle marker consumed by `cordis.patch.yml`. Windows CI owns runtime applicability; Linux may certify only the platform-neutral source seam.
- Preserve the shared MCP-process caveat: `--isolated` protects the personal browser profile but does not isolate concurrent DSH Sessions from each other.
- Never restart a live DSH Host without direct user authorization after checking for active Sessions.
