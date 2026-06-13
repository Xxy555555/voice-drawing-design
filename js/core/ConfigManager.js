// ConfigManager.js — 配置管理（LLM/语音/画布/Q版风格）
import { LLM_PRESETS, DEFAULT_CANVAS, DEFAULT_VOICE, STORAGE_KEYS } from '../utils/constants.js';

export class ConfigManager {
  constructor() {
    this._data = this._loadDefaults();
    this._loadFromStorage();
  }

  _loadDefaults() {
    return {
      llm: {
        apiUrl: '',
        apiKey: '',
        model: '',
        maxTokens: 4096,
        temperature: 0.3,
        preset: '',
      },
      voice: { ...DEFAULT_VOICE },
      canvas: {
        width: DEFAULT_CANVAS.width,
        height: DEFAULT_CANVAS.height,
        background: DEFAULT_CANVAS.background,
        autoSaveInterval: 30000,
        maxHistory: 50,
      },
      qbStyle: {
        strokeWidth: 2.5,
        blush: true,
        highlight: true,
        defaultPalette: 'yellows',
      },
    };
  }

  _loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 深度合并
        for (const section of Object.keys(parsed)) {
          if (this._data[section] && typeof parsed[section] === 'object') {
            Object.assign(this._data[section], parsed[section]);
          }
        }
      }
    } catch (e) {
      console.warn('配置加载失败，使用默认值', e);
    }
  }

  _saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this._data));
    } catch (e) {
      console.warn('配置保存失败', e);
    }
  }

  getAll() {
    return { ...this._data };
  }

  get(section, key) {
    return this._data[section]?.[key];
  }

  set(section, key, value) {
    if (!this._data[section]) this._data[section] = {};
    this._data[section][key] = value;
    this._saveToStorage();
  }

  setSection(section, data) {
    if (!this._data[section]) this._data[section] = {};
    Object.assign(this._data[section], data);
    this._saveToStorage();
  }

  applyPreset(presetName) {
    const preset = LLM_PRESETS.find(p => p.name === presetName);
    if (!preset) return false;
    this._data.llm.apiUrl = preset.apiUrl;
    this._data.llm.model = preset.model;
    this._data.llm.preset = presetName;
    this._saveToStorage();
    return true;
  }

  reset() {
    this._data = this._loadDefaults();
    this._saveToStorage();
  }

  isLLMConfigured() {
    const { apiUrl, apiKey, model } = this._data.llm;
    return !!(apiUrl && apiKey && model);
  }

  getLLMConfig() {
    return { ...this._data.llm };
  }

  getVoiceConfig() {
    return { ...this._data.voice };
  }

  getCanvasConfig() {
    return { ...this._data.canvas };
  }

  getQBStyleConfig() {
    return { ...this._data.qbStyle };
  }
}
