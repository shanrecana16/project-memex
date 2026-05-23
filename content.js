// content.js — Project Memex v1.2

const PLATFORM = (() => {
  const h = location.hostname;
  if (h.includes('claude.ai')) return 'claude';
  if (h.includes('chatgpt.com') || h.includes('chat.openai.com')) return 'chatgpt';
  if (h.includes('gemini.google.com')) return 'gemini';
  if (h.includes('chat.deepseek.com')) return 'deepseek';
  return null;
})();

if (!PLATFORM) throw new Error('Project Memex: unsupported platform');

// DeepSeek uses a contenteditable div, not a textarea
// Try multiple selectors with a retry mechanism
const SELECTOR_LISTS = {
  claude:   [
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
  ],
  chatgpt:  [
    '#prompt-textarea',
    'div[contenteditable="true"][data-id]',
    'div[contenteditable="true"]',
  ],
  gemini:   [
    'div[contenteditable="true"].ql-editor',
    'rich-textarea div[contenteditable="true"]',
    'div[contenteditable="true"]',
  ],
  deepseek: [
    'textarea[placeholder]',
    '#chat-input',
    'textarea',
    'div[contenteditable="true"]',
    '[contenteditable="true"]',
  ],
};

function findInput() {
  const selectors = SELECTOR_LISTS[PLATFORM] || [];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

// Retry finding the input up to 5 times over 2.5s (handles slow page loads)
function findInputWithRetry(attempts = 5, delay = 500) {
  return new Promise((resolve) => {
    const try_ = (n) => {
      const el = findInput();
      if (el) return resolve(el);
      if (n <= 0) return resolve(null);
      setTimeout(() => try_(n - 1), delay);
    };
    try_(attempts);
  });
}

function buildBriefing(project) {
  const p = project;
  const lines = [];

  lines.push(`# ⚡ Project Memex Briefing`);
  lines.push(`Project: ${p.name}`);
  lines.push(`Goal: ${p.context?.goal || 'Not specified'}`);
  lines.push('');

  if (p.stack) {
    lines.push('## Tech Stack (follow exactly, do not deviate)');
    const s = p.stack;
    if (s.language)       lines.push(`- Language: ${s.language}`);
    if (s.framework)      lines.push(`- Framework: ${s.framework}`);
    if (s.runtime)        lines.push(`- Runtime: ${s.runtime}`);
    if (s.database)       lines.push(`- Database: ${s.database}`);
    if (s.styling)        lines.push(`- Styling: ${s.styling}`);
    if (s.packageManager) lines.push(`- Package manager: ${s.packageManager}`);
    if (s.otherDeps?.length) lines.push(`- Other deps: ${s.otherDeps.join(', ')}`);
    lines.push('');
  }

  if (p.scannedStructure) {
    lines.push('## Project File Structure (scanned from source)');
    lines.push(p.scannedStructure);
    lines.push('');
  }

  if (p.conventions) {
    lines.push('## Coding Conventions (enforce strictly)');
    const c = p.conventions;
    if (c.fileNaming)       lines.push(`- File naming: ${c.fileNaming}`);
    if (c.componentStyle)   lines.push(`- Components: ${c.componentStyle}`);
    if (c.stateManagement)  lines.push(`- State: ${c.stateManagement}`);
    if (c.apiLayer)         lines.push(`- API layer: ${c.apiLayer}`);
    if (c.rules?.length)    c.rules.forEach(r => lines.push(`- ${r}`));
    lines.push('');
  }

  if (p.decisions?.length) {
    lines.push('## Architectural Decisions (final — do not re-litigate)');
    p.decisions.forEach(d => {
      lines.push(`- ${d.decision} — ${d.reason}`);
      if (d.alternatives) lines.push(`  Rejected: ${d.alternatives}`);
    });
    lines.push('');
  }

  if (p.structure?.folders?.length) {
    lines.push('## File Structure');
    if (p.structure.root)       lines.push(`Root: ${p.structure.root}`);
    if (p.structure.entryPoint) lines.push(`Entry: ${p.structure.entryPoint}`);
    p.structure.folders.forEach(f => lines.push(`- ${f.path} — ${f.purpose}`));
    lines.push('');
  }

  if (p.state) {
    const st = p.state;
    lines.push('## Current State');
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
    lines.push('## Known Issues');
    p.context.knownIssues.forEach(k => lines.push(`- ${k}`));
    lines.push('');
  }

  lines.push('---');
  lines.push('You are continuing this project. Follow all conventions and decisions above without question. Ask only if something is genuinely ambiguous.');

  return lines.join('\n');
}

async function injectIntoInput(text) {
  const el = await findInputWithRetry();

  if (!el) {
    alert(`Project Memex: Could not find the chat input on ${PLATFORM}.\n\nTry:\n1. Click into the chat input box first\n2. Then click Inject again\n\nIf this keeps happening, please report it on GitHub.`);
    return;
  }

  el.focus();

  if (el.tagName === 'TEXTAREA') {
    // Native setter approach — works for React-controlled textareas
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeSetter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    // Move cursor to end
    el.selectionStart = el.selectionEnd = el.value.length;
  } else if (el.contentEditable === 'true') {
    // ContentEditable (ProseMirror, Quill, etc.)
    el.focus();
    // Clear first
    document.execCommand('selectAll', false, null);
    // Insert text
    const success = document.execCommand('insertText', false, text);
    if (!success) {
      // Fallback: set innerHTML directly
      el.innerText = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'INJECT') {
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_PROJECT' }, (res) => {
      if (!res?.project) {
        alert('Project Memex: No active project set. Open the extension popup and select a project first.');
        return;
      }
      const briefing = buildBriefing(res.project);
      injectIntoInput(briefing);
      sendResponse({ ok: true });
    });
    return true;
  }
});

// Subtle active indicator
function addIndicator() {
  if (document.getElementById('pm-indicator')) return;
  chrome.runtime.sendMessage({ type: 'GET_ACTIVE_PROJECT' }, (res) => {
    if (!res?.project) return;
    const el = document.createElement('div');
    el.id = 'pm-indicator';
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    el.style.cssText = `
      position:fixed;bottom:16px;right:16px;z-index:9999;
      background:${isDark ? '#17171f' : '#f8f8fc'};
      color:${isDark ? '#c8c8ff' : '#3333aa'};
      font-size:11px;padding:5px 11px;border-radius:20px;
      font-family:'SF Mono',monospace;
      border:1px solid ${isDark ? '#2a2a38' : '#dcdcec'};
      opacity:0.92;pointer-events:none;
      display:flex;align-items:center;gap:6px;
      box-shadow:0 2px 8px rgba(0,0,0,0.15);
    `;
    el.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:#22c55e;display:inline-block;flex-shrink:0"></span>${res.project.name}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  });
}

setTimeout(addIndicator, 2000);