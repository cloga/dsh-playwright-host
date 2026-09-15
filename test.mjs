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
const DSH_016_ALPHA1_COMMIT = '0a15e36e7f82b6ed45af6fa9759f29b40dcd965d'
const DSH_016_ALPHA1_TREE = '66c4c9c2053c6fcf91ad4e47d85bd77539c0b101'
const CERTIFIED_DSH_SOURCES = new Map([
  [DSH_RC1_COMMIT, { version: '0.1.2-rc.1', label: 'rc.1' }],
  [DSH_ALPHA1_COMMIT, { version: '0.1.3-alpha.1', label: '0.1.3-alpha.1' }],
  [DSH_015_ALPHA1_COMMIT, { version: '0.1.5-alpha.1', label: '0.1.5-alpha.1' }],
  [DSH_015_ALPHA2_COMMIT, { version: '0.1.5-alpha.2', label: '0.1.5-alpha.2' }],
  [DSH_015_RC1_COMMIT, { version: '0.1.5-rc.1', label: '0.1.5-rc.1' }],
  [DSH_015_RC2_COMMIT, { version: '0.1.5-rc.2', label: '0.1.5-rc.2' }],
  [DSH_016_ALPHA1_COMMIT, { version: '0.1.6-alpha.1', label: '0.1.6-alpha.1' }],
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
  assert.equal(manifest.version, '0.1.7')
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.deepEqual(manifest.peerDependencies, {
    '@deepseek-ai/dsh-mcp-client': '>=0.1.6-alpha.1 <0.1.7-0',
    '@deepseek-ai/dsh-mcp-resources': '>=0.1.6-alpha.1 <0.1.7-0',
    '@deepseek-ai/dsh-system-prompt': '>=0.1.6-alpha.1 <0.1.7-0',
  })
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
    'maxInstructionBytes: 32768',
    'reconnect:',
    'enabled: true',
    'initialDelayMs: 500',
    'maxDelayMs: 30000',
    'maxAttempts: 10',
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
  assert.match(readme, /github:cloga\/dsh-playwright-host#v0\.1\.7/)
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
  assert.match(readme, /0\.1\.6-alpha\.1/)
  assert.match(readme, new RegExp(DSH_016_ALPHA1_COMMIT))
  assert.match(readme, new RegExp(DSH_016_ALPHA1_TREE))
  assert.match(readme, /DSH_CORE_REF/)
  assert.match(readme, /latest published release.*v0\.1\.6/)
  assert.match(readme, /cloga\/dsh-windows-ops#161/)
  assert.match(readme, /cloga\/deepseek-harness#33/)
  assert.match(changelog, /## 0\.1\.7/)
  assert.match(changelog, /0\.1\.6-alpha\.1/)
  assert.match(changelog, new RegExp(DSH_016_ALPHA1_COMMIT))
  assert.match(changelog, new RegExp(DSH_016_ALPHA1_TREE))
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
    'version: 0.1.6-alpha.1',
    DSH_RC1_COMMIT,
    DSH_ALPHA1_COMMIT,
    DSH_015_ALPHA1_COMMIT,
    DSH_015_ALPHA2_COMMIT,
    DSH_015_RC1_COMMIT,
    DSH_015_RC2_COMMIT,
    DSH_016_ALPHA1_COMMIT,
    'ref: ${{ matrix.dsh.commit }}',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core',
    'release-ready:',
    'contract:',
    'needs: [certify, contract]',
    'vitest.snapshot.config.ts',
    'mcp-pagination.expected.e2e.ts',
    'protocol.spec.ts',
    'resources.spec.ts',
    'pnpm@11.7.0',
    '--ignore-scripts',
    "--filter '@deepseek-ai/dsh-typert-generator...'",
    "--filter '@deepseek-ai/dsh-session-snapshot...'",
    'packages/typert/generator/tsconfig.json',
    "tsdown --env.DSH_BUILD_FACE host --filter '@deepseek-ai/dsh-llm'",
    'packages/subagent/subagent/lib/typert.host.js',
    'uses: ./.github/workflows/release.yml',
    "if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' && needs.release-ready.result == 'success' }}",
  ]) assert.ok(testWorkflow.includes(marker), `test workflow omits ${marker}`)
  for (const marker of [
    'on:\n  workflow_call:',
    'name: plan',
    'name: release',
    'Decide whether the declared version is still unreleased',
    'if git rev-parse --verify --quiet "refs/tags/$tag"',
    'echo "release=false" >> "$GITHUB_OUTPUT"',
    'echo "release=true" >> "$GITHUB_OUTPUT"',
    'needs: [plan]',
    "if: ${{ needs.plan.outputs.release == 'true' }}",
    'test "${{ needs.plan.outputs.tag }}" = "v$version"',
    'test "${{ needs.plan.outputs.sha }}" = "$(git rev-parse HEAD)"',
    DSH_RC1_COMMIT,
    DSH_ALPHA1_COMMIT,
    DSH_015_ALPHA1_COMMIT,
    DSH_015_ALPHA2_COMMIT,
    DSH_015_RC1_COMMIT,
    DSH_015_RC2_COMMIT,
    DSH_016_ALPHA1_COMMIT,
    'path: dsh-core-015-alpha2',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-015-alpha2',
    'path: dsh-core-015-alpha1',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-015-alpha1',
    'path: dsh-core-015-rc1',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-015-rc1',
    'path: dsh-core-015-rc2',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-015-rc2',
    'path: dsh-core-016-alpha1',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-016-alpha1',
    'Verify DSH 0.1.6 MCP v2 behavior',
    'path: dsh-core-rc1',
    'path: dsh-core-alpha1',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-rc1',
    'DSH_CORE_PATH: ${{ github.workspace }}/dsh-core-alpha1',
    'git tag -a "$tag" -m "Release $tag"',
    'test "$(git cat-file -t "refs/tags/$tag")" = tag',
    'git push origin "refs/tags/$tag"',
    'npm test',
    'npm pack --pack-destination artifacts',
    'sha256sum -- *.tgz > SHA256SUMS',
    'gh release create "$tag" artifacts/*.tgz artifacts/SHA256SUMS',
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

  const indexMarkers = [
    "export const inject = ['tools']",
    "transport: z.const('stdio')",
    'serverName: z.string().required()',
    'command: z.string().required()',
    'args: z.array(String).default([])',
    'toolCallTimeoutMs: z.number().default(DEFAULT_TOOL_CALL_TIMEOUT_MS)',
    'failOnStartupError: z.boolean().default(false)',
    'const connection = startConnection(ctx, config, reconnect)',
    'const outcome = await connection.ready',
    'outcome.error !== undefined && config.failOnStartupError',
  ]
  if (commit === DSH_016_ALPHA1_COMMIT) {
    indexMarkers.push(
      'maxInstructionBytes: z.number().step(1).min(1).default(DEFAULT_MAX_INSTRUCTION_BYTES)',
      'registerServerContext(ctx, config.serverName, connection)',
      "ctx.on('internal/plugin', (fiber) =>",
      "ctx.effect(() => dispose, 'mcp-client.connection')",
    )
  } else {
    indexMarkers.push('return () => connection.dispose()')
  }
  assertMarkers(index, indexMarkers, 'packages/mcp/mcp-client/src/index.ts')
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
  if (commit === DSH_016_ALPHA1_COMMIT) {
    const tree = execFileSync('git', ['--no-replace-objects', '-C', dshCorePath, 'show', '-s', '--format=%T', commit], {
      encoding: 'utf8',
      env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0' },
    }).trim()
    assert.equal(tree, DSH_016_ALPHA1_TREE, '0.1.6-alpha.1 source tree must match the reviewed release tree')

    const baseManifest = JSON.parse(await readSource('packages/bundle/base/package.json', commit))
    const resourcesManifest = JSON.parse(await readSource('packages/mcp/mcp-resources/package.json', commit))
    assert.equal(resourcesManifest.version, certification.version)
    assert.equal(baseManifest.version, certification.version)
    assert.equal(baseManifest.dependencies['@deepseek-ai/dsh-mcp-resources'], 'workspace:^')
    assert.equal(mcpManifest.dependencies['@modelcontextprotocol/client'], '2.0.0')
    assert.equal(mcpManifest.peerDependencies['@deepseek-ai/dsh-mcp-resources'], 'workspace:^')
    assert.equal(mcpManifest.peerDependencies['@deepseek-ai/dsh-system-prompt'], 'workspace:^')
    assert.equal(mcpManifest.peerDependenciesMeta['@deepseek-ai/dsh-mcp-resources'].optional, true)
    assert.equal(mcpManifest.peerDependenciesMeta['@deepseek-ai/dsh-system-prompt'].optional, true)

    const serverContext = await readSource('packages/mcp/mcp-client/src/server-context.ts', commit)
    const resourcesIndex = await readSource('packages/mcp/mcp-resources/src/index.ts', commit)
    const resourceTools = await readSource('packages/mcp/mcp-resources/src/tools.ts', commit)
    const basePatch = await readSource('packages/bundle/base/cordis.patch.yml', commit)
    const protocolTest = await readSource('packages/mcp/mcp-client/tests/protocol.spec.ts', commit)
    const lifecycleTest = await readSource('packages/mcp/mcp-client/tests/negotiation-lifecycle.spec.ts', commit)
    const resourceFixture = await readSource('packages/mcp/mcp-client/tests/fixtures/resources-server.ts', commit)
    const paginationFixture = await readSource('packages/mcp/mcp-client/tests/fixtures/pagination-limit-server.ts', commit)
    const paginationProfileTest = await readSource('apps/cli/tests/profiles/headless/tests/mcp-pagination.expected.e2e.ts', commit)
    const profileCompositionTest = await readSource('apps/cli/tests/profile-mcp.spec.ts', commit)

    assertMarkers(connection, [
      "versionNegotiation: { mode: 'auto' }",
      'listChanged:',
      'autoRefresh: false',
      'signal: exec.signal',
      "case 'resources/list':",
      "case 'resources/templates/list':",
      "case 'resources/read':",
      'server instructions exceed maxInstructionBytes',
      'transport closure could not be confirmed during disposal',
    ], 'packages/mcp/mcp-client/src/connection.ts (0.1.6-alpha.1)')
    assertMarkers(tools, [
      "client.getServerCapabilities()?.tools === undefined",
      "{ tools: [] }",
      "client.listTools(undefined, { cacheMode: 'refresh' })",
      'execution.signal',
      'task-based execution, which this bridge does not support',
      'structuredContent',
    ], 'packages/mcp/mcp-client/src/tools.ts (0.1.6-alpha.1)')
    assertMarkers(serverContext, [
      "ctx.inject(['mcpResources']",
      'inner.mcpResources.register(server, connection.resources)',
      "ctx.inject(['systemPrompt']",
      'text: () => connection.instructions()',
    ], 'packages/mcp/mcp-client/src/server-context.ts')
    assertMarkers(resourcesIndex, [
      'class McpResourceRuntime extends Service',
      'register(server: string, provider: McpResourceProvider)',
      'if (layer.servers.isEmpty()) disposal = layer.disposeTools!()',
      'MCP resource server "${server}" is unavailable',
    ], 'packages/mcp/mcp-resources/src/index.ts')
    assertMarkers(resourceTools, [
      "name: 'list_mcp_resources'",
      "name: 'list_mcp_resource_templates'",
      "name: 'read_mcp_resource'",
      "method: 'resources/list'",
      "method: 'resources/templates/list'",
      "method: 'resources/read'",
    ], 'packages/mcp/mcp-resources/src/tools.ts')
    assertMarkers(basePatch, [
      'id: mcp-resources',
      "name: '@deepseek-ai/dsh-mcp-resources'",
      'id: tools',
      "name: '@deepseek-ai/dsh-tools'",
      'id: system-prompt',
      "name: '@deepseek-ai/dsh-system-prompt'",
    ], 'packages/bundle/base/cordis.patch.yml')
    assertMarkers(protocolTest, [
      'keeps a resource-only server connected without requesting tools',
      'keeps shared resource tools for a configured server without resource capability',
      'reads resources and preserves explicit list and template cursors through the SDK',
      'updates tools through the SDK modern list-change subscription',
      'delivers caller cancellation to an executing modern tool',
    ], 'packages/mcp/mcp-client/tests/protocol.spec.ts')
    assertMarkers(lifecycleTest, [
      'reaps the probe before starting the serving process',
      'disposes during a probe without starting or retaining a serving process',
      'stops retries when a failed probe cannot confirm transport cleanup',
    ], 'packages/mcp/mcp-client/tests/negotiation-lifecycle.spec.ts')
    assertMarkers(resourceFixture, [
      "new ResourceTemplate('memo://greeting/{name}'",
      "text: `Hello, ${String(variables.name)}.`",
      'MCP_RESOURCE_INSTRUCTION: keep {{braces}} literal.',
    ], 'packages/mcp/mcp-client/tests/fixtures/resources-server.ts')
    assertMarkers(paginationFixture, [
      "capabilities: { tools: {} }",
      'nextCursor: String(++requests)',
    ], 'packages/mcp/mcp-client/tests/fixtures/pagination-limit-server.ts')
    assertMarkers(paginationProfileTest, [
      'warns when MCP discovery exceeds the SDK page limit and completes the headless task',
      'exceeded listMaxPages',
    ], 'apps/cli/tests/profiles/headless/tests/mcp-pagination.expected.e2e.ts')
    assertMarkers(profileCompositionTest, [
      'carries one shared resource consumer without a server',
      "expect(rows.filter(row => row.name === '@deepseek-ai/dsh-mcp-client')).toEqual([])",
    ], 'apps/cli/tests/profile-mcp.spec.ts')
  }
})
