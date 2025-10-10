This repository is a small Next.js (App Router) project with a client-side FFmpeg demo and a few project-specific conventions. Use these notes to make targeted, low-risk changes and to know where to look for common pitfalls.

Quick context
- Framework: Next.js (app directory) — see `src/app/layout.js`, `src/app/page.js` and other `src/app/*` routes.
- Dev server: `npm run dev` runs `next dev --turbopack -p 3001` (port 3001). See `package.json`.
- Build: `npm run build` uses Turbopack. Start uses port 3001.

Key files to reference
- `package.json` — dev/build scripts, dependencies (notably `@ffmpeg/*`, `next`, React).
- `src/app/test/page.js` — client-side FFmpeg integration (dynamic CDN imports, toBlobURL, read/write with FFmpeg WASM). Primary place for binary-processing logic.
- `src/app/layout.js` — root layout, font loading, and where global CSS is imported.
- `src/app/globals.css` — global styles (Tailwind is installed/configured).
- `next.config.mjs`, `postcss.config.mjs`, `eslint.config.mjs` — platform/build and lint configuration.

Project-specific patterns and conventions
- App Router + mixed components: files under `src/app` default to server components. Explicitly mark client-only code with "use client" at the top (see `src/app/test/page.js`).
- FFmpeg usage: The test page dynamically imports FFmpeg and @ffmpeg/util from CDN URLs (hard-coded to exact ESM CDN versions). It uses util.toBlobURL to load `ffmpeg-core.js`, `ffmpeg-core.wasm`, and worker. If you need offline/local builds, swap CDN dynamic imports for the local package and update load paths.
- External integration: The test page POSTs compressed video to an external Flask endpoint: `http://vip.tecom.pro:8789/videos_job`. Expect CORS and network failures when running locally. Use a proxy or configure the server for CORS during local development.
- CSS and fonts: `layout.js` uses next/font to load Geist fonts into CSS variables (see variable usage in `globals.css`). Tailwind classes are used throughout.

Developer workflows (explicit commands)
- Start dev server (hot reload): npm run dev  # runs on port 3001
- Build for production: npm run build
- Start built server: npm run start
- Lint (uses eslint binary exported by config): npm run lint

Helpful editing tips for an AI agent
- When adding client-only logic, ensure the file begins with "use client" and avoid importing server-only modules (fs, path, etc.).
- For binary/video work (FFmpeg): prefer small test files when iterating locally. The WASM core loads from CDN in `src/app/test/page.js`; be explicit if switching to local artifacts.
- If touching the FFmpeg flow, update both the CDN import lines and the baseURL used by toBlobURL. Example lines to inspect: dynamic import URLs and the baseURL constant in `src/app/test/page.js`.
- Watch for CORS: calls to `http://vip.tecom.pro:8789/videos_job` will fail in a dev browser unless the remote server allows requests from `http://localhost:3001` (or 3000). For CI or headless tests, mock network requests.

Safety and performance notes
- FFmpeg WASM is large and can be slow to load — tests should mock or stub heavy operations where possible.
- The repo includes `@ffmpeg/*` packages in package.json but the test page loads from CDN; confirm intended approach before refactoring.

When you complete a change
- Run `npm run dev` and exercise the relevant page (e.g., `/test`) in the browser to validate client behavior and network interactions.
- Verify console logs for FFmpeg progress messages (the page prints ffmpeg logs to UI).
- If you change build config or CSS, run a production build: `npm run build` and `npm run start` to catch runtime differences.

If anything here is unclear or you want the file to enforce stricter rules (examples: a local FFmpeg setup, preferred ports, or mocking strategy), tell me which area and I'll iterate the instructions.
