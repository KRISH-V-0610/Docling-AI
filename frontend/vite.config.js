/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [ react(), tailwindcss() ],
  server: {
    proxy: {
      '/latex-api': {
        target: 'https://latexonline.cc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/latex-api/, '')
      }
    }
  },
  // Vitest — jsdom env + a setup file that registers jest-dom matchers.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
