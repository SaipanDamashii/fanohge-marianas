# Fanohge — The Marianas (web build)

A playable, self-contained HTML5/Three.js build. Open `index.html` in any modern
browser (Chrome / Edge / Firefox recommended — WebGL required). Everything runs
client-side; no server, no install.

## Fastest way to go live: Netlify Drop
1. Go to https://app.netlify.com/drop
2. Drag this `dist-web` folder onto the page.
3. You get a live URL instantly — share it with anyone.

## Or host on GitHub Pages
1. Push this folder's contents to a GitHub repo.
2. GitHub → Settings → Pages → deploy from `main` at `/` (root).
3. Visit https://<you>.github.io/<repo>/

The `.nojekyll` file is included so GitHub Pages serves the site as-is.

## Notes
- Audio: browsers require a first click before sound plays — use the 🔊 toggle.
- The 3D board needs WebGL (all modern browsers have it).
