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
      tabSize: 2,
      lineWrapping: true,            // wrap long lines on small screens
      viewportMargin: Infinity,
      // contenteditable input mode can be friendlier on some mobile keyboards
      inputStyle: (typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)) ? 'contenteditable' : 'textarea'
    });
    // increase font-size on mobile for readability and ensure wrapper sizing
    if(typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth <= 700){
      try{
        const wrap = cm.getWrapperElement();
        if(wrap) wrap.style.fontSize = '15px';
        cm.setOption('lineNumbers', true);
      }catch(e){/*ignore*/}
    }
  }

  attachEvents();
  openFile(Object.keys(files)[0]);
  runPreview();
  // adjust mobile layout sizes after initialization
  setTimeout(adjustMobileLayout, 120);
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
  if(connectGit) connectGit.addEventListener('click', connectGitHub);
  if(pushGit) pushGit.addEventListener('click', pushToGitHub);
  // install button for PWA (if present)
  const installBtn = document.getElementById('installBtn');
  if(installBtn){
    installBtn.addEventListener('click', async ()=>{
      if(deferredPrompt){
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice.catch(()=>({outcome:'dismissed'}));
        if(choice && choice.outcome === 'accepted'){
          installBtn.classList.add('hidden');
        }
        deferredPrompt = null;
      }
    });
  }
  collapseSidebar.addEventListener('click', ()=>{
    // On small screens, open sidebar as mobile overlay; on larger screens, use collapsed state
    if(window.innerWidth <= 700){
      // act as hamburger on mobile: toggle the sidebar overlay
      sidebarEl.classList.toggle('mobile-open');
    } else {
      sidebarEl.classList.toggle('collapsed');
    }
  });

  // Close mobile sidebar when tapping outside it
  document.addEventListener('click', (e)=>{
    if(!sidebarEl) return;
    if(!sidebarEl.classList.contains('mobile-open')) return;
    const path = e.composedPath ? e.composedPath() : (e.path || []);
    if(!path.includes(sidebarEl) && !path.includes(collapseSidebar)){
      sidebarEl.classList.remove('mobile-open');
    }
  });
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

  // topbar preview button (duplicate control)
  const togglePreviewTop = document.getElementById('togglePreviewTop');
  if(togglePreviewTop){
    togglePreviewTop.addEventListener('click', togglePreviewPanel);
  }

  // Responsive hamburger menu: populate on demand when More button clicked
  const moreBtn = document.getElementById('moreBtn');
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  if(moreBtn && hamburgerMenu){
    moreBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      // toggle
      const open = hamburgerMenu.classList.toggle('hidden') === false;
      if(open){ buildHamburgerMenu(); }
    });

    // close on outside click
    document.addEventListener('click', (e)=>{
      const path = e.composedPath ? e.composedPath() : (e.path || []);
      if(!path.includes(hamburgerMenu) && !path.includes(moreBtn)){
        hamburgerMenu.classList.add('hidden');
      }
    });
    // close on Escape
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hamburgerMenu.classList.add('hidden'); });
  }

  // Mobile floating Run button
  const runFab = document.getElementById('runFab');
  if(runFab) runFab.addEventListener('click', ()=>{
    runPreview();
    // if preview shown on mobile, scroll into view smoothly
    if(window.innerWidth <= 700){
      const previewPanel = document.getElementById('previewPanel');
      if(previewPanel && previewPanel.style.display !== 'none') previewPanel.scrollIntoView({behavior:'smooth'});
    }
  });

  // Refresh/adjust editor when viewport changes
  window.addEventListener('resize', adjustMobileLayout);
  window.addEventListener('orientationchange', ()=> setTimeout(adjustMobileLayout, 120));
}

function buildHamburgerMenu(){
  const menu = document.getElementById('hamburgerMenu');
  if(!menu) return;
  menu.innerHTML = '';
  // Define items: label and target button id (existing controls)
  const items = [
    {label:'Run', id:'runBtnTop', icon:'▶'},
    {label:'Preview', id:'togglePreviewTop', icon:'👁️'},
    {label:'Save', id:'saveProjectTop', icon:'💾'},
    {label:'Connect', id:'connectGit', icon:'🔗'},
    {label:'Push', id:'pushGit', icon:'📤'},
    {label:'Install', id:'installBtn', icon:'⬇️'},
    {label:'Publish', id:'publishBtn', icon:'🚀'}
  ];
  items.forEach(it=>{
    const btn = document.createElement('button');
    btn.className = 'h-item';
    btn.type = 'button';
    // compact tile with icon + label
    btn.innerHTML = `<span class="h-icon">${it.icon || ''}</span><span class="h-label">${it.label}</span>`;
    btn.addEventListener('click', ()=>{
      const target = document.getElementById(it.id);
      if(target){ target.click(); }
      menu.classList.add('hidden');
    });
    menu.appendChild(btn);
  });
}

function togglePreviewPanel(){
  const previewPanel = document.getElementById('previewPanel');
  if(!previewPanel) return;
  const isHidden = previewPanel.classList.toggle('hidden');
  // On small screens, if preview is visible, make it mobile-fullscreen-friendly
  if(window.innerWidth <= 700){
    if(!isHidden){
      previewPanel.classList.add('mobile-visible');
      // hide code panel for a focused preview experience
      const codePanel = document.querySelector('.code-panel'); if(codePanel) codePanel.style.display = 'none';
    } else {
      previewPanel.classList.remove('mobile-visible');
      const codePanel = document.querySelector('.code-panel'); if(codePanel) codePanel.style.display = '';
    }
  }
  // refresh CodeMirror because layout changed
  setTimeout(()=>{ if(cm && cm.refresh) cm.refresh(); }, 140);
}

// PWA: service worker registration and install prompt handling
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  // show a brief automatic prompt to install after a short delay (most browsers allow prompt here)
  setTimeout(()=>{
    if(deferredPrompt){
      try{ deferredPrompt.prompt(); }
      catch(err){ /* ignore */ }
    }
  }, 1000);
});

window.addEventListener('appinstalled', ()=>{
  // hide any custom install UI if present
  const btn = document.getElementById('installBtn'); if(btn) btn.classList.add('hidden');
});

// register service worker
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
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
  // Open repo modal instead of prompt
  openRepoModal();
}

function openRepoModal(){
  const modal = document.getElementById('repoModal');
  const owner = localStorage.getItem('qrb_github_owner') || '';
  const repo = localStorage.getItem('qrb_github_repo') || '';
  const branch = localStorage.getItem('qrb_github_branch') || 'main';
  document.getElementById('repoOwner').value = owner;
  document.getElementById('repoName').value = repo;
  document.getElementById('repoBranch').value = branch;
  modal.classList.remove('hidden');
  // focus first field
  setTimeout(()=> document.getElementById('repoOwner').focus(), 100);
}

function closeRepoModal(){
  document.getElementById('repoModal').classList.add('hidden');
}

// handle modal form submit
document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('repoForm');
  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const owner = document.getElementById('repoOwner').value.trim();
      const repo = document.getElementById('repoName').value.trim();
      const branch = document.getElementById('repoBranch').value.trim() || 'main';
      if(!owner || !repo){ alert('Owner and repo are required'); return; }
      // store defaults
      localStorage.setItem('qrb_github_owner', owner);
      localStorage.setItem('qrb_github_repo', repo);
      localStorage.setItem('qrb_github_branch', branch);
      closeRepoModal();
      await pushViaServer(owner, repo, branch);
    });
    document.getElementById('repoCancel').addEventListener('click', ()=> closeRepoModal());
    // close modal on Escape
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeRepoModal(); });
  }
  // close push panel
  const closePush = document.getElementById('closePushPanel');
  if(closePush) closePush.addEventListener('click', ()=> document.getElementById('pushPanel').classList.add('hidden'));
});

async function pushViaServer(owner, repo, branch){
  const serverUrl = localStorage.getItem('qrb_server_url') || 'http://localhost:4000';
  const pushPanel = document.getElementById('pushPanel');
  const pushLog = document.getElementById('pushLog');
  const pushSummary = document.getElementById('pushProgressSummary');
  pushLog.innerHTML = '';
  pushPanel.classList.remove('hidden');
  pushSummary.textContent = 'Preparing files...';

  // show pending entries
  const entries = Object.keys(files).map(p=>({path:p,status:'pending'}));
  for(const e of entries){
    const li = document.createElement('li'); li.className = 'pending'; li.dataset.path = e.path;
    li.innerHTML = `<span class="fname">${e.path}</span><span class="status">Pending</span>`;
    pushLog.appendChild(li);
  }

  try{
    pushSummary.textContent = 'Uploading (single-commit)...';
    const resp = await fetch(`${serverUrl.replace(/\/$/, '')}/api/github/push`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include',
      body: JSON.stringify({ owner, repo, branch, message: `QuickRedBlazer push`, files })
    });
    const data = await resp.json();
    if(!resp.ok){
      pushSummary.textContent = 'Push failed';
      const li = document.createElement('li'); li.className='fail'; li.textContent = 'Server error: ' + (data.error||JSON.stringify(data));
      pushLog.appendChild(li);
      return;
    }

    // success: update per-file status using returned blobs mapping
    pushSummary.textContent = `Push successful — commit ${data.commit}`;
    const blobs = data.files || {};
    for(const li of Array.from(pushLog.children)){
      const path = li.dataset.path;
      if(blobs[path]){
        li.className = 'success';
        li.querySelector('.status').textContent = 'OK ' + blobs[path].slice(0,7);
      } else {
        li.className = 'fail';
        li.querySelector('.status').textContent = 'Unknown';
      }
    }
    // move a small progress indicator
    const prog = document.querySelector('.push-progress > i');
    if(prog) prog.style.width = '100%';
  }catch(err){
    pushSummary.textContent = 'Push failed: ' + err.message;
    const li = document.createElement('li'); li.className='fail'; li.textContent = err.message;
    pushLog.appendChild(li);
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
  // Prefer srcdoc for compatibility on many mobile browsers; fall back to blob URL if needed
  try{
    preview.removeAttribute('src');
    preview.srcdoc = html;
  }catch(e){
    const blob = new Blob([html], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    preview.src = url;
    setTimeout(()=> URL.revokeObjectURL(url), 2000);
  }
}

function showPanel(name){
  const sidebar = document.getElementById('sidebar');
  const codePanel = document.querySelector('.code-panel');
  const previewPanel = document.getElementById('previewPanel');
  if(name === 'files'){
    // show sidebar, hide preview
    if(sidebar) sidebar.style.display = '';
    if(previewPanel) { previewPanel.style.display = 'none'; previewPanel.classList.remove('mobile-visible'); }
    if(codePanel) codePanel.style.display = '';
  } else if(name === 'editor'){
    if(sidebar) sidebar.style.display = 'none';
    if(previewPanel) { previewPanel.style.display = 'none'; previewPanel.classList.remove('mobile-visible'); }
    if(codePanel) codePanel.style.display = '';
  } else if(name === 'preview'){
    if(sidebar) sidebar.style.display = 'none';
    if(codePanel) codePanel.style.display = 'none';
    if(previewPanel) { previewPanel.style.display = ''; previewPanel.classList.add('mobile-visible'); }
  }
  // refresh CodeMirror after layout changes so it resizes correctly
  setTimeout(()=>{ if(cm && cm.refresh) cm.refresh(); }, 140);
}

// debounce run
let debounceTimer = null;
function debounceRun(){
  if(debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=> runPreview(), 600);
}

// Adjust editor/preview sizing on mobile/resize and refresh CodeMirror
function adjustMobileLayout(){
  const isMobile = window.innerWidth <= 700;
  const codePanel = document.querySelector('.code-panel');
  const previewPanel = document.getElementById('previewPanel');
  const topbar = document.querySelector('.topbar');
  const mobileNav = document.getElementById('mobileNav');
  // compute available height
  const vh = window.innerHeight;
  let used = 0;
  if(topbar) used += topbar.getBoundingClientRect().height || 56;
  if(mobileNav && isMobile) used += mobileNav.getBoundingClientRect().height || 64;
  const avail = Math.max(240, vh - used - 90);
  if(codePanel && isMobile){ codePanel.style.height = avail + 'px'; }
  if(previewPanel && isMobile && previewPanel.classList.contains('mobile-visible')){
    previewPanel.style.height = (vh - used - 36) + 'px';
  }
  // Ensure CodeMirror refreshes (necessary when container sizes change)
  if(cm && typeof cm.refresh === 'function'){
    try{ cm.refresh(); }catch(e){ /* ignore */ }
  }
}

// init on load
document.addEventListener('DOMContentLoaded', init);
