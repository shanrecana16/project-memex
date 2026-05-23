// manager.js — Project Memex v1.2

// ── Utilities ──────────────────────────────────────────────────
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
function esc(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function g(id) { return document.getElementById(id)?.value || ''; }
function s(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }

// ── Theme ──────────────────────────────────────────────────────
let currentTheme = localStorage.getItem('pm-theme') || 'dark';
function applyTheme(t) {
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('theme-icon').textContent = t === 'dark' ? '☀️' : '🌙';
  document.getElementById('theme-label-btn').textContent = t === 'dark' ? 'Light' : 'Dark';
  localStorage.setItem('pm-theme', t);
}
applyTheme(currentTheme);
document.getElementById('theme-toggle').addEventListener('click', () => {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// ── Tag system ─────────────────────────────────────────────────
const tagStores = {};
function initTags(key, wrapId, inputId, btnId) {
  tagStores[key] = [];
  const render = () => {
    const el = document.getElementById(wrapId);
    if (!el) return;
    el.innerHTML = tagStores[key].map((v, i) =>
      `<span class="tag">${v}<span class="tag-x" data-k="${key}" data-i="${i}">×</span></span>`
    ).join('');
    el.querySelectorAll('.tag-x').forEach(x => {
      x.addEventListener('click', () => { tagStores[x.dataset.k].splice(+x.dataset.i, 1); render(); });
    });
  };
  const add = () => {
    const inp = document.getElementById(inputId);
    const v = inp.value.trim();
    if (v) { tagStores[key].push(v); inp.value = ''; render(); }
  };
  document.getElementById(btnId)?.addEventListener('click', add);
  document.getElementById(inputId)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  });
  render();
  return { render, set: arr => { tagStores[key] = Array.isArray(arr) ? [...arr] : []; render(); } };
}

const tagsCtrl = {
  deps:        initTags('deps',        'deps-tags',        'dep-input',         'dep-add'),
  rules:       initTags('rules',       'rules-tags',       'rule-input',        'rule-add'),
  completed:   initTags('completed',   'completed-tags',   'completed-input',   'completed-add'),
  inprogress:  initTags('inprogress',  'inprogress-tags',  'inprogress-input',  'inprogress-add'),
  nextsteps:   initTags('nextsteps',   'nextsteps-tags',   'nextsteps-input',   'nextsteps-add'),
  blockers:    initTags('blockers',    'blockers-tags',    'blockers-input',    'blockers-add'),
  constraints: initTags('constraints', 'constraints-tags', 'constraints-input', 'constraints-add'),
  issues:      initTags('issues',      'issues-tags',      'issues-input',      'issues-add'),
};

// ── Decisions ──────────────────────────────────────────────────
let decisions = [];
function renderDecisions() {
  const el = document.getElementById('decisions-list');
  el.innerHTML = decisions.map((d, i) => `
    <div class="decision">
      <div class="decision-row">
        <input type="text" placeholder="Decision: e.g. Use REST not GraphQL" value="${esc(d.decision)}" data-f="decision" data-i="${i}">
        <button class="rm-btn" data-i="${i}">Remove</button>
      </div>
      <div class="decision-sub">
        <textarea placeholder="Why — the reasoning behind this decision" data-f="reason" data-i="${i}">${esc(d.reason)}</textarea>
        <textarea placeholder="Rejected alternatives (optional)" data-f="alternatives" data-i="${i}">${esc(d.alternatives || '')}</textarea>
      </div>
    </div>`).join('');
  el.querySelectorAll('[data-f]').forEach(inp => {
    inp.addEventListener('input', () => { decisions[+inp.dataset.i][inp.dataset.f] = inp.value; });
  });
  el.querySelectorAll('.rm-btn').forEach(btn => {
    btn.addEventListener('click', () => { decisions.splice(+btn.dataset.i, 1); renderDecisions(); });
  });
}
document.getElementById('decision-add').addEventListener('click', () => {
  decisions.push({ decision: '', reason: '', alternatives: '' });
  renderDecisions();
});

// ── Folders ────────────────────────────────────────────────────
let folders = [];
function renderFolders() {
  const el = document.getElementById('folders-list');
  const mkInp = (val, field, i) =>
    `<input type="text" value="${esc(val)}"
      placeholder="${field === 'path' ? '/src/components' : 'Purpose of this folder'}"
      data-f="${field}" data-i="${i}"
      style="flex:${field === 'path' ? 1 : 2};padding:6px 9px;background:var(--bg);
             border:1px solid var(--border2);border-radius:var(--r);
             color:var(--text);font-family:var(--mono);font-size:12px;outline:none;">`;
  el.innerHTML = folders.map((f, i) =>
    `<div style="display:flex;gap:6px;margin-bottom:6px;">
      ${mkInp(f.path, 'path', i)}${mkInp(f.purpose, 'purpose', i)}
      <button class="rm-btn" data-i="${i}" style="align-self:center">×</button>
    </div>`).join('');
  el.querySelectorAll('[data-f]').forEach(inp => {
    inp.addEventListener('input', () => { folders[+inp.dataset.i][inp.dataset.f] = inp.value; });
  });
  el.querySelectorAll('.rm-btn').forEach(btn => {
    btn.addEventListener('click', () => { folders.splice(+btn.dataset.i, 1); renderFolders(); });
  });
}
document.getElementById('folder-add').addEventListener('click', () => {
  folders.push({ path: '', purpose: '' }); renderFolders();
});

// ── File / Folder Scanner ──────────────────────────────────────
let scannedResult = null;

// Build an ASCII tree from file paths
function buildTree(paths) {
  const root = {};
  // Filter out hidden, node_modules, .git, dist, build, __pycache__
  const IGNORE = /node_modules|\.git|dist\/|build\/|\.next\/|__pycache__|\.cache|\.DS_Store/;
  const filtered = paths.filter(p => !IGNORE.test(p));

  filtered.forEach(p => {
    const parts = p.split('/').filter(Boolean);
    let node = root;
    parts.forEach((part, i) => {
      if (!node[part]) node[part] = i === parts.length - 1 ? null : {};
      if (node[part] !== null) node = node[part];
    });
  });

  function render(node, prefix = '', isLast = true) {
    if (!node || typeof node !== 'object') return '';
    const entries = Object.entries(node);
    // Sort: folders first, then files
    entries.sort(([ak, av], [bk, bv]) => {
      const aIsDir = av !== null;
      const bIsDir = bv !== null;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return ak.localeCompare(bk);
    });
    return entries.map(([name, child], i) => {
      const last = i === entries.length - 1;
      const connector = last ? '└── ' : '├── ';
      const newPrefix = prefix + (last ? '    ' : '│   ');
      const icon = child === null ? '' : '📁 ';
      const line = prefix + connector + icon + name;
      const children = child !== null ? render(child, newPrefix) : '';
      return children ? line + '\n' + children : line;
    }).join('\n');
  }

  return render(root);
}

async function inferFromFiles(files) {
  const fileArr = Array.from(files);
  const names = fileArr.map(f => f.name);
  const paths = fileArr.map(f => f.webkitRelativePath || f.name);

  const detected = {
    language: null, framework: null, runtime: null,
    database: null, styling: null, pm: null,
    deps: [], patterns: [], structureFolders: [],
    fileTree: buildTree(paths),
    totalFiles: fileArr.length,
  };

  // Language detection
  const ext = (e) => fileArr.some(f => f.name.endsWith(e));
  if (ext('.ts') || ext('.tsx') || names.includes('tsconfig.json')) detected.language = 'TypeScript';
  else if (ext('.js') || ext('.jsx')) detected.language = 'JavaScript';
  else if (ext('.py') || names.some(n => ['pyproject.toml','setup.py','requirements.txt'].includes(n))) detected.language = 'Python';
  else if (ext('.go') || names.includes('go.mod')) detected.language = 'Go';
  else if (ext('.rs') || names.includes('Cargo.toml')) detected.language = 'Rust';
  else if (ext('.java') || names.includes('pom.xml')) detected.language = 'Java';
  else if (ext('.php')) detected.language = 'PHP';

  // Package manager
  if (names.includes('pnpm-lock.yaml')) detected.pm = 'pnpm';
  else if (names.includes('bun.lockb')) detected.pm = 'bun';
  else if (names.includes('yarn.lock')) detected.pm = 'yarn';
  else if (names.includes('package-lock.json')) detected.pm = 'npm';

  // Config-based framework detection
  if (names.includes('next.config.js') || names.includes('next.config.ts') || names.includes('next.config.mjs')) detected.framework = 'Next.js';
  else if (names.includes('vite.config.ts') || names.includes('vite.config.js')) detected.framework = 'Vite';
  else if (names.includes('nuxt.config.ts') || names.includes('nuxt.config.js')) detected.framework = 'Nuxt';
  else if (names.includes('svelte.config.js')) detected.framework = 'SvelteKit';
  else if (names.includes('astro.config.mjs')) detected.framework = 'Astro';
  else if (names.includes('remix.config.js')) detected.framework = 'Remix';

  // Styling detection from file names
  if (names.some(n => n === 'tailwind.config.js' || n === 'tailwind.config.ts')) detected.styling = 'Tailwind CSS';
  else if (names.some(n => n.endsWith('.module.css') || n.endsWith('.module.scss'))) detected.styling = 'CSS Modules';

  // Folder structure
  const topFolders = new Set(paths.map(p => p.split('/').filter(Boolean)[0]).filter(Boolean));
  const KNOWN = ['src','app','pages','components','lib','utils','api','hooks','store','styles','public','assets','tests','__tests__','server','client','config','scripts','docs'];
  KNOWN.forEach(f => { if (topFolders.has(f)) detected.structureFolders.push(f); });

  // File naming patterns
  const tsxFiles = fileArr.filter(f => f.name.endsWith('.tsx') || f.name.endsWith('.jsx')).map(f => f.name);
  if (tsxFiles.some(n => /^[A-Z]/.test(n))) detected.patterns.push('PascalCase components');
  if (paths.some(p => p.includes('/hooks/use'))) detected.patterns.push('Custom hooks in /hooks');
  if (paths.some(p => p.includes('/lib/') || p.includes('/utils/'))) detected.patterns.push('Utility functions in /lib or /utils');
  if (paths.some(p => p.includes('.test.') || p.includes('.spec.'))) detected.patterns.push('Co-located test files (.test / .spec)');
  if (paths.some(p => p.includes('/api/'))) detected.patterns.push('API routes in /api');

  // Read package.json for deeper detection
  const pkgFile = fileArr.find(f => f.name === 'package.json' && !f.webkitRelativePath?.includes('node_modules'));
  if (pkgFile) {
    await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const pkg = JSON.parse(e.target.result);
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
          const d = Object.keys(allDeps);

          // Framework from package.json (fallback)
          if (!detected.framework) {
            if (d.includes('next')) detected.framework = `Next.js ${(allDeps['next']||'').replace(/[\^~]/,'')}`.trim();
            else if (d.includes('react') && d.includes('vite')) detected.framework = 'React + Vite';
            else if (d.includes('react')) detected.framework = 'React';
            else if (d.includes('vue')) detected.framework = 'Vue';
            else if (d.includes('svelte')) detected.framework = 'Svelte';
            else if (d.includes('@angular/core')) detected.framework = 'Angular';
            else if (d.includes('express')) detected.framework = 'Express.js';
            else if (d.includes('fastify')) detected.framework = 'Fastify';
            else if (d.includes('hono')) detected.framework = 'Hono';
          }

          // Styling (fallback)
          if (!detected.styling) {
            if (d.includes('tailwindcss')) detected.styling = 'Tailwind CSS';
            else if (d.includes('styled-components')) detected.styling = 'styled-components';
            else if (d.includes('@emotion/react')) detected.styling = 'Emotion';
          }

          // Database / ORM
          if (d.includes('@prisma/client')) detected.database = 'PostgreSQL (Prisma ORM)';
          else if (d.includes('drizzle-orm')) detected.database = 'Drizzle ORM';
          else if (d.includes('mongoose')) detected.database = 'MongoDB (Mongoose)';
          else if (d.includes('sequelize')) detected.database = 'Sequelize ORM';
          else if (d.includes('@supabase/supabase-js')) detected.database = 'Supabase';

          // Notable deps
          const notable = ['zod','zustand','jotai','redux','@tanstack/react-query','react-query','axios','stripe','resend','@trpc/client','drizzle-orm','lucia','next-auth','clerk'];
          notable.forEach(dep => { if (d.includes(dep) && !detected.deps.includes(dep)) detected.deps.push(dep); });

          // Runtime
          if (pkg.engines?.node) detected.runtime = `Node.js ${pkg.engines.node}`;
          else if (d.includes('next') || d.includes('express')) detected.runtime = 'Node.js';
        } catch (_) {}
        resolve();
      };
      reader.readAsText(pkgFile);
    });
  }

  return { detected };
}

function renderScanTree(detected, fileTree, totalFiles) {
  const treeEl = document.getElementById('scan-tree');
  const chips = [
    detected.language, detected.framework, detected.runtime,
    detected.database, detected.styling, detected.pm,
    ...detected.deps, ...detected.patterns
  ].filter(Boolean);

  treeEl.innerHTML = `
    <div class="tree-header">
      <span>📁 Project structure</span>
      <small>${totalFiles} files scanned</small>
    </div>
    <div class="tree-body">${fileTree || '(no structure detected)'}</div>
    ${chips.length ? `<div class="tree-detected">${chips.map(c => `<span class="det-chip">${c}</span>`).join('')}</div>` : ''}
  `;
  treeEl.classList.add('show');
}

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-drop-input');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', async e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  // Handle folder drops via DataTransferItems when available
  const items = e.dataTransfer.items;
  let files = null;
  if (items) {
    files = e.dataTransfer.files;
  } else {
    files = e.dataTransfer.files;
  }
  if (files?.length) await processFiles(files);
});
fileInput.addEventListener('change', async e => {
  if (e.target.files?.length) await processFiles(e.target.files);
});

async function processFiles(files) {
  const actionsEl = document.getElementById('scan-actions');
  const treeEl = document.getElementById('scan-tree');
  treeEl.innerHTML = '<div style="padding:12px;font-family:var(--mono);font-size:11px;color:var(--text3)">Scanning...</div>';
  treeEl.classList.add('show');
  actionsEl.style.display = 'none';

  const result = await inferFromFiles(files);
  scannedResult = result;

  renderScanTree(result.detected, result.detected.fileTree, result.detected.totalFiles);
  actionsEl.style.display = 'flex';
}

document.getElementById('btn-apply-scan').addEventListener('click', () => {
  if (!scannedResult) return;
  const d = scannedResult.detected;

  if (d.language  && !g('f-language'))  s('f-language',  d.language);
  if (d.framework && !g('f-framework')) s('f-framework', d.framework);
  if (d.runtime   && !g('f-runtime'))   s('f-runtime',   d.runtime);
  if (d.database  && !g('f-database'))  s('f-database',  d.database);
  if (d.styling   && !g('f-styling'))   s('f-styling',   d.styling);
  if (d.pm        && !g('f-pm'))        s('f-pm',        d.pm);

  d.deps.forEach(dep => { if (!tagStores.deps.includes(dep)) tagStores.deps.push(dep); });
  tagsCtrl.deps.render();

  d.patterns.forEach(p => { if (!tagStores.rules.includes(p)) tagStores.rules.push(p); });
  tagsCtrl.rules.render();

  if (d.structureFolders.length) {
    const PURPOSES = {
      src: 'Main source code', app: 'App directory (Next.js App Router)',
      pages: 'Page routes', components: 'Reusable UI components',
      lib: 'Library utilities', utils: 'Helper functions',
      api: 'API routes/handlers', hooks: 'Custom React hooks',
      store: 'State management', styles: 'Global stylesheets',
      public: 'Static assets', assets: 'Images, fonts, icons',
      tests: 'Test files', __tests__: 'Jest test files',
      server: 'Server-side code', client: 'Client-side code',
      config: 'Configuration files', scripts: 'Build/dev scripts',
    };
    const newFolders = d.structureFolders.map(f => ({
      path: `/${f}`,
      purpose: PURPOSES[f] || '',
    }));
    folders = [...folders, ...newFolders.filter(nf => !folders.some(ef => ef.path === nf.path))];
    renderFolders();
  }

  toast('✓ Scan applied to project');
});

document.getElementById('btn-clear-scan').addEventListener('click', () => {
  scannedResult = null;
  document.getElementById('scan-tree').classList.remove('show');
  document.getElementById('scan-actions').style.display = 'none';
  fileInput.value = '';
});

// ── Storage ────────────────────────────────────────────────────
const isExt = typeof chrome !== 'undefined' && chrome.runtime?.id;

async function getAllProjects() {
  if (isExt) return new Promise(res => chrome.runtime.sendMessage({ type: 'GET_ALL_PROJECTS' }, res));
  return { projects: JSON.parse(localStorage.getItem('pm_projects') || '{}'), activeId: localStorage.getItem('pm_active') || null };
}
async function saveProject(p) {
  if (isExt) return new Promise(res => chrome.runtime.sendMessage({ type: 'SAVE_PROJECT', project: p }, res));
  const all = JSON.parse(localStorage.getItem('pm_projects') || '{}');
  all[p.id] = p; localStorage.setItem('pm_projects', JSON.stringify(all));
}
async function setActive(id) {
  if (isExt) return new Promise(res => chrome.runtime.sendMessage({ type: 'SET_ACTIVE_PROJECT', id }, res));
  localStorage.setItem('pm_active', id || '');
}
async function deleteProject(id) {
  if (isExt) return new Promise(res => chrome.runtime.sendMessage({ type: 'DELETE_PROJECT', id }, res));
  const all = JSON.parse(localStorage.getItem('pm_projects') || '{}');
  delete all[id]; localStorage.setItem('pm_projects', JSON.stringify(all));
  if (localStorage.getItem('pm_active') === id) localStorage.removeItem('pm_active');
}

// ── App state ──────────────────────────────────────────────────
let allProjects = {};
let currentId = null;

function phaseClass(ph) {
  const map = { planning:'ph-planning', building:'ph-building', scaffolding:'ph-building', debugging:'ph-debugging', deploying:'ph-deploying' };
  return map[ph] || 'ph-building';
}

function renderSidebar() {
  const el = document.getElementById('sidebar-list');
  const ids = Object.keys(allProjects);
  if (!ids.length) { el.innerHTML = '<div style="padding:12px;font-size:11px;color:var(--text3)">No projects yet</div>'; return; }
  el.innerHTML = ids.map(id => {
    const p = allProjects[id];
    return `<div class="proj-item ${id === currentId ? 'active' : ''}" data-id="${id}">
      <div class="proj-item-name">${p.name || 'Untitled'}</div>
      <div class="proj-item-meta">${p.stack?.framework || ''}</div>
      ${p.state?.phase ? `<span class="phase-pill ${phaseClass(p.state.phase)}">${p.state.phase}</span>` : ''}
    </div>`;
  }).join('');
  el.querySelectorAll('.proj-item').forEach(el => el.addEventListener('click', () => loadProject(el.dataset.id)));
}

function collectProject() {
  return {
    id: currentId,
    name: g('f-name') || 'Untitled',
    version: '1.2.0',
    created: allProjects[currentId]?.created || new Date().toISOString(),
    updated: new Date().toISOString(),
    context: {
      goal: g('f-goal'), audience: g('f-audience'),
      constraints: [...tagStores.constraints], knownIssues: [...tagStores.issues],
    },
    stack: {
      language: g('f-language'), framework: g('f-framework'), runtime: g('f-runtime'),
      database: g('f-database'), styling: g('f-styling'), packageManager: g('f-pm'),
      otherDeps: [...tagStores.deps],
    },
    conventions: {
      fileNaming: g('f-file-naming'), componentStyle: g('f-component-style'),
      stateManagement: g('f-state'), apiLayer: g('f-api-layer'), rules: [...tagStores.rules],
    },
    structure: {
      root: g('f-root'), entryPoint: g('f-entry'),
      folders: folders.map(f => ({ ...f })),
    },
    decisions: decisions.map(d => ({ ...d })),
    state: {
      phase: g('f-phase'), lastSessionSummary: g('f-summary'),
      completed: [...tagStores.completed], inProgress: [...tagStores.inprogress],
      nextSteps: [...tagStores.nextsteps], blockers: [...tagStores.blockers],
    },
    scannedStructure: scannedResult?.detected?.fileTree || null,
  };
}

function populateForm(p) {
  s('f-name', p.name); s('f-goal', p.context?.goal); s('f-audience', p.context?.audience);
  s('f-language', p.stack?.language); s('f-framework', p.stack?.framework);
  s('f-runtime', p.stack?.runtime); s('f-database', p.stack?.database);
  s('f-styling', p.stack?.styling); s('f-pm', p.stack?.packageManager);
  s('f-file-naming', p.conventions?.fileNaming); s('f-component-style', p.conventions?.componentStyle);
  s('f-state', p.conventions?.stateManagement); s('f-api-layer', p.conventions?.apiLayer);
  s('f-root', p.structure?.root); s('f-entry', p.structure?.entryPoint);
  s('f-phase', p.state?.phase || 'building'); s('f-summary', p.state?.lastSessionSummary);

  tagsCtrl.deps.set(p.stack?.otherDeps);
  tagsCtrl.rules.set(p.conventions?.rules);
  tagsCtrl.completed.set(p.state?.completed);
  tagsCtrl.inprogress.set(p.state?.inProgress);
  tagsCtrl.nextsteps.set(p.state?.nextSteps);
  tagsCtrl.blockers.set(p.state?.blockers);
  tagsCtrl.constraints.set(p.context?.constraints);
  tagsCtrl.issues.set(p.context?.knownIssues);

  decisions = (p.decisions || []).map(d => ({ ...d })); renderDecisions();
  folders = (p.structure?.folders || []).map(f => ({ ...f })); renderFolders();

  document.getElementById('topbar-title').textContent = p.name || 'Untitled';
  document.getElementById('preview-card').style.display = 'none';
  scannedResult = null;
  document.getElementById('scan-tree').classList.remove('show');
  document.getElementById('scan-actions').style.display = 'none';
}

async function loadProject(id) {
  currentId = id;
  await setActive(id);
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('editor').style.display = 'block';
  populateForm(allProjects[id]);
  renderSidebar();
}

async function newProject() {
  const id = uuid();
  const p = {
    id, name: 'New project', version: '1.2.0',
    created: new Date().toISOString(), updated: new Date().toISOString(),
    context: {}, stack: {}, conventions: {}, structure: { folders: [] },
    decisions: [], state: { phase: 'planning' },
  };
  allProjects[id] = p;
  await saveProject(p);
  await loadProject(id);
  document.getElementById('f-name').focus();
  document.getElementById('f-name').select();
}

// ── Briefing builder ───────────────────────────────────────────
function buildBriefing(p) {
  const lines = [];
  lines.push(`# ⚡ Project Memex Briefing`);
  lines.push(`Project: ${p.name}`);
  if (p.context?.goal) lines.push(`Goal: ${p.context.goal}`);
  lines.push('');

  if (p.scannedStructure) {
    lines.push('## Project Structure (scanned from source files)');
    lines.push('```');
    lines.push(p.scannedStructure);
    lines.push('```');
    lines.push('');
  }

  if (p.stack) {
    const st = p.stack;
    lines.push('## Tech Stack (follow exactly)');
    if (st.language)       lines.push(`- Language: ${st.language}`);
    if (st.framework)      lines.push(`- Framework: ${st.framework}`);
    if (st.runtime)        lines.push(`- Runtime: ${st.runtime}`);
    if (st.database)       lines.push(`- Database: ${st.database}`);
    if (st.styling)        lines.push(`- Styling: ${st.styling}`);
    if (st.packageManager) lines.push(`- Package manager: ${st.packageManager}`);
    if (st.otherDeps?.length) lines.push(`- Other: ${st.otherDeps.join(', ')}`);
    lines.push('');
  }

  if (p.conventions) {
    const c = p.conventions;
    lines.push('## Conventions (enforce strictly)');
    if (c.fileNaming)      lines.push(`- Files: ${c.fileNaming}`);
    if (c.componentStyle)  lines.push(`- Components: ${c.componentStyle}`);
    if (c.stateManagement) lines.push(`- State: ${c.stateManagement}`);
    if (c.apiLayer)        lines.push(`- API: ${c.apiLayer}`);
    if (c.rules?.length)   c.rules.forEach(r => lines.push(`- ${r}`));
    lines.push('');
  }

  if (p.decisions?.length) {
    lines.push('## Architectural decisions (final — do not re-litigate)');
    p.decisions.forEach(d => {
      lines.push(`- ${d.decision} — ${d.reason}`);
      if (d.alternatives) lines.push(`  Rejected: ${d.alternatives}`);
    });
    lines.push('');
  }

  if (p.structure?.folders?.length) {
    lines.push('## Key folders');
    if (p.structure.root)       lines.push(`Root: ${p.structure.root}`);
    if (p.structure.entryPoint) lines.push(`Entry: ${p.structure.entryPoint}`);
    p.structure.folders.forEach(f => lines.push(`- ${f.path} — ${f.purpose}`));
    lines.push('');
  }

  if (p.state) {
    const st = p.state;
    lines.push('## Current state');
    if (st.phase)               lines.push(`Phase: ${st.phase}`);
    if (st.lastSessionSummary)  lines.push(`Last session: ${st.lastSessionSummary}`);
    if (st.completed?.length)   lines.push(`Done: ${st.completed.join('; ')}`);
    if (st.inProgress?.length)  lines.push(`In progress: ${st.inProgress.join('; ')}`);
    if (st.blockers?.length)    lines.push(`Blockers: ${st.blockers.join('; ')}`);
    if (st.nextSteps?.length) {
      lines.push('Next steps:');
      st.nextSteps.forEach((n, i) => lines.push(`  ${i + 1}. ${n}`));
    }
    lines.push('');
  }

  if (p.context?.constraints?.length) {
    lines.push('## Constraints');
    p.context.constraints.forEach(c => lines.push(`- ${c}`));
    lines.push('');
  }
  if (p.context?.knownIssues?.length) {
    lines.push('## Known issues');
    p.context.knownIssues.forEach(k => lines.push(`- ${k}`));
    lines.push('');
  }

  lines.push('---');
  lines.push('You are continuing this project. Follow all conventions and decisions above. Ask only if something is genuinely ambiguous.');
  return lines.join('\n');
}

// ── Button handlers ────────────────────────────────────────────
document.getElementById('btn-new').addEventListener('click', newProject);
document.getElementById('btn-welcome-new').addEventListener('click', newProject);

document.getElementById('btn-save').addEventListener('click', async () => {
  const p = collectProject();
  allProjects[p.id] = p;
  await saveProject(p);
  document.getElementById('topbar-title').textContent = p.name;
  renderSidebar();
  toast('✓ Project saved');
});

document.getElementById('btn-delete').addEventListener('click', async () => {
  if (!confirm(`Delete "${allProjects[currentId]?.name}"?`)) return;
  await deleteProject(currentId);
  delete allProjects[currentId];
  currentId = null;
  document.getElementById('editor').style.display = 'none';
  document.getElementById('welcome').style.display = 'flex';
  renderSidebar();
  toast('Project deleted');
});

document.getElementById('btn-preview').addEventListener('click', () => {
  const card = document.getElementById('preview-card');
  if (card.style.display !== 'none') { card.style.display = 'none'; return; }
  document.getElementById('preview-text').textContent = buildBriefing(collectProject());
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btn-export').addEventListener('click', () => {
  const p = collectProject();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }));
  a.download = `${(p.name || 'project').toLowerCase().replace(/\s+/g, '-')}-memex.json`;
  a.click();
  toast('↓ Exported');
});

document.getElementById('btn-import-json').addEventListener('click', () => document.getElementById('import-input').click());
document.getElementById('import-input').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const p = JSON.parse(await file.text());
    if (!p.name) throw new Error('Invalid file');
    p.id = p.id || uuid();
    allProjects[p.id] = p;
    await saveProject(p);
    await loadProject(p.id);
    toast('↑ Project imported');
  } catch (err) { alert('Could not import: ' + err.message); }
  e.target.value = '';
});

// ── Init ───────────────────────────────────────────────────────
async function init() {
  const { projects, activeId } = await getAllProjects();
  allProjects = projects || {};
  renderSidebar();
  if (activeId && allProjects[activeId]) loadProject(activeId);
}
init();