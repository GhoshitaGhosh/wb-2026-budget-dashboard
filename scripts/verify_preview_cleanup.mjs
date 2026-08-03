import assert from 'node:assert/strict';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'budget-frontend');
const vite = path.join(frontend, 'node_modules', 'vite', 'bin', 'vite.js');
const host = '127.0.0.1';

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, host, () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function portOpen(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    const finish = value => { socket.destroy(); resolve(value); };
    socket.setTimeout(300);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function waitFor(check, expected, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check() === expected) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for verification state: ${expected}`);
}

const port = await freePort();
const before = process.memoryUsage().rss;
let child;
try {
  child = spawn(process.execPath, [vite, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: frontend,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  let diagnostics = '';
  child.stdout.on('data', chunk => { diagnostics += chunk; });
  child.stderr.on('data', chunk => { diagnostics += chunk; });
  child.once('error', error => { diagnostics += error.stack || String(error); });
  await waitFor(() => portOpen(port), true);
  for (const resource of ['wb-2026-budget-dashboard/', 'wb-2026-budget-dashboard/metadata.json', 'wb-2026-budget-dashboard/map-data.json']) {
    const response = await fetch(`http://${host}:${port}/${resource}`);
    assert.equal(response.ok, true, `${resource} returned ${response.status}. ${diagnostics}`);
  }
  console.log(`Preview smoke checks passed on owned PID ${child.pid}, port ${port}.`);
} finally {
  if (child && child.exitCode == null) {
    child.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      new Promise(resolve => setTimeout(resolve, 4_000))
    ]);
    if (child.exitCode == null) child.kill('SIGKILL');
  }
  await waitFor(() => portOpen(port), false);
  const after = process.memoryUsage().rss;
  console.log(`Cleanup verified: PID ${child?.pid ?? 'not-started'} exited, port ${port} released, verifier RSS ${Math.round(before / 1048576)}MB -> ${Math.round(after / 1048576)}MB.`);
}
