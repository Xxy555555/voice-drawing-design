# AI 语音绘图工具 — 任务清单

> 基于 `docs/plan.md` 拆分，每条任务 = 一个 PR = 一个独立功能
> 状态标记：⬜ 待开始 | 🔄 进行中 | ✅ 已完成

---

## Phase 0 — 项目骨架 + 工具函数

### T-001 ⬜ 创建项目文件结构与 HTML 入口

- **标题**：feat: 创建项目文件结构与 index.html 入口
- **功能描述**：创建完整的目录结构和空文件，实现 index.html 单入口页面，使用 ES Module 加载 js/app.js，HTML 骨架包含顶栏、对话面板、画布区域、状态栏、底部输入区
- **实现思路**：纯 HTML，`<script type="module">` 加载入口，参照 spec §七.3 界面布局搭建骨架
- **涉及文件**：index.html（新建）, js/app.js（新建空文件）, 所有目录和空 .js 文件
- **依赖**：无
- **验证**：浏览器打开 index.html 无报错，控制台无 404

---

### T-002 ⬜ CSS 基础布局与主题样式

- **标题**：feat: CSS 基础三栏布局 + 暗色/亮色主题变量
- **功能描述**：实现 Grid 三栏布局（侧栏 | 对话面板 | 画布区域），CSS 变量定义暗色+亮色主题色，顶栏/状态栏/底部输入区固定布局，基础组件样式（按钮、输入框、消息气泡、模态框），响应式（最小 1024px），动画关键帧（波形、旋转加载、淡入淡出）
- **实现思路**：CSS Grid + CSS Variables，媒体查询实现响应式，@keyframes 定义动画
- **涉及文件**：css/style.css（新建）
- **依赖**：T-001
- **验证**：页面显示三栏布局骨架，各区域占位正确，暗色主题生效

---

### T-003 ⬜ 常量定义模块

- **标题**：feat: constants.js — 图形类型、Q版风格常量、LLM 预设、限制常量
- **功能描述**：定义所有全局常量：SHAPE_TYPES 图形枚举、QB_STYLE Q版风格参数、QB_PALETTE Q版色板、LLM_PRESETS 5 个预设模板、DEFAULT_CANVAS/DEFAULT_VOICE 默认配置、OP_TYPES 操作类型枚举、TEMPLATE_CATEGORIES 模板类别、LIMITS 限制常量
- **实现思路**：纯 ES Module 导出常量对象，参照 plan §0.4 的完整定义
- **涉及文件**：js/utils/constants.js（新建）
- **依赖**：T-001
- **验证**：其他模块可正常 import 常量，无引用错误

---

### T-004 ⬜ 工具函数模块

- **标题**：feat: helpers.js — 通用工具函数 + Q版专用坐标/颜色工具
- **功能描述**：实现通用工具（generateId, clamp, deepClone, debounce, throttle, formatTimestamp, colorKeywords, normalizeColor）和Q版专用工具（relToAbs, absToRel, randomQBColor, generateHighlights）
- **实现思路**：纯函数，ES Module 导出，colorKeywords 维护中文颜色名→CSS值映射表
- **涉及文件**：js/utils/helpers.js（新建）
- **依赖**：T-003（使用 QB_PALETTE）
- **验证**：单元测试或控制台调用 generateId('obj') 返回 "obj_xxx"，relToAbs(0.5, 200) 返回 100

---

### T-005 ⬜ 中英文文本映射模块

- **标题**：feat: i18n.js — 中英文 UI 文案映射
- **功能描述**：导出 t(key) 函数，内置中英文对照表，覆盖所有 UI 文案（按钮、状态提示、错误信息、Q版/模板相关文案），默认中文
- **实现思路**：对象映射 + 语言切换函数，ES Module 导出
- **涉及文件**：js/utils/i18n.js（新建）
- **依赖**：T-001
- **验证**：t('voice.listening') 返回 "正在听..."

---

### T-006 ⬜ app.js 入口模块初始化

- **标题**：feat: app.js — 应用入口，DOMContentLoaded 初始化
- **功能描述**：导入所有模块，DOMContentLoaded 中初始化 ObjectStore、DrawEngine、HistoryManager 等核心模块并连接，控制台打印版本信息
- **实现思路**：ES Module 顶层 import，DOMContentLoaded 回调中 new 各模块实例
- **涉及文件**：js/app.js（修改，填充实现）
- **依赖**：T-001 ~ T-005, T-007（ObjectStore）, T-008（DrawEngine 基础）, T-010（HistoryManager）
- **验证**：浏览器打开后控制台打印版本信息，无初始化错误

---

## Phase 1 — Canvas 绘图引擎 + 对象模型

### T-007 ⬜ ObjectStore 对象/图层存储

- **标题**：feat: ObjectStore.js — DrawingObject 数据模型 + 图层管理 + 增删改查
- **功能描述**：实现 DrawingObject 数据模型（含所有字段 + templateRef）、Layer 数据模型，ObjectStore 类管理图层的增删改查、对象的选择/移动/缩放/旋转/翻转/居中、组合/取消组合、复制/粘贴，内部 Map 索引实现 O(1) 查找，getState() 返回完整状态快照
- **实现思路**：类实现，内部维护 layers[] 和 Map<id, DrawingObject>，所有修改操作返回操作结果
- **涉及文件**：js/core/ObjectStore.js（新建）
- **依赖**：T-003（常量）, T-004（generateId）
- **验证**：创建对象 → 添加到图层 → getObject 返回正确对象；moveObject → 坐标更新；getState 返回完整快照

---

### T-008 ⬜ DrawEngine 基础图形渲染

- **标题**：feat: DrawEngine.js — Canvas 渲染引擎（基础图形）
- **功能描述**：实现 DrawEngine 核心渲染：render() 主循环、_drawObject 分发、9 种基础图形绘制（circle, rect, ellipse, triangle, line, polygon, arc, text, arrow）、_applyStyle 通用属性应用、_applyTransform 变换处理、选中框绘制、网格绘制、画布缩放/平移/resize
- **实现思路**：Canvas 2D API，switch-case 分发到具体绘制方法，ctx.save()/restore() 管理状态
- **涉及文件**：js/core/DrawEngine.js（新建）
- **依赖**：T-007（ObjectStore）
- **验证**：用 JS 创建 9 种基础图形对象并渲染到画布，可见且样式正确

---

### T-009 ⬜ DrawEngine 高级图形渲染 + 逐步绘制动画

- **标题**：feat: DrawEngine 高级几何图形 + animateActions 逐步绘制动画
- **功能描述**：实现 13 种高级图形（bezier, spiral, wave, sine, star, heart, flower, gear, cloud, tree, fractal, crown, diamond）+ 复合对象递归绘制 + animateActions 逐步绘制动画（逐个添加对象，每步 60ms，onProgress 回调）+ animateTemplateParts 模板专用逐步绘制 + exportPNG/SVG 导出
- **实现思路**：高级图形用数学公式计算点位，animateActions 用 async/await + setTimeout 逐步执行，exportSVG 将 DrawingObject 序列化为 SVG 元素
- **涉及文件**：js/core/DrawEngine.js（修改，追加方法）
- **依赖**：T-008
- **验证**：所有高级图形可绘制；animateActions 逐个对象出现，每步约 60ms；exportPNG 返回有效 dataURL

---

### T-010 ⬜ HistoryManager 历史管理

- **标题**：feat: HistoryManager.js — 撤销/重做/时间线快照
- **功能描述**：实现撤销栈/重做栈管理，pushSnapshot 推入 ObjectStore 状态快照，undo/redo 恢复快照，canUndo/canRedo 状态查询，getTimeline 返回完整时间线，最大 50 步限制
- **实现思路**：双栈结构，pushSnapshot 时深拷贝当前状态，undo 时 pop 并 push 到 redo 栈
- **涉及文件**：js/core/HistoryManager.js（新建）
- **依赖**：T-004（deepClone）
- **验证**：push 3 个快照 → undo 2 次 → redo 1 次 → 状态正确恢复

---

### T-011 ⬜ CanvasArea UI + StatusBar UI

- **标题**：feat: CanvasArea.js + StatusBar.js — 画布区域与状态栏 UI 组件
- **功能描述**：CanvasArea 创建 canvas 元素，初始化 DrawEngine 和 ObjectStore，ResizeObserver 监听尺寸变化，绑定 Ctrl+Z/Ctrl+Shift+Z 快捷键，getCanvasDataURL 返回缩略图。StatusBar 显示当前图层名、对象总数、选中对象名、可撤销步数，监听 ObjectStore/HistoryManager 事件更新
- **实现思路**：CanvasArea 持有 DrawEngine 实例，StatusBar 订阅事件更新 DOM
- **涉及文件**：js/ui/CanvasArea.js（新建）, js/ui/StatusBar.js（新建）
- **依赖**：T-008, T-009, T-010
- **验证**：页面显示 Canvas 区域和状态栏，Ctrl+Z 触发撤销并更新状态栏信息

---

## Phase 2 — Q版风格层 + 模板系统 🎨

### T-012 ⬜ Q版风格渲染方法（扩展 DrawEngine）

- **标题**：feat: DrawEngine Q版风格渲染 — 统一描边、高光、腮红、鼻子绘制
- **功能描述**：在 DrawEngine 新增Q版专用方法：_applyQBStyle（应用统一描边 2.5px/#1e1e1e、round lineCap/lineJoin）、_drawQBHighlight（眼睛白色高光点）、_drawQBBlush（粉色半透明腮红椭圆）、_drawQBNose（triangle/dot/oval 三种鼻子）、renderQBFigure（一次性渲染完整Q版形象，按绘制顺序排序，自动应用风格默认值）
- **实现思路**：Canvas 2D API，globalAlpha 控制腮红透明度，arc 绘制高光圆点
- **涉及文件**：js/core/DrawEngine.js（修改，追加方法）
- **依赖**：T-009, T-003（QB_STYLE 常量）
- **验证**：调用 renderQBFigure 渲染测试数据，画布上显示带描边、高光、腮红的Q版部件

---

### T-013 ⬜ TemplateLib 模板库管理

- **标题**：feat: TemplateLib.js — Q版模板库加载/匹配/实例化/保存
- **功能描述**：实现模板库管理：init() 加载内置+自定义模板，search() 支持中文名/别名/模糊匹配，instantiate() 将模板相对坐标转为绝对坐标生成 DrawingObject[]（支持 size/position/colorOverrides/variant 参数），saveAsTemplate() 将 LLM 生成的图形保存为新模板（绝对→相对坐标、自动识别 colorSlots），listTemplates/getTemplateNames 列表查询，deleteTemplate/exportTemplate/importTemplate 管理功能
- **实现思路**：Map 存储模板，search 用关键词匹配 name/aliases，instantiate 遍历 parts 调用 relToAbs，saveAsTemplate 计算包围盒后调用 absToRel
- **涉及文件**：js/core/TemplateLib.js（新建）
- **依赖**：T-004（relToAbs/absToRel）, T-007（DrawingObject 模型）, T-003（TEMPLATE_CATEGORIES）
- **验证**：手动创建一个测试模板 JSON → init 加载 → search("小猫") 匹配 → instantiate 生成 DrawingObject[] → saveAsTemplate 保存为新模板

---

### T-014 ⬜ 动物模板 — 猫/狗/兔子/熊猫（第一批 4 个）

- **标题**：feat: 动物模板第一批 — 猫、狗、兔子、熊猫 Q版模板 JSON
- **功能描述**：制作 4 个精致Q版动物模板 JSON：cat.json（尖耳/胡须/长尾）、dog.json（垂耳/舌头/短尾）、rabbit.json（长耳/短尾/门牙）、panda.json（黑眼圈/黑白配色）。每个模板 30-50 个 TemplatePart，包含 colorSlots、aliases、drawingOrder、默认 variant
- **实现思路**：基于 plan §2.3 的特征描述，用相对坐标手工设计各部位图形组合，先画 SVG 原型验证后转为 JSON
- **涉及文件**：templates/animals/cat.json, dog.json, rabbit.json, panda.json（新建）
- **依赖**：T-013（TemplateLib 可加载）
- **验证**：TemplateLib.instantiate("cat") 渲染出精致Q版小猫，描边统一、有高光和腮红

---

### T-015 ⬜ 动物模板 — 小鸟/鱼/小熊/老鼠（第二批 4 个）

- **标题**：feat: 动物模板第二批 — 小鸟、鱼、小熊、老鼠 Q版模板 JSON
- **功能描述**：制作 bird.json（翅膀/尖嘴/羽毛）、fish.json（鳍/尾巴/鳞片纹）、bear.json（圆耳/大肚）、mouse.json（大圆耳/细尾巴）。每个模板 30-50 个 TemplatePart
- **实现思路**：同 T-014
- **涉及文件**：templates/animals/bird.json, fish.json, bear.json, mouse.json（新建）
- **依赖**：T-014（模板格式已验证）
- **验证**：4 个模板 instantiate 渲染效果精致

---

### T-016 ⬜ 动物模板 — 老虎/狮子/狐狸/企鹅（第三批 4 个）

- **标题**：feat: 动物模板第三批 — 老虎、狮子、狐狸、企鹅 Q版模板 JSON
- **功能描述**：制作 tiger.json（条纹/王字额）、lion.json（鬃毛/大鼻）、fox.json（尖脸/大尾巴）、penguin.json（黑白配色/短翅）。每个模板 30-50 个 TemplatePart
- **实现思路**：同 T-014
- **涉及文件**：templates/animals/tiger.json, lion.json, fox.json, penguin.json（新建）
- **依赖**：T-014
- **验证**：4 个模板 instantiate 渲染效果精致

---

### T-017 ⬜ 交通工具模板（6 个）

- **标题**：feat: 交通工具模板 — 汽车/飞机/火箭/船/火车/自行车 Q版模板 JSON
- **功能描述**：制作 6 个Q版交通工具模板：car.json（车轮/车窗/车灯）、plane.json（机翼/螺旋桨）、rocket.json（尾焰/舷窗）、ship.json（帆/船身）、train.json（烟囱/车轮/车厢）、bicycle.json（车轮/车把/车座）。每个模板 30-50 个 TemplatePart
- **实现思路**：同 T-014，交通工具风格与动物统一描边/配色
- **涉及文件**：templates/vehicles/car.json, plane.json, rocket.json, ship.json, train.json, bicycle.json（新建）
- **依赖**：T-014（模板格式已验证）
- **验证**：6 个模板 instantiate 渲染效果精致，风格与动物模板统一

---

## Phase 3 — LLM 通信桥 + 上下文系统

### T-018 ⬜ ConfigManager 配置管理

- **标题**：feat: ConfigManager.js — LLM/语音/画布配置管理 + localStorage 持久化
- **功能描述**：管理所有用户配置：LLM 配置（apiUrl, apiKey, model, maxTokens, temperature）、5 个预设模板快速切换、语音配置（语言/模式/超时/播报）、画布配置（尺寸/背景/保存间隔/历史上限），加载/保存到 localStorage，isLLMConfigured 检查
- **实现思路**：单例类，getAll/set/reset 方法操作一个内部对象，JSON 序列化存 localStorage
- **涉及文件**：js/core/ConfigManager.js（新建）
- **依赖**：T-003（LLM_PRESETS, DEFAULT_CANVAS, DEFAULT_VOICE）
- **验证**：设置 API 地址 → 刷新页面 → 地址恢复；applyPreset('glm') 正确切换配置

---

### T-019 ⬜ System Prompt 构建器

- **标题**：feat: system-prompt.js — LLM System Prompt 构建器（含Q版规范 + 模板指令 + Few-shot）
- **功能描述**：构建完整的 System Prompt：角色定义（Q版语音绘图助手）、Q版绘制规范（头身比/描边/高光/腮红/色板/图形数/绘制顺序）、模板匹配指令（注入可用模板列表、useTemplate 操作说明）、模板保存指令（saveTemplate）、能力清单、操作类型说明、输出格式要求、歧义处理、容错规则、二次创作规则、安全规则、3 个 Few-shot 示例（useTemplate/batch/addChild）。buildContextPayload 构建完整上下文（含 templateRef、压缩策略）
- **实现思路**：模板字符串拼接，templateLib.getTemplateNames() 动态注入模板列表
- **涉及文件**：js/prompts/system-prompt.js（新建）
- **依赖**：T-013（getTemplateNames）, T-003（OP_TYPES）
- **验证**：调用 buildSystemPrompt 返回完整 prompt 文本，包含Q版规范段落和模板列表

---

### T-020 ⬜ LLMBridge 流式通信

- **标题**：feat: LLMBridge.js — LLM API 流式通信（SSE 解析 + 自动修正重试）
- **功能描述**：实现 LLM 通信：sendStream 流式发送（stream: true, SSE 解析, onToken/onComplete/onError 回调）、send 非流式备用、sendStreamWithRetry 带自动修正重试（最多 3 次）、buildMessages 构建完整消息数组。OpenAI 兼容格式，超时保护 30 秒
- **实现思路**：Fetch API + ReadableStream 解析 SSE data: 行，提取 delta.content，流式完成后拼完整 JSON 解析
- **涉及文件**：js/core/LLMBridge.js（新建）
- **依赖**：T-018（ConfigManager）, T-019（buildMessages 需要 system-prompt）
- **验证**：配置 LLM API 后，sendStream 接收流式 token 并打印到控制台

---

### T-021 ⬜ 操作校验器

- **标题**：feat: validators.js — LLM 操作校验 + Q版风格校验 + 自动补全
- **功能描述**：校验 LLM 返回的每个操作：validateAction 校验各操作类型（add/update/delete/move/addChild/batch/useTemplate/saveTemplate）的 schema 和参数合法性，validateActions 校验数组，sanitizeAction 清洗补全默认值（描边/位置/名称），Q版自动补全（缺少高光→追加、缺少腮红→追加、batch<15→标记需补充）
- **实现思路**：纯函数，switch-case 按 op 类型校验，sanitizeAction 返回清洗后的 action
- **涉及文件**：js/utils/validators.js（新建）
- **依赖**：T-003（OP_TYPES）, T-007（ObjectStore 查对象是否存在）, T-013（模板库查 templateId）
- **验证**：校验合法 action 通过；校验非法 action 返回 errors；sanitizeAction 补全缺失字段

---

### T-022 ⬜ ConversationManager 状态中枢（核心流程）

- **标题**：feat: ConversationManager.js — 状态中枢（模板匹配→LLM流式→逐步绘制→完成）
- **功能描述**：实现核心处理流程：processUserInput（先模板匹配→构建上下文→流式调用 LLMBridge.sendStream→onToken 实时显示→校验 actions→处理 useTemplate/saveTemplate→animateActions 逐步绘制→onProgress 更新进度→绘制完成显示最终消息→更新历史→语音播报→自动保存），executeAction 单操作分发，executeActions 批量执行，confirmDangerousAction 危险确认
- **实现思路**：async/await 编排异步流程，持有所有子模块引用，模板匹配优先于 LLM 生成
- **涉及文件**：js/core/ConversationManager.js（新建）
- **依赖**：T-007, T-008, T-009, T-010, T-013, T-018, T-019, T-020, T-021
- **验证**：文字输入"画一个圆" → LLM 返回 add 操作 → 圆形渲染到画布；文字输入"画一只小猫" → useTemplate → Q版小猫逐步渲染

---

## Phase 4 — 语音引擎

### T-023 ⬜ VoiceEngine 语音识别与播报

- **标题**：feat: VoiceEngine.js — Web Speech API 语音识别（实时中间结果）+ 语音播报
- **功能描述**：封装 Web Speech API：语音识别（startListening/stopListening、持续监听/按住说话两种模式、interimResults=true 实时中间结果、maxAlternatives=3 候选结果、静音超时自动提交、兼容性检测），语音播报（speak/stopSpeaking、播报速度/级别控制、新语音输入自动中断播报），状态管理（idle/listening/processing）
- **实现思路**：webkitSpeechRecognition/SpeechRecognition 兼容处理，SpeechSynthesisUtterance 播报，setTimeout 实现静音超时
- **涉及文件**：js/core/VoiceEngine.js（新建）
- **依赖**：T-018（读取语音配置）
- **验证**：点击开始监听 → 说话 → onInterimResult 实时回调 → onFinalResult 返回最终文字+候选；speak 播报文字

---

### T-024 ⬜ ChatPanel 对话面板（语音实时显示 + LLM 流式 + 绘制进度）

- **标题**：feat: ChatPanel.js — 对话面板（语音实时显示 + LLM 逐字流式 + 绘制进度 + 完成消息）
- **功能描述**：实现对话面板完整功能：消息列表渲染（用户/助手/系统消息），语音实时显示区域（波形动画+实时中间识别文字，识别完成后移入消息列表），LLM 流式输出显示（appendStreamToken 逐字追加，打字机效果，光标闪烁），绘制进度显示（updateDrawProgress "第 5/35 个图形"，绘制期间不显示最终结果），绘制完成显示（showDrawComplete 结果+数量+耗时，此时才触发播报），底部输入区（语音按钮+文字输入框+发送按钮），模板使用提示
- **实现思路**：DOM 操作渲染消息列表，textContent 逐字追加实现流式效果，CSS 动画实现波形/光标闪烁
- **涉及文件**：js/ui/ChatPanel.js（新建）
- **依赖**：T-002（CSS 样式）, T-023（VoiceEngine 集成）, T-022（ConversationManager 调用）
- **验证**：语音说话→实时文字更新→识别完成→LLM 逐字回复→画布逐步绘制→进度更新→完成消息出现

---

## Phase 5 — 对话管理 + 持久化

### T-025 ⬜ StorageAdapter 持久化存储

- **标题**：feat: StorageAdapter.js — localStorage + IndexedDB 持久化（含模板存储）
- **功能描述**：封装存储操作：localStorage 操作（设置/对话索引/对话数据/缩略图的读写删除），IndexedDB 自动降级（>4MB 时启用，conversations/canvas_snapshots/audio_cache stores），自定义模板存储（saveCustomTemplate/loadCustomTemplates/deleteCustomTemplate），自动保存（startAutoSave/stopAutoSave），导出/导入 JSON
- **实现思路**：策略模式，内部判断数据大小选择 localStorage 或 IndexedDB，IDB 使用 async/await 封装
- **涉及文件**：js/core/StorageAdapter.js（新建）
- **依赖**：T-004（工具函数）
- **验证**：保存对话 → 刷新 → 恢复；保存大体积数据 → 自动降级到 IndexedDB；保存自定义模板 → 刷新 → 恢复

---

### T-026 ⬜ ConversationManager 多轮对话扩展

- **标题**：feat: ConversationManager 多轮对话 — 创建/切换/删除/重命名对话 + 模板二次创作
- **功能描述**：扩展 ConversationManager 支持多轮对话：conversations Map 管理多个对话，createConversation 新建对话（清空画布），switchConversation 切换（恢复画布快照+消息），deleteConversation 删除，renameConversation 重命名，autoTitle 自动标题，saveCurrentConversation 保存，loadAllConversations 启动加载。模板二次创作：识别"给它加个帽子"→ 查找 templateRef 定位目标 → LLM 根据 templateRef 了解结构
- **实现思路**：Map 管理对话实例，切换时保存当前状态+恢复目标状态
- **涉及文件**：js/core/ConversationManager.js（修改，追加多轮对话方法）
- **依赖**：T-022（基础流程）, T-025（StorageAdapter）
- **验证**：新建对话 → 画猫 → 新建对话 → 画狗 → 切换回第一个 → 猫恢复

---

### T-027 ⬜ SidebarPanel 对话列表侧栏

- **标题**：feat: SidebarPanel.js — 对话列表侧栏 + 模板管理入口
- **功能描述**：对话列表 UI：每项显示缩略图/标题/时间/消息数，右键菜单（重命名/删除/导出），点击切换对话，新建对话按钮，导入对话按钮，模板管理入口（查看/删除自定义模板）
- **实现思路**：DOM 渲染列表，事件委托处理点击/右键，模态框处理重命名/删除确认
- **涉及文件**：js/ui/SidebarPanel.js（新建）
- **依赖**：T-026（多轮对话 API）, T-002（CSS）
- **验证**：侧栏显示对话列表，点击切换，新建/删除/重命名正常

---

## Phase 6 — UI 精细化 + 容错体系

### T-028 ⬜ SettingsPanel 设置面板

- **标题**：feat: SettingsPanel.js — 设置面板（LLM/语音/画布/Q版风格设置）
- **功能描述**：模态框式设置面板：LLM 设置区（API 地址/Key/模型/5 个预设按钮/Max Token 滑块/温度滑块/测试连接按钮），语音设置区（语言下拉/模式切换/静音超时/播报级别/播报速度），画布设置区（尺寸/背景色/保存间隔），Q版风格设置（描边粗细 2-4px/腮红开关/高光开关/默认色系），保存/重置按钮
- **实现思路**：模态框 DOM + 表单控件，change 事件写入 ConfigManager，测试连接调用 LLMBridge.send 发送简单请求
- **涉及文件**：js/ui/SettingsPanel.js（新建）
- **依赖**：T-018（ConfigManager）, T-020（LLMBridge 测试连接）
- **验证**：修改 API 地址 → 保存 → 刷新恢复；点击测试连接 → 成功/失败提示；Q版描边改为 3px → 后续绘制生效

---

### T-029 ⬜ 五层容错体系完善

- **标题**：feat: 完善五层容错 — 危险操作确认 + Q版要素自动补全 + 状态可视化
- **功能描述**：完善容错：第四层安全兜底（危险操作 UI 确认弹窗——清空画布/批量删除/覆盖内容，操作前自动快照，对象数量限制 ≤50，LLM 超时 30 秒），第五层用户反馈闭环（每步状态可视化、语音播报、错误友好展示、重试进度），Q版容错（LLM batch 缺少高光→自动补全、缺少腮红→自动补全、batch<15→提示补充细节）
- **实现思路**：confirmDangerousAction 在 executeAction 前拦截，Q版自动补全在 sanitizeAction 中实现
- **涉及文件**：js/utils/validators.js（修改）, js/core/ConversationManager.js（修改）, css/style.css（修改，确认弹窗样式）
- **依赖**：T-021, T-022
- **验证**："清空画布" → 弹出确认框；LLM 返回缺少高光的 batch → 自动补全高光后渲染

---

### T-030 ⬜ CSS 美化 + 无障碍

- **标题**：feat: CSS 美化 — 暗色主题完善 + 动画过渡 + 无障碍焦点指示器
- **功能描述**：完善 CSS：暗色主题所有组件适配，消息气泡样式优化，按钮 hover/active 状态，加载/流式动画过渡，ARIA 标签，焦点指示器，画布交互增强（背景/网格/缩放指示器/尺寸调整 UI）
- **实现思路**：CSS 变量切换主题，transition 过渡动画，:focus-visible 焦点样式，aria-label 标注
- **涉及文件**：css/style.css（修改）
- **依赖**：T-002
- **验证**：暗色/亮色切换流畅，Tab 键可导航所有交互元素，动画流畅

---

## Phase 7 — 导出 + 高级功能 + 测试

### T-031 ⬜ 导出功能（PNG/JPG/SVG/快照）

- **标题**：feat: 导出功能 — PNG/JPG/SVG 多分辨率导出 + 画布快照
- **功能描述**：实现 4 种导出：PNG 导出（支持 1x/2x/3x 分辨率），JPG 导出（可选背景色），SVG 导出（DrawingObject 序列化为 SVG 元素），画布快照导出（完整状态 JSON，可重新加载编辑）
- **实现思路**：canvas.toDataURL 导出 PNG/JPG，手动构建 SVG 字符串，JSON.stringify 导出快照
- **涉及文件**：js/core/DrawEngine.js（修改，完善 exportPNG/exportSVG）, js/core/ConversationManager.js（修改，添加导出指令处理）
- **依赖**：T-009
- **验证**："导出图片" → 下载 PNG；"导出高清" → 2x 分辨率 PNG；"导出 SVG" → 下载 SVG 文件

---

### T-032 ⬜ 高级绘图功能（自由绘制/布尔运算/渐变阴影）

- **标题**：feat: 高级绘图 — 自由绘制模式 + 布尔运算 + 渐变填充 + 阴影效果
- **功能描述**：自由绘制模式（"开始画"进入路径记录，语音控制方向/长度，"结束画"生成 path 对象），布尔运算（group/ungroup + 交集/合并/减去），渐变填充（线性/径向渐变，多色渐变），阴影效果
- **实现思路**：自由绘制用 Path2D 记录路径，布尔运算用 Canvas clip/composite，渐变用 createLinearGradient/createRadialGradient
- **涉及文件**：js/core/DrawEngine.js（修改）, js/core/ObjectStore.js（修改）
- **依赖**：T-009
- **验证**："开始画" → 语音控制绘制路径 → "结束画" → 生成 path 对象；"合并形状" → 两个图形合并

---

### T-033 ⬜ System Prompt 优化 + 集成测试

- **标题**：feat: System Prompt 优化 + 集成测试 + 最终文档
- **功能描述**：根据前期测试优化 System Prompt（添加更多 Few-shot、优化模板匹配精度、优化二次创作 templateRef 定位），编写集成测试（语音识别/LLM 指令/Q版专项/容错/持久化/浏览器兼容性/性能），更新设计文档实现状态跟踪表，编写用户使用指南
- **实现思路**：迭代优化 prompt，测试用例覆盖每种指令类型至少 3 个用例
- **涉及文件**：js/prompts/system-prompt.js（修改）, docs/specs/2026-06-12-voice-drawing-design.md（修改状态表）
- **依赖**：T-032（所有功能完成后）
- **验证**：18 个模板逐一验证；非模板图形具备Q版风格；五层容错全部验证；Chrome/Edge 完整功能可用

---

## 任务总览

| ID | 任务标题 | Phase | 依赖 | 预估行数 |
|----|----------|-------|------|----------|
| T-001 | 项目文件结构 + HTML 入口 | 0 | 无 | ~80 |
| T-002 | CSS 基础布局 + 主题 | 0 | T-001 | ~300 |
| T-003 | constants.js 常量定义 | 0 | T-001 | ~150 |
| T-004 | helpers.js 工具函数 | 0 | T-003 | ~200 |
| T-005 | i18n.js 中英文文本 | 0 | T-001 | ~150 |
| T-006 | app.js 入口初始化 | 0 | T-001~T-005, T-007, T-008, T-010 | ~100 |
| T-007 | ObjectStore 对象/图层存储 | 1 | T-003, T-004 | ~600 |
| T-008 | DrawEngine 基础图形 | 1 | T-007 | ~500 |
| T-009 | DrawEngine 高级图形 + 逐步绘制 | 1 | T-008 | ~700 |
| T-010 | HistoryManager 历史管理 | 1 | T-004 | ~150 |
| T-011 | CanvasArea + StatusBar UI | 1 | T-008~T-010 | ~200 |
| T-012 | Q版风格渲染方法 | 2 | T-009, T-003 | ~250 |
| T-013 | TemplateLib 模板库管理 | 2 | T-004, T-007, T-003 | ~500 |
| T-014 | 动物模板第一批 4 个 | 2 | T-013 | ~800 (JSON) |
| T-015 | 动物模板第二批 4 个 | 2 | T-014 | ~800 (JSON) |
| T-016 | 动物模板第三批 4 个 | 2 | T-014 | ~800 (JSON) |
| T-017 | 交通工具模板 6 个 | 2 | T-014 | ~1200 (JSON) |
| T-018 | ConfigManager 配置管理 | 3 | T-003 | ~200 |
| T-019 | System Prompt 构建器 | 3 | T-013, T-003 | ~400 |
| T-020 | LLMBridge 流式通信 | 3 | T-018, T-019 | ~350 |
| T-021 | validators.js 操作校验 | 3 | T-003, T-007, T-013 | ~300 |
| T-022 | ConversationManager 状态中枢 | 3 | T-007~T-013, T-018~T-021 | ~400 |
| T-023 | VoiceEngine 语音引擎 | 4 | T-018 | ~300 |
| T-024 | ChatPanel 对话面板 | 4 | T-002, T-022, T-023 | ~400 |
| T-025 | StorageAdapter 持久化 | 5 | T-004 | ~300 |
| T-026 | ConversationManager 多轮对话 | 5 | T-022, T-025 | ~250 |
| T-027 | SidebarPanel 对话侧栏 | 5 | T-026, T-002 | ~200 |
| T-028 | SettingsPanel 设置面板 | 6 | T-018, T-020 | ~350 |
| T-029 | 五层容错体系完善 | 6 | T-021, T-022 | ~200 |
| T-030 | CSS 美化 + 无障碍 | 6 | T-002 | ~200 |
| T-031 | 导出功能 | 7 | T-009 | ~200 |
| T-032 | 高级绘图功能 | 7 | T-009 | ~300 |
| T-033 | System Prompt 优化 + 测试 | 7 | T-032 | ~300 |

**总计：33 个任务（PR），预估 ~10,100 行 JS + ~3,600 行 JSON 模板**
