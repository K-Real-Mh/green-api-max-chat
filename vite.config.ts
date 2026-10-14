import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/green-api-max-chat/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    strictPort: true,
  },
}))
