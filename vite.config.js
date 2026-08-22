import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Build-time version stamp. Baked into the bundle as __APP_VERSION__ and
// also written to dist/version.json so a running client can fetch it and
// compare — if the two differ, the client is stale and the update gate
// blocks the UI until they refresh.
const APP_VERSION = String(Date.now())

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'emit-version-json',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: APP_VERSION }),
        })
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
})
