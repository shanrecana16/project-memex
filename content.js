// content.js — Project Memex v1.1 — Claude, ChatGPT, Gemini, DeepSeek

const PLATFORM = (() => {
  const h = location.hostname;
  if (h.includes('claude.ai')) return 'claude';
  if (h.includes('chatgpt.com') || h.includes('chat.openai.com')) return 'chatgpt';
  if (h.includes('gemini.google.com')) return 'gemini';
  if (h.includes('chat.deepseek.com')) return 'deepseek';
  return null;
})();

if (!PLATFORM) throw new Error('Project Memex: unsupported platform');

const SELECTORS = {
  claude:   'div[contenteditable="true"].ProseMirror, div[contenteditable="true"][data-placeholder]',
  chatgpt:  '#prompt-textarea, div[contenteditable="true"][data-id]',
  gemini:   'div[contenteditable="true"].ql-editor, rich-textarea div[contenteditable="true"]',
  deepseek: 'textarea#chat-input, div[contenteditable="true"].ds-editor',
};

function buildBriefing(project) {
  const p = project;
  const lines = [];

  lines.push(`# ⚡ Project Memex Briefing`);
  lines.push(`Project: ${p.name}`);
  lines.push(`Goal: ${p.context?.goal || 'Not specified'}`);
  if (p.aiCombo?.length) lines.push(`AI Stack: ${p.aiCombo.join(' → ')}`);
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
    lines.push('## Scanned Project Structure (detected from uploaded files)');
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
    if (c.testingFramework) lines.push(`- Testing: ${c.testingFramework}`);
    if (c.rules?.length)    c.rules.forEach(r => lines.push(`- ${r}`));
    lines.push('');
  }

  if (p.decisions?.length) {
    lines.push('## Architectural Decisions (these are final — do not re-litigate)');
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
  const sel = SELECTORS[PLATFORM];
  const el = document.querySelector(sel);
  if (!el) {
    alert('Project Memex: Could not find the chat input. Click into the input box first, then inject again.');
    return;
  }

  el.focus();

  if (PLATFORM === 'claude' || PLATFORM === 'gemini') {
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  } else if (PLATFORM === 'chatgpt') {
    if (el.tagName === 'TEXTAREA') {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeSetter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
    }
  } else if (PLATFORM === 'deepseek') {
    if (el.tagName === 'TEXTAREA') {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeSetter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
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

// Subtle indicator badge
function addIndicator() {
  if (document.getElementById('pm-indicator')) return;
  const el = document.createElement('div');
  el.id = 'pm-indicator';

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  el.style.cssText = `
    position: fixed; bottom: 16px; right: 16px; z-index: 9999;
    background: ${isDark ? '#1a1a2e' : '#f0f0ff'};
    color: ${isDark ? '#c8c8ff' : '#3333aa'};
    font-size: 11px; padding: 5px 10px; border-radius: 20px;
    font-family: 'SF Mono', monospace;
    border: 1px solid ${isDark ? '#333' : '#ccc'};
    opacity: 0.9; pointer-events: none;
    display: flex; align-items: center; gap: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  `;

  chrome.runtime.sendMessage({ type: 'GET_ACTIVE_PROJECT' }, (res) => {
    if (res?.project) {
      el.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block;flex-shrink:0"></span> ${res.project.name}`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
  });
}

setTimeout(addIndicator, 2000);
