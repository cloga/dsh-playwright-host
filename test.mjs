import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const manifestUrl = new URL('./package.json', import.meta.url)
const patchUrl = new URL('./cordis.patch.yml', import.meta.url)
const readmeUrl = new URL('./README.md', import.meta.url)
const changelogUrl = new URL('./CHANGELOG.md', import.meta.url)
const dshCorePath = process.env.DSH_CORE_PATH?.trim()
const DSH_RC1_COMMIT = 'a66e4702047846cdaa10c66c9d3df3951f5ea70d'

function assertRc1Commit(commit) {
  assert.equal(commit, DSH_RC1_COMMIT, 'DSH_CORE_PATH must be the exact certified rc1 commit')
}

async function readSource(relativePath) {
  return readFile(path.join(dshCorePath, ...relativePath.split('/')), 'utf8')
}

function assertMarkers(source, markers, file) {
  for (const marker of markers) assert.ok(source.includes(marker), `${file} is missing ${marker}`)
}

test('bundle pins the reviewed MCP and isolated Edge configuration', async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const patch = await readFile(patchUrl, 'utf8')
  const readme = await readFile(readmeUrl, 'utf8')
  const changelog = await readFile(changelogUrl, 'utf8')
  assert.equal(manifest.name, 'dsh-playwright-host')
  assert.equal(manifest.version, '0.1.1')
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  for (const marker of [
    'id: mcp-playwright',
    "name: '@deepseek-ai/dsh-mcp-client'",
    'serverName: playwright',
    'transport: stdio',
    "'@playwright/mcp@0.0.80'",
    "'--isolated'",
    "'--browser'",
    "'msedge'",
    "'testing,devtools,vision'",
    'toolCallTimeoutMs: 120000',
    'failOnStartupError: true',
  ]) assert.match(patch, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(readme, /Host scope/)
  assert.match(readme, /concurrent Sessions can affect the same browser state/)
  assert.match(readme, /github:cloga\/dsh-playwright-host#v0\.1\.1/)
  assert.match(readme, /development-only/)
  assert.match(readme, /Do not restart or replace a running DSH Host/)
  assert.match(readme, /exact interruption list/)
  assert.match(readme, /0\.1\.2-rc\.1/)
  assert.match(readme, new RegExp(DSH_RC1_COMMIT))
  assert.match(changelog, /0\.1\.1/)
  assert.equal(root, path.dirname(fileURLToPath(manifestUrl)))
})

test('same-version source cannot substitute a different rc1 commit', () => {
  assert.throws(
    () => assertRc1Commit('0000000000000000000000000000000000000000'),
    /exact certified rc1 commit/,
  )
})

test('official DSH rc1 source preserves the required mcp-client stdio and lifecycle seams', {
  skip: !dshCorePath,
}, async () => {
  const head = execFileSync('git', ['-C', dshCorePath, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  assertRc1Commit(head)
  const rootManifest = JSON.parse(await readSource('package.json'))
  const mcpManifest = JSON.parse(await readSource('packages/mcp/mcp-client/package.json'))
  assert.equal(rootManifest.version, '0.1.2-rc.1')
  assert.equal(mcpManifest.name, '@deepseek-ai/dsh-mcp-client')
  assert.equal(mcpManifest.version, '0.1.2-rc.1')

  const index = await readSource('packages/mcp/mcp-client/src/index.ts')
  const transport = await readSource('packages/mcp/mcp-client/src/transport.ts')
  const connection = await readSource('packages/mcp/mcp-client/src/connection.ts')
  const tools = await readSource('packages/mcp/mcp-client/src/tools.ts')

  assertMarkers(index, [
    "export const inject = ['tools']",
    "transport: z.const('stdio')",
    'serverName: z.string().required()',
    'command: z.string().required()',
    'args: z.array(String).default([])',
    'toolCallTimeoutMs: z.number().default(DEFAULT_TOOL_CALL_TIMEOUT_MS)',
    'failOnStartupError: z.boolean().default(false)',
    'const connection = startConnection(ctx, config, reconnect)',
    'return () => connection.dispose()',
    'const outcome = await connection.ready',
    'outcome.error !== undefined && config.failOnStartupError',
  ], 'packages/mcp/mcp-client/src/index.ts')
  assertMarkers(transport, [
    "case 'stdio':",
    'return new StdioClientTransport({',
    'command: config.command',
    'args: config.args',
    'env: buildChildEnv(config.env)',
    'cwd: config.cwd',
  ], 'packages/mcp/mcp-client/src/transport.ts')
  assertMarkers(connection, [
    'toolCallTimeoutMs: config.toolCallTimeoutMs',
    'registrationFailure: \'throw\'',
    'dispose(): Promise<void>',
    'for (const dispose of disposers.values()) dispose()',
  ], 'packages/mcp/mcp-client/src/connection.ts')
  assertMarkers(tools, [
    'mcp__${serverName}__${rawName}',
    'timeout: opts.toolCallTimeoutMs',
    'for (const dispose of previous.values()) dispose()',
  ], 'packages/mcp/mcp-client/src/tools.ts')
})
