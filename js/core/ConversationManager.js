// ConversationManager.js — 状态中枢（模板匹配→LLM流式→逐步绘制→完成）
import { generateId } from '../utils/helpers.js';
import { buildSystemPrompt, buildContextPayload } from '../prompts/system-prompt.js';
import { validateActions, sanitizeQBStyles } from '../utils/validators.js';
import { createDrawingObject } from './ObjectStore.js';
import { LIMITS } from '../utils/constants.js';

export class ConversationManager {
  /**
   * @param {Object} modules
   * @param {import('./ObjectStore.js').ObjectStore} modules.objectStore
   * @param {import('./DrawEngine.js').DrawEngine} modules.drawEngine
   * @param {import('./LLMBridge.js').LLMBridge} modules.llmBridge
   * @param {import('./HistoryManager.js').HistoryManager} modules.historyManager
   * @param {import('./ConfigManager.js').ConfigManager} modules.configManager
   * @param {import('./TemplateLib.js').TemplateLib} modules.templateLib
   * @param {import('../ui/ChatPanel.js').ChatPanel} modules.chatPanel
   * @param {import('../ui/StatusBar.js').StatusBar} modules.statusBar
   * @param {import('./VoiceEngine.js').VoiceEngine} modules.voiceEngine
   * @param {import('./StorageAdapter.js').StorageAdapter} modules.storageAdapter
   * @param {import('../ui/CanvasArea.js').CanvasArea} modules.canvasArea
   */
  constructor(modules) {
    Object.assign(this, modules);
    this._processing = false;
  }

  /**
   * 处理用户输入（核心流程）
   * @param {string} text - 用户输入文字
   * @param {string[]} alternatives - 语音候选结果
   */
  async processUserInput(text, alternatives = []) {
    if (this._processing) return;
    this._processing = true;
    const startTime = Date.now();

    try {
      // 1. ChatPanel 显示用户消息
      if (this.chatPanel) {
        this.chatPanel.addMessage({ role: 'user', content: text });
      }

      // 2. 先尝试模板匹配
      const templateMatch = this.templateLib.search(text);

      // 3. 构建上下文
      const recentMessages = this.chatPanel ? this.chatPanel.getRecentMessages(20) : [];
      const contextPayload = buildContextPayload(this.objectStore, this.historyManager, recentMessages);

      // 4. 构建 System Prompt
      const templateNames = this.templateLib.getTemplateNames();
      let systemPrompt = buildSystemPrompt(contextPayload, templateNames);

      // 如果匹配到模板，追加提示
      if (templateMatch.matched) {
        systemPrompt += `\n\n提示：用户的请求"${text}"匹配到模板"${templateMatch.template.name}"(${templateMatch.template.id})，优先使用 useTemplate 操作。`;
      }

      // 5. 构建 messages
      const messages = this.llmBridge.buildMessages(systemPrompt, contextPayload, text, alternatives);

      // 6. 流式调用 LLM
      let assistantReply = '';
      if (this.chatPanel) {
        this.chatPanel.addMessage({ role: 'assistant', content: '', status: 'streaming' });
      }

      const llmResult = await this.llmBridge.sendStreamWithRetry(messages, LIMITS.MAX_RETRY, {
        onToken: (token) => {
          assistantReply += token;
          if (this.chatPanel) {
            this.chatPanel.appendStreamToken(token);
          }
        },
        onError: (err) => {
          console.error('LLM 流式错误:', err);
        },
      });

      const { reply, actions, success } = llmResult;

      // 7. 校验 + Q版自动补全
      if (success && actions.length > 0) {
        const { actions: sanitized, fixes } = sanitizeQBStyles(actions);
        if (fixes.length > 0) {
          console.log('Q版自动补全:', fixes.join('; '));
        }
        const validation = validateActions(sanitized, this.objectStore);

        if (validation.valid || validation.validCount > 0) {
          // 8. 逐步绘制动画
          if (this.chatPanel) {
            this.chatPanel.updateDrawProgress(0, this._countObjects(sanitized));
          }

          await this.executeActions(sanitized);

          // 9. 推入历史
          this.historyManager.pushSnapshot(this.objectStore.getState(), text);

          // 10. 显示完成消息
          const elapsed = Date.now() - startTime;
          const objCount = this._countObjects(sanitized);
          if (this.chatPanel) {
            this.chatPanel.showDrawComplete({
              reply: reply || assistantReply,
              objectCount: objCount,
              elapsed,
              fixes,
            });
          }
        } else {
          if (this.chatPanel) {
            this.chatPanel.addMessage({
              role: 'system',
              content: `操作校验失败: ${validation.errors.join('; ')}`,
            });
          }
        }
      } else if (reply) {
        // 纯回复（clarify/reply）
        if (this.chatPanel) {
          this.chatPanel.showDrawComplete({ reply, objectCount: 0, elapsed: Date.now() - startTime });
        }
      }

      // 11. 语音播报
      if (this.voiceEngine) {
        this.voiceEngine.speak(reply || assistantReply);
      }

      // 12. 自动保存
      if (this.storageAdapter) {
        this.storageAdapter.saveCurrentConversation();
      }

    } catch (error) {
      console.error('处理用户输入失败:', error);
      if (this.chatPanel) {
        this.chatPanel.addMessage({ role: 'system', content: `错误: ${error.message}` });
      }
    } finally {
      this._processing = false;
    }
  }

  /**
   * 执行操作数组
   */
  async executeActions(actions) {
    for (const action of actions) {
      await this.executeAction(action);
    }
  }

  /**
   * 执行单个操作
   */
  async executeAction(action) {
    switch (action.op) {
      case 'add':
        this.objectStore.addObject(action.object);
        this.drawEngine.render();
        break;

      case 'update':
        this.objectStore.updateObject(action.objectId, action.changes);
        this.drawEngine.render();
        break;

      case 'delete':
        this.objectStore.deleteObject(action.objectId);
        this.drawEngine.render();
        break;

      case 'move':
        this.objectStore.moveObject(action.objectId, action.x, action.y);
        this.drawEngine.render();
        break;

      case 'addChild': {
        const parent = this.objectStore.getObject(action.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          action.object.id = action.object.id || generateId('obj');
          parent.children.push(action.object);
          this.drawEngine.render();
        }
        break;
      }

      case 'batch':
        await this.drawEngine.animateActions(
          action.actions.filter(a => a.op === 'add'),
          {
            stepDelay: LIMITS.ANIMATE_STEP_DELAY,
            onProgress: (cur, total) => {
              if (this.chatPanel) this.chatPanel.updateDrawProgress(cur, total);
            },
          }
        );
        // 执行非 add 操作（update/delete/move）
        for (const sub of action.actions) {
          if (sub.op !== 'add') await this.executeAction(sub);
        }
        break;

      case 'useTemplate': {
        const objects = this.templateLib.instantiate(action.templateId, action.options);
        if (objects) {
          await this.drawEngine.animateActions(
            objects.map(obj => ({ op: 'add', object: obj })),
            {
              stepDelay: LIMITS.ANIMATE_STEP_DELAY,
              onProgress: (cur, total) => {
                if (this.chatPanel) this.chatPanel.updateDrawProgress(cur, total);
              },
            }
          );
        }
        break;
      }

      case 'saveTemplate': {
        const selected = this.objectStore.getSelectedObject();
        const objects = selected?.children || this.objectStore.getAllObjects();
        this.templateLib.saveAsTemplate(action.name, objects);
        break;
      }

      case 'clarify':
      case 'reply':
        // 纯回复，不做绘图操作
        break;
    }
  }

  /**
   * 危险操作二次确认
   */
  confirmDangerousAction(action) {
    return new Promise((resolve) => {
      const dangerous = ['clear', 'delete_all'];
      if (dangerous.includes(action.op)) {
        const modal = document.getElementById('confirm-modal');
        const msg = document.getElementById('confirm-message');
        const ok = document.getElementById('btn-confirm-ok');
        const cancel = document.getElementById('btn-confirm-cancel');

        if (modal && msg) {
          msg.textContent = `确定要执行"${action.op}"吗？此操作可撤销。`;
          modal.classList.remove('hidden');

          const cleanup = () => {
            modal.classList.add('hidden');
            ok.removeEventListener('click', onOk);
            cancel.removeEventListener('click', onCancel);
          };
          const onOk = () => { cleanup(); resolve(true); };
          const onCancel = () => { cleanup(); resolve(false); };
          ok.addEventListener('click', onOk);
          cancel.addEventListener('click', onCancel);
        } else {
          resolve(true);
        }
      } else {
        resolve(true);
      }
    });
  }

  _countObjects(actions) {
    let count = 0;
    for (const a of actions) {
      if (a.op === 'add') count++;
      if (a.op === 'batch' && a.actions) {
        count += a.actions.filter(s => s.op === 'add').length;
      }
      if (a.op === 'useTemplate') {
        const tpl = this.templateLib.templates.get(a.templateId);
        if (tpl) count += tpl.parts?.length || 0;
      }
    }
    return count;
  }
}
