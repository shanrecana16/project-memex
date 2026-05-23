// manager.js — Project Memex v1.1

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

// ── AI Combo ───────────────────────────────────────────────────
const AI_OPTIONS = [
  { id: 'claude',    label: 'Claude',    color: '#d97706' },
  { id: 'chatgpt',  label: 'ChatGPT',   color: '#16a34a' },
  { id: 'gemini',   label: 'Gemini',    color: '#2563eb' },
  { id: 'deepseek', label: 'DeepSeek',  color: '#7c3aed' },
];
let selectedAIs = []; // ordered array of AI ids

function renderAIGrid() {
  const el = document.getElementById('ai-grid');
  el.innerHTML = AI_OPTIONS.map(ai => {
    const idx = selectedAIs.indexOf(ai.id);
    const sel = idx !== -1;
    return `<div class="ai-chip ${sel ? 'selected' : ''}" data-ai="${ai.id}">
      <span class="ai-dot" style="background:${ai.color}"></span>
      ${ai.label}
      ${sel ? `<span class="order-badge">${idx + 1}</span>` : ''}
    </div>`;
  }).join('');
  el.querySelectorAll('.ai-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.ai;
      const idx = selectedAIs.indexOf(id);
      if (idx === -1) selectedAIs.push(id);
      else selectedAIs.splice(idx, 1);
      renderAIGrid();
    });
  });
}
renderAIGrid();

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
  document.getElementById(inputId)?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
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
        <textarea placeholder="Why — the reasoning" data-f="reason" data-i="${i}">${esc(d.reason)}</textarea>
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
  const inp = (val, field, i) =>
    `<input type="text" value="${esc(val)}" placeholder="${field === 'path' ? '/src/components' : 'Purpose of this folder'}"
     data-f="${field}" data-i="${i}"
     style="flex:${field==='path'?1:2};padding:6px 9px;background:var(--bg);border:1px solid var(--border2);border-radius:var(--r);color:var(--text);font-family:var(--mono);font-size:12px;outline:none;">`;
  el.innerHTML = folders.map((f, i) =>
    `<div style="display:flex;gap:6px;margin-bottom:6px;">
      ${inp(f.path,'path',i)}${inp(f.purpose,'purpose',i)}
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

// ── File Scanner ───────────────────────────────────────────────
let scannedResult = null;

function inferFromFiles(files) {
  const names = Array.from(files).map(f => f.name);
  const paths = Array.from(files).map(f => f.webkitRelativePath || f.name);
  const all = paths.join('\n');

  const detected = {
    language: null, framework: null, runtime: null,
    database: null, styling: null, pm: null,
    deps: [], patterns: [], structure: []
  };

  // Language
  if (names.some(n => n.endsWith('.ts') || n.endsWith('.tsx') || n === 'tsconfig.json')) detected.language = 'TypeScript';
  else if (names.some(n => n.endsWith('.js') || n.endsWith('.jsx'))) detected.language = 'JavaScript';
  else if (names.some(n => n.endsWith('.py') || n === 'pyproject.toml')) detected.language = 'Python';
  else if (names.some(n => n.endsWith('.go'))) detected.language = 'Go';
  else if (names.some(n => n.endsWith('.rs') || n === 'Cargo.toml')) detected.language = 'Rust';
  else if (names.some(n => n.endsWith('.java'))) detected.language = 'Java';

  // Framework detection from package.json reading
  const pkgFile = Array.from(files).find(f => f.name === 'package.json');

  const finalize = (pkg) => {
    if (pkg) {
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const d = Object.keys(deps);

      if (d.includes('next')) detected.framework = `Next.js ${deps['next']?.replace(/[\^~]/,'')||''}`.trim();
      else if (d.includes('vite')) detected.framework = 'Vite';
      else if (d.includes('react')) detected.framework = 'React';
      else if (d.includes('vue')) detected.framework = 'Vue';
      else if (d.includes('svelte')) detected.framework = 'Svelte';
      else if (d.includes('@angular/core')) detected.framework = 'Angular';
      else if (d.includes('express')) detected.framework = 'Express';
      else if (d.includes('fastify')) detected.framework = 'Fastify';

      if (d.includes('tailwindcss')) detected.styling = 'Tailwind CSS';
      else if (d.includes('styled-components')) detected.styling = 'styled-components';
      else if (d.includes('@emotion/react')) detected.styling = 'Emotion';

      if (d.includes('prisma') || d.includes('@prisma/client')) { detected.database = detected.database || 'Prisma ORM'; }
      if (d.includes('drizzle-orm')) detected.database = 'Drizzle ORM';
      if (d.includes('mongoose')) detected.database = 'MongoDB (Mongoose)';

      if (d.includes('zustand')) detected.deps.push('zustand');
      if (d.includes('@tanstack/react-query') || d.includes('react-query')) detected.deps.push('react-query');
      if (d.includes('zod')) detected.deps.push('zod');
      if (d.includes('axios')) detected.deps.push('axios');
      if (d.includes('stripe')) detected.deps.push('stripe');

      if (pkg.engines?.node) detected.runtime = `Node.js ${pkg.engines.node}`;
      else detected.runtime = 'Node.js';
    }

    // File naming patterns
    const tsxFiles = names.filter(n => n.endsWith('.tsx') || n.endsWith('.jsx'));
    if (tsxFiles.some(n => /^[A-Z]/.test(n))) detected.patterns.push('Components use PascalCase');
    if (tsxFiles.some(n => n.includes('-'))) detected.patterns.push('Some files use kebab-case');

    // Structure
    const folders_seen = new Set(paths.map(p => p.split('/')[0]).filter(Boolean));
    folders_seen.forEach(f => {
      if (['src','app','pages','components','lib','utils','api','hooks','store','styles','public','assets','tests','__tests__'].includes(f)) {
        detected.structure.push(f);
      }
    });

    // PM
    if (names.includes('pnpm-lock.yaml')) detected.pm = 'pnpm';
    else if (names.includes('yarn.lock')) detected.pm = 'yarn';
    else if (names.includes('package-lock.json')) detected.pm = 'npm';
    else if (names.includes('bun.lockb')) detected.pm = 'bun';

    return buildScanReport(detected, names);
  };

  if (pkgFile) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        try { resolve(finalize(JSON.parse(e.target.result))); }
        catch { resolve(finalize(null)); }
      };
      reader.readAsText(pkgFile);
    });
  }
  return Promise.resolve(finalize(null));
}

function buildScanReport(d, names) {
  const lines = ['── Scan Results ─────────────────────'];
  if (d.language)   lines.push(`Language:   ${d.language}`);
  if (d.framework)  lines.push(`Framework:  ${d.framework}`);
  if (d.runtime)    lines.push(`Runtime:    ${d.runtime}`);
  if (d.database)   lines.push(`Database:   ${d.database}`);
  if (d.styling)    lines.push(`Styling:    ${d.styling}`);
  if (d.pm)         lines.push(`Pkg mgr:    ${d.pm}`);
  if (d.deps.length) lines.push(`Deps:       ${d.deps.join(', ')}`);
  lines.push('');
  if (d.structure.length) lines.push(`Folders:    /${d.structure.join('  /')}`);
  if (d.patterns.length)  lines.push(`Patterns:   ${d.patterns.join(' · ')}`);
  lines.push('');
  lines.push(`Files scanned: ${names.length}`);
  lines.push('─────────────────────────────────────');
  return { report: lines.join('\n'), detected: d };
}

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-drop-input');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', async e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length) await processFiles(files);
});
fileInput.addEventListener('change', async e => {
  if (e.target.files.length) await processFiles(e.target.files);
});

async function processFiles(files) {
  const resultEl = document.getElementById('scan-result');
  const actionsEl = document.getElementById('scan-actions');
  resultEl.textContent = 'Scanning...';
  resultEl.classList.add('show');
  actionsEl.style.display = 'none';

  scannedResult = await inferFromFiles(files);
  resultEl.textContent = scannedResult.report;
  actionsEl.style.display = 'flex';
}

document.getElementById('btn-apply-scan').addEventListener('click', () => {
  if (!scannedResult) return;
  const d = scannedResult.detected;
  if (d.language && !g('f-language'))  s('f-language', d.language);
  if (d.framework && !g('f-framework')) s('f-framework', d.framework);
  if (d.runtime && !g('f-runtime'))    s('f-runtime', d.runtime);
  if (d.database && !g('f-database'))  s('f-database', d.database);
  if (d.styling && !g('f-styling'))    s('f-styling', d.styling);
  if (d.pm && !g('f-pm'))              s('f-pm', d.pm);
  d.deps.forEach(dep => { if (!tagStores.deps.includes(dep)) { tagStores.deps.push(dep); } });
  tagsCtrl.deps.render();
  if (d.structure.length && !g('f-root')) {
    folders = d.structure.map(f => ({ path: `/${f}`, purpose: '' }));
    renderFolders();
  }
  if (d.patterns.length) {
    d.patterns.forEach(p => { if (!tagStores.rules.includes(p)) tagStores.rules.push(p); });
    tagsCtrl.rules.render();
  }
  toast('✓ Scan applied to project fields');
});

document.getElementById('btn-clear-scan').addEventListener('click', () => {
  scannedResult = null;
  document.getElementById('scan-result').classList.remove('show');
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

// ── State ──────────────────────────────────────────────────────
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
    version: '1.1.0',
    created: allProjects[currentId]?.created || new Date().toISOString(),
    updated: new Date().toISOString(),
    aiCombo: [...selectedAIs],
    context: { goal: g('f-goal'), audience: g('f-audience'), constraints: [...tagStores.constraints], knownIssues: [...tagStores.issues] },
    stack: { language: g('f-language'), framework: g('f-framework'), runtime: g('f-runtime'), database: g('f-database'), styling: g('f-styling'), packageManager: g('f-pm'), otherDeps: [...tagStores.deps] },
    conventions: { fileNaming: g('f-file-naming'), componentStyle: g('f-component-style'), stateManagement: g('f-state'), apiLayer: g('f-api-layer'), rules: [...tagStores.rules] },
    structure: { root: g('f-root'), entryPoint: g('f-entry'), folders: folders.map(f => ({ ...f })) },
    decisions: decisions.map(d => ({ ...d })),
    state: { phase: g('f-phase'), lastSessionSummary: g('f-summary'), completed: [...tagStores.completed], inProgress: [...tagStores.inprogress], nextSteps: [...tagStores.nextsteps], blockers: [...tagStores.blockers] },
    scannedStructure: scannedResult?.report || null,
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

  selectedAIs = Array.isArray(p.aiCombo) ? [...p.aiCombo] : [];
  renderAIGrid();

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
  document.getElementById('scan-result').classList.remove('show');
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
  const p = { id, name: 'New project', version: '1.1.0', created: new Date().toISOString(), updated: new Date().toISOString(), aiCombo: [], context: {}, stack: {}, conventions: {}, structure: { folders: [] }, decisions: [], state: { phase: 'planning' } };
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
  if (p.aiCombo?.length) {
    const labels = { claude:'Claude', chatgpt:'ChatGPT', gemini:'Gemini', deepseek:'DeepSeek' };
    lines.push(`AI Stack: ${p.aiCombo.map(a => labels[a] || a).join(' → ')}`);
  }
  lines.push('');
  if (p.stack) {
    const s = p.stack;
    lines.push('## Tech Stack (follow exactly)');
    if (s.language)       lines.push(`- Language: ${s.language}`);
    if (s.framework)      lines.push(`- Framework: ${s.framework}`);
    if (s.runtime)        lines.push(`- Runtime: ${s.runtime}`);
    if (s.database)       lines.push(`- Database: ${s.database}`);
    if (s.styling)        lines.push(`- Styling: ${s.styling}`);
    if (s.packageManager) lines.push(`- Package manager: ${s.packageManager}`);
    if (s.otherDeps?.length) lines.push(`- Other: ${s.otherDeps.join(', ')}`);
    lines.push('');
  }
  if (p.scannedStructure) { lines.push('## Scanned Structure'); lines.push(p.scannedStructure); lines.push(''); }
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
    lines.push('## Architectural decisions (final)');
    p.decisions.forEach(d => { lines.push(`- ${d.decision} — ${d.reason}`); if (d.alternatives) lines.push(`  Rejected: ${d.alternatives}`); });
    lines.push('');
  }
  if (p.structure?.folders?.length) {
    lines.push('## File structure');
    if (p.structure.root) lines.push(`Root: ${p.structure.root}`);
    if (p.structure.entryPoint) lines.push(`Entry: ${p.structure.entryPoint}`);
    p.structure.folders.forEach(f => lines.push(`- ${f.path} — ${f.purpose}`));
    lines.push('');
  }
  if (p.state) {
    const st = p.state;
    lines.push('## Current state');
    if (st.phase) lines.push(`Phase: ${st.phase}`);
    if (st.lastSessionSummary) lines.push(`Last session: ${st.lastSessionSummary}`);
    if (st.completed?.length)  lines.push(`Done: ${st.completed.join('; ')}`);
    if (st.inProgress?.length) lines.push(`In progress: ${st.inProgress.join('; ')}`);
    if (st.blockers?.length)   lines.push(`Blockers: ${st.blockers.join('; ')}`);
    if (st.nextSteps?.length)  { lines.push('Next steps:'); st.nextSteps.forEach((n,i) => lines.push(`  ${i+1}. ${n}`)); }
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
  a.download = `${(p.name||'project').toLowerCase().replace(/\s+/g,'-')}-memex.json`;
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
