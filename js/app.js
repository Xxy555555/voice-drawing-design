// app.js — 应用入口（完整初始化）
import { APP_VERSION } from './utils/constants.js';
import { ObjectStore } from './core/ObjectStore.js';
import { DrawEngine } from './core/DrawEngine.js';
import { HistoryManager } from './core/HistoryManager.js';
import { ConfigManager } from './core/ConfigManager.js';
import { TemplateLib } from './core/TemplateLib.js';
import { LLMBridge } from './core/LLMBridge.js';
import { VoiceEngine } from './core/VoiceEngine.js';
import { ConversationManager } from './core/ConversationManager.js';
import { StatusBar } from './ui/StatusBar.js';
import { CanvasArea } from './ui/CanvasArea.js';
import { ChatPanel } from './ui/ChatPanel.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log(`%c🎨 AI 语音绘图工具 v${APP_VERSION}`, 'color: #6c63ff; font-size: 16px; font-weight: bold;');

  // === 1. 基础模块 ===
  const objectStore = new ObjectStore();
  const historyManager = new HistoryManager();
  const configManager = new ConfigManager();
  const statusBar = new StatusBar();

  // === 2. 绘图引擎 ===
  const canvas = document.getElementById('main-canvas');
  const drawEngine = new DrawEngine(canvas, objectStore);

  // === 3. UI 组件 ===
  const chatPanel = new ChatPanel();

  const canvasArea = new CanvasArea({
    container: document.getElementById('canvas-area'),
    objectStore,
    drawEngine,
    historyManager,
    statusBar,
  });

  // === 4. 模板库 ===
  const templateLib = new TemplateLib();
  await templateLib.init();

  // === 5. LLM 通信 ===
  const llmBridge = new LLMBridge(configManager);

  // === 6. 语音引擎 ===
  const voiceEngine = new VoiceEngine(configManager);

  // === 7. ConversationManager（状态中枢） ===
  const conversationManager = new ConversationManager({
    objectStore,
    drawEngine,
    llmBridge,
    historyManager,
    configManager,
    templateLib,
    chatPanel,
    statusBar,
    voiceEngine,
    canvasArea,
    storageAdapter: null, // Phase 5 实现
  });

  // === 8. 连接事件 ===

  // 文字输入 → ConversationManager
  document.addEventListener('user-input', (e) => {
    const { text } = e.detail;
    conversationManager.processUserInput(text);
  });

  // 语音最终结果 → ConversationManager
  voiceEngine.onFinalResult = (text, alternatives) => {
    chatPanel.hideVoiceStatus();
    conversationManager.processUserInput(text, alternatives);
  };

  // 语音中间结果 → 实时显示
  voiceEngine.onInterimResult = (text) => {
    chatPanel.showVoiceStatus(text);
  };

  // 语音开关按钮
  const btnVoice = document.getElementById('btn-voice-toggle');
  if (btnVoice) {
    btnVoice.addEventListener('click', () => {
      if (voiceEngine.state === 'idle') {
        voiceEngine.startListening();
        btnVoice.classList.add('active');
      } else {
        voiceEngine.stopListening();
        btnVoice.classList.remove('active');
      }
    });
  }

  // 侧栏切换
  const btnSidebar = document.getElementById('btn-sidebar-toggle');
  if (btnSidebar) {
    btnSidebar.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('collapsed');
    });
  }

  // === 9. 保存初始快照 ===
  historyManager.pushSnapshot(objectStore.getState(), '初始状态');

  // === 10. 调试接口 ===
  window.__app = {
    objectStore, drawEngine, historyManager, configManager,
    templateLib, llmBridge, voiceEngine, conversationManager,
    chatPanel, canvasArea,
  };

  console.log('✅ 所有模块初始化完成。可通过 window.__app 调试');
  console.log(`📦 模板库：${templateLib.templates.size} 个模板`);
  if (!configManager.isLLMConfigured()) {
    console.log('⚠️ LLM 未配置，请点击 ⚙️ 设置 API 地址和 Key');
  }
});
