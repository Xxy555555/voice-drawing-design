// app.js — 应用入口（最小版本，Phase 1 后扩展）
import { APP_VERSION } from './utils/constants.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log(`%c🎨 AI 语音绘图工具 v${APP_VERSION}`, 'color: #6c63ff; font-size: 16px; font-weight: bold;');
  console.log('模块加载中...');

  // Phase 1 完成后在此初始化 ObjectStore, DrawEngine, HistoryManager 等
  // 当前仅加载工具函数模块，验证 ES Module 链路正常

  console.log('✅ 基础模块加载完成');
});
