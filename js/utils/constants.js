// constants.js — 全局常量定义

// ========== 图形类型枚举 ==========
export const SHAPE_TYPES = {
  CIRCLE: 'circle',
  RECT: 'rect',
  ELLIPSE: 'ellipse',
  TRIANGLE: 'triangle',
  LINE: 'line',
  POLYGON: 'polygon',
  ARC: 'arc',
  TEXT: 'text',
  ARROW: 'arrow',
  BEZIER: 'bezier',
  SPIRAL: 'spiral',
  WAVE: 'wave',
  SINE: 'sine',
  STAR: 'star',
  HEART: 'heart',
  FLOWER: 'flower',
  GEAR: 'gear',
  CLOUD: 'cloud',
  TREE: 'tree',
  FRACTAL: 'fractal',
  CROWN: 'crown',
  DIAMOND: 'diamond',
  COMPOSITE: 'composite',
  PATH: 'path',
};

// ========== Q版风格常量 ==========
export const QB_STYLE = {
  STROKE_COLOR: '#1e1e1e',
  STROKE_WIDTH: 2.5,
  LINE_CAP: 'round',
  LINE_JOIN: 'round',
  BLUSH_COLOR: '#fca5a5',
  BLUSH_OPACITY: 0.4,
  HIGHLIGHT_COLOR: 'white',
  HIGHLIGHT_RADIUS_MIN: 2,
  HIGHLIGHT_RADIUS_MAX: 4,
  HEAD_BODY_RATIO: 1.0,
  MAX_PARTS_PER_FIGURE: 50,
  MIN_PARTS_PER_FIGURE: 15,
};

// ========== Q版色板（柔和色系） ==========
export const QB_PALETTE = {
  yellows: ['#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'],
  oranges: ['#fb923c', '#fdba74', '#fed7aa'],
  pinks: ['#f472b6', '#f9a8d4', '#fbcfe8'],
  blues: ['#60a5fa', '#93c5fd', '#bfdbfe'],
  greens: ['#4ade80', '#86efac', '#bbf7d0'],
  purples: ['#a78bfa', '#c4b5fd', '#ddd6fe'],
  reds: ['#f87171', '#fca5a5', '#fecaca'],
  browns: ['#d97706', '#f59e0b', '#92400e'],
  blacks: ['#374151', '#4b5563', '#6b7280'],
  whites: ['#fefce8', '#fef9c3', '#f5f5f4'],
};

// ========== LLM 预设模板 ==========
export const LLM_PRESETS = [
  { name: 'OpenAI GPT', apiUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
  { name: '智谱 GLM', apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4' },
  { name: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  { name: '通义千问', apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
  { name: 'Moonshot', apiUrl: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
];

// ========== 默认画布配置 ==========
export const DEFAULT_CANVAS = {
  width: 1200,
  height: 800,
  background: '#FFFFFF',
};

// ========== 默认语音配置 ==========
export const DEFAULT_VOICE = {
  language: 'zh-CN',
  listenMode: 'continuous',
  silenceTimeout: 3000,
  speechLevel: 'success_error',
  speechRate: 1.0,
};

// ========== 操作类型枚举 ==========
export const OP_TYPES = {
  ADD: 'add',
  UPDATE: 'update',
  DELETE: 'delete',
  MOVE: 'move',
  ADD_CHILD: 'addChild',
  BATCH: 'batch',
  USE_TEMPLATE: 'useTemplate',
  SAVE_TEMPLATE: 'saveTemplate',
  CLARIFY: 'clarify',
  REPLY: 'reply',
};

// ========== 模板类别 ==========
export const TEMPLATE_CATEGORIES = {
  ANIMALS: 'animals',
  VEHICLES: 'vehicles',
  CUSTOM: 'custom',
};

// ========== 限制常量 ==========
export const LIMITS = {
  MAX_CHILDREN_PER_BATCH: 50,
  MAX_RETRY: 3,
  MAX_HISTORY: 50,
  MAX_CONVERSATION_TURNS: 20,
  AUTO_SAVE_INTERVAL: 30000,
  LLM_TIMEOUT: 30000,
  ANIMATE_STEP_DELAY: 60,
};

// ========== 消息状态 ==========
export const MSG_STATUS = {
  PENDING: 'pending',
  EXECUTING: 'executing',
  SUCCESS: 'success',
  ERROR: 'error',
  RETRYING: 'retrying',
};

// ========== 语音引擎状态 ==========
export const VOICE_STATE = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
};

// ========== 存储键名 ==========
export const STORAGE_KEYS = {
  SETTINGS: 'vdt_settings',
  CONVERSATIONS: 'vdt_conversations',
  CONV_PREFIX: 'vdt_conv_',
  THUMB_PREFIX: 'vdt_conv_%s_thumb',
  CUSTOM_TEMPLATES: 'vdt_custom_templates',
};

// ========== 应用版本 ==========
export const APP_VERSION = '0.1.0';
