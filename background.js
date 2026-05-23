// background.js — service worker

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_ACTIVE_PROJECT') {
    chrome.storage.local.get(['activeProjectId', 'projects'], (data) => {
      const projects = data.projects || {};
      const id = data.activeProjectId;
      sendResponse({ project: id ? projects[id] : null });
    });
    return true; // async
  }

  if (msg.type === 'SET_ACTIVE_PROJECT') {
    chrome.storage.local.set({ activeProjectId: msg.id }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'SAVE_PROJECT') {
    chrome.storage.local.get(['projects'], (data) => {
      const projects = data.projects || {};
      projects[msg.project.id] = msg.project;
      chrome.storage.local.set({ projects }, () => {
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  if (msg.type === 'GET_ALL_PROJECTS') {
    chrome.storage.local.get(['projects', 'activeProjectId'], (data) => {
      sendResponse({ projects: data.projects || {}, activeId: data.activeProjectId });
    });
    return true;
  }

  if (msg.type === 'DELETE_PROJECT') {
    chrome.storage.local.get(['projects', 'activeProjectId'], (data) => {
      const projects = data.projects || {};
      delete projects[msg.id];
      const update = { projects };
      if (data.activeProjectId === msg.id) update.activeProjectId = null;
      chrome.storage.local.set(update, () => sendResponse({ ok: true }));
    });
    return true;
  }
});
