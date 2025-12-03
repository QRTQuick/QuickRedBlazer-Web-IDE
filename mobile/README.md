# QuickRedBlazer — Mobile (Installable React App)

This `mobile/` folder contains the React (Vite) mobile-focused version of QuickRedBlazer. It was scaffolded with Vite and implemented to be installable as a Progressive Web App (PWA) for mobile devices.

Key points
- This is the installable mobile app: users will install this app to their device (PWA) when served over HTTPS or `localhost`.
- The primary app entry is `mobile/index.html`. Start the dev server inside `mobile/` with `npm run dev`.
- The app UI is implemented under `mobile/src/` using React. The important files and folders:
  - `mobile/src/main.jsx` — React entry
  - `mobile/src/App.jsx` — main app layout and state
  - `mobile/src/components/` — UI components (`Topbar`, `Sidebar`, `Editor`, `Preview`, `FilesPanel`, `SettingsPanel`)
  - `mobile/public/` — public assets (icons, manifest should go here)

Install / Run locally
1. cd into the folder: `cd mobile`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev` (add `-- --host` to expose to your LAN)

Making it installable (PWA)
- Ensure `manifest.webmanifest` and icons (192/512) exist in `mobile/public/` and are referenced from `mobile/index.html`.
- Register a service worker (`sw.js`) to enable offline caching and allow the browser to prompt the user to install the app.
- PWAs require secure context (HTTPS) to be installable except on `localhost` during development.

Notes
- Files edited in the mobile app are persisted locally (via `localStorage`) and the Files panel supports creating `.html`, `.css`, and `.js` files.
- If you want this folder to be the published site for a dedicated mobile install, build it (`npm run build`) and publish the `dist/` folder over HTTPS.
