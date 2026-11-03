import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'local-api') {
    const url = loadEnv(mode, process.cwd()).VITE_SUPABASE_URL
    if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
      throw new Error('Run npm run setup:local -w server before starting the local frontend.')
    }
  }
  return {
    server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3001' } },
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
  }
})
