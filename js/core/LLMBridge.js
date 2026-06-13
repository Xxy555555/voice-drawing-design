// LLMBridge.js — LLM API 流式通信
import { LIMITS } from '../utils/constants.js';

export class LLMBridge {
  /**
   * @param {import('./ConfigManager.js').ConfigManager} configManager
   */
  constructor(configManager) {
    this.configManager = configManager;
  }

  /**
   * 流式发送消息到 LLM API
   * @param {Object[]} messages - OpenAI 格式消息数组
   * @param {Object} callbacks - { onToken, onComplete, onError }
   */
  async sendStream(messages, callbacks = {}) {
    const { onToken, onComplete, onError } = callbacks;
    const config = this.configManager.getLLMConfig();

    if (!config.apiUrl || !config.apiKey || !config.model) {
      const err = new Error('LLM 未配置，请在设置中填写 API 地址、Key 和模型名称');
      if (onError) onError(err);
      throw err;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LIMITS.LLM_TIMEOUT);

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          max_tokens: config.maxTokens || 4096,
          temperature: config.temperature ?? 0.3,
          stream: true,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`API 错误 ${response.status}: ${errText}`);
      }

      // 解析 SSE 流
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留未完成行

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) {
              fullText += token;
              if (onToken) onToken(token);
            }
          } catch {
            // 忽略解析错误（不完整的 JSON）
          }
        }
      }

      clearTimeout(timeoutId);
      if (onComplete) onComplete(fullText);
      return fullText;

    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        const err = new Error('请求超时，请重试');
        if (onError) onError(err);
        throw err;
      }
      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * 非流式发送（备用，用于测试连接等简单操作）
   */
  async send(messages) {
    const config = this.configManager.getLLMConfig();
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: config.maxTokens || 100,
        temperature: config.temperature ?? 0.3,
      }),
    });
    if (!response.ok) {
      throw new Error(`API 错误 ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * 带自动修正的流式发送
   */
  async sendStreamWithRetry(messages, maxRetry = LIMITS.MAX_RETRY, callbacks = {}) {
    let lastError = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetry; attempt++) {
      try {
        const fullText = await this.sendStream(messages, {
          onToken: callbacks.onToken,
          onComplete: undefined, // 我们自己处理 complete
          onError: callbacks.onError,
        });

        // 尝试解析 JSON
        let parsed;
        try {
          parsed = JSON.parse(fullText);
        } catch {
          throw new Error(`LLM 返回的 JSON 无法解析: ${fullText.substring(0, 100)}`);
        }

        const reply = parsed.reply || '';
        const actions = parsed.actions || [];

        return { reply, actions, success: true, retryCount };

      } catch (error) {
        lastError = error;
        retryCount = attempt;
        if (attempt < maxRetry) {
          // 将错误追加到消息，让 LLM 修正
          messages.push({
            role: 'assistant',
            content: lastError.message || '上一轮输出有误',
          });
          messages.push({
            role: 'user',
            content: `上一次输出有错误：${lastError.message}。请修正后重新输出正确的 JSON。`,
          });
        }
      }
    }

    return {
      reply: `抱歉，理解失败（重试 ${retryCount} 次后仍然出错）。能再说一次吗？`,
      actions: [],
      success: false,
      retryCount,
      error: lastError?.message,
    };
  }

  /**
   * 构建完整 messages 数组
   */
  buildMessages(systemPrompt, contextPayload, userMessage, alternatives = []) {
    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    // 上下文（作为 system 消息追加）
    if (contextPayload) {
      messages.push({
        role: 'system',
        content: `当前画布上下文：\n${JSON.stringify(contextPayload, null, 2)}`,
      });
    }

    // 用户消息
    let content = userMessage;
    if (alternatives.length > 0) {
      content += `\n\n（语音候选结果：${alternatives.join('、')}）`;
    }
    messages.push({ role: 'user', content });

    return messages;
  }

  /**
   * 测试连接
   */
  async testConnection() {
    const config = this.configManager.getLLMConfig();
    try {
      const result = await this.send([
        { role: 'user', content: '回复"连接成功"四个字' },
      ]);
      return { success: true, message: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
