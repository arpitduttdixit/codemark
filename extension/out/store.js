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
exports.Store = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class Store {
    workspaceRoot;
    data = { version: 1, marks: [] };
    storePath;
    _onDidChange = new vscode.EventEmitter();
    onDidChange = this._onDidChange.event;
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        const vscodePath = path.join(workspaceRoot, '.vscode');
        this.storePath = path.join(vscodePath, 'code-understanding.json');
        this.load();
    }
    load() {
        try {
            if (fs.existsSync(this.storePath)) {
                const raw = fs.readFileSync(this.storePath, 'utf-8');
                this.data = JSON.parse(raw);
            }
        }
        catch (e) {
            console.warn('Code Tracker: Failed to load store, starting fresh', e);
            this.data = { version: 1, marks: [] };
        }
    }
    save() {
        try {
            const dir = path.dirname(this.storePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2), 'utf-8');
            this._onDidChange.fire();
        }
        catch (e) {
            vscode.window.showErrorMessage(`Code Tracker: Failed to save - ${e}`);
        }
    }
    generateId() {
        return `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    getRelativePath(absolutePath) {
        return path.relative(this.workspaceRoot, absolutePath);
    }
    addMark(filePath, range, level, preview, functionContext) {
        const relPath = this.getRelativePath(filePath);
        // Remove overlapping marks in the same file
        this.data.marks = this.data.marks.filter(m => {
            if (m.filePath !== relPath)
                return true;
            return !this.rangesOverlap(m, range);
        });
        const mark = {
            id: this.generateId(),
            filePath: relPath,
            startLine: range.start.line,
            startChar: range.start.character,
            endLine: range.end.line,
            endChar: range.end.character,
            level,
            preview: preview.slice(0, 80).replace(/\n/g, ' '),
            functionContext,
            timestamp: Date.now(),
        };
        this.data.marks.push(mark);
        this.save();
        return mark;
    }
    removeMark(filePath, range) {
        const relPath = this.getRelativePath(filePath);
        const before = this.data.marks.length;
        this.data.marks = this.data.marks.filter(m => {
            if (m.filePath !== relPath)
                return true;
            return !this.rangesOverlap(m, range);
        });
        if (this.data.marks.length < before) {
            this.save();
        }
    }
    adjustMarksForChange(filePath, change) {
        const relPath = this.getRelativePath(filePath);
        const linesDeleted = change.range.end.line - change.range.start.line;
        const linesAdded = (change.text.match(/\n/g) || []).length;
        const lineDelta = linesAdded - linesDeleted;
        let changed = false;
        const idsToRemove = new Set();
        for (const m of this.data.marks) {
            if (m.filePath !== relPath)
                continue;
            if (this.rangesOverlap(m, change.range)) {
                idsToRemove.add(m.id);
                changed = true;
            }
            else if (m.startLine > change.range.end.line && lineDelta !== 0) {
                m.startLine += lineDelta;
                m.endLine += lineDelta;
                changed = true;
            }
        }
        if (idsToRemove.size > 0) {
            this.data.marks = this.data.marks.filter(m => !idsToRemove.has(m.id));
        }
        if (changed) {
            this.save();
        }
        return changed;
    }
    addNoteToMark(filePath, range, note) {
        const relPath = this.getRelativePath(filePath);
        for (const m of this.data.marks) {
            if (m.filePath === relPath && this.rangesOverlap(m, range)) {
                m.note = note;
            }
        }
        this.save();
    }
    getMarksForFile(filePath) {
        const relPath = this.getRelativePath(filePath);
        return this.data.marks.filter(m => m.filePath === relPath);
    }
    getAllMarks() {
        return [...this.data.marks];
    }
    clearFile(filePath) {
        const relPath = this.getRelativePath(filePath);
        this.data.marks = this.data.marks.filter(m => m.filePath !== relPath);
        this.save();
    }
    getStats() {
        const understood = this.data.marks.filter(m => m.level === 'understood').length;
        const partial = this.data.marks.filter(m => m.level === 'partial').length;
        const files = new Set(this.data.marks.map(m => m.filePath)).size;
        return { total: this.data.marks.length, understood, partial, files };
    }
    getMarksByFile() {
        const map = new Map();
        for (const m of this.data.marks) {
            const arr = map.get(m.filePath) || [];
            arr.push(m);
            map.set(m.filePath, arr);
        }
        return map;
    }
    rangesOverlap(mark, range) {
        const markStart = new vscode.Position(mark.startLine, mark.startChar);
        const markEnd = new vscode.Position(mark.endLine, mark.endChar);
        const markRange = new vscode.Range(markStart, markEnd);
        return !(markRange.end.isBefore(range.start) || range.end.isBefore(markRange.start));
    }
    exportMermaidMindMap() {
        const byFile = this.getMarksByFile();
        const lines = ['mindmap', '  root((Project Understanding))'];
        for (const [filePath, marks] of byFile) {
            const fileName = path.basename(filePath);
            const dir = path.dirname(filePath);
            const label = dir === '.' ? fileName : `${dir}/${fileName}`;
            lines.push(`    ${label}`);
            for (const m of marks) {
                const icon = m.level === 'understood' ? '🟢' : '🟡';
                const text = m.functionContext || m.preview;
                const safeText = text.replace(/[()[\]{}]/g, ' ').trim();
                lines.push(`      ${icon} ${safeText}`);
                if (m.note) {
                    const safeNote = m.note.replace(/[()[\]{}]/g, ' ').trim();
                    lines.push(`        📝 ${safeNote}`);
                }
            }
        }
        return lines.join('\n');
    }
    dispose() {
        this._onDidChange.dispose();
    }
}
exports.Store = Store;
//# sourceMappingURL=store.js.map