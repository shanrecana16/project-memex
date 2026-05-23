<div align="center">

<img src="https://raw.githubusercontent.com/YOUR_USERNAME/project-memex/main/docs/logo.png" width="72" height="72" alt="Project Memex logo">

# Project Memex

**Never re-explain your project to an AI again.**

A browser extension that captures your project's full context — stack, conventions, decisions, and current state — and injects it into any AI chat with one click.

[![Version](https://img.shields.io/badge/version-1.1.0-5b6af5?style=flat-square)](https://github.com/YOUR_USERNAME/project-memex/releases)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-f59e0b?style=flat-square&logo=googlechrome)](https://chrome.google.com/webstore)

[**Install**](#installation) · [**Usage**](#usage) · [**How it works**](#how-it-works) · [**Contributing**](#contributing)

---

</div>

## The problem

You're building a project with Claude. You hit the context limit. You open a new chat — or switch to ChatGPT or Gemini — and now you have to re-explain:

- Your tech stack and exact versions
- Why you chose REST over GraphQL
- What your folder structure looks like
- Where you left off

Every AI makes its own assumptions. Your project becomes inconsistent.

**Project Memex solves this.** You describe your project once. Every AI session starts from the same ground truth.

---

## Supported platforms

| Platform | Status |
|---|---|
| 🟠 Claude (claude.ai) | ✅ Supported |
| 🟢 ChatGPT (chatgpt.com) | ✅ Supported |
| 🔵 Gemini (gemini.google.com) | ✅ Supported |
| 🟣 DeepSeek (chat.deepseek.com) | ✅ Supported |

---

## Installation

> **No build step required.** This is a plain Chrome extension — just load the folder.

### Step 1 — Download

Clone the repo or download the ZIP:

```bash
git clone https://github.com/YOUR_USERNAME/project-memex.git
```

Or click **Code → Download ZIP** and extract it.

### Step 2 — Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder inside the downloaded project

The Project Memex icon (🧠) will appear in your Chrome toolbar.

> Works on Chrome, Brave, Edge, and any Chromium-based browser.

---

## Usage

### Creating your first project

1. Click the **Project Memex icon** in your toolbar
2. Click **Open manager →**
3. Click **+ New project**
4. Fill in your project details:

| Section | What to fill in |
|---|---|
| **Identity** | Project name, one-line goal, audience |
| **AI Combo** | Which AIs you use and in what order (e.g. Claude → ChatGPT) |
| **Tech Stack** | Language, framework, runtime, database, styling, package manager |
| **Conventions** | File naming, component style, state management, API layer rules |
| **Decisions** | What you decided + WHY + what you rejected ← *most important* |
| **File Structure** | Root folder, entry point, key folders and their purpose |
| **Current State** | Phase, last session summary, done/in-progress/next/blockers |

5. Click **Save**

---

### Scanning an existing project (auto-detect)

Instead of filling everything manually, you can drop your project files and let Memex detect the structure:

1. In the manager, find the **Project file scanner** card
2. Drag and drop files from your project:
   - `package.json` — detects framework, deps, package manager
   - `tsconfig.json` — confirms TypeScript
   - Source files (`.ts`, `.tsx`, `.py`, `.go`, etc.) — detects language and patterns
   - Config files (`vite.config.ts`, `next.config.js`, etc.) — confirms framework
3. Click **Apply to project** — detected fields are filled automatically
4. Review and adjust anything that was missed

---

### Injecting context into an AI

1. Go to **claude.ai**, **chatgpt.com**, **gemini.google.com**, or **chat.deepseek.com**
2. Open a new chat
3. Click the **Project Memex icon** in your toolbar
4. Click your project name to set it as active (highlighted in purple)
5. Click **⚡ Inject briefing into chat**
6. The briefing appears in the chat input
7. Add your actual question or task below it and send

The AI now knows your full project context before you type a single word.

---

### Updating after each session

At the end of every AI session, spend 60 seconds updating your project state:

1. Open the manager
2. Go to **Current state**
3. Move completed items from "In progress" → "Completed"
4. Add new items to "Next steps"
5. Update "Last session summary" with a 1–2 sentence recap
6. Click **Save**

This keeps your briefing accurate for the next session.

---

### Exporting and importing

**Export** — saves your project memory as a `.json` file. Use this to:
- Back up your project memory
- Share with teammates (they import and have the same context)
- Version control your project context alongside your code

**Import** — loads a `.json` memory file. Click **↑ Import** and select the file.

---

### Your AI combo

The **AI Combo** feature lets you document which AIs you use on a project and in what order. For example:

> Claude → ChatGPT → DeepSeek

This gets included in the briefing so each AI knows its role in your workflow. There's no wrong answer — use whatever combination works for you.

Example combos:
- **Claude + ChatGPT** — Claude for architecture and reasoning, ChatGPT for code generation
- **Claude + Gemini** — Claude for complex decisions, Gemini for quick tasks
- **All four** — rotate based on which performs best for a given task

---

## How it works

```
Your project (once)
       │
       ▼
  Manager app
  ┌──────────────────────────────────┐
  │  Stack · Conventions · Decisions │
  │  Structure · State · AI Combo    │
  └──────────────────────────────────┘
       │  stored in chrome.storage.local
       │
       ▼
  Extension popup
  (select active project)
       │
       ▼
  Content script
  (detects which AI platform you're on)
       │  builds briefing text
       ▼
  Injected into chat input
       │
       ▼
  AI session (Claude / ChatGPT / Gemini / DeepSeek)
  — starts with full context, no re-explaining
```

### Why it enforces consistency

The key insight is in the **Architectural Decisions** section. Every field in the briefing removes a decision the AI would otherwise make on its own:

- Stack fields → AI can't invent its own version choices
- Convention fields → AI can't choose its own naming or component style
- Decision fields → AI can't re-litigate settled choices (and knows *why* they were made)
- State fields → AI picks up exactly where the last session ended

---

## Project structure

```
extension/
├── manifest.json    Chrome extension config (MV3)
├── background.js    Service worker — handles all storage
├── content.js       Runs on AI sites — injects briefing into chat input
├── popup.html       Toolbar icon UI
├── popup.js         Popup logic — project switcher, inject trigger
├── manager.html     Full manager app UI
└── manager.js       Manager logic — CRUD, file scanner, briefing builder
```

---

## Privacy

- **All data stays on your machine.** Project Memex uses `chrome.storage.local` — your project data never leaves your browser.
- No analytics, no telemetry, no servers.
- The extension only runs on `claude.ai`, `chatgpt.com`, `gemini.google.com`, and `chat.deepseek.com`.

---

## Contributing

Pull requests are welcome. Key areas for improvement:

- **More platform support** — Perplexity, Copilot, Mistral Le Chat
- **Auto-capture** — detect context limit warnings and prompt to update state
- **Git integration** — read `package.json` and folder structure directly from a repo URL
- **VS Code extension** — update current state from the editor sidebar
- **Team sync** — shared project memories via a simple backend

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">
Built to solve a real problem: keeping AI sessions consistent across tools and context limits.
</div>
