import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const shim = (p: string) => fileURLToPath(new URL(p, import.meta.url))

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // next-compat shims for ported components (see src/lib/next-compat)
      'next/navigation': shim('./src/lib/next-compat/navigation.tsx'),
      'next/link': shim('./src/lib/next-compat/link.tsx'),
      'next/image': shim('./src/lib/next-compat/image.tsx'),
    },
  },
  plugins: [
    devtools({ eventBusConfig: { disableConsoleReplication: true } }),
    tailwindcss(),
    // ponytail: TS type for tanstackStart's router option is narrower than the
    // runtime schema (zod parse accepts autoCodeSplitting). Cast bypasses TS;
    // verified against start-plugin-core vite/schema.d.ts which includes the field.
    tanstackStart({ router: { autoCodeSplitting: true } } as never),
    viteReact(),
  ],
  build: {
    rollupOptions: {
      output: {
        // ponytail: this Rolldown build requires a function, not the plain
        // object form Vite/Rollup normally accepts (throws "manualChunks is
        // not a function" otherwise).
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (/react-markdown|remark-gfm|rehype-highlight/.test(id)) {
              return 'vendor-markdown'
            }
            if (id.includes('mermaid')) {
              return 'vendor-mermaid'
            }
          }
        },
      },
    },
  },
})

export default config
