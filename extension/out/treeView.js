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
exports.StatsViewProvider = exports.TreeViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class FileItem extends vscode.TreeItem {
    filePath;
    marks;
    workspaceRoot;
    constructor(filePath, marks, workspaceRoot) {
        super(filePath, vscode.TreeItemCollapsibleState.Expanded);
        this.filePath = filePath;
        this.marks = marks;
        this.workspaceRoot = workspaceRoot;
        const understood = marks.filter(m => m.level === 'understood').length;
        const partial = marks.filter(m => m.level === 'partial').length;
        this.description = `🟢 ${understood}  🟡 ${partial}`;
        this.iconPath = new vscode.ThemeIcon('file-code');
        this.tooltip = path.join(workspaceRoot, filePath);
    }
    contextValue = 'file';
}
class MarkItem extends vscode.TreeItem {
    mark;
    workspaceRoot;
    constructor(mark, workspaceRoot) {
        super(mark.functionContext || mark.preview, vscode.TreeItemCollapsibleState.None);
        this.mark = mark;
        this.workspaceRoot = workspaceRoot;
        const icon = mark.level === 'understood' ? '🟢' : '🟡';
        this.description = `L${mark.startLine + 1}-${mark.endLine + 1} ${icon}`;
        this.tooltip = mark.note || mark.preview;
        this.iconPath = new vscode.ThemeIcon(mark.level === 'understood' ? 'pass' : 'warning');
        // Click to navigate
        const absPath = path.join(workspaceRoot, mark.filePath);
        this.command = {
            command: 'vscode.open',
            title: 'Go to Mark',
            arguments: [
                vscode.Uri.file(absPath),
                {
                    selection: new vscode.Range(mark.startLine, mark.startChar, mark.endLine, mark.endChar),
                },
            ],
        };
    }
    contextValue = 'mark';
}
class TreeViewProvider {
    store;
    workspaceRoot;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(store, workspaceRoot) {
        this.store = store;
        this.workspaceRoot = workspaceRoot;
        store.onDidChange(() => this._onDidChangeTreeData.fire(undefined));
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level: group by file
            const byFile = this.store.getMarksByFile();
            const items = [];
            for (const [filePath, marks] of byFile) {
                items.push(new FileItem(filePath, marks, this.workspaceRoot));
            }
            return items.sort((a, b) => a.filePath.localeCompare(b.filePath));
        }
        if (element instanceof FileItem) {
            return element.marks
                .sort((a, b) => a.startLine - b.startLine)
                .map(m => new MarkItem(m, this.workspaceRoot));
        }
        return [];
    }
}
exports.TreeViewProvider = TreeViewProvider;
class StatsViewProvider {
    store;
    static viewType = 'codeTracker.statsView';
    _view;
    constructor(store) {
        this.store = store;
        store.onDidChange(() => this.updateView());
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: false };
        this.updateView();
    }
    updateView() {
        if (!this._view)
            return;
        const stats = this.store.getStats();
        const pct = stats.total > 0
            ? Math.round((stats.understood / stats.total) * 100)
            : 0;
        this._view.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            padding: 12px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
          }
          .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 13px;
          }
          .bar-bg {
            width: 100%;
            height: 8px;
            background: var(--vscode-progressBar-background, #333);
            border-radius: 4px;
            margin: 10px 0;
            overflow: hidden;
          }
          .bar-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s;
          }
          .bar-understood {
            background: rgba(34, 197, 94, 0.8);
            width: ${pct}%;
          }
          .big-number {
            font-size: 28px;
            font-weight: bold;
            text-align: center;
            margin: 8px 0;
          }
          .label {
            text-align: center;
            font-size: 11px;
            opacity: 0.7;
          }
        </style>
      </head>
      <body>
        <div class="big-number">${stats.total}</div>
        <div class="label">sections marked across ${stats.files} file${stats.files !== 1 ? 's' : ''}</div>
        <div class="bar-bg"><div class="bar-fill bar-understood"></div></div>
        <div class="stat-row"><span>🟢 Understood</span><span>${stats.understood}</span></div>
        <div class="stat-row"><span>🟡 Partial</span><span>${stats.partial}</span></div>
      </body>
      </html>
    `;
    }
}
exports.StatsViewProvider = StatsViewProvider;
//# sourceMappingURL=treeView.js.map