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
  },
  build: {
    copyPublicDir: false,
  },
})
