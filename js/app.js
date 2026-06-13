// app.js — 应用入口
import { APP_VERSION, DEFAULT_CANVAS } from './utils/constants.js';
import { ObjectStore } from './core/ObjectStore.js';
import { DrawEngine } from './core/DrawEngine.js';
import { HistoryManager } from './core/HistoryManager.js';
import { StatusBar } from './ui/StatusBar.js';
import { CanvasArea } from './ui/CanvasArea.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log(`%c🎨 AI 语音绘图工具 v${APP_VERSION}`, 'color: #6c63ff; font-size: 16px; font-weight: bold;');

  // 初始化核心模块
  const objectStore = new ObjectStore();
  const historyManager = new HistoryManager();
  const statusBar = new StatusBar();

  // 获取 canvas 并初始化 DrawEngine
  const canvas = document.getElementById('main-canvas');
  const drawEngine = new DrawEngine(canvas, objectStore);

  // 初始化 CanvasArea（连接 DOM + 引擎 + 快捷键）
  const canvasArea = new CanvasArea({
    container: document.getElementById('canvas-area'),
    objectStore,
    drawEngine,
    historyManager,
    statusBar,
  });

  // 保存初始快照
  historyManager.pushSnapshot(objectStore.getState(), '初始状态');

  // 暴露到 window 用于调试
  window.__app = { objectStore, drawEngine, historyManager, canvasArea };

  console.log('✅ 模块初始化完成。可通过 window.__app 调试');
});
