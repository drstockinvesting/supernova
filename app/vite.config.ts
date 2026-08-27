import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * A project Pages site is served from a subdirectory named after the repository,
 * not from the domain root. Only the build takes it: applying it in dev too would
 * move the dev server to `localhost:5173/supernova/` for no benefit.
 */
const PAGES_BASE = '/supernova/'

/**
 * The two things a static host does not do that the dev server does for free.
 *
 * GitHub Pages has no SPA rewrite. It serves a file if one exists at the path and
 * otherwise returns `404.html`, so every address React Router owns — every
 * `/student/:id`, every `/school/:id` — is a 404 on a hard load or a refresh, and
 * a link pasted into a message is always a hard load. Pages serves `404.html`
 * with the requested URL still in the address bar, so a copy of `index.html`
 * there boots the app and the router reads the address it was already given.
 *
 * `copyPublicDir` is off because `public/data` is a symlink to a 188MB dataset
 * that must not be inlined into a bundle. That switch is all-or-nothing, so the
 * handful of genuine assets in `public/` are carried over here instead, and the
 * dataset stays what the config below says it is: something a deploy decides
 * about separately.
 */
function staticHostFallbacks(): Plugin {
  return {
    name: 'supernova-static-host',
    apply: 'build',
    closeBundle() {
      const root = import.meta.dirname
      const dist = resolve(root, 'dist')

      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))

      for (const asset of ['favicon.svg', 'icons.svg']) {
        const from = resolve(root, 'public', asset)
        if (existsSync(from)) copyFileSync(from, resolve(dist, asset))
      }
    },
  }
}

// `public/data` is a symlink to the repo's `data/` directory, so the dev server
// serves the generated dataset at /data/... without copying 178MB into the app.
// Vite needs explicit permission to read through a symlink that leaves the project
// root, and the dataset must stay out of the production bundle -- a deploy decides
// separately which slice of it ships. `.github/workflows/pages.yml` is that
// decision for the Pages build: it copies the whole dataset in beside the bundle.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? PAGES_BASE : '/',
  plugins: [react(), staticHostFallbacks()],
  server: {
    fs: { allow: ['..'] },
    // Vite defaults to 5173 and ignores PORT. Honouring it lets a second dev
    // server run alongside a first instead of the two fighting over the port.
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    copyPublicDir: false,
  },
}))
