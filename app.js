/* QuickRedBlazer - app.js
   Minimal editor + live preview logic for the neon Web IDE.
   This file provides file-tree UI, basic file editing and a live preview iframe.
*/

const defaultFiles = {
  'index.html': `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>QuickRedBlazer Preview</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <h1 style="padding:24px">Hello from QuickRedBlazer</h1>
  </body>
</html>`,
  'styles.css': `body{font-family:Inter, sans-serif;background:#071018;color:#e6eef6;margin:0}`,
  'script.js': `console.log('Hello from QuickRedBlazer');`
};

// State
let files = {};
let currentFile = null;

// Elements
const fileTree = document.getElementById('fileTree');
const editor = document.getElementById('editor');
const fileTabs = document.getElementById('fileTabs');
const runBtn = document.getElementById('runBtn');
const preview = document.getElementById('preview');
const newFileBtn = document.getElementById('newFile');
const saveBtn = document.getElementById('saveProject');
const collapseSidebar = document.getElementById('collapseSidebar');
const sidebarEl = document.getElementById('sidebar');
const togglePreview = document.getElementById('togglePreview');
const openInNew = document.getElementById('openInNew');
let cm = null; // CodeMirror instance

// Initialize
function init(){
  files = JSON.parse(localStorage.getItem('qrb_files') || 'null') || {...defaultFiles};
  renderFileTree();

  // Initialize CodeMirror from the textarea
  if(window.CodeMirror){
    cm = CodeMirror.fromTextArea(editor, {
      mode: 'htmlmixed',
      theme: 'dracula',
      lineNumbers: true,
      styleActiveLine: true,
      matchBrackets: true,
      indentUnit: 2,
      tabSize: 2
    });
    cm.setOption('viewportMargin', Infinity);
  }

  attachEvents();
  openFile(Object.keys(files)[0]);
  runPreview();
}

function attachEvents(){
  if(cm){
    cm.on('change', onEditorInput);
  } else {
    editor.addEventListener('input', onEditorInput);
  }
  newFileBtn.addEventListener('click', onNewFile);
  saveBtn.addEventListener('click', onSave);
  runBtn.addEventListener('click', runPreview);
  // Topbar duplicates (connect topbar buttons to same actions)
  const runTop = document.getElementById('runBtnTop');
  const saveTop = document.getElementById('saveProjectTop');
  const publishBtn = document.getElementById('publishBtn');
  const moreBtn = document.getElementById('moreBtn');
  const connectGit = document.getElementById('connectGit');
  const pushGit = document.getElementById('pushGit');
  if(runTop) runTop.addEventListener('click', runPreview);
  if(saveTop) saveTop.addEventListener('click', onSave);
  if(publishBtn) publishBtn.addEventListener('click', ()=>{
    const cmds = `git add .\n git commit -m "Deploy via QuickRedBlazer"\n git push origin main`;
    // copy to clipboard if supported
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(cmds).then(()=>{
        alert('Git commands copied to clipboard. Push `main` to trigger GitHub Pages deploy workflow.');
      }).catch(()=>{
        alert('Copy failed. Run the following commands in your repo:\n\n' + cmds);
      });
    } else {
      alert('Run the following commands in your repo to push and trigger deploy:\n\n' + cmds);
    }
  });
  if(moreBtn) moreBtn.addEventListener('click', ()=>{ alert('More actions coming soon'); });
  if(connectGit) connectGit.addEventListener('click', connectGitHub);
  if(pushGit) pushGit.addEventListener('click', pushToGitHub);
  collapseSidebar.addEventListener('click', ()=> sidebarEl.classList.toggle('collapsed'));
  togglePreview.addEventListener('click', ()=> document.getElementById('previewPanel').classList.toggle('hidden'));
  openInNew.addEventListener('click', ()=> window.open(preview.src || '', '_blank'));
  document.getElementById('fileSearch').addEventListener('input', onSearch);

  // Mobile nav buttons
  const mFiles = document.getElementById('mFiles');
  const mEditor = document.getElementById('mEditor');
  const mPreview = document.getElementById('mPreview');
  if(mFiles) mFiles.addEventListener('click', ()=> showPanel('files'));
  if(mEditor) mEditor.addEventListener('click', ()=> showPanel('editor'));
  if(mPreview) mPreview.addEventListener('click', ()=> showPanel('preview'));
}

/* -------------------------
   GitHub linking & push
   Uses the GitHub Contents API (per-file PUT) with a personal access token.
   WARNING: Storing tokens in localStorage is insecure for production; this demo stores the token locally for convenience only.
   ------------------------- */

function connectGitHub(){
  const savedToken = localStorage.getItem('qrb_github_token') || '';
  const token = prompt('Paste a GitHub Personal Access Token (repo scope) — stored locally on this device:', savedToken);
  if(!token) return;
  const owner = prompt('Repository owner (GitHub username or org):', localStorage.getItem('qrb_github_owner') || '');
  if(!owner) return;
  const repo = prompt('Repository name:', localStorage.getItem('qrb_github_repo') || '');
  if(!repo) return;
  const branch = prompt('Branch to push to:', localStorage.getItem('qrb_github_branch') || 'main');
  if(!branch) return;

  localStorage.setItem('qrb_github_token', token);
  localStorage.setItem('qrb_github_owner', owner);
  localStorage.setItem('qrb_github_repo', repo);
  localStorage.setItem('qrb_github_branch', branch);
  alert('GitHub linked locally. Use Push to send files to the repository.');
}

async function pushToGitHub(){
  // Prefer server-side push if the helper server is available
  const serverUrl = localStorage.getItem('qrb_server_url') || 'http://localhost:4000';
  const owner = prompt('Repository owner (GitHub username/org):', localStorage.getItem('qrb_github_owner')||'');
  if(!owner) return;
  const repo = prompt('Repository name:', localStorage.getItem('qrb_github_repo')||'');
  if(!repo) return;
  const branch = prompt('Branch to push to:', localStorage.getItem('qrb_github_branch')||'main');
  if(!confirm(`Push ${Object.keys(files).length} files to ${owner}/${repo}@${branch} via server ${serverUrl}?`)) return;

  // Call server-side API to perform a single-commit push
  try{
    const resp = await fetch(`${serverUrl.replace(/\/$/, '')}/api/github/push`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include',
      body: JSON.stringify({ owner, repo, branch, message: `QuickRedBlazer push`, files })
    });
    const data = await resp.json();
    if(resp.ok){
      alert('Push complete. Commit: ' + data.commit);
    } else {
      console.error(data);
      alert('Push failed: ' + (data.error||JSON.stringify(data)));
    }
  }catch(err){
    console.error(err);
    alert('Push failed: ' + err.message + '\nMake sure the server is running and you have connected via OAuth.');
  }
}

function onEditorInput(){
  if(!currentFile) return;
  const val = cm ? cm.getValue() : editor.value;
  files[currentFile] = val;
  localStorage.setItem('qrb_files', JSON.stringify(files));
  debounceRun();
}

function onNewFile(){
  const name = prompt('New file name (e.g. main.js or index.html):','untitled.txt');
  if(!name) return;
  if(files[name]){ alert('File already exists'); return; }
  files[name] = '';
  renderFileTree();
  openFile(name);
}

function onSave(){
  localStorage.setItem('qrb_files', JSON.stringify(files));
  flashSaved();
}

function flashSaved(){
  saveBtn.classList.add('flash');
  setTimeout(()=> saveBtn.classList.remove('flash'), 700);
}

function renderFileTree(filter = ''){
  fileTree.innerHTML = '';
  Object.keys(files).forEach(name => {
    if(filter && !name.toLowerCase().includes(filter.toLowerCase())) return;
    const el = document.createElement('div');
    el.className = 'file-item' + (name===currentFile ? ' active' : '');
    el.dataset.name = name;
    el.innerHTML = `<div class="fname">${name}</div><div class="ext">${name.split('.').pop()}</div>`;
    el.addEventListener('click', ()=> openFile(name));
    fileTree.appendChild(el);
  });
  renderTabs();
}

function renderTabs(){
  fileTabs.innerHTML = '';
  Object.keys(files).forEach(name => {
    const b = document.createElement('button');
    b.className = 'tab' + (name===currentFile ? ' active' : '');
    b.textContent = name;
    b.onclick = ()=> openFile(name);
    fileTabs.appendChild(b);
  });
}

function openFile(name){
  currentFile = name;
  const value = files[name] ?? '';
  if(cm){
    cm.setValue(value);
    cm.focus();
  } else {
    editor.value = value;
  }
  renderFileTree(document.getElementById('fileSearch').value || '');
}

function onSearch(e){ renderFileTree(e.target.value); }

// Build preview html from files (simple: inject CSS & JS inline if present)
function buildPreview(){
  const f = {...files};
  const html = f['index.html'] || '<!doctype html><html><head></head><body></body></html>';
  const css = f['styles.css'] || '';
  const js = (f['script.js'] || f['app.js'] || '');

  // insert CSS into <head> and JS before </body>
  let out = html;
  if(out.includes('</head>')){
    out = out.replace('</head>', `<style>${css}</style></head>`);
  } else {
    out = out.replace('<html>', `<html><head><style>${css}</style></head>`);
  }
  if(out.includes('</body>')){
    out = out.replace('</body>', `<script>${js}<!-- --></script></body>`);
  } else {
    out += `<script>${js}<!-- --></script>`;
  }
  return out;
}

function runPreview(){
  const html = buildPreview();
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  preview.src = url;
  setTimeout(()=> URL.revokeObjectURL(url), 2000);
}

function showPanel(name){
  const sidebar = document.getElementById('sidebar');
  const codePanel = document.querySelector('.code-panel');
  const previewPanel = document.getElementById('previewPanel');
  if(name === 'files'){
    // show sidebar, hide preview
    if(sidebar) sidebar.style.display = '';
    if(previewPanel) previewPanel.style.display = 'none';
    if(codePanel) codePanel.style.display = '';
  } else if(name === 'editor'){
    if(sidebar) sidebar.style.display = 'none';
    if(previewPanel) previewPanel.style.display = 'none';
    if(codePanel) codePanel.style.display = '';
  } else if(name === 'preview'){
    if(sidebar) sidebar.style.display = 'none';
    if(codePanel) codePanel.style.display = 'none';
    if(previewPanel) previewPanel.style.display = '';
  }
}

// debounce run
let debounceTimer = null;
function debounceRun(){
  if(debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=> runPreview(), 600);
}

// init on load
document.addEventListener('DOMContentLoaded', init);
