// Opt-in real upstream MCP/Edge smoke; no DSH process or real user profile is touched.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createInterface } from 'node:readline'
import path from 'node:path'
import { test } from 'node:test'

const cli = process.env.PLAYWRIGHT_MCP_CLI
const browser = process.env.DSH_BROWSER_EXECUTABLE
const required = process.env.REQUIRE_BROWSER_TEST === '1'
if (required && (!cli || !browser)) throw new Error('Required browser smoke needs PLAYWRIGHT_MCP_CLI and DSH_BROWSER_EXECUTABLE')

for (const mode of ['retained-bundle', 'official-defaults']) test(`pinned MCP Edge smoke: ${mode}`, {
  skip: !cli || !browser,
  timeout: 90_000,
}, async () => {
  const manifest = JSON.parse(await readFile(path.join(path.dirname(cli), 'package.json'), 'utf8'))
  assert.equal(manifest.name, '@playwright/mcp')
  assert.equal(manifest.version, '0.0.80')
  const scratch = await mkdtemp(path.join(tmpdir(), 'dsh-playwright-browser-'))
  const args = mode === 'retained-bundle'
    ? [cli, '--isolated', '--browser', 'msedge', '--caps', 'testing,devtools,vision', '--viewport-size', '1440x900']
    : [cli, '--browser', 'chromium', '--isolated']
  // Official provider clears all PLAYWRIGHT_MCP_* environment controls. Use the
  // same protection in this isolated comparison so ambient flags cannot hide gaps.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('PLAYWRIGHT_MCP_')))
  const child = spawn(process.execPath, [...args, '--headless', '--executable-path', browser], {
    cwd: scratch, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
  })
  let nextId = 0
  const pending = new Map()
  const lines = createInterface({ input: child.stdout })
  let diagnostic = ''
  child.stderr.on('data', chunk => { diagnostic = (diagnostic + String(chunk)).slice(-4000) })
  lines.on('line', line => {
    let message
    try { message = JSON.parse(line) } catch { return }
    const waiter = pending.get(message.id)
    if (!waiter) return
    pending.delete(message.id)
    clearTimeout(waiter.timeout)
    if (message.error) waiter.reject(new Error(`MCP error ${message.error.code}`))
    else waiter.resolve(message.result)
  })
  const settled = new Promise(resolve => child.once('exit', resolve))
  child.on('error', error => {
    for (const waiter of pending.values()) { clearTimeout(waiter.timeout); waiter.reject(error) }
    pending.clear()
  })
  child.on('exit', () => {
    for (const waiter of pending.values()) { clearTimeout(waiter.timeout); waiter.reject(new Error(`MCP exited: ${diagnostic}`)) }
    pending.clear()
  })
  const rpc = (method, params) => new Promise((resolve, reject) => {
    const id = ++nextId
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`MCP timeout: ${method}`)) }, 30_000)
    pending.set(id, { resolve, reject, timeout })
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
  })
  const call = async (name, args) => {
    const result = await rpc('tools/call', { name, arguments: args })
    assert.notEqual(result.isError, true, `${name} returned an MCP tool error`)
    return result
  }
  try {
    await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'dsh-playwright-qualification', version: '0.1.8' } })
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
    const names = (await rpc('tools/list', {})).tools.map(tool => tool.name)
    for (const name of ['browser_navigate', 'browser_snapshot', 'browser_evaluate', 'browser_take_screenshot', 'browser_console_messages', 'browser_network_requests']) assert.ok(names.includes(name), name)
    assert.equal(names.some(name => name.startsWith('browser_verify_')), mode === 'retained-bundle', 'testing capability parity')
    assert.equal(names.some(name => name.startsWith('browser_mouse_')), mode === 'retained-bundle', 'vision capability parity')
    const url = 'data:text/html,' + encodeURIComponent('<!doctype html><title>Isolated MCP qualification</title><button id="counter" onclick="this.textContent=\'clicked\'">click</button>')
    await call('browser_navigate', { url })
    await call('browser_evaluate', { function: '() => { document.getElementById("counter").click(); console.log("isolated-browser-smoke"); return {width:innerWidth,height:innerHeight,text:document.getElementById("counter").textContent}; }' })
    const state = await call('browser_evaluate', { function: '() => ({width:innerWidth,height:innerHeight,text:document.getElementById("counter").textContent})' })
    const text = state.content.filter(block => block.type === 'text').map(block => block.text).join('\n')
    if (mode === 'retained-bundle') {
      assert.match(text, /1440/)
      assert.match(text, /900/)
    } else {
      assert.ok(!text.includes('1440') || !text.includes('900'), 'official defaults unexpectedly matched the fixed viewport')
    }
    assert.match(text, /clicked/)
    const snapshot = await call('browser_snapshot', {})
    assert.ok(snapshot.content.some(block => block.type === 'text' && block.text.includes('clicked')))
    await call('browser_console_messages', { level: 'info' })
    await call('browser_network_requests', { includeStatic: false })
    const screenshot = await call('browser_take_screenshot', { type: 'png' })
    assert.ok(screenshot.content.some(block => block.type === 'image' && block.mimeType === 'image/png' && block.data.length > 0))
    await call('browser_close', {})
  } finally {
    lines.close()
    child.stdin.end()
    const kill = setTimeout(() => child.kill(), 3000)
    await settled
    clearTimeout(kill)
    await rm(scratch, { recursive: true, force: true })
  }
})
