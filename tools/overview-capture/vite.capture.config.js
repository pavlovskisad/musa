// Serves the app for recording only: sign-in, the clock and chain reads are swapped for stand-ins.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const stub = (f) => path.join(here, f);

export default defineConfig({
  root,
  plugins: [react()],
  cacheDir: path.join(root, 'node_modules/.vite-capture'),
  resolve: {
    alias: [
      { find: '@privy-io/react-auth', replacement: stub('privy-stub.js') },
      { find: /^\.\/hooks\/useSimTime\.js$/, replacement: stub('simtime-stub.js') },
      { find: /^\.\.\/lib\/chain\.js$/, replacement: stub('chain-stub.js') },
    ],
  },
  server: { port: 5179, strictPort: true },
});
