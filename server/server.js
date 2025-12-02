require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:8080';

if(!CLIENT_ID || !CLIENT_SECRET){
  console.warn('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set. OAuth will not work until configured.');
}

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(session({ secret: 'quickredblazer-demo-secret', resave:false, saveUninitialized:true }));

// Redirect to GitHub OAuth authorization
app.get('/auth/github/login', (req, res) => {
  if(!CLIENT_ID) return res.status(500).send('Server not configured');
  const state = Math.random().toString(36).slice(2);
  req.session.oauthState = state;
  const redirect = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo&state=${state}`;
  res.redirect(redirect);
});

// Callback endpoint that GitHub redirects back to
app.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;
  if(!code || !state || state !== req.session.oauthState){
    return res.status(400).send('Invalid OAuth state');
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept':'application/json', 'Content-Type':'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code })
  });
  const tokenData = await tokenRes.json();
  if(tokenData.error){
    return res.status(500).send('OAuth token error: ' + tokenData.error_description);
  }
  req.session.githubToken = tokenData.access_token;

  // Redirect back to app origin with success
  return res.redirect(`${APP_ORIGIN}/?oauth=success`);
});

// Simple endpoint to check if server has a token for this session
app.get('/api/github/status', (req, res) => {
  res.json({ connected: !!req.session.githubToken });
});

// Push files using single-commit approach (blobs/trees/commit)
app.post('/api/github/push', async (req, res) => {
  const token = req.session.githubToken || req.headers['x-gh-token'];
  if(!token) return res.status(401).json({ error: 'Not authenticated with GitHub' });

  const { owner, repo, branch='main', message='QuickRedBlazer push', files } = req.body;
  if(!owner || !repo || !files) return res.status(400).json({ error: 'owner, repo and files are required' });

  const headers = { 'Authorization': `token ${token}`, 'Accept':'application/vnd.github.v3+json' };
  try{
    // 1) Get reference for branch
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers });
    if(refRes.status >= 400) return res.status(502).json({ error: 'Failed to get branch ref', status: refRes.status });
    const refData = await refRes.json();
    const baseCommitSha = refData.object.sha;

    // 2) Create blobs for each file
    const blobs = {};
    for(const [path, content] of Object.entries(files)){
      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST', headers: {...headers, 'Content-Type':'application/json'},
        body: JSON.stringify({ content: Buffer.from(content).toString('base64'), encoding: 'base64' })
      });
      if(blobRes.status >= 400){
        const err = await blobRes.text();
        return res.status(502).json({ error: 'Failed creating blob for ' + path, detail: err });
      }
      const blobData = await blobRes.json();
      blobs[path] = blobData.sha;
    }

    // 3) Create tree
    const treeItems = Object.keys(blobs).map(path => ({ path, mode: '100644', type: 'blob', sha: blobs[path] }));
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST', headers: {...headers, 'Content-Type':'application/json'},
      body: JSON.stringify({ tree: treeItems, base_tree: null })
    });
    if(treeRes.status >= 400){
      const err = await treeRes.text();
      return res.status(502).json({ error: 'Failed creating tree', detail: err });
    }
    const treeData = await treeRes.json();

    // 4) Create commit
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST', headers: {...headers, 'Content-Type':'application/json'},
      body: JSON.stringify({ message, tree: treeData.sha, parents: [baseCommitSha] })
    });
    if(commitRes.status >= 400){
      const err = await commitRes.text();
      return res.status(502).json({ error: 'Failed creating commit', detail: err });
    }
    const commitData = await commitRes.json();

    // 5) Update ref
    const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH', headers: {...headers, 'Content-Type':'application/json'},
      body: JSON.stringify({ sha: commitData.sha })
    });
    if(updateRes.status >= 400){
      const err = await updateRes.text();
      return res.status(502).json({ error: 'Failed updating ref', detail: err });
    }

    return res.json({ ok:true, commit: commitData.sha });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, ()=> console.log(`OAuth/push server running on port ${PORT}`));
