# Changelog

## 0.1.2

- Republish the rc.1 certification after enabling repository-level immutable GitHub Releases.
- Preserve the reviewed 0.1.1 bundle behavior; only release provenance metadata changes.

## 0.1.1

- Certify the bundle's static composition against official DeepSeek Harness `0.1.2-rc.1` at commit `a66e4702047846cdaa10c66c9d3df3951f5ea70d`.
- Verify the rc.1 `@deepseek-ai/dsh-mcp-client` stdio configuration consumed by `cordis.patch.yml`: server namespace, command and argument forwarding, environment and working directory, tool-call timeout, and startup-failure policy.
- Verify rc.1 lifecycle seams for initial readiness, fail-loud startup, effect-owned disposal, reconnect supervision, tool registration replacement, and per-call timeout.
- Keep runtime support Windows-only; Linux CI validates the platform-neutral official source seam only.
