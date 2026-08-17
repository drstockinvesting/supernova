import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `public/data` is a symlink to the repo's `data/` directory, so the dev server
// serves the generated dataset at /data/... without copying 178MB into the app.
// Vite needs explicit permission to read through a symlink that leaves the project
// root, and the dataset must stay out of the production bundle -- a deploy decides
// separately which slice of it ships.
export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: ['..'] },
    // Vite defaults to 5173 and ignores PORT. Honouring it lets a second dev
    // server run alongside a first instead of the two fighting over the port.
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    copyPublicDir: false,
  },
})
