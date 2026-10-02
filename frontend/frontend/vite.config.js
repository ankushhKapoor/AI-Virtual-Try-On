import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')
  const backendTarget = env.BACKEND_URL || 'http://127.0.0.1:8000'
  const modelTarget = env.MODEL_API_URL || 'http://127.0.0.1:8001'

  return {
    envDir: projectRoot,
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: Number(env.FRONTEND_PORT || 5173),
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/model': {
          target: modelTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/model/, ''),
        },
      },
    },
  }
})
