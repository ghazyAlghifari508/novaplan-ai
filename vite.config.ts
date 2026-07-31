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
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
