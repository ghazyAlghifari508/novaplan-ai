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
    devtools(),
    tailwindcss(),
    // ponytail: TS type for tanstackStart's router option is narrower than the
    // runtime schema (zod parse accepts autoCodeSplitting). Cast bypasses TS;
    // verified against start-plugin-core vite/schema.d.ts which includes the field.
    tanstackStart({ router: { autoCodeSplitting: true } } as never),
    viteReact(),
  ],
})

export default config
