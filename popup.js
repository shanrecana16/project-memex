// popup.js — Project Memex v1.1

const PLATFORMS = {
  'claude.ai': 'Claude',
  'chatgpt.com': 'ChatGPT',
  'chat.openai.com': 'ChatGPT',
  'gemini.google.com': 'Gemini',
  'chat.deepseek.com': 'DeepSeek',
};

let activeId = null;
let projects = {};
let currentPlatform = null;

// Theme sync with manager
let theme = localStorage.getItem('pm-theme') || 'dark';
function applyTheme(t) {
  theme = t;
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('theme-btn').textContent = t === 'dark' ? '☀️ Light' : '🌙 Dark';
  localStorage.setItem('pm-theme', t);
}
applyTheme(theme);
document.getElementById('theme-btn').addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark'));

function detectPlatform(tab) {
  if (!tab?.url) return null;
  try {
    const host = new URL(tab.url).hostname;
    for (const [k, v] of Object.entries(PLATFORMS)) {
      if (host.includes(k)) return v;
    }
  } catch (_) {}
  return null;
}

function renderProjects() {
  const el = document.getElementById('project-list');
  const ids = Object.keys(projects);
  if (!ids.length) { el.innerHTML = '<div class="empty">No projects — open manager to create one</div>'; return; }
  el.innerHTML = ids.map(id => {
    const p = projects[id];
    return `<div class="proj-item ${id === activeId ? 'active' : ''}" data-id="${id}">
      <div class="proj-dot"></div>
      <span class="proj-name">${p.name || 'Untitled'}</span>
      <span class="proj-phase">${p.state?.phase || ''}</span>
    </div>`;
  }).join('');
  el.querySelectorAll('.proj-item').forEach(el => {
    el.addEventListener('click', () => {
      activeId = el.dataset.id;
      chrome.runtime.sendMessage({ type: 'SET_ACTIVE_PROJECT', id: activeId });
      renderProjects();
      updateBtn();
    });
  });
}

function updateBtn() {
  document.getElementById('inject-btn').disabled = !activeId || !currentPlatform;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentPlatform = detectPlatform(tab);

  const badge = document.getElementById('platform-badge');
  if (currentPlatform) {
    badge.textContent = currentPlatform;
    badge.classList.add('on');
  } else {
    badge.textContent = 'not on AI site';
  }

  chrome.runtime.sendMessage({ type: 'GET_ALL_PROJECTS' }, res => {
    projects = res.projects || {};
    activeId = res.activeId || null;
    renderProjects();
    updateBtn();
  });

  document.getElementById('inject-btn').addEventListener('click', async () => {
    if (!activeId || !currentPlatform) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { type: 'INJECT' }, () => {
      const s = document.getElementById('status');
      s.classList.add('show');
      setTimeout(() => s.classList.remove('show'), 3000);
    });
  });

  document.getElementById('open-mgr').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
  });
}

init();
