// VoiceEngine.js — Web Speech API 语音识别 + 播报
import { VOICE_STATE } from '../utils/constants.js';

export class VoiceEngine {
  /**
   * @param {import('./ConfigManager.js').ConfigManager} configManager
   */
  constructor(configManager) {
    this.configManager = configManager;
    this.state = VOICE_STATE.IDLE;
    this.isSpeaking = false;
    this._recognition = null;
    this._silenceTimer = null;

    // 事件回调
    this.onInterimResult = null;
    this.onFinalResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;

    this._initRecognition();
  }

  _initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('当前浏览器不支持语音识别');
      return;
    }

    this._recognition = new SpeechRecognition();
    const voiceConfig = this.configManager.getVoiceConfig();

    this._recognition.continuous = voiceConfig.listenMode === 'continuous';
    this._recognition.interimResults = true;
    this._recognition.maxAlternatives = 3;
    this._recognition.lang = voiceConfig.language || 'zh-CN';

    this._recognition.onresult = (event) => {
      this._handleResult(event);
    };

    this._recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      this.state = VOICE_STATE.IDLE;
      if (this.onError) this.onError(event.error);
    };

    this._recognition.onstart = () => {
      this.state = VOICE_STATE.LISTENING;
      if (this.onStart) this.onStart();
    };

    this._recognition.onend = () => {
      // continuous 模式自动重启
      if (this.state === VOICE_STATE.LISTENING &&
          this.configManager.getVoiceConfig().listenMode === 'continuous') {
        try { this._recognition.start(); } catch {}
      } else {
        this.state = VOICE_STATE.IDLE;
        if (this.onEnd) this.onEnd();
      }
    };
  }

  _handleResult(event) {
    const voiceConfig = this.configManager.getVoiceConfig();
    let finalTranscript = '';
    let interimTranscript = '';
    const alternatives = [];

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript = result[0].transcript;
        for (let j = 1; j < result.length; j++) {
          alternatives.push(result[j].transcript);
        }
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    // 清除静音计时器
    clearTimeout(this._silenceTimer);

    if (finalTranscript) {
      // 最终结果
      this.state = VOICE_STATE.PROCESSING;
      if (this.onFinalResult) {
        this.onFinalResult(finalTranscript, alternatives);
      }
    } else if (interimTranscript) {
      // 中间结果
      if (this.onInterimResult) {
        this.onInterimResult(interimTranscript);
      }
      // 静音超时自动提交
      const timeout = voiceConfig.silenceTimeout || 3000;
      this._silenceTimer = setTimeout(() => {
        if (this.state === VOICE_STATE.LISTENING && interimTranscript) {
          this.state = VOICE_STATE.PROCESSING;
          if (this.onFinalResult) {
            this.onFinalResult(interimTranscript, []);
          }
        }
      }, timeout);
    }
  }

  startListening() {
    if (!this._recognition) {
      if (this.onError) this.onError('not_supported');
      return;
    }
    // 停止当前播报避免自听
    this.stopSpeaking();
    try {
      this._recognition.start();
    } catch (e) {
      // 可能已经在运行
    }
  }

  stopListening() {
    if (this._recognition) {
      this.state = VOICE_STATE.IDLE;
      try { this._recognition.stop(); } catch {}
    }
    clearTimeout(this._silenceTimer);
  }

  // ========== 语音播报 ==========
  speak(text) {
    if (!text) return;
    const voiceConfig = this.configManager.getVoiceConfig();
    const level = voiceConfig.speechLevel || 'success_error';

    if (level === 'none') return;

    // 停止之前播报
    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceConfig.language || 'zh-CN';
    utterance.rate = voiceConfig.speechRate || 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };
    utterance.onerror = () => { this.isSpeaking = false; };

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
  }

  isRecognitionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}
