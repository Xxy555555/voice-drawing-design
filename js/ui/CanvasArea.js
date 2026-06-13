// CanvasArea.js — 画布区域 UI 组件
import { DEFAULT_CANVAS } from '../utils/constants.js';

export class CanvasArea {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.container - 画布容器 DOM
   * @param {import('../core/ObjectStore.js').ObjectStore} opts.objectStore
   * @param {import('../core/DrawEngine.js').DrawEngine} drawEngine
   * @param {import('../core/HistoryManager.js').HistoryManager} opts.historyManager
   * @param {import('../ui/StatusBar.js').StatusBar} opts.statusBar
   */
  constructor({ container, objectStore, drawEngine, historyManager, statusBar }) {
    this.container = container;
    this.objectStore = objectStore;
    this.drawEngine = drawEngine;
    this.historyManager = historyManager;
    this.statusBar = statusBar;

    this._canvas = document.getElementById('main-canvas');
    this._wrapper = document.getElementById('canvas-wrapper');
    this._init();
  }

  _init() {
    // 初始尺寸
    this._resizeCanvas();
    // 监听容器尺寸变化
    this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
    this._resizeObserver.observe(this._wrapper);
    // 工具栏按钮
    this._bindToolbar();
    // 键盘快捷键
    this._bindKeyboard();
    // 首次渲染
    this.drawEngine.render();
    this._updateStatusBar();
  }

  _resizeCanvas() {
    const rect = this._wrapper.getBoundingClientRect();
    const w = Math.floor(rect.width - 32);
    const h = Math.floor(rect.height - 32);
    if (w > 0 && h > 0) {
      this.drawEngine.resize(w, h);
    }
  }

  _bindToolbar() {
    const zoomIn = document.getElementById('btn-zoom-in');
    const zoomOut = document.getElementById('btn-zoom-out');
    const zoomReset = document.getElementById('btn-zoom-reset');
    const grid = document.getElementById('btn-grid');

    if (zoomIn) zoomIn.addEventListener('click', () => this.drawEngine.zoom(1.2));
    if (zoomOut) zoomOut.addEventListener('click', () => this.drawEngine.zoom(1 / 1.2));
    if (zoomReset) zoomReset.addEventListener('click', () => this.drawEngine.resetView());
    if (grid) grid.addEventListener('click', () => this.drawEngine.toggleGrid());
  }

  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Z 撤销
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        this._undo();
      }
      // Ctrl+Shift+Z 重做
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        this._redo();
      }
    });
  }

  _undo() {
    const state = this.historyManager.undo();
    if (state) {
      this.objectStore.setState(state);
      this.drawEngine.render();
      this._updateStatusBar();
    }
  }

  _redo() {
    const state = this.historyManager.redo();
    if (state) {
      this.objectStore.setState(state);
      this.drawEngine.render();
      this._updateStatusBar();
    }
  }

  _updateStatusBar() {
    if (this.statusBar) {
      this.statusBar.update({
        layer: this.objectStore.getCurrentLayer()?.name || '—',
        objectCount: this.objectStore.getAllObjects().length,
        selected: this.objectStore.getSelectedObject()?.name || '无',
        undoCount: this.historyManager.getUndoCount(),
      });
    }
  }

  getCanvasDataURL() {
    return this._canvas.toDataURL('image/png');
  }

  /** 保存快照 + 触发渲染 */
  saveSnapshotAndRender(label = '') {
    this.historyManager.pushSnapshot(this.objectStore.getState(), label);
    this.drawEngine.render();
    this._updateStatusBar();
  }
}
