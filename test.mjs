import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const manifestUrl = new URL('./package.json', import.meta.url)
const patchUrl = new URL('./cordis.patch.yml', import.meta.url)
const readmeUrl = new URL('./README.md', import.meta.url)
const changelogUrl = new URL('./CHANGELOG.md', import.meta.url)
const testWorkflowUrl = new URL('./.github/workflows/test.yml', import.meta.url)
const releaseWorkflowUrl = new URL('./.github/workflows/release.yml', import.meta.url)
const agentsUrl = new URL('./AGENTS.md', import.meta.url)
const dshCorePath = process.env.DSH_CORE_PATH?.trim()
const dshCoreRef = process.env.DSH_CORE_REF?.trim()
assert.notEqual(dshCorePath, '', 'DSH_CORE_PATH must be nonempty when configured')
assert.notEqual(dshCoreRef, '', 'DSH_CORE_REF must be nonempty when configured')
const DSH_RC1_COMMIT = 'a66e4702047846cdaa10c66c9d3df3951f5ea70d'
const DSH_ALPHA1_COMMIT = 'd347e703908d0406b7a7ef80e3a0e594d86b2215'
const DSH_015_ALPHA1_COMMIT = '5dda764ed3aa172535a7967b06ff95d9cbfe536a'
const DSH_015_ALPHA2_COMMIT = 'b2e3b2a0125854567a4a5fcba75782e42fe84901'
const DSH_015_RC1_COMMIT = '183f08e9c6dde7e36cd2318eaee70b0da08fb35e'
const DSH_015_RC2_COMMIT = 'fb2c4b9e698e30edb738bca4cf0618587db7d203'
const CERTIFIED_DSH_SOURCES = new Map([
  [DSH_RC1_COMMIT, { version: '0.1.2-rc.1', label: 'rc.1' }],
  [DSH_ALPHA1_COMMIT, { version: '0.1.3-alpha.1', label: '0.1.3-alpha.1' }],
  [DSH_015_ALPHA1_COMMIT, { version: '0.1.5-alpha.1', label: '0.1.5-alpha.1' }],
  [DSH_015_ALPHA2_COMMIT, { version: '0.1.5-alpha.2', label: '0.1.5-alpha.2' }],
  [DSH_015_RC1_COMMIT, { version: '0.1.5-rc.1', label: '0.1.5-rc.1' }],
  [DSH_015_RC2_COMMIT, { version: '0.1.5-rc.2', label: '0.1.5-rc.2' }],
])
// The repeated non-empty tools/list continuation-cursor guard landed in 0.1.5-alpha.2
// and is unchanged in both 0.1.5-rc sources.
const CURSOR_GUARD_SOURCES = new Set([DSH_015_ALPHA2_COMMIT, DSH_015_RC1_COMMIT, DSH_015_RC2_COMMIT])

function certifiedSource(commit) {
  const certification = CERTIFIED_DSH_SOURCES.get(commit)
  assert.ok(certification, 'DSH_CORE_PATH must be an exact certified DSH commit')
  return certification
}

function sourceCommit(corePath, coreRef) {
  if (coreRef !== undefined) {
    assert.ok(corePath, 'DSH_CORE_REF requires DSH_CORE_PATH to an existing Git repository')
    assert.match(coreRef, /^[0-9a-f]{40}$/, 'DSH_CORE_REF must be a full certified commit SHA, not a moving ref')
    certifiedSource(coreRef)
    return coreRef
  }
  const status = execFileSync('git', ['--no-replace-objects', '-C', corePath, 'status', '--porcelain', '--untracked-files=no'], {
    encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  }).trim()
  assert.equal(status, '', 'DSH source checkout must have no tracked modifications; use exact DSH_CORE_REF for immutable blob inspection')
  return execFileSync('git', ['--no-replace-objects', '-C', corePath, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
}

async function readSource(relativePath, commit) {
  if (dshCoreRef !== undefined) {
    // Read immutable blobs, not HEAD or working-tree files. Never checkout/reset/fetch.
    return execFileSync('git', ['--no-replace-objects', '-C', dshCorePath, 'show', `${commit}:${relativePath}`], {
      encoding: 'utf8',
      env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0' },
    })
  }
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
  const agents = await readFile(agentsUrl, 'utf8')
  const testWorkflow = (await readFile(testWorkflowUrl, 'utf8')).replaceAll('\r\n', '\n')
  const releaseWorkflow = (await readFile(releaseWorkflowUrl, 'utf8')).replaceAll('\r\n', '\n')
  assert.equal(manifest.name, 'dsh-playwright-host')
  assert.equal(manifest.version, '0.1.6')
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  for (const marker of [
    'id: mcp-playwright',
    "name: '@deepseek-ai/dsh-mcp-client'",
    'serverName: playwright',
    'transport: stdio',
    'command: npx',
    "'@playwright/mcp@0.0.80'",
    "'--isolated'",
    "'--browser'",
    "'msedge'",
    "'testing,devtools,vision'",
    "'--viewport-size'",
    "'1440x900'",
    'toolCallTimeoutMs: 120000',
    'failOnStartupError: true',
  ]) assert.match(patch, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.ok(patch.replaceAll('\r\n', '\n').includes(`        args:
          - '-y'
          - '@playwright/mcp@0.0.80'
          - '--isolated'
          - '--browser'
          - 'msedge'
          - '--caps'
          - 'testing,devtools,vision'
          - '--viewport-size'
          - '1440x900'`), 'cordis.patch.yml must preserve the reviewed Playwright argument order')
  assert.match(readme, /Host scope/)
  assert.match(readme, /concurrent Sessions can affect the same browser state/)
  assert.match(readme, /github:cloga\/dsh-playwright-host#v0\.1\.6/)
  assert.match(readme, /development-only/)
  assert.match(readme, /Do not restart or replace a running DSH Host/)
  assert.match(readme, /exact interruption list/)
  assert.match(readme, /0\.1\.2-rc\.1/)
  assert.match(readme, new RegExp(DSH_RC1_COMMIT))
  assert.match(readme, /0\.1\.3-alpha\.1/)
  assert.match(readme, new RegExp(DSH_ALPHA1_COMMIT))
  assert.match(readme, /0\.1\.5-alpha\.1/)
  assert.match(readme, new RegExp(DSH_015_ALPHA1_COMMIT))
  assert.match(readme, /0\.1\.5-alpha\.2/)
  assert.match(readme, new RegExp(DSH_015_ALPHA2_COMMIT))
  assert.match(readme, /0\.1\.5-rc\.1/)
  assert.match(readme, new RegExp(DSH_015_RC1_COMMIT))
  assert.match(readme, /0\.1\.5-rc\.2/)
  assert.match(readme, new RegExp(DSH_015_RC2_COMMIT))
  assert.match(readme, /DSH_CORE_REF/)
  assert.match(readme, /latest published release.*v0\.1\.5/)
  assert.match(changelog, /## 0\.1\.6/)
  assert.match(changelog, /0\.1\.5-rc\.2/)
  assert.match(changelog, new RegExp(DSH_015_RC2_COMMIT))
  assert.match(changelog, /0\.1\.5-rc\.1/)
  assert.match(changelog, new RegExp(DSH_015_RC1_COMMIT))
  assert.match(changelog, /## 0\.1\.5/)
  assert.match(changelog, /0\.1\.5-alpha\.2/)
  assert.match(changelog, new RegExp(DSH_015_ALPHA2_COMMIT))
  for (const [commit, { version }] of CERTIFIED_DSH_SOURCES) {
    assert.ok(agents.includes(commit) && agents.includes(version), `AGENTS.md omits ${version} certification`)
    assert.ok(testWorkflow.includes(`version: ${version}\n            commit: ${commit}`), `test workflow mismatches ${version} certification`)
  }
  assert.match(changelog, /## 0\.1\.4/)
  assert.match(changelog, /0\.1\.5-alpha\.1/)
  assert.match(changelog, new RegExp(DSH_015_ALPHA1_COMMIT))
  assert.match(changelog, /## 0\.1\.3/)
  assert.match(changelog, /0\.1\.2/)
  assert.match(changelog, /0\.1\.3-alpha\.1/)
  assert.match(changelog, new RegExp(DSH_ALPHA1_COMMIT))
  for (const marker of [
    'version: 0.1.2-rc.1',
    'version: 0.1.3-alpha.1',
    'version: 0.1.5-alpha.1',
    'version: 0.1.5-alpha.2',
    'version: 0.1.5-rc.1',
    'version: 0.1.5-rc.2',
    DSH_RC1_COMMIT,
    DSH_ALPHA1_COMMIT,
    DSH_015_ALPHA1_COMMIT,
    DSH_015_ALPHA2_COMMIT,
    DSH_015_RC1_COMMIT,
    DSH_015_RC2_COMMIT,
    'ref: ${{ matrix.dsh.commit }}',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core',
  ]) assert.ok(testWorkflow.includes(marker), `test workflow omits ${marker}`)
  for (const marker of [
    "tags:\n      - 'v*'",
    DSH_RC1_COMMIT,
    DSH_ALPHA1_COMMIT,
    DSH_015_ALPHA1_COMMIT,
    DSH_015_ALPHA2_COMMIT,
    DSH_015_RC1_COMMIT,
    DSH_015_RC2_COMMIT,
    'path: dsh-core-015-alpha2',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-015-alpha2',
    'path: dsh-core-015-alpha1',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-015-alpha1',
    'path: dsh-core-015-rc1',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-015-rc1',
    'path: dsh-core-015-rc2',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-015-rc2',
    'path: dsh-core-rc1',
    'path: dsh-core-alpha1',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-rc1',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-alpha1',
    'git cat-file -t "refs/tags/$GITHUB_REF_NAME"',
    'npm test',
    'npm pack --pack-destination artifacts',
    'sha256sum -- *.tgz > SHA256SUMS',
    'gh release create "$GITHUB_REF_NAME" artifacts/*.tgz artifacts/SHA256SUMS',
  ]) assert.ok(releaseWorkflow.includes(marker), `release workflow omits ${marker}`)
  assert.equal(root, path.dirname(fileURLToPath(manifestUrl)))
})

test('same-version source cannot substitute a different certified commit', () => {
  assert.throws(
    () => certifiedSource('0000000000000000000000000000000000000000'),
    /exact certified DSH commit/,
  )
})

test('read-only source refs require a repository and a full certified commit', () => {
  assert.throws(() => sourceCommit(undefined, DSH_015_ALPHA2_COMMIT), /DSH_CORE_REF requires DSH_CORE_PATH/)
  for (const ref of ['', 'HEAD', 'dsh-v0.1.5-alpha.2', DSH_015_ALPHA2_COMMIT.slice(0, 12)]) {
    assert.throws(() => sourceCommit('unused-repository', ref), /full certified commit SHA/)
  }
  assert.throws(() => sourceCommit('unused-repository', '0'.repeat(40)), /exact certified DSH commit/)
  for (const commit of CERTIFIED_DSH_SOURCES.keys()) {
    assert.equal(sourceCommit('unused-repository', commit), commit)
  }
})

test('explicitly blank source configuration fails rather than skipping', () => {
  for (const key of ['DSH_CORE_PATH', 'DSH_CORE_REF']) {
    const env = { ...process.env }
    delete env.DSH_CORE_PATH
    delete env.DSH_CORE_REF
    env[key] = '   '
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env, encoding: 'utf8' })
    assert.equal(child.error, undefined)
    assert.notEqual(child.status, 0)
    assert.ok(child.stderr.includes(`${key} must be nonempty`))
  }
})

test('checkout mode refuses staged modifications before reading source', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'playwright-source-dirty-'))
  try {
    execFileSync('git', ['init', '--quiet', fixture])
    await writeFile(path.join(fixture, 'package.json'), '{}\n')
    execFileSync('git', ['-C', fixture, 'add', 'package.json'])
    assert.throws(() => sourceCommit(fixture, undefined), /no tracked modifications/)
  } finally {
    await rm(fixture, { recursive: true, force: true })
  }
})

test('official certified DSH source preserves the required mcp-client stdio and lifecycle seams', {
  skip: !dshCorePath && dshCoreRef === undefined,
}, async () => {
  const commit = sourceCommit(dshCorePath, dshCoreRef)
  const certification = certifiedSource(commit)
  const rootManifest = JSON.parse(await readSource('package.json', commit))
  const mcpManifest = JSON.parse(await readSource('packages/mcp/mcp-client/package.json', commit))
  assert.equal(rootManifest.version, certification.version, `root package must match certified ${certification.label} version`)
  assert.equal(mcpManifest.name, '@deepseek-ai/dsh-mcp-client')
  assert.equal(mcpManifest.version, certification.version, `mcp-client must match certified ${certification.label} version`)

  const index = await readSource('packages/mcp/mcp-client/src/index.ts', commit)
  const transport = await readSource('packages/mcp/mcp-client/src/transport.ts', commit)
  const connection = await readSource('packages/mcp/mcp-client/src/connection.ts', commit)
  const tools = await readSource('packages/mcp/mcp-client/src/tools.ts', commit)

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
  if (CURSOR_GUARD_SOURCES.has(commit)) {
    // This checks the reviewed source markers, not pagination behavior.
    assertMarkers(tools, [
      'const seenCursors = new Set<string>()',
      'cursor = response.nextCursor',
      'if (seenCursors.has(cursor))',
      'server repeated a tools/list continuation cursor',
      'seenCursors.add(cursor)',
    ], `packages/mcp/mcp-client/src/tools.ts (${certification.label} cursor guard)`)
  }
})
