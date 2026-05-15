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
exports.DecorationManager = void 0;
const vscode = __importStar(require("vscode"));
class DecorationManager {
    store;
    understoodDecoration;
    partialDecoration;
    constructor(store) {
        this.store = store;
        this.understoodDecoration = this.createDecorationType('understood');
        this.partialDecoration = this.createDecorationType('partial');
        // Re-apply when config changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codeTracker')) {
                this.understoodDecoration.dispose();
                this.partialDecoration.dispose();
                this.understoodDecoration = this.createDecorationType('understood');
                this.partialDecoration = this.createDecorationType('partial');
                this.refreshAll();
            }
        });
    }
    createDecorationType(level) {
        const config = vscode.workspace.getConfiguration('codeTracker');
        const bgColor = level === 'understood'
            ? config.get('understoodColor', 'rgba(34, 197, 94, 0.12)')
            : config.get('partialColor', 'rgba(234, 179, 8, 0.12)');
        const borderColor = level === 'understood'
            ? config.get('understoodBorderColor', 'rgba(34, 197, 94, 0.5)')
            : config.get('partialBorderColor', 'rgba(234, 179, 8, 0.5)');
        return vscode.window.createTextEditorDecorationType({
            backgroundColor: bgColor,
            borderWidth: '0 0 0 3px',
            borderStyle: 'solid',
            borderColor: borderColor,
            isWholeLine: false,
            overviewRulerColor: borderColor,
            overviewRulerLane: vscode.OverviewRulerLane.Left,
            after: {
                contentText: level === 'understood' ? ' ✅' : ' 🟡',
                margin: '0 0 0 8px',
                color: 'rgba(150,150,150,0.5)',
            },
        });
    }
    refreshEditor(editor) {
        const filePath = editor.document.uri.fsPath;
        const marks = this.store.getMarksForFile(filePath);
        const understoodRanges = [];
        const partialRanges = [];
        for (const mark of marks) {
            const range = new vscode.Range(mark.startLine, mark.startChar, mark.endLine, mark.endChar);
            const hoverMessage = this.buildHover(mark);
            const option = { range, hoverMessage };
            if (mark.level === 'understood') {
                understoodRanges.push(option);
            }
            else {
                partialRanges.push(option);
            }
        }
        editor.setDecorations(this.understoodDecoration, understoodRanges);
        editor.setDecorations(this.partialDecoration, partialRanges);
    }
    refreshAll() {
        for (const editor of vscode.window.visibleTextEditors) {
            this.refreshEditor(editor);
        }
    }
    buildHover(mark) {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        const icon = mark.level === 'understood' ? '✅' : '🟡';
        const label = mark.level === 'understood' ? 'Understood' : 'Partially Understood';
        md.appendMarkdown(`**${icon} ${label}**\n\n`);
        if (mark.functionContext) {
            md.appendMarkdown(`📦 \`${mark.functionContext}\`\n\n`);
        }
        if (mark.note) {
            md.appendMarkdown(`📝 ${mark.note}\n\n`);
        }
        const date = new Date(mark.timestamp).toLocaleDateString();
        md.appendMarkdown(`_Marked on ${date}_`);
        return md;
    }
    dispose() {
        this.understoodDecoration.dispose();
        this.partialDecoration.dispose();
    }
}
exports.DecorationManager = DecorationManager;
//# sourceMappingURL=decorations.js.map