import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'

const TARGET = 'ddefc45fbc7f8e46dd73185e68295696d1297887'
const PREVIOUS = '0a15e36e7f82b6ed45af6fa9759f29b40dcd965d'
const core = process.env.DSH_CORE_PATH
const ref = process.env.DSH_CORE_REF
const target = core && (ref ?? execFileSync('git', ['--no-replace-objects', '-C', core, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()) === TARGET
async function source(file) {
  if (ref) return execFileSync('git', ['--no-replace-objects', '-C', core, 'show', `${TARGET}:${file}`], {
    encoding: 'utf8', env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0' },
  })
  return readFile(path.join(core, file), 'utf8')
}

test('official-first decisions preserve required capabilities and separate evidence limits', async () => {
  const guide = await readFile(new URL('./docs/official-first-016-alpha2.md', import.meta.url), 'utf8')
  for (const marker of [TARGET, 'retain-temporarily', '--caps', '--viewport-size', 'retirement', 'not a live DSH', 'Agent']) assert.ok(guide.includes(marker), marker)
  const patch = await readFile(new URL('./cordis.patch.yml', import.meta.url), 'utf8')
  assert.equal((patch.match(/id: mcp-playwright/g) ?? []).length, 1)
  assert.ok(!patch.includes('browser-use-playwright'), 'do not mount both ownership models')
  const workflow = await readFile(new URL('./.github/workflows/test.yml', import.meta.url), 'utf8')
  for (const marker of [TARGET, 'browser:', 'REQUIRE_BROWSER_TEST', 'npm run test:browser', 'official-browser-contract:']) assert.ok(workflow.includes(marker), marker)
})

test('runtime CI builds alpha2 exports and fails immediately on native PowerShell errors', async () => {
  const workflow = await readFile(new URL('./.github/workflows/test.yml', import.meta.url), 'utf8')
  for (const directory of ['dsh-core-contract', 'dsh-core-resources']) {
    assert.ok(workflow.includes(`--dir ${directory} run build:lib:host`), directory)
  }
  assert.ok(workflow.includes('--dir dsh-core-browser run build:native-system'))
  const lines = workflow.split('\n')
  let shell
  for (let i = 0; i < lines.length; i++) {
    if (/^      - /.test(lines[i])) shell = undefined
    if (lines[i].trim() === 'shell: pwsh') shell = 'pwsh'
    if (shell === 'pwsh' && /^          (npx|npm) /.test(lines[i])) {
      assert.equal(lines[i + 1].trim(), 'if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }', `native command line ${i + 1}`)
    }
  }
})

test('exact official provider offers Agent lifecycle but not required caps or viewport configuration', { skip: !target }, async () => {
  const provider = await source('packages/experimental/browser-use-playwright-mcp/src/index.ts')
  const runtime = await source('packages/experimental/browser-use-runtime/src/mcp.ts')
  const resources = await source('packages/experimental/browser-use-runtime/src/index.ts')
  const manifest = JSON.parse(await source('packages/experimental/browser-use-playwright-mcp/package.json'))
  assert.equal(manifest.dependencies['@playwright/mcp'], '0.0.80')
  for (const marker of ['mountSessionMcp', "'--browser', 'chromium'", "'--isolated'", 'process.execPath', 'PLAYWRIGHT_MCP_', "'--executable-path'"]) assert.ok(provider.includes(marker), marker)
  assert.ok(!provider.includes("'--caps'"))
  assert.ok(!provider.includes("'--viewport-size'"))
  const config = runtime.slice(runtime.indexOf('export const BrowserMcpConfig'), runtime.indexOf('export function validateBrowserMcpConfig'))
  assert.ok(!config.includes('caps:') && !config.includes('viewport:'))
  for (const marker of ['new Map<Agent, ClientState>()', "ctx.on('agent/created'", 'reconnect: { enabled: false }', 'await resources.dispose()', 'exec.agent !== agent']) assert.ok(runtime.includes(marker), marker)
  assert.ok(resources.includes("this.ctx.get('agents')?.get(agent.id) === agent"))
  const lifecycleTests = await source('packages/experimental/browser-use-runtime/tests/agent-disposal.spec.ts')
  assert.ok(lifecycleTests.includes('dispose'))
})

test('alpha2 keeps the consumed generic MCP production seams byte-identical to alpha1', { skip: !target || !ref }, async () => {
  // No fallback to a same-version local working tree: missing previous objects fail.
  for (const file of ['index.ts', 'connection.ts', 'transport.ts', 'tools.ts', 'server-context.ts']) {
    const relative = `packages/mcp/mcp-client/src/${file}`
    const previous = execFileSync('git', ['--no-replace-objects', '-C', core, 'show', `${PREVIOUS}:${relative}`], {
      encoding: 'utf8', env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0' },
    })
    assert.equal(await source(relative), previous, relative)
  }
})
