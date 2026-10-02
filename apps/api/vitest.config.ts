import { fileURLToPath } from 'node:url';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/** Mobile sources imported by the contract test use the app's `@/` alias. */
const mobileSrc = fileURLToPath(new URL('../mobile/src/', import.meta.url));

// SWC (not esbuild) so NestJS decorator metadata is emitted in tests, matching the tsc build.
export default defineConfig({
  plugins: [swc.vite()],
  resolve: {
    alias: [{ find: /^@\//, replacement: mobileSrc }],
  },
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 180_000,
    // Each file gets its own database cloned from a migrated template (see test/global-setup.ts).
    fileParallelism: true,
  },
});
