<div align="center">

<br>

<svg width="64" height="64" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="#5b6af5"/>
  <path d="M8 10h10M8 16h16M8 22h12" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="24" cy="10" r="3" fill="#a5b4fc"/>
  <path d="M22 10l1.5 1.5L25.5 8" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

# Project Memex

**Never re-explain your project to an AI again.**

A Chrome extension that captures your project's full context — stack, conventions, architectural decisions, file structure, and current state — and injects it into any AI chat with one click so you can continue exactly where you left off.

[![Version](https://img.shields.io/badge/version-1.2.0-5b6af5?style=flat-square)](#)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)
[![Manifest](https://img.shields.io/badge/manifest-v3-f59e0b?style=flat-square)](#)

[**Install**](#-installation) · [**How to use**](#-how-to-use) · [**Features**](#-features) · [**How it works**](#-how-it-works) · [**Contributing**](#-contributing)

<br>

</div>

---

## The problem

You're building a project with Claude. You hit the context limit. You open a new session — or switch to ChatGPT — and now you have to re-explain everything:

- Your tech stack and exact versions
- Why you made certain architectural choices
- What your folder structure looks like
- Where you actually left off

Every AI starts fresh. Every AI makes its own assumptions. Your project becomes inconsistent.

**Project Memex fixes this.** You describe your project once. Every AI session starts from the same ground truth.

---

## ✅ Supported platforms

| AI | URL | Status |
|---|---|---|
| Claude | claude.ai | ✅ Supported |
| ChatGPT | chatgpt.com | ✅ Supported |
| Gemini | gemini.google.com | ✅ Supported |
| DeepSeek | chat.deepseek.com | ✅ Supported |

---

## 📦 Installation

> No build step, no npm install. Just load the folder into Chrome.

**Step 1 — Get the files**

```bash
git clone https://github.com/YOUR_USERNAME/project-memex.git
```

Or click **Code → Download ZIP** and extract it.

**Step 2 — Load into Chrome**

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** — toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `extension/` folder

The Project Memex icon appears in your Chrome toolbar.

> ✅ Also works on Brave, Edge, Arc, and any Chromium-based browser.

---

## 🚀 How to use

### Step 1 — Create a project

1. Click the **Project Memex icon** in your toolbar
2. Click **Open manager →**
3. Click **+ New project**
4. Give your project a name and a one-line goal

---

### Step 2 — Scan your project folder *(fastest way)*

Instead of filling everything manually, drop your project files and let Memex detect the structure automatically.

1. In the manager, find the **Project file scanner** card
2. **Drag your entire project folder** onto the drop zone — or click to pick files
3. Memex scans and displays:
   - A full **file tree** of your project structure
   - Detected **tech stack** (language, framework, runtime, DB, styling, package manager)
   - Detected **patterns** (naming conventions, folder usage, test setup)
   - Notable **dependencies** (zod, zustand, prisma, etc.)
4. Click **Apply to project** — all detected fields are filled automatically
5. Review and adjust anything that needs correcting

**What gets detected from a scan:**

| What | How it's detected |
|---|---|
| Language | File extensions (`.ts`, `.py`, `.go`, etc.) + `tsconfig.json`, `go.mod` |
| Framework | Config files (`next.config.js`, `vite.config.ts`) + `package.json` deps |
| Database/ORM | `package.json` deps (`@prisma/client`, `drizzle-orm`, `mongoose`) |
| Styling | `tailwind.config.*` file + `package.json` deps |
| Package manager | Lock files (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`) |
| Folder structure | Full ASCII tree built from all file paths |
| Patterns | PascalCase components, co-located tests, hook organization |

---

### Step 3 — Fill in what the scanner missed

After applying the scan, complete the remaining sections:

**Conventions** — how code is written in your project:
- File naming (kebab-case, PascalCase, etc.)
- Component style (functional arrow functions, function declarations)
- State management approach
- API layer (e.g. "all calls go through `/lib/api.ts`")
- Any other rules

**Architectural decisions** — the most important section:

> This is where you capture **what** you decided and **why**. This is what stops the next AI from second-guessing or re-litigating settled choices.

For each decision, fill in:
- The decision: `"Use REST, not GraphQL"`
- The reason: `"Client is simple, REST is sufficient, no need for GraphQL complexity"`
- Rejected alternatives: `"GraphQL — overkill for this use case"`

**Current state** — where you are right now:
- Phase (planning / building / debugging / deploying)
- Last session summary (1–2 sentences)
- What's done, what's in progress, what's next, what's blocking you

---

### Step 4 — Inject into an AI

1. Go to any supported AI platform (Claude, ChatGPT, Gemini, DeepSeek)
2. Open a **new chat**
3. Click the **Project Memex icon** in your toolbar
4. Click your project to **set it as active** (it highlights in purple)
5. Click **⚡ Inject briefing into chat**
6. The full project briefing appears in the chat input
7. Add your question or task **below** the briefing and send

The AI now has your complete project context before it writes a single line of code.

---

### Step 5 — Update after each session

At the end of every session, spend **60 seconds** updating your state:

1. Open the manager
2. Move completed tasks from **In progress → Completed**
3. Add new items to **Next steps**
4. Write a 1–2 sentence **Last session summary**
5. Click **Save**

That's it. Next session, inject and continue.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Project file scanner** | Drop your folder or files — auto-detects stack, structure, patterns, deps |
| **Full file tree** | Builds an ASCII tree of your project and includes it in the briefing |
| **Dark / light mode** | Developer-friendly dark mode by default, toggle to light anytime |
| **Export / import** | Save your memory as JSON, share with teammates or version control it |
| **Multi-platform injection** | One-click inject works on Claude, ChatGPT, Gemini, DeepSeek |
| **Briefing preview** | See exactly what gets injected before you send it |

---

## 🔧 How it works

```
Your project folder
       │  drag & drop
       ▼
  File Scanner
  ─ reads package.json, config files, source files
  ─ builds full file tree
  ─ detects stack, patterns, deps
       │  one click → apply
       ▼
  Project Memory Store
  ┌─────────────────────────────────────────┐
  │  Stack · Conventions · Decisions        │
  │  File Tree · Structure · Current State  │
  └─────────────────────────────────────────┘
       │  saved to chrome.storage.local
       │
       ▼
  Toolbar popup
  ─ select active project
  ─ click ⚡ Inject
       │
       ▼
  Content script
  ─ detects which AI platform you're on
  ─ builds briefing text from stored project
  ─ injects into the chat input
       │
       ▼
  AI chat (Claude / ChatGPT / Gemini / DeepSeek)
  ─ full context before you type a word
```

### File structure

```
extension/
├── manifest.json    Chrome extension config (Manifest V3)
├── background.js    Service worker — handles all chrome.storage operations
├── content.js       Runs on AI sites — finds input, injects briefing text
├── popup.html       Toolbar icon UI — project switcher + inject button
├── popup.js         Popup logic
├── manager.html     Full manager app — create, edit, scan, preview projects
└── manager.js       Manager logic — file scanner, CRUD, briefing builder
```

---

## 🔒 Privacy

- **All data is local.** Project Memex uses `chrome.storage.local` — nothing leaves your browser.
- No analytics, no telemetry, no network requests from your data.
- The extension only activates on the four supported AI platforms.
- Your code files dropped into the scanner are read in-browser only, never uploaded anywhere.

---

## 🤝 Contributing

Pull requests are welcome. Areas to improve:

- **More platforms** — Perplexity, Mistral Le Chat, Copilot, Grok
- **Smarter scanner** — read `.env.example`, infer API structure from route files
- **Auto-state capture** — detect context limit warnings, prompt to save current state
- **Git integration** — load project structure from a GitHub repo URL
- **VS Code extension** — sidebar to update current state without leaving the editor
- **Team sync** — share project memories via a simple URL or JSON export

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

<div align="center">
<sub>Built to solve the real problem of keeping AI sessions consistent across tools and context limits.</sub>
</div>
