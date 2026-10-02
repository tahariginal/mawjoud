// Generates Expo Router typed routes (.expo/types/router.d.ts) without an interactive session.
// Expo only writes these types while the dev server starts, so we start it in CI mode,
// wait for a fresh file, then stop it. Used by `pnpm typecheck` so invalid links fail CI.
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const target = join(root, '.expo', 'types', 'router.d.ts');
const startedAt = Date.now();
const TIMEOUT_MS = 120_000;
const port = String(19000 + Math.floor(Math.random() * 1000));

const child = spawn('npx', ['expo', 'start', '--port', port], {
  cwd: root,
  env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
  stdio: 'ignore',
  detached: true,
});

function stop(code, message) {
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    // Already exited.
  }
  if (message) console[code === 0 ? 'log' : 'error'](message);
  process.exit(code);
}

const timer = setInterval(() => {
  if (existsSync(target) && statSync(target).mtimeMs >= startedAt - 1000) {
    clearInterval(timer);
    // Give the generator a moment to finish writing.
    setTimeout(() => stop(0, 'typegen: router types generated'), 1500);
  } else if (Date.now() - startedAt > TIMEOUT_MS) {
    clearInterval(timer);
    stop(1, 'typegen: timed out waiting for .expo/types/router.d.ts');
  }
}, 500);

child.on('exit', (code) => {
  if (!existsSync(target)) stop(1, `typegen: expo start exited early (code ${code})`);
});
