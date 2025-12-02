# QuickRedBlazer — Neon Web IDE (Demo)

This repository contains a compact, self-contained frontend demo of a sleek, neon-themed Web IDE. It focuses on layout and visuals and runs entirely in the browser.

Files

- `index.html` — the Web IDE UI (sidebar, editor, live preview)
- `styles.css` — dark neon theme (red, purple, blue accents) and responsive layout
- `app.js` — minimal editor logic: file tree, tabs, edit, localStorage persistence, live preview iframe
- `firebase/firestore.rules` — optional Firestore rules template (kept for reference)

Quick start

1. Open the project folder in your editor (VS Code or similar).
2. Open `index.html` in your browser (double-click or use a static server / Live Server extension).

Usage notes

- The editor stores files in `localStorage` under the key `qrb_files`.
- Edit `index.html`, `styles.css`, and `script.js` (or create new files) to see updates in the preview.
- Click `Run` to refresh the live preview; edits also auto-run after a short debounce.

Next steps (ideas)

- Add a proper code editor (CodeMirror / Monaco) for syntax highlighting and better editing.
- Wire up Firebase Authentication + Firestore if you want remote save/load and publishing.
- Add export/download (ZIP) and deploy integrations.

License: MIT (or choose your preferred license)
 
Recent changes

- Added in-editor syntax highlighting using CodeMirror (preloaded in `index.html`). The editor falls back to a plain `textarea` if CodeMirror is not available.
- Added `sitemap.xml` and `robots.txt` at project root — update the URLs in `sitemap.xml` to match your deployed domain before publishing.

Auto-deploy with GitHub Pages

- A GitHub Actions workflow has been added at `.github/workflows/deploy.yml`. When you push to the `main` branch the workflow will publish the repository root to the `gh-pages` branch, which can be served using GitHub Pages.
- To publish from your local machine: commit and push your changes to `main`. The workflow runs automatically and deploys to `gh-pages`.
- The `Publish` button inside the IDE copies the recommended git commands to your clipboard to make pushing easy.

Notes

- The workflow uses the default `GITHUB_TOKEN` so no extra secrets are required to publish from pushes to `main`.
- After the first successful deploy, configure GitHub Pages in your repository Settings to serve the `gh-pages` branch (if GitHub hasn't already done so automatically).

GitHub linking & direct push from the IDE

- You can link a GitHub repository to the IDE and push files directly from the browser using a Personal Access Token (PAT). This is implemented as a convenience for local users and stores the token in your browser's `localStorage`.
- To link: click `Connect GitHub` in the top bar, paste a PAT with `repo` scope, and enter the `owner`, `repo` and `branch` to push to.
- To push: click `Push`. The IDE will attempt to create/update each file in the repository using the GitHub Contents API. After pushing, the GitHub Actions deploy workflow will run automatically for pushes to `main`.

Server-based OAuth & single-commit push (recommended)

- For a secure flow and efficient pushes, run the included OAuth/push helper server in the `server/` folder. It implements a server-side GitHub OAuth exchange and a `/api/github/push` endpoint that performs a single-commit push (blobs/trees/commit) to the target branch.
- Steps:
	1. Create a GitHub OAuth App and set callback URL to `http://localhost:4000/auth/github/callback` (or your server origin).
	2. Copy `server/.env.example` to `server/.env` and fill `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `APP_ORIGIN`.
	3. Install & start the server (`cd server && npm install && npm start`).
	4. In the IDE, click `Connect GitHub` (this opens the OAuth flow). After authorizing, the server stores the token in your session.
	5. Click `Push` — the IDE will call the server endpoint which performs a single-commit push for all files.

Security note: storing a PAT in localStorage is insecure for production. Use the server OAuth flow for better security and do not commit secrets.