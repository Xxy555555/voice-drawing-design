# AI 语音绘图工具 — 项目规范

## PR（Pull Request）提交规范

### 核心原则

- **每个 PR 只做一件事**：每个 PR 只实现或修改单一功能；鼓励尽可能小、粒度尽可能细的 PR；大功能应拆分为多个独立 PR 分步提交
- **主分支始终可运行**：PR 合并后，主分支代码需保持可运行状态，评委在任意时间查看应能复现演示效果

### PR 内容要求

每个 PR 必须包含以下内容：

1. **标题**：一句话说明本 PR 新增/修改了什么
2. **功能描述**：说明该功能的作用与使用方式
3. **实现思路**：简要说明技术选型或核心实现逻辑
4. **测试方式**：如何验证该功能正常运行

### PR 模板

```markdown
## 标题

<一句话说明本 PR 新增/修改了什么>

## 功能描述

<说明该功能的作用与使用方式>

## 实现思路

<简要说明技术选型或核心实现逻辑>

## 测试方式

<如何验证该功能正常运行>
```

### 拆分示例

大功能按 Phase 进一步拆分：

| Phase | 可拆分为独立 PR |
|-------|----------------|
| Phase 0 | PR1: 项目骨架 + 文件结构; PR2: CSS 布局; PR3: 工具函数模块 |
| Phase 1 | PR4: ObjectStore 对象模型; PR5: DrawEngine 基础图形; PR6: DrawEngine 高级图形; PR7: HistoryManager |
| Phase 2 | PR8: Q版风格渲染方法; PR9: TemplateLib 模板库; PR10: 动物模板(可每个动物一个PR); PR11: 交通工具模板 |
| Phase 3 | PR12: LLM 流式通信; PR13: System Prompt + Q版规范; PR14: 操作校验器; PR15: ConversationManager 核心流程 |
| Phase 4 | PR16: 语音识别实时显示; PR17: 语音播报; PR18: ChatPanel 流式输出 + 绘制进度 |
| Phase 5 | PR19: StorageAdapter 持久化; PR20: 多轮对话管理; PR21: 侧栏面板; PR22: 模板持久化 |
| Phase 6 | PR23: 设置面板; PR24: 容错体系; PR25: CSS 美化 |
| Phase 7 | PR26: 导出功能; PR27: 高级绘图; PR28: 集成测试 |

---

## 项目架构

### 技术栈
- **纯 Web**：HTML5 + CSS3 + ES Module JavaScript，无构建工具，浏览器直接运行
- **语音**：Web Speech API（识别 + 播报）
- **绘图**：HTML Canvas 2D + 自定义对象模型
- **LLM**：Fetch API 直连 OpenAI 兼容格式（支持流式 SSE）
- **存储**：localStorage + IndexedDB 自动降级

### 核心模块（js/core/）
- `ObjectStore.js` — DrawingObject 数据模型 + Layer 图层管理 + 增删改查
- `DrawEngine.js` — Canvas 渲染引擎（22 种图形 + Q版风格 + 逐步绘制动画）
- `HistoryManager.js` — 撤销/重做双栈快照管理
- `TemplateLib.js` — Q版模板库（加载/匹配/实例化/保存）
- `LLMBridge.js` — LLM API 流式通信（SSE 解析）
- `ConversationManager.js` — 状态中枢（模板匹配→LLM流式→逐步绘制→完成）
- `VoiceEngine.js` — 语音识别 + 播报
- `ConfigManager.js` — 配置管理（LLM/语音/画布/Q版风格）
- `StorageAdapter.js` — 持久化存储

### 关键文件
- `docs/specs/2026-06-12-voice-drawing-design.md` — 完整设计规格书
- `docs/plan.md` — 8 阶段实现计划
- `docs/task.md` — 33 个细分任务清单
- `templates/animals/` — 12 个动物模板 JSON
- `templates/vehicles/` — 6 个交通工具模板 JSON

### 远程仓库
- https://github.com/Xxy555555/voice-drawing-design.git

### 开发进度
- ✅ Phase 0: 项目骨架 + 工具函数（T-001 ~ T-006）
- ✅ Phase 1: Canvas 绘图引擎 + 对象模型（T-007 ~ T-011）
- 🔄 Phase 2: Q版风格层 + 模板系统（T-012 ~ T-017）
- ⬜ Phase 3 ~ Phase 7: 待执行
