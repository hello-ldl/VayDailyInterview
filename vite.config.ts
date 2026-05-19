import { copyFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// GitHub Pages project site: set VITE_BASE_URL=/RepositoryName/ in CI (see workflow).
const base = process.env.VITE_BASE_URL ?? './'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: 'spa-github-pages-fallback',
      closeBundle() {
        if (process.env.VITE_SKIP_404_COPY === '1') return
        const dist = path.resolve(__dirname, 'dist')
        copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))
      },
    },
  ],
})
