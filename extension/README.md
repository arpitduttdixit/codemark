# 🧠 Code Understanding Tracker

A VS Code extension to track which parts of a codebase you understand. Built for developers learning codebases with the help of LLMs.

## How It Works

1. **Select code** in your editor
2. **Right-click** → "🧠 Code Understanding" → "Mark as Understood" (or use `Cmd+Shift+U`)
3. The section highlights with a **green tint** (or yellow for partial understanding)
4. All marks appear in the **sidebar tree view** — your knowledge mind map
5. **Export** as a Mermaid mind map for visualization

## Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Mark as Understood | `Cmd+Shift+U` | `Ctrl+Shift+U` |
| Mark as Partial | `Cmd+Shift+P` | `Ctrl+Shift+P` |

Other commands available via right-click context menu or Command Palette (`Code Tracker:`).

## Features

- ✅ **Mark as Understood** — green highlight with left border
- 🟡 **Mark as Partially Understood** — yellow highlight
- 📝 **Add Notes** — attach explanations to any marked section
- 🧭 **Sidebar Tree View** — browse all marks grouped by file, click to navigate
- 📊 **Stats Overview** — see your progress at a glance in the sidebar
- 🗺️ **Mermaid Mind Map Export** — generate a visual mind map of your understanding
- 🔍 **Auto-detects function context** — Go, JS/TS, Python, Java, Rust
- 💾 **Persists in `.vscode/code-understanding.json`** — commit to share with team

## Install from Source

```bash
cd code-understanding-tracker
npm install
npm run compile
npm run package
# Produces code-understanding-tracker-0.1.0.vsix
# Then: code --install-extension code-understanding-tracker-0.1.0.vsix
```

## Configuration

In VS Code settings, search for `codeTracker` to customize highlight colors:

- `codeTracker.understoodColor` — background color for understood sections
- `codeTracker.partialColor` — background color for partial sections
- `codeTracker.understoodBorderColor` — left border for understood
- `codeTracker.partialBorderColor` — left border for partial

## Data Storage

Marks are stored in `.vscode/code-understanding.json` in your workspace. You can:
- **Commit it** to share understanding with teammates
- **Gitignore it** to keep it personal
- **Back it up** — it's just JSON
