# AI 语音绘图工具 — 实现计划

> 日期：2026-06-13（更新）
> 基于：`docs/specs/2026-06-12-voice-drawing-design.md`
> 状态：待执行

---

## 总览

将设计规格书拆分为 **8 个阶段（Phase）**，每个阶段产出可独立运行的增量版本。阶段之间有依赖关系，但阶段内的任务可以并行开发。

```
Phase 0  项目骨架 + 工具函数            → 能打开空白页面
Phase 1  Canvas 绘图引擎 + 对象模型     → 能用 JS 画出所有图形
Phase 2  Q版风格层 + 模板系统           → 能渲染精致Q版图形 + 模板匹配
Phase 3  LLM 通信桥 + 上下文系统        → 能发指令给 LLM 并接收操作
Phase 4  语音引擎                       → 能说话驱动绘图
Phase 5  对话管理 + 持久化              → 多轮对话 + 自动保存
Phase 6  UI 精细化 + 容错体系           → 完整用户体验
Phase 7  导出 + 高级功能 + 测试         → 可交付
```

---

## Phase 0 — 项目骨架 + 工具函数

**目标**：建立文件结构、HTML 入口、CSS 基础布局、工具函数模块，确保页面可打开且模块可加载。

### 0.1 创建文件结构

按照设计文档 §十一 的文件结构创建所有目录和空文件：

```
AI 语音绘图工具/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── core/
│   │   ├── ConversationManager.js
│   │   ├── VoiceEngine.js
│   │   ├── LLMBridge.js
│   │   ├── DrawEngine.js
│   │   ├── ObjectStore.js
│   │   ├── HistoryManager.js
│   │   ├── ConfigManager.js
│   │   ├── StorageAdapter.js
│   │   └── TemplateLib.js
│   ├── ui/
│   │   ├── ChatPanel.js
│   │   ├── CanvasArea.js
│   │   ├── SettingsPanel.js
│   │   ├── SidebarPanel.js
│   │   └── StatusBar.js
│   ├── prompts/
│   │   └── system-prompt.js
│   └── utils/
│       ├── validators.js
│       ├── constants.js
│       ├── helpers.js
│       └── i18n.js
├── assets/
│   └── icons/
├── templates/
│   ├── animals/
│   └── vehicles/
└── docs/
    └── specs/  (已存在)
```

### 0.2 `index.html` — 单入口

- 使用 `<script type="module">` 加载 `js/app.js`
- HTML 骨架包含顶栏、对话面板、画布区域、状态栏、底部输入区（参照 §七.3 界面布局）
- 引入 `css/style.css`
- `<meta>` 标签设置 UTF-8、viewport、描述

### 0.3 `css/style.css` — 基础布局

- CSS 变量定义主题色（暗色主题 + 亮色主题变量）
- Grid 布局实现 §七.3 的三栏结构（侧栏 | 对话面板 | 画布区域）
- 顶栏、状态栏、底部输入区的固定布局
- 基础组件样式：按钮、输入框、消息气泡、模态框
- 响应式媒体查询（最小 1024px 宽度）
- 动画关键帧：波形动画、旋转加载、淡入淡出

### 0.4 `js/utils/constants.js` — 常量定义

```javascript
// 图形类型枚举
export const SHAPE_TYPES = { ... }

// Q版风格常量
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
  HEAD_BODY_RATIO: 1.0,       // 头身比
  MAX_PARTS_PER_FIGURE: 50,
  MIN_PARTS_PER_FIGURE: 15,
}

// Q版色板（柔和色系）
export const QB_PALETTE = {
  yellows: ['#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'],
  oranges: ['#fb923c', '#fdba74', '#fed7aa'],
  pinks: ['#f472b6', '#f9a8d4', '#fbcfe8'],
  blues: ['#60a5fa', '#93c5fd', '#bfdbfe'],
  greens: ['#4ade80', '#86efac', '#bbf7d0'],
  purples: ['#a78bfa', '#c4b5fd', '#ddd6fe'],
  reds: ['#f87171', '#fca5a5', '#fecaca'],
  browns: ['#d97706', '#f59e0b', '#92400e'],
}

// LLM 预设模板（§九.2）
export const LLM_PRESETS = [ ... ]

// 默认画布配置（§九.4）
export const DEFAULT_CANVAS = { width: 1200, height: 800, background: '#FFFFFF' }

// 语音配置默认值（§九.3）
export const DEFAULT_VOICE = { ... }

// 操作类型枚举
export const OP_TYPES = {
  ADD: 'add',
  UPDATE: 'update',
  DELETE: 'delete',
  MOVE: 'move',
  ADD_CHILD: 'addChild',
  BATCH: 'batch',
  SAVE_TEMPLATE: 'saveTemplate',
  CLARIFY: 'clarify',
  REPLY: 'reply',
}

// 模板类别
export const TEMPLATE_CATEGORIES = {
  ANIMALS: 'animals',
  VEHICLES: 'vehicles',
  CUSTOM: 'custom',    // 用户/LLM 学习保存的
}

// 限制常量
export const LIMITS = {
  MAX_CHILDREN_PER_BATCH: 50,
  MAX_RETRY: 3,
  MAX_HISTORY: 50,
  MAX_CONVERSATION_TURNS: 20,
  AUTO_SAVE_INTERVAL: 30000,
}
```

### 0.5 `js/utils/helpers.js` — 工具函数

- `generateId(prefix)` — 生成唯一 ID（如 `obj_001`、`layer_1`）
- `clamp(val, min, max)` — 数值钳制
- `deepClone(obj)` — 深拷贝
- `debounce(fn, ms)` / `throttle(fn, ms)` — 防抖/节流
- `formatTimestamp(ts)` — 时间格式化
- `colorKeywords` — 中文颜色名 → CSS 颜色值映射
- `normalizeColor(color)` — 统一颜色格式
- **Q版专用工具**：
  - `relToAbs(relVal, baseSize)` — 模板相对坐标 → 绝对坐标
  - `absToRel(absVal, baseSize)` — 绝对坐标 → 相对坐标（模板保存时用）
  - `randomQBColor(category)` — 从Q版色板中随机取色
  - `generateHighlights(eyeX, eyeY, eyeRadius)` — 生成标准高光点坐标

### 0.6 `js/utils/i18n.js` — 中英文文本

- 导出 `t(key)` 函数
- 内置中英文对照表，覆盖所有 UI 文案和状态提示
- 新增Q版/模板相关文案：模板保存成功、模板匹配提示等
- 默认中文

### 0.7 `js/app.js` — 入口模块

- 导入所有模块（仅导入，暂不初始化）
- `DOMContentLoaded` 事件中打印版本信息到控制台

### 验收标准

- [ ] `index.html` 在浏览器中打开无报错
- [ ] 控制台无 404 或模块加载错误
- [ ] 页面显示基础三栏布局骨架
- [ ] `templates/animals/` 和 `templates/vehicles/` 目录存在

---

## Phase 1 — Canvas 绘图引擎 + 对象模型

**目标**：实现完整的绘图引擎，支持所有图形类型、图层系统、渲染机制，可以用 JS API 画出设计文档中列出的所有图形。

### 1.1 `js/core/ObjectStore.js` — 对象/图层存储

**职责**：管理所有 DrawingObject 和 Layer 的增删改查。

- 实现 `DrawingObject` 数据模型（§五.1）
  - 所有字段：id, type, name, x, y, params, strokeColor, fillColor, fill, strokeWidth, opacity, rotation, scaleX, scaleY, visible, locked, layer, children, path, gradient, shadow
  - **新增字段**：`templateRef: string | null` — 标记该对象来自哪个模板（如 "cat"）
- 实现 `Layer` 数据模型（§五.2）
  - 字段：id, name, visible, opacity, locked, objects[]
- `ObjectStore` 类：
  - `layers: Layer[]` — 默认创建一个"图层 1"
  - `selectedObjectId: string | null`
  - `currentLayerId: number`
  - `addObject(obj)` / `getObject(id)` / `updateObject(id, changes)` / `deleteObject(id)`
  - `moveObject(id, x, y)` / `scaleObject(id, sx, sy)` / `rotateObject(id, deg)`
  - `flipObject(id, axis)` / `centerObject(id)`
  - `selectObject(id)` / `selectAll()` / `deselectAll()`
  - `addLayer()` / `deleteLayer(id)` / `switchLayer(id)` / `reorderLayer(id, newIndex)`
  - `toggleLayerVisibility(id)` / `setLayerOpacity(id, opacity)`
  - `groupObjects(ids)` / `ungroupObject(id)`
  - `duplicateObject(id)` / `copyObject(id)` / `pasteObject()`
  - `getSelectedObject()` / `getObjectsByLayer(layerId)` / `getAllObjects()`
  - `getState()` — 返回完整状态快照（用于上下文发送）
  - `clear()` — 清空所有对象和图层
  - 内部维护一个 `Map<id, DrawingObject>` 索引用于 O(1) 查找

### 1.2 `js/core/DrawEngine.js` — Canvas 渲染引擎

**职责**：将 ObjectStore 中的对象渲染到 Canvas 上。

- `DrawEngine` 类：
  - 构造函数接收 `canvas: HTMLCanvasElement` 和 `objectStore: ObjectStore`
  - `render()` — 主渲染方法
    1. 清空画布
    2. 按图层顺序遍历
    3. 每个对象调用 `_drawObject(ctx, obj)`
    4. 绘制选中框（虚线 + 控制点）
    5. 绘制网格（如果启用）
  - `_drawObject(ctx, obj)` — 根据 obj.type 分发到具体绘制方法
  - 基础图形绘制方法（§五.3）：
    - `_drawCircle(ctx, obj)` — params: { radius }
    - `_drawRect(ctx, obj)` — params: { width, height, cornerRadius }
    - `_drawEllipse(ctx, obj)` — params: { rx, ry }
    - `_drawTriangle(ctx, obj)` — params: { size } 或自定义三点
    - `_drawLine(ctx, obj)` — params: { x2, y2 }
    - `_drawPolygon(ctx, obj)` — params: { sides, radius }
    - `_drawArc(ctx, obj)` — params: { radius, startAngle, endAngle }
    - `_drawText(ctx, obj)` — params: { text, fontSize, fontFamily, fontWeight, fontStyle }
    - `_drawArrow(ctx, obj)` — params: { x2, y2, headSize }
  - 高级几何绘制方法：
    - `_drawBezier(ctx, obj)` — params: { points: [{cp1x, cp1y, cp2x, cp2y, x, y}] }
    - `_drawSpiral(ctx, obj)` — params: { turns, radius, spacing }
    - `_drawWave(ctx, obj)` — params: { amplitude, wavelength, length }
    - `_drawSine(ctx, obj)` — params: { amplitude, frequency, length }
    - `_drawStar(ctx, obj)` — params: { outerRadius, innerRadius, points }
    - `_drawHeart(ctx, obj)` — params: { size }
    - `_drawFlower(ctx, obj)` — params: { petals, petalRadius, centerRadius }
    - `_drawGear(ctx, obj)` — params: { teeth, outerRadius, innerRadius }
    - `_drawCloud(ctx, obj)` — params: { width, height }
    - `_drawTree(ctx, obj)` — params: { trunkHeight, canopyRadius }
    - `_drawFractal(ctx, obj)` — params: { type: 'koch'|'sierpinski'|'mandelbrot', depth }
    - `_drawCrown(ctx, obj)` — params: { width, height }
    - `_drawDiamond(ctx, obj)` — params: { width, height }
  - 复合对象绘制：`_drawComposite(ctx, obj)` — 递归绘制 children
  - 通用属性应用：`_applyStyle(ctx, obj)` — 应用 strokeColor, fillColor, opacity, shadow, gradient, strokeWidth
  - 变换处理：`_applyTransform(ctx, obj)` — 应用 translate, rotate, scale
  - 选中框绘制：`_drawSelection(ctx, obj)` — 虚线边框 + 8个控制点
  - 网格绘制：`_drawGrid(ctx)` — 可选显示
  - 画布缩放/平移：
    - `zoom(factor)` / `pan(dx, dy)` / `resetView()`
    - 内部维护 `viewTransform: { scale, offsetX, offsetY }`
  - 导出方法：
    - `exportPNG(scale)` — 返回 dataURL
    - `exportSVG(objectStore)` — 将对象序列化为 SVG（不含网格/选中框）
  - `resize(width, height)` — 调整画布尺寸
  - `setBackground(color)` / `setGradientBackground(gradient)`
  - **逐步绘制动画**（新增）：
    - `async animateActions(actions, options)` — 逐个添加对象并渲染，模拟逐步绘制
      - `options.stepDelay: number` — 每步间隔（默认 60ms）
      - `options.onProgress(current, total)` — 进度回调（用于 ChatPanel 显示进度）
      - `options.onComplete()` — 全部绘制完成回调
      - 按绘制顺序逐个 `ObjectStore.addObject()` → `render()`
      - 每 1-2 个对象触发一次重绘（避免单个像素级别闪烁）
      - 返回 `Promise<void>` — resolve 时表示动画完成
    - `async animateTemplateParts(parts, options)` — 专门用于模板的逐步绘制
      - 按 `drawingOrder` 排序的 parts 逐步渲染
      - 先底层（尾巴/身体）后顶层（五官/装饰）
      - 视觉效果：像一笔笔在画

### 1.3 `js/core/HistoryManager.js` — 历史管理

**职责**：撤销/重做/时间线快照。

- `HistoryManager` 类：
  - `undoStack: Snapshot[]` — 撤销栈
  - `redoStack: Snapshot[]` — 重做栈
  - `maxLength: 50` — 最大历史数
  - `pushSnapshot(state)` — 在每次操作后推入当前 ObjectStore 状态
  - `undo()` → 返回上一个快照
  - `redo()` → 返回下一个快照
  - `canUndo()` / `canRedo()`
  - `getTimeline()` → 返回完整时间线用于 UI 展示
  - `clear()` — 清空历史

### 1.4 `js/ui/CanvasArea.js` — 画布区域 UI

**职责**：管理画布 DOM 元素、响应尺寸变化、键盘快捷键（撤销等）。

- 创建 `<canvas>` 元素
- 初始化 DrawEngine 和 ObjectStore 实例
- `ResizeObserver` 监听容器尺寸变化 → 调用 `DrawEngine.resize()`
- 绑定 `Ctrl+Z` / `Ctrl+Shift+Z` 快捷键到 HistoryManager
- `getCanvasDataURL()` — 返回缩略图数据
- 状态栏信息更新回调

### 1.5 `js/ui/StatusBar.js` — 底部状态栏

**职责**：显示画布当前状态信息。

- 显示内容：当前图层名、对象总数、选中对象名、可撤销步数
- 监听 ObjectStore 和 HistoryManager 事件更新显示

### 验收标准

- [ ] 可以用 JS 代码创建对象并渲染到画布上
- [ ] 所有基础图形（circle, rect, ellipse, triangle, line, polygon, arc, text, arrow）可绘制
- [ ] 所有高级图形（star, heart, flower, gear, spiral, wave, bezier, fractal 等）可绘制
- [ ] 图层增删切换正常
- [ ] 选中对象显示虚线边框 + 控制点
- [ ] 撤销/重做功能正常
- [ ] 画布缩放/平移正常
- [ ] 复合对象（children）递归渲染正常

---

## Phase 2 — Q版风格层 + 模板系统 🎨

**目标**：在 DrawEngine 之上构建Q版风格渲染能力，实现模板库加载/匹配/保存，让"画一只小猫"能输出精致的Q版小猫图形。

### 2.1 `js/core/TemplateLib.js` — 模板库管理

**职责**：管理所有Q版模板的加载、查询、实例化和保存。

- `TemplateLib` 类：
  - `templates: Map<id, Template>` — 所有已加载模板
  - `async init()` — 启动时加载所有模板
    - 加载 `templates/animals/` 下的 12 个内置动物模板
    - 加载 `templates/vehicles/` 下的 6 个内置交通工具模板
    - 加载用户保存的自定义模板（从 StorageAdapter）
  - **模板匹配**：
    - `search(keyword, options)` — 根据关键词匹配模板
      - 支持中文名匹配（"小猫" → "cat"）
      - 支持别名匹配（"kitty"、"猫咪" → "cat"）
      - 支持模糊匹配（"狗狗" → "dog"）
      - 返回 `{ matched: boolean, template: Template | null, confidence: number }`
    - `matchCategory(keyword)` — 判断关键词属于哪个类别
  - **模板实例化**：
    - `instantiate(templateId, options)` — 将模板转为可执行的 DrawingObject 数组
      - `options.size: { width, height }` — 目标尺寸（默认模板的 baseSize）
      - `options.position: { x, y }` — 放置位置（默认画布中心）
      - `options.colorOverrides: { [slotName]: color }` — 颜色覆盖（如 "画一只黑猫"）
      - `options.variant: string` — 姿态变体（"sit"/"stand"/"run"）
      - 内部调用 `relToAbs()` 将相对坐标转为绝对坐标
      - 返回 `DrawingObject[]`（30-50 个对象）
  - **模板保存（学习机制）**：
    - `saveAsTemplate(name, objects, boundingBox)` — 将 LLM 生成的图形组合保存为模板
      - 计算包围盒
      - 将绝对坐标转为相对坐标（`absToRel()`）
      - 自动识别 colorSlots（检测哪些颜色可以参数化）
      - 保存到 StorageAdapter（自定义模板）
    - `deleteTemplate(id)` — 删除自定义模板
    - `exportTemplate(id)` / `importTemplate(json)` — 导入导出
  - `listTemplates(category?)` — 列出模板（按类别筛选）
  - `getTemplateNames()` — 返回所有模板名称列表（用于 System Prompt 注入）

### 2.2 Q版风格渲染方法（扩展 DrawEngine）

在 DrawEngine 中新增Q版专用渲染方法：

- **`_applyQBStyle(ctx, obj)`** — 应用Q版风格默认值
  - 缺少 strokeColor → 使用 `QB_STYLE.STROKE_COLOR`（`#1e1e1e`）
  - 缺少 strokeWidth → 使用 `QB_STYLE.STROKE_WIDTH`（2.5px）
  - 设置 `lineCap = 'round'`, `lineJoin = 'round'`
  - 自动为 ellipse/circle 类型的"眼睛"对象添加高光
- **`_drawQBHighlight(ctx, eyeObj)`** — 绘制眼睛高光
  - 根据眼睛位置和大小，在左上方绘制白色圆点高光
  - 可选第二层小高光（opacity 0.5）
- **`_drawQBBlush(ctx, x, y, radiusX, radiusY)`** — 绘制腮红
  - 粉色半透明椭圆（`#fca5a5`, opacity 0.35-0.5）
- **`_drawQBNose(ctx, x, y, type)`** — 绘制Q版鼻子
  - `triangle` 类型：小三角形（常见于猫）
  - `dot` 类型：小圆点（常见于兔）
  - `oval` 类型：小椭圆（常见于狗）
- **`renderQBFigure(parts, options)`** — 一次性渲染完整Q版形象
  - 接收 TemplatePart 数组
  - 按绘制顺序（先底层如尾巴/身体，后顶层如五官）排序
  - 自动应用风格默认值
  - 返回根 DrawingObject（type: "composite"，包含 children）

### 2.3 制作 18 个种子模板

每个模板是一个独立的 JSON 文件，包含 30-50 个 TemplatePart。

**动物模板（12 个）**：

| 文件名 | 名称 | 别名 | 特征 |
|--------|------|------|------|
| cat.json | 小猫 | 猫咪、kitty | 尖耳、胡须、长尾巴 |
| dog.json | 小狗 | 狗狗、puppy | 垂耳、舌头、短尾 |
| rabbit.json | 兔子 | 小兔、bunny | 长耳、短尾、大门牙 |
| panda.json | 熊猫 | 国宝 | 黑眼圈、黑白配色 |
| bird.json | 小鸟 | 鸟儿 | 翅膀、尖嘴、羽毛 |
| fish.json | 鱼 | 小鱼 | 鳍、尾巴、鳞片纹 |
| bear.json | 小熊 | 熊 | 圆耳、大肚 |
| mouse.json | 老鼠 | 小鼠 | 大圆耳、细尾巴 |
| tiger.json | 老虎 | 虎 | 条纹、王字额 |
| lion.json | 狮子 | 老狮 | 鬃毛、大鼻 |
| fox.json | 狐狸 | 小狐 | 尖脸、大尾巴 |
| penguin.json | 企鹅 | 小企鹅 | 黑白配色、短翅 |

**交通工具模板（6 个）**：

| 文件名 | 名称 | 别名 | 特征 |
|--------|------|------|------|
| car.json | 汽车 | 小汽车 | 车轮、车窗、车灯 |
| plane.json | 飞机 | 小飞机 | 机翼、螺旋桨、窗户 |
| rocket.json | 火箭 | 小火箭 | 尾焰、舷窗、尖头 |
| ship.json | 船 | 小船 | 帆、船身、波浪 |
| train.json | 火车 | 小火车 | 烟囱、车轮、车厢 |
| bicycle.json | 自行车 | 单车 | 车轮、车把、车座 |

每个模板需包含：
- `colorSlots`：至少定义主色调位（如动物的"毛色"）
- `variants`：至少提供一个默认姿态
- `aliases`：中英文别名数组
- `drawingOrder`：绘制顺序（先底层后顶层）

### 2.4 DrawingObject 新增 `templateRef` 字段

- ObjectStore 中 DrawingObject 新增 `templateRef: string | null`
- 值为模板 ID（如 `"cat"`）或 `null`（非模板生成的对象）
- 用于二次创作时快速定位模板相关对象
- LLM 上下文中附带 templateRef 信息，便于"给猫加个帽子"等操作

### 验收标准

- [ ] 18 个种子模板全部加载成功
- [ ] `TemplateLib.search("小猫")` 能匹配到 cat 模板
- [ ] `TemplateLib.instantiate("cat")` 能生成 30-50 个 DrawingObject
- [ ] 生成的Q版图形在画布上渲染效果精致（描边统一、有高光和腮红）
- [ ] 颜色覆盖有效（`instantiate("cat", {colorOverrides: {fur: "#333"}})` 生成黑猫）
- [ ] 模板保存功能正常（saveAsTemplate → 下次 search 可匹配）
- [ ] 无模板匹配时返回 `null`，不报错

---

## Phase 3 — LLM 通信桥 + 上下文系统

**目标**：实现与 LLM API 的通信、上下文构建、System Prompt（含Q版绘制规范）、返回结果校验和自动修正循环。

### 3.1 `js/core/ConfigManager.js` — 配置管理

**职责**：管理所有用户配置，包括 LLM 和语音设置。

- `ConfigManager` 类：
  - 加载/保存到 localStorage（key: `vdt_settings`）
  - LLM 配置（§九.1）：
    - `apiUrl`, `apiKey`, `model`, `maxTokens`, `temperature`
  - 预设模板（§九.2）：
    - `applyPreset(presetName)` — 快速切换预设
  - 语音配置（§九.3）：
    - `voiceLanguage`, `listenMode`, `silenceTimeout`, `speechLevel`, `speechRate`
  - 画布配置（§九.4）：
    - `defaultWidth`, `defaultHeight`, `defaultBackground`, `autoSaveInterval`, `maxHistory`
  - `getAll()` / `set(key, value)` / `reset()`
  - `isLLMConfigured()` — 检查是否已配置 API

### 3.2 `js/prompts/system-prompt.js` — System Prompt

**职责**：构建发送给 LLM 的 System Prompt。

- `buildSystemPrompt(context, templateLib)` 函数：
  - 角色定义："你是一个Q版风格语音绘图助手"
  - **Q版绘制规范**（新增核心段落）：
    - 头身比 1:1 或 1:0.8
    - 描边统一 2.5-3px，颜色 `#1e1e1e`
    - 眼睛必须有高光（白色圆点）
    - 必须有腮红（粉色半透明椭圆）
    - 配色使用柔和色系（提供色板参考）
    - 每个具象图形 30-50 个基础图形
    - 绘制顺序：先底层（尾巴/身体）后顶层（五官/装饰）
  - **模板匹配指令**（新增）：
    - 注入当前可用模板列表（`templateLib.getTemplateNames()`）
    - 指示 LLM：如果用户请求匹配到模板，输出 `{ "op": "useTemplate", "templateId": "cat", "options": {...} }`
    - 如果无匹配模板，使用 `batch` 操作直接生成
  - **模板保存指令**：
    - 当用户说"记住这个样子"时，输出 `saveTemplate` 操作
  - 能力清单：参照 §四 中所有指令类型
  - 操作类型说明：add / update / delete / move / addChild / batch / useTemplate / saveTemplate / clarify / reply
  - 输出格式要求：JSON 对象，包含 `reply` 和 `actions` 数组
  - 上下文注入：当前画布状态（图形列表 + 选中对象 + 图层信息 + templateRef）
  - 歧义处理规则：§四.15 — 有歧义时追问
  - 容错规则：参数缺失时使用Q版默认值
  - 二次创作规则：§四.13 — 在已有内容上追加/修改，参考 templateRef 定位
  - 安全规则：不执行危险操作，大量操作需确认
  - **Few-shot 示例**（新增）：
    - "画一只小猫" → useTemplate 示例
    - "画一只喷火龙" → batch 生成示例（展示Q版拆解方式）
    - "给猫加个帽子" → addChild 示例
- `buildContextPayload(objectStore, historyManager, recentMessages)` 函数：
  - 构造 §六.1 的完整上下文对象
  - 包含 templateRef 信息
  - 应用 §六.3 的上下文压缩策略
  - 返回可直接插入 messages 数组的上下文消息

### 3.3 `js/core/LLMBridge.js` — LLM 通信桥

**职责**：封装与 LLM API 的所有通信。

- `LLMBridge` 类：
  - 构造函数接收 `configManager: ConfigManager`
  - **`async sendStream(messages, callbacks)`** — 流式发送消息到 LLM API（新增核心方法）
    - 从 ConfigManager 读取 API 地址和 Key
    - 使用 Fetch API 调用 OpenAI 兼容的 `/chat/completions` 端点
    - **`stream: true`** — 开启流式输出
    - 设置 `response_format: { type: "json_object" }` 要求 JSON 输出
    - 超时保护（30 秒）
    - **流式回调**：
      - `callbacks.onToken(token)` — 每收到一个 token 片段立即回调（ChatPanel 逐字显示）
      - `callbacks.onComplete(fullText)` — 流式接收完成，返回完整 JSON 文本
      - `callbacks.onError(error)` — 流式传输错误
    - 内部实现：解析 SSE `data:` 行，提取 `choices[0].delta.content`
    - 流式接收完成后解析完整 JSON 为 `{ reply, actions }`
    - 错误处理：网络错误、API 错误、JSON 解析错误
  - `async send(messages)` — 非流式发送（备用，用于简单操作如测试连接）
  - `async sendStreamWithRetry(messages, maxRetry, callbacks)` — 带自动修正的流式发送
    1. 流式发送消息 → 实时显示 reply
    2. 流式完成后校验 actions
    3. 失败 → 将错误信息追加到 messages → 重试（最多 3 次）
    4. 返回 `{ actions, reply, success, retryCount }`
  - `buildMessages(systemPrompt, context, userMessage, alternatives)` — 构建完整 messages 数组

### 3.4 `js/utils/validators.js` — 操作校验

**职责**：校验 LLM 返回的每个操作是否合法。

- `validateAction(action, objectStore)` 函数：
  - Schema 校验：`op` 字段必填且合法
  - `add` 操作：`object` 必填，type 合法，必要参数齐全
  - `update` 操作：`objectId` 必须存在，`changes` 非空
  - `delete` 操作：`objectId` 必须存在
  - `move` 操作：`objectId` 必须存在，x/y 为数字
  - `addChild` 操作：`parentId` 必须存在
  - `batch` 操作：`actions` 数组非空，递归校验每个子操作
  - **`useTemplate` 操作**（新增）：`templateId` 必须存在于模板库中
  - **`saveTemplate` 操作**（新增）：`name` 非空，`parts` 数组非空
  - 数值范围校验：坐标不超出画布范围过多、尺寸 > 0、透明度 0-1
  - 对象数量限制：单次 batch 不超过 50 个子对象
  - **Q版风格校验**（新增）：检查 batch 生成的具象图形是否有高光、描边等Q版要素
- `validateActions(actions, objectStore)` — 校验操作数组
- `sanitizeAction(action, styleContext)` — 清洗操作，补全Q版默认值
  - 缺少描边 → 默认 `#1e1e1e`, 2.5px
  - 缺少位置 → 画布中心
  - 缺少名称 → 根据 type 自动命名
  - **Q版自动补全**：如果 batch 中有"眼睛"但没有高光对象，自动追加高光

### 3.5 `js/core/ConversationManager.js` — 对话管理器（状态中枢）

**职责**：协调所有核心模块，作为系统的状态中枢。

- `ConversationManager` 类：
  - 持有所有子模块引用：objectStore, drawEngine, voiceEngine, llmBridge, historyManager, configManager, chatPanel, storageAdapter, **templateLib**
  - `async processUserInput(text, alternatives)` — 处理用户输入（语音/文字）
    1. **先尝试模板匹配**：`templateLib.search(text)`
    2. 匹配成功 → 构建上下文时注入匹配信息
    3. 构建上下文（§六.1）
    4. **流式调用 LLMBridge.sendStream()**
       - `onToken` → ChatPanel 逐字显示 LLM 回复（流式体验）
    5. 流式完成 → 校验返回的完整 actions
    6. **处理 `useTemplate` 操作**：调用 `templateLib.instantiate()` 获取对象数组
    7. **逐步绘制动画**：`DrawEngine.animateActions(actions)`
       - 画布上逐个添加对象，每步 50-100ms
       - `onProgress(current, total)` → ChatPanel 更新进度（"正在绘制第 5/35 个图形..."）
       - 绘制期间 **不显示** 最终结果消息
    8. **绘制完成** → ChatPanel 显示最终结果（"✅ 小猫画好了！"）
    9. 更新 HistoryManager
    10. 语音播报最终回复
    11. 自动保存
  - `executeAction(action)` — 执行单个操作
    - 根据 `op` 类型分发：
      - `add/update/delete/move/addChild/batch` → 调用 ObjectStore 方法
      - **`useTemplate`** → 调用 templateLib.instantiate() → animateTemplateParts()
      - **`saveTemplate`** → 调用 templateLib.saveAsTemplate()
    - 返回 `{ success, error }`
  - `executeActions(actions)` — 批量执行
  - `confirmDangerousAction(action)` — 危险操作二次确认

### 验收标准

- [ ] 可以用文字输入测试 LLM 通信
- [ ] **LLM 回复以流式方式接收**（sendStream 正常工作）
- [ ] LLM 返回的操作能被正确校验
- [ ] 非法操作能触发自动修正重试
- [ ] "画一只小猫" → LLM 输出 `useTemplate` → 逐步绘制出精致Q版小猫
- [ ] "画一只喷火龙" → 模板无匹配 → LLM 输出 batch → 逐步绘制出Q版喷火龙
- [ ] "记住这个样子" → LLM 输出 saveTemplate → 模板保存成功
- [ ] "画一只黑猫" → useTemplate + colorOverrides → 逐步绘制出黑色Q版小猫
- [ ] 基础指令（画圆、画矩形、改颜色等）能通过 LLM 执行
- [ ] **逐步绘制动画流畅**（每步 50-100ms，视觉上像一笔笔在画）

---

## Phase 4 — 语音引擎

**目标**：实现语音识别和语音播报，用户可以通过语音完全驱动绘图。

### 4.1 `js/core/VoiceEngine.js` — 语音引擎

**职责**：封装 Web Speech API 的语音识别和语音播报。

- `VoiceEngine` 类：
  - **语音识别**（SpeechRecognition）：
    - `startListening()` / `stopListening()`
    - 支持两种模式：持续监听 / 按住说话
    - `interimResults = true`, `maxAlternatives = 3`
    - 语言设置、静音超时
    - 事件回调：
      - `onInterimResult(text)` — **实时中间结果**（"画一..."、"画一只小..."），ChatPanel 输入区实时更新
      - `onFinalResult(text, alternatives)` — 最终识别结果
      - `onError(error)` / `onStart()` / `onEnd()`
    - 兼容性检测：`isRecognitionSupported()`
  - **语音播报**（SpeechSynthesis）：
    - `speak(text)` / `stopSpeaking()`
    - 播报速度、播报级别控制
    - 自动中断：新语音输入时停止当前播报
  - **状态管理**：state, isSpeaking

### 4.2 `js/ui/ChatPanel.js` — 对话面板（语音 + 流式 + 动画集成）

**职责**：显示对话消息 + 语音输入控件 + 流式输出 + 绘制进度。

- **消息列表渲染**：
  - 用户消息：语音图标 + 最终识别文字
  - 助手消息（流式）：LLM 回复逐字显示，用打字机效果
  - 系统消息：状态提示
- **语音实时显示区域**（新增核心）：
  - 位于底部输入区上方
  - 语音识别中：显示波形动画 + 实时中间识别文字
  - 示例：`● 正在听... "画一只小猫..."` （文字随语音实时更新）
  - 识别完成后：文字确认 → 移入消息列表作为用户消息
- **LLM 流式输出显示**（新增核心）：
  - `appendStreamToken(token)` — 逐字追加 LLM 回复到当前助手消息
  - 打字机效果：每个 token 追加时轻微延迟（模拟打字）
  - 光标闪烁动画表示"正在生成"
- **绘制进度显示**（新增核心）：
  - `updateDrawProgress(current, total)` — 更新绘制进度
  - 显示："📐 正在绘制小猫...（第 5/35 个图形）"
  - 进度条或步骤计数器
  - **绘制期间不显示最终结果**（"✅ 小猫画好了！"）
- **绘制完成显示**：
  - `showDrawComplete(result)` — 绘制动画结束后显示最终消息
  - 消息内容：结果 + 图形数量 + 耗时
  - 此消息出现后才触发语音播报
- **底部输入区**：
  - 语音按钮：🎤 开/关切换
  - 文字输入框：作为备选输入方式
  - 发送按钮
- 模板使用提示（"使用了模板：小猫 🐱"）

### 验收标准

- [ ] 语音识别正常工作（Chrome/Edge）
- [ ] **语音识别中间结果实时显示**（"画一..." → "画一只..." → "画一只小猫"）
- [ ] 语音播报正常工作
- [ ] **LLM 回复逐字流式显示**（打字机效果）
- [ ] **绘图逐步呈现**（画布上一个一个图形出现，每步 50-100ms）
- [ ] **绘制进度实时更新**（"第 5/35 个图形"）
- [ ] **最终结果消息只在绘制完成后出现**
- [ ] "画一只小猫"语音指令 → 完整流程：语音实时显示 → LLM 流式 → 逐步绘制 → 完成消息
- [ ] 持续监听和按住说话两种模式都可用
- [ ] 文字输入作为备选正常工作

---

## Phase 5 — 对话管理 + 持久化

**目标**：实现多轮对话管理、对话切换、数据持久化存储（含模板持久化）。

### 5.1 `js/core/StorageAdapter.js` — 持久化存储

- localStorage + IndexedDB 自动降级
- **新增**：模板存储
  - `saveCustomTemplate(templateData)` — 保存用户自定义模板
  - `loadCustomTemplates()` — 加载所有自定义模板
  - `deleteCustomTemplate(id)` — 删除自定义模板
- 对话存储、自动保存、导出/导入（同原计划）

### 5.2 扩展 `ConversationManager.js` — 多轮对话

- conversations 管理、切换、删除、重命名
- **模板二次创作支持**：
  - 识别 "给它加个帽子" 等指令时，查找 templateRef 定位目标
  - LLM 根据 templateRef 了解目标图形结构

### 5.3 `js/ui/SidebarPanel.js` — 对话列表侧栏

- 对话列表、新建/删除/重命名/导出
- **新增**：模板管理入口（查看/删除自定义模板）

### 5.4 扩展 `ChatPanel.js` — 消息管理

- 消息状态展示、操作耗时
- **新增**：模板来源标识（显示图形是否来自模板）

### 验收标准

- [ ] 新建/切换/删除对话正常
- [ ] 自动保存正常（30 秒间隔）
- [ ] 刷新页面后对话和画布恢复
- [ ] 自定义模板持久化（刷新后仍在）
- [ ] 导出/导入 JSON 正常

---

## Phase 6 — UI 精细化 + 容错体系

**目标**：完善 UI 交互细节，实现完整的五层容错体系。

### 6.1 `js/ui/SettingsPanel.js` — 设置面板

- LLM 设置（API/Key/模型/预设/测试连接）
- 语音设置（语言/模式/超时/播报）
- 画布设置（尺寸/背景/保存间隔）
- **新增**：Q版风格设置
  - 默认描边粗细（2-4px）
  - 腮红开关
  - 高光开关
  - 默认色系选择

### 6.2 完善容错体系

- 第五层：用户反馈闭环（状态可视化、语音播报）
- 第四层：安全兜底（确认弹窗、快照、数量限制、超时）
- **新增Q版容错**：
  - LLM 生成的 batch 缺少高光 → 自动补全
  - LLM 生成的 batch 缺少腮红 → 自动补全
  - batch 子对象数 < 15 → 提示 LLM 补充细节

### 6.3 画布交互增强 + CSS 美化

- 画布背景/网格/缩放
- 暗色主题、动画、无障碍

### 验收标准

- [ ] 设置面板所有配置项可正常修改和保存
- [ ] Q版风格设置生效（描边/腮红/高光可独立控制）
- [ ] 危险操作确认弹窗正常
- [ ] LLM 缺少Q版要素时自动补全
- [ ] UI 美观且响应流畅

---

## Phase 7 — 导出 + 高级功能 + 测试

**目标**：实现导出功能、高级绘图特性、全面测试，达到交付标准。

### 7.1 导出功能

- PNG/JPG/SVG 导出（多分辨率）
- 画布快照导出

### 7.2 高级绘图功能

- 自由绘制模式
- 布尔运算（group/ungroup/交集/合并）
- 渐变填充 + 阴影效果

### 7.3 System Prompt 优化

- 根据测试结果迭代优化
- 添加更多Q版 Few-shot 示例
- 优化模板匹配精度
- 优化二次创作的 templateRef 定位

### 7.4 集成测试

- **语音识别测试**：中英文混合、口语化表达
- **LLM 指令理解测试**：每种指令类型至少 3 个用例
- **Q版专项测试**：
  - 18 个模板逐一验证渲染效果
  - 模板颜色覆盖（"画一只黑猫"/"画一只蓝猫"）
  - 模板无匹配时的 LLM 生成质量
  - 模板学习保存和复用
  - Q版要素自动补全
- **容错测试**：识别错误/非法操作/执行错误/修正循环/二次确认
- **持久化测试**：大量数据/刷新恢复/导出导入/自定义模板持久化
- **浏览器兼容性**：Chrome、Edge（必须），Firefox（文字模式）、Safari
- **性能测试**：100+ 对象时的渲染性能

### 7.5 最终文档

- 更新设计文档实现状态跟踪表
- 用户使用指南（快速开始 + 常用指令 + 模板列表）

### 验收标准

- [ ] PNG/JPG/SVG 导出正常
- [ ] 自由绘制模式可用
- [ ] 18 个模板全部渲染正常
- [ ] LLM 生成非模板图形具备Q版风格
- [ ] 模板学习保存/复用正常
- [ ] 容错体系五层全部验证
- [ ] Chrome 和 Edge 上完整功能可用
- [ ] 大量对象（100+）时渲染流畅

---

## 依赖关系图

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6 ──→ Phase 7
  │            │            │            │            │            │            │
  │            │            │            │            │            │            └── 导出+测试
  │            │            │            │            │            └── 设置面板+容错
  │            │            │            │            └── 语音引擎
  │            │            │            └── LLM通信+校验(useTemplate/saveTemplate)
  │            │            └── Q版风格层+18个模板+TemplateLib
  │            └── 绘图引擎/对象模型
  └── 骨架/工具函数/Q版常量
```

## 估计工作量

| Phase | 文件数 | 预估代码行 | 说明 |
|-------|--------|-----------|------|
| Phase 0 | ~15 | ~1000 | 骨架搭建 + Q版常量/工具函数 |
| Phase 1 | ~4 | ~2000 | 绘图引擎（含基础/高级图形） |
| **Phase 2** | **~3 + 18 模板** | **~1500 + ~3000** | **Q版风格层 + TemplateLib + 18个模板 JSON** |
| Phase 3 | ~5 | ~2000 | LLM 通信 + System Prompt（含Q版规范） |
| Phase 4 | ~2 | ~800 | 语音 API 封装 |
| Phase 5 | ~3 | ~1000 | 持久化 + 多对话 + 模板持久化 |
| Phase 6 | ~3 | ~800 | UI 美化 + 容错 + Q版设置 |
| Phase 7 | ~3 | ~1000 | 导出 + 高级功能 + 测试 |
| **总计** | **~23 + 18 模板** | **~10100 + ~3000** | **纯 JavaScript + 模板 JSON** |

## 风险与缓解

| 风险 | 影响 | 缓解策略 |
|------|------|----------|
| Web Speech API 兼容性 | Firefox/Safari 不支持 | 提供文字输入备选方案 |
| LLM 输出不稳定 | 绘图操作解析失败 | 三层容错 + 重试机制 |
| **LLM 生成的Q版图形质量不稳定** | **非模板图形风格不统一** | **Q版 Few-shot 示例 + 要素自动补全** |
| **模板制作工作量大** | **18 个模板耗时长** | **先用 LLM 生成初版，人工微调** |
| 大量对象渲染性能 | 画布卡顿 | 脏矩形渲染、对象数量上限 |
| 上下文 Token 过长 | API 费用高/超限 | 上下文压缩策略（模板引用代替完整 parts） |
| 跨域 API 调用 | 某些 LLM 不支持浏览器直连 | 文档说明需开启 CORS 或使用代理 |
