# Repository agent rules

- Use the exact `cloga` GitHub identity for every write.
- Load credentials into the current process only from a user-designated trusted `.env`; never print or commit them.
- Keep Issue → `cloga-<task-slug>` branch → verification → pull request → merge → sync.
- Never push directly to `main`.
- Keep Microsoft Playwright MCP pinned and update the Windows Ops practice in `cloga/dsh-windows-ops` whenever installation, lifecycle, security, or compatibility guidance changes.
- Never restart a live DSH Host without direct user authorization after checking for active Sessions.
