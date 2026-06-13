// ChatPanel.js — 对话面板（语音实时显示 + LLM 流式 + 绘制进度）
import { generateId, formatTimestamp } from '../utils/helpers.js';

export class ChatPanel {
  constructor() {
    this._messageList = document.getElementById('message-list');
    this._voiceStatus = document.getElementById('voice-status');
    this._voiceText = document.getElementById('voice-interim-text');
    this._textInput = document.getElementById('text-input');
    this._btnSend = document.getElementById('btn-send');
    this._btnVoice = document.getElementById('btn-voice-toggle');

    this._messages = [];
    this._currentStreamEl = null;
    this._currentStreamText = '';

    this._bindEvents();
  }

  _bindEvents() {
    if (this._btnSend) {
      this._btnSend.addEventListener('click', () => this._handleSend());
    }
    if (this._textInput) {
      this._textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this._handleSend();
        }
      });
    }
  }

  _handleSend() {
    const text = this._textInput?.value?.trim();
    if (!text) return;
    this._textInput.value = '';
    // 触发自定义事件，由 app.js 监听并调用 ConversationManager
    this._dispatch('user-input', { text });
  }

  _dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // ========== 消息管理 ==========

  addMessage({ role, content, status }) {
    const id = generateId('msg');
    const msg = { id, role, content, status: status || 'done', timestamp: Date.now() };
    this._messages.push(msg);

    const el = document.createElement('div');
    el.className = `message message-${role}`;
    el.id = `msg-${id}`;

    if (role === 'assistant' && status === 'streaming') {
      el.innerHTML = `<div class="message-bubble"><span class="stream-text"></span><span class="stream-cursor"></span></div>`;
      this._currentStreamEl = el.querySelector('.stream-text');
      this._currentStreamText = '';
    } else if (role === 'user') {
      el.innerHTML = `<div class="message-bubble">🎤 ${this._escapeHtml(content)}</div>`;
    } else {
      el.innerHTML = `<div class="message-bubble">${this._escapeHtml(content)}</div>`;
    }

    this._messageList.appendChild(el);
    this._scrollToBottom();
    return id;
  }

  updateMessage(id, updates) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    if (updates.content !== undefined) {
      const bubble = el.querySelector('.message-bubble');
      if (bubble) bubble.textContent = updates.content;
    }
  }

  clearMessages() {
    this._messages = [];
    if (this._messageList) this._messageList.innerHTML = '';
  }

  getRecentMessages(n = 20) {
    return this._messages.slice(-n).map(m => ({
      role: m.role,
      content: m.content,
    }));
  }

  // ========== 语音实时显示 ==========

  showVoiceStatus(text) {
    if (this._voiceStatus) {
      this._voiceStatus.classList.remove('hidden');
    }
    if (this._voiceText) {
      this._voiceText.textContent = `● 正在听... "${text}"`;
    }
  }

  hideVoiceStatus() {
    if (this._voiceStatus) {
      this._voiceStatus.classList.add('hidden');
    }
    if (this._voiceText) {
      this._voiceText.textContent = '';
    }
  }

  // ========== LLM 流式输出 ==========

  appendStreamToken(token) {
    if (this._currentStreamEl) {
      this._currentStreamText += token;
      this._currentStreamEl.textContent = this._currentStreamText;
      this._scrollToBottom();
    }
  }

  // ========== 绘制进度 ==========

  updateDrawProgress(current, total) {
    // 在当前流式消息中追加进度信息
    if (this._currentStreamEl) {
      const parent = this._currentStreamEl.closest('.message-bubble');
      if (parent) {
        let progressEl = parent.querySelector('.draw-progress');
        if (!progressEl) {
          progressEl = document.createElement('div');
          progressEl.className = 'draw-progress';
          parent.appendChild(progressEl);
        }
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        progressEl.innerHTML = `
          📐 正在绘制...（第 ${current}/${total} 个图形）
          <div class="draw-progress-bar"><div class="draw-progress-fill" style="width:${pct}%"></div></div>
        `;
        this._scrollToBottom();
      }
    }
  }

  // ========== 绘制完成 ==========

  showDrawComplete({ reply, objectCount, elapsed, fixes }) {
    // 移除光标和进度
    if (this._currentStreamEl) {
      const parent = this._currentStreamEl.closest('.message-bubble');
      if (parent) {
        // 移除光标
        const cursor = parent.querySelector('.stream-cursor');
        if (cursor) cursor.remove();
        // 移除进度条
        const progress = parent.querySelector('.draw-progress');
        if (progress) progress.remove();
      }
    }

    // 添加完成消息
    const parts = [];
    if (reply) parts.push(reply);
    if (objectCount > 0) {
      parts.push(`✅ 绘制完成！共 ${objectCount} 个图形`);
    }
    if (elapsed) {
      parts.push(`⏱ ${(elapsed / 1000).toFixed(1)}s`);
    }
    if (fixes && fixes.length > 0) {
      parts.push(`🔧 ${fixes.join('; ')}`);
    }

    this.addMessage({
      role: 'assistant',
      content: parts.join('\n'),
    });

    this._currentStreamEl = null;
    this._currentStreamText = '';
  }

  // ========== 工具 ==========

  _scrollToBottom() {
    if (this._messageList) {
      this._messageList.scrollTop = this._messageList.scrollHeight;
    }
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
