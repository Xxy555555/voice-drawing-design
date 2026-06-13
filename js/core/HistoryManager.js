// HistoryManager.js — 撤销/重做/时间线快照
import { deepClone } from '../utils/helpers.js';
import { LIMITS } from '../utils/constants.js';

export class HistoryManager {
  constructor() {
    /** @type {Snapshot[]} */
    this.undoStack = [];
    /** @type {Snapshot[]} */
    this.redoStack = [];
    this.maxLength = LIMITS.MAX_HISTORY;
    this._timeline = []; // 完整时间线记录
  }

  pushSnapshot(state, label = '') {
    const snapshot = {
      state: deepClone(state),
      label,
      timestamp: Date.now(),
    };
    this.undoStack.push(snapshot);
    // 新操作清空 redo 栈
    this.redoStack = [];
    // 限制最大长度
    if (this.undoStack.length > this.maxLength) {
      this.undoStack.shift();
    }
    // 记录到时间线
    this._timeline.push({ ...snapshot, type: 'action' });
    if (this._timeline.length > this.maxLength * 2) {
      this._timeline = this._timeline.slice(-this.maxLength);
    }
  }

  undo() {
    if (this.undoStack.length === 0) return null;
    const snapshot = this.undoStack.pop();
    this.redoStack.push(snapshot);
    this._timeline.push({ ...snapshot, type: 'undo', timestamp: Date.now() });
    return snapshot.state;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const snapshot = this.redoStack.pop();
    this.undoStack.push(snapshot);
    this._timeline.push({ ...snapshot, type: 'redo', timestamp: Date.now() });
    return snapshot.state;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  getUndoCount() {
    return this.undoStack.length;
  }

  getRedoCount() {
    return this.redoStack.length;
  }

  getTimeline() {
    return [...this._timeline];
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this._timeline = [];
  }
}
