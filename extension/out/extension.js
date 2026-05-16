"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const store_1 = require("./store");
const decorations_1 = require("./decorations");
const treeView_1 = require("./treeView");
let store;
let decorationManager;
function activate(context) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        // No workspace open — silently skip activation
        return;
    }
    store = new store_1.Store(workspaceRoot);
    decorationManager = new decorations_1.DecorationManager(store);
    // --- Tree Views ---
    const treeProvider = new treeView_1.TreeViewProvider(store, workspaceRoot);
    vscode.window.registerTreeDataProvider('codeTracker.treeView', treeProvider);
    const statsProvider = new treeView_1.StatsViewProvider(store);
    vscode.window.registerWebviewViewProvider(treeView_1.StatsViewProvider.viewType, statsProvider);
    // --- Commands ---
    context.subscriptions.push(vscode.commands.registerCommand('codeTracker.markUnderstood', () => markSelection('understood')), vscode.commands.registerCommand('codeTracker.markPartial', () => markSelection('partial')), vscode.commands.registerCommand('codeTracker.unmark', () => unmarkSelection()), vscode.commands.registerCommand('codeTracker.addNote', () => addNote()), vscode.commands.registerCommand('codeTracker.exportMindMap', () => exportMindMap()), vscode.commands.registerCommand('codeTracker.showStats', () => showStats()), vscode.commands.registerCommand('codeTracker.clearFile', () => clearFile()));
    // --- Refresh decorations on editor events ---
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor)
            decorationManager.refreshEditor(editor);
    }), vscode.workspace.onDidOpenTextDocument(() => {
        decorationManager.refreshAll();
    }), store.onDidChange(() => {
        decorationManager.refreshAll();
    }));
    // --- Auto-remove marks when their code is deleted or edited ---
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        const filePath = event.document.uri.fsPath;
        let affected = false;
        for (const change of event.contentChanges) {
            if (store.adjustMarksForChange(filePath, change)) {
                affected = true;
            }
        }
        if (affected) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.uri.fsPath === filePath) {
                decorationManager.refreshEditor(editor);
            }
        }
    }));
    // Initial decoration pass
    decorationManager.refreshAll();
    vscode.window.showInformationMessage('🧠 Code Understanding Tracker active');
}
// --- Command Implementations ---
function markSelection(level) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('Select some code first');
        return;
    }
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    const funcContext = detectFunctionContext(editor.document, selection);
    store.addMark(editor.document.uri.fsPath, selection, level, text, funcContext);
    decorationManager.refreshEditor(editor);
    const label = level === 'understood' ? '🟢 Understood' : '🟡 Partially understood';
    const scope = funcContext ? ` (${funcContext})` : '';
    vscode.window.showInformationMessage(`${label}${scope}`);
}
function unmarkSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('Select the marked region to remove');
        return;
    }
    store.removeMark(editor.document.uri.fsPath, editor.selection);
    decorationManager.refreshEditor(editor);
    vscode.window.showInformationMessage('Mark removed');
}
async function addNote() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('Select a marked region to add a note');
        return;
    }
    const note = await vscode.window.showInputBox({
        prompt: 'Add a note about this code section',
        placeHolder: 'e.g. "This caches instrument tokens to avoid repeated API calls"',
    });
    if (note !== undefined) {
        store.addNoteToMark(editor.document.uri.fsPath, editor.selection, note);
        decorationManager.refreshEditor(editor);
    }
}
async function exportMindMap() {
    const mermaid = store.exportMermaidMindMap();
    const doc = await vscode.workspace.openTextDocument({
        content: mermaid,
        language: 'markdown',
    });
    await vscode.window.showTextDocument(doc);
    vscode.window.showInformationMessage('Mind map exported as Mermaid. Paste into mermaid.live or an Obsidian note to visualize.');
}
function showStats() {
    const stats = store.getStats();
    const pct = stats.total > 0
        ? Math.round((stats.understood / stats.total) * 100)
        : 0;
    vscode.window.showInformationMessage(`🧠 ${stats.total} sections marked across ${stats.files} files | ` +
        `🟢 ${stats.understood} understood (${pct}%) | 🟡 ${stats.partial} partial`);
}
function clearFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    store.clearFile(editor.document.uri.fsPath);
    decorationManager.refreshEditor(editor);
    vscode.window.showInformationMessage('All marks cleared in this file');
}
// --- Helpers ---
function detectFunctionContext(document, selection) {
    // Walk backwards from selection start to find enclosing function/method
    const patterns = [
        /func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(/, // Go
        /(?:function|async function)\s+(\w+)\s*\(/, // JS/TS
        /(?:def|async def)\s+(\w+)\s*\(/, // Python
        /(?:public|private|protected|static|\s)+[\w<>[\]]+\s+(\w+)\s*\(/, // Java/C#
        /fn\s+(\w+)\s*[(<]/, // Rust
    ];
    for (let line = selection.start.line; line >= 0; line--) {
        const text = document.lineAt(line).text;
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match)
                return match[1];
        }
    }
    return undefined;
}
function deactivate() {
    store?.dispose();
    decorationManager?.dispose();
}
//# sourceMappingURL=extension.js.map