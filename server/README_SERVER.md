QuickRedBlazer OAuth & Push Server

This small Express server provides:
- GitHub OAuth endpoints to securely exchange an authorization code for an access token (server-side, using your GitHub App client secret).
- A `/api/github/push` endpoint that performs a single-commit push using GitHub's git/blobs/trees/commits API (more efficient than per-file contents PUTs).

Setup

1. Create a GitHub OAuth App in your GitHub account (Settings → Developer settings → OAuth Apps). Set the Authorization callback URL to `http://localhost:4000/auth/github/callback` (adjust if you run the server elsewhere).
2. Copy the App `Client ID` and `Client Secret`.
3. In the `server` folder, copy `.env.example` to `.env` and fill `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `APP_ORIGIN` (the origin where the IDE is served).
4. Install dependencies and start server:

```powershell
cd server
npm install
npm start
```

Usage

- Click `Connect GitHub` in the IDE top bar — this will open the GitHub OAuth consent and the server will store the resulting token in the session.
- Then click `Push` and provide the repository details. The server will create a single commit with all files.

Security notes

- The server stores GitHub access tokens in server-side sessions (memory by default). This is suitable for demo/testing only. Use a secure session store in production.
- Do not check your `GITHUB_CLIENT_SECRET` into source control. Use environment variables or GitHub Secrets in CI.

Limitations

- This server is a minimal demo to illustrate a secure OAuth flow and single-commit push. For production, add CSRF protection, stricter CORS, and persistent session storage.
