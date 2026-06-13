# AI 语音绘图工具 — 设计文档 (Spec)

> 日期：2026-06-12
> 状态：设计完成，待实现

---

## 一、项目概述

开发一款**纯语音控制**的 Web 绘图工具。用户全程通过语音指令完成绘图创作，不可使用鼠标或键盘操作画布。工具接入可配置的大语言模型（LLM）作为"大脑"，负责理解自然语言指令、拆解复合指令、基于画布上下文进行二次创作，以及自动修正执行错误。

### 核心设计目标

| 目标 | 说明 |
|------|------|
| 纯语音驱动 | 画布操作完全由语音指令完成，提供文字输入作为备选 |
| 智能指令理解 | LLM 解析自然语言，支持口语化、中英混合、模糊表达 |
| 上下文感知 | LLM 能看到当前画布状态，支持在已有内容上二次创作 |
| 容错与自修正 | 语音识别容错 + LLM 输出校验 + 执行错误自动修正循环 |
| 完整绘图能力 | 基础图形、复杂几何、具象图形（猫/狗/房子等）、图层、变换 |
| 多轮对话 | 类似 ChatGPT 的对话界面，支持历史管理和项目切换 |

---

## 二、技术选型

| 维度 | 选择 | 理由 |
|------|------|------|
| 应用形式 | 单页 Web 应用 | 零安装，双击即用 |
| 语音识别 | Web Speech API | Chrome/Edge 原生支持，免费，中英文识别好 |
| 语音播报 | SpeechSynthesis API | 原生支持，无需额外依赖 |
| 绘图引擎 | HTML Canvas + 自定义对象模型 | 完全可控，支持图层/选择/变换 |
| LLM 通信 | Fetch API 直连 | 用户自行配置 API 地址和 Key |
| LLM 格式 | OpenAI 兼容格式 | 覆盖 GPT / GLM / DeepSeek / 通义 / Kimi 等 |
| 持久化 | localStorage + IndexedDB | 轻量存储，自动降级 |
| 构建 | 无构建工具 | 纯 ES Module，浏览器直接运行 |

---

## 三、系统架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        index.html                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    UI 层 (UI Layer)                       │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │  ChatPanel   │  │  CanvasArea  │  │  SettingsPanel  │  │   │
│  │  │  对话面板    │  │  画布区域     │  │  设置面板       │  │   │
│  │  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │   │
│  └─────────┼────────────────┼──────────────────┼───────────┘   │
│            │                │                  │                │
│  ┌─────────┼────────────────┼──────────────────┼───────────┐   │
│  │         │       核心引擎层 (Core Engine)     │           │   │
│  │         │                │                  │           │   │
│  │  ┌──────▼──────┐  ┌─────▼──────┐  ┌───────▼────────┐  │   │
│  │  │ VoiceEngine │  │ DrawEngine │  │  ConfigManager  │  │   │
│  │  │ 语音引擎    │  │ 绘图引擎   │  │  配置管理器     │  │   │
│  │  └──────┬──────┘  └─────┬──────┘  └───────┬────────┘  │   │
│  │         │               │                  │           │   │
│  │  ┌──────▼──────┐  ┌─────▼──────┐  ┌───────▼────────┐  │   │
│  │  │ LLMBridge   │  │ ObjectStore│  │  HistoryManager │  │   │
│  │  │ LLM 通信桥  │  │ 对象存储   │  │  历史管理器     │  │   │
│  │  └──────┬──────┘  └─────┬──────┘  └───────┬────────┘  │   │
│  │         │               │                  │           │   │
│  │  ┌──────▼───────────────▼──────────────────▼────────┐  │   │
│  │  │              ConversationManager                  │  │   │
│  │  │              对话管理器（状态中枢）                │  │   │
│  │  └──────────────────────┬───────────────────────────┘  │   │
│  └─────────────────────────┼─────────────────────────────┘   │
│                            │                                   │
│  ┌─────────────────────────┼─────────────────────────────┐   │
│  │                存储层 (Storage Layer)                   │   │
│  │         ┌───────────────▼───────────────┐              │   │
│  │         │  StorageAdapter               │              │   │
│  │         │  localStorage / IndexedDB     │              │   │
│  │         └───────────────────────────────┘              │   │
│  └────────────────────────────────────────────────────────┘   │
│                            │                                   │
└────────────────────────────┼───────────────────────────────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │   LLM API       │
                    │ (OpenAI 格式)   │
                    └─────────────────┘
```

### 3.2 数据流：一次完整的语音操作（流式体验）

```
1. 用户说话
      ↓
2. VoiceEngine 识别 → 实时显示中间识别结果（ChatPanel 波形区域）
   ┌─────────────────────────────────────────┐
   │ ● 正在听... "画一只..."（文字实时更新）  │
   └─────────────────────────────────────────┘
      ↓
3. 识别完成 → ChatPanel 显示最终用户消息
      ↓
4. ConversationManager.buildContext()
   ├─ ObjectStore.getCurrentState()
   ├─ HistoryManager.getRecentActions()
   └─ ChatPanel.getRecentMessages()
      ↓
5. LLMBridge.sendStream(context, transcript) — 流式请求
      ↓
6. ChatPanel 实时显示 LLM 回复文字（逐字流式输出）
   ┌─────────────────────────────────────────┐
   │ 🤖 好的，我来画一只可爱的小猫...         │
   │    （文字逐字出现）                       │
   └─────────────────────────────────────────┘
      ↓
7. 流式接收 LLM 返回的完整 actions → 前端校验
      ↓
8a. 通过 → DrawEngine.animateActions(actions) — 逐步绘制动画
   ┌─────────────────────────────────────────┐
   │ 画布上：先画身体 → 再画头 → 再画耳朵 →  │
   │ 再画眼睛 → 再画高光 → ... 逐步呈现      │
   │ 每步间隔 50-100ms，视觉上像一笔笔在画    │
   └─────────────────────────────────────────┘
8b. 失败 → LLMBridge.retryWithFeedback(error) → 回到 7（最多 3 次）
      ↓
9. 绘制完成 → ChatPanel 显示最终结果消息
   ┌─────────────────────────────────────────┐
   │ 🤖 好的，我来画一只可爱的小猫...         │
   │ ✅ 小猫画好了！用了 35 个图形            │
   └─────────────────────────────────────────┘
      ↓
10. HistoryManager.pushSnapshot()
      ↓
11. VoiceEngine.speak(reply) 语音播报
      ↓
12. StorageAdapter.save() 自动保存
      ↓
13. 等待下一条语音输入
```

**三个核心体验要求**：

| 体验要求 | 实现方式 |
|----------|----------|
| 语音识别实时显示 | VoiceEngine 的 interimResults 实时更新到 ChatPanel 输入区 |
| LLM 流式输出 | LLMBridge 使用 `stream: true`，ChatPanel 逐字渲染回复 |
| 绘图逐步呈现 | DrawEngine.animateActions() 逐个添加对象并重绘，每步 50-100ms |

---

## 四、指令能力清单

### 4.1 画布管理

| 指令示例 | 动作 |
|----------|------|
| "新建画布" / "清空画布" | 清空所有对象，重置画布 |
| "画布大小 1200×800" | 调整画布尺寸 |
| "背景色设为蓝色" / "白色背景" | 设置画布背景色 |
| "背景设为渐变，从蓝到白" | 渐变背景 |
| "保存" / "导出图片" | 导出 PNG/JPG |
| "导出 SVG" | 导出矢量格式 |
| "导出高清" / "导出 2 倍" | 高分辨率导出 |

### 4.2 基础图形绘制

| 指令示例 | 动作 |
|----------|------|
| "画一个圆" / "画一个圆，半径 50" | draw_circle |
| "画一个红色的圆" | 带颜色参数 |
| "画一个矩形，宽 200 高 100" | draw_rect |
| "画一条线从左到右" | draw_line |
| "画一个三角形" | draw_triangle |
| "画一个正六边形" | draw_polygon(sides=6) |
| "画一个正方形" | draw_rect(square) |
| "画一段弧线" | draw_arc |
| "画一个椭圆" | draw_ellipse |

### 4.3 复杂几何图形

| 指令示例 | 动作 |
|----------|------|
| "画一条贝塞尔曲线" | draw_bezier |
| "画一个螺旋" / "画三圈螺旋线" | draw_spiral |
| "画一条波浪线" | draw_wave |
| "画一条正弦曲线" | draw_sine |
| "画一个五角星" | draw_star |
| "画一颗心" / "画一个心形" | draw_heart |
| "画一朵花，五片花瓣" | draw_flower |
| "画一个齿轮，八个齿" | draw_gear |
| "画一个分形雪花" / "科赫雪花" | draw_fractal |

### 4.4 具象图形（LLM 生成式）

通过 LLM 将"画一只小猫"拆解为多个基础图形的组合，无预设模板限制。

| 指令示例 | 说明 |
|----------|------|
| "画一只小猫" | LLM 组合基础图形生成 |
| "画一只正在跑的小狗" | 带姿态描述 |
| "画一棵大树" | composite |
| "画一辆汽车" | composite |
| "画一栋房子" | composite |
| "画一个女孩在跳舞" | composite |
| 任何具象图形 | LLM 自由组合 |

### 4.5 文本

| 指令示例 | 动作 |
|----------|------|
| "写上'生日快乐'" | draw_text |
| "标题写 Hello World" | draw_text(fontSize=大) |
| "字体改成楷体" | update text font |
| "字号放大到 36" | update fontSize |
| "文字加粗" / "斜体" | update fontWeight/style |

### 4.6 属性与样式

| 指令示例 | 动作 |
|----------|------|
| "颜色设为红色" / "改成蓝色" | update strokeColor/fillColor |
| "填充蓝色" / "只描边不填充" | update fill |
| "线条粗细 5" / "线宽 3 像素" | update strokeWidth |
| "透明度 50%" / "半透明" | update opacity |
| "渐变填充，从红到黄" | update gradient |
| "加个阴影" / "阴影模糊 10" | update shadow |
| "圆角 20" | update cornerRadius |

### 4.7 变换操作

| 指令示例 | 动作 |
|----------|------|
| "把它移到左边" / "向右移 100 像素" | move |
| "放大" / "放大两倍" / "缩小一点" | scale |
| "旋转 45 度" / "顺时针转 90 度" | rotate |
| "水平翻转" / "垂直翻转" | flip |
| "居中" / "移到画布中心" | center |

### 4.8 选择与定位

| 指令示例 | 动作 |
|----------|------|
| "选中那个圆" / "选择猫" | select (by name/type/位置) |
| "选中最后一个" / "选中第一个" | select (by order) |
| "全部选中" | selectAll |
| "取消选择" | deselect |
| "放在左边" / "放在右上角" | 定位到预设区域 |

### 4.9 图层操作

| 指令示例 | 动作 |
|----------|------|
| "新建图层" / "添加图层" | addLayer |
| "切换到图层 2" / "去背景层" | switchLayer |
| "图层 1 往上移" / "调整图层顺序" | reorderLayer |
| "显示/隐藏图层 1" | toggleLayer |
| "合并图层" | mergeLayers |
| "删除当前图层" | deleteLayer |
| "图层透明度 50%" | update layer opacity |

### 4.10 编辑操作

| 指令示例 | 动作 |
|----------|------|
| "撤销" / "撤销三步" | undo |
| "重做" | redo |
| "删除" / "删掉这个" | delete |
| "复制" / "复制一个" | duplicate |
| "粘贴" | paste |
| "剪切" | cut |

### 4.11 组合与布尔运算

| 指令示例 | 动作 |
|----------|------|
| "把这两个组合" / "编组" | group |
| "取消组合" / "打散" | ungroup |
| "取交集" | boolean intersect |
| "合并形状" | boolean union |
| "减去重叠部分" | boolean subtract |

### 4.12 自由绘制模式

| 指令示例 | 动作 |
|----------|------|
| "开始画" / "进入画笔模式" | 开始记录路径 |
| "向右画 100 像素" | 路径延伸 |
| "向左上画一条曲线" | 贝塞尔延伸 |
| "画一个圆弧连到起点" | 闭合路径 |
| "结束画" / "完成" | 结束路径，生成 path 对象 |
| "画笔粗细 5" | 更新画笔参数 |
| "画笔颜色红色" | 更新画笔颜色 |

### 4.13 二次创作指令

| 指令示例 | 动作 |
|----------|------|
| "给它加个帽子" | addChild（LLM 在选中对象上追加） |
| "把猫变成蓝色的" | update（LLM 定位并修改） |
| "在旁边画一碗猫粮" | add（LLM 根据上下文定位） |
| "让它看起来更开心" | LLM 重绘（调整细节） |
| "换一个风格，水彩风" | LLM 批量修改样式 |
| "复制一只猫在右边" | duplicate + move |

### 4.14 辅助指令

| 指令示例 | 动作 |
|----------|------|
| "放大画布" / "缩小画布" | zoom in/out |
| "往上移一点" | pan 画布 |
| "显示网格" / "隐藏网格" | toggle grid |
| "对齐到网格" | snap to grid |
| "你能做什么" | 播报帮助信息 |
| "重新听一下" | 重复上一条语音播报 |

### 4.15 指令歧义处理

当指令有歧义时，LLM 主动追问：

```json
{
  "reply": "你想画一个大的什么图形？圆形、矩形还是其他？",
  "action": "clarify",
  "options": ["圆形", "矩形", "三角形", "星形"]
}
```

---

## 五、Canvas 绘图引擎

### 5.1 对象模型

每个图形都是 `DrawingObject`，存入图层内的 `objects` 数组。

```javascript
DrawingObject {
  id: string                // 唯一标识（如 "obj_001"）
  type: string              // 图形类型
  name: string              // 可读名称（如 "小猫"）
  x, y: number             // 位置
  params: {}                // 类型特有参数
  strokeColor: string       // 描边颜色
  fillColor: string         // 填充颜色
  fill: boolean             // 是否填充
  strokeWidth: number       // 线宽
  opacity: number           // 透明度 0-1
  rotation: number          // 旋转角度（度）
  scaleX, scaleY: number    // 缩放
  visible: boolean          // 是否可见
  locked: boolean           // 是否锁定
  layer: number             // 所属图层 ID
  children: DrawingObject[] // 复合对象的子对象
  path: Point[]             // 曲线/自由路径点序列
  gradient: {               // 渐变填充
    type: "linear" | "radial"
    colors: string[]
    direction: string
  }
  shadow: {                 // 阴影
    color: string
    blur: number
    offsetX: number
    offsetY: number
  }
}
```

### 5.2 图层系统

```javascript
Layer {
  id: number
  name: string
  visible: boolean
  opacity: number
  locked: boolean
  objects: DrawingObject[]
}
```

### 5.3 支持的图形类型

**基础几何：** circle, rect, ellipse, triangle, line, polygon, arc, text, arrow

**曲线与高级几何：** bezier, spiral, wave, sine, ellipse

**复合/装饰图形：** star, heart, flower, gear, cloud, tree, fractal, crown, diamond

**具象图形（LLM 生成）：** 任意 — LLM 通过组合基础图形 + SVG path 数据生成

### 5.4 Q版风格渲染系统

#### 5.4.1 风格定位

所有具象图形（动物、人物、物品等）统一使用 **精致Q版风格** 渲染：

| 特征 | 规范 |
|------|------|
| 头身比 | 1:1 或 1:0.8（大头小身体） |
| 描边 | 统一 2.5-3px，颜色 `#1e1e1e`，`round` lineCap/lineJoin |
| 眼睛 | 必须有高光（白色圆点，2-4px） |
| 腮红 | 粉色半透明椭圆（`#fca5a5`，opacity 0.35-0.5） |
| 内色层 | 耳朵/鼻子/肚皮等部位有内色填充 |
| 配色 | 柔和Q版色系，饱和度适中，避免过于鲜艳 |
| 图形数 | 每个具象图形 30-50 个基础图形组成 |

#### 5.4.2 渲染机制

- 每次 objects 变化 → 清空 Canvas → 按图层顺序重绘所有对象
- 被选中的对象显示虚线边框 + 控制点
- 绘图操作只修改 objects 数组，不直接操作 Canvas
- DrawEngine 内置 `StyleLayer` 方法统一渲染Q版风格细节（描边、高光、腮红等）

#### 5.4.3 混合模板系统

采用**模板优先 + LLM 兜底**的混合策略：

**模板库**（预置种子模板）：

| 类别 | 模板列表 | 数量 |
|------|----------|------|
| 常见动物 | 猫、狗、兔子、熊猫、小鸟、鱼、熊、老鼠、老虎、狮子、狐狸、企鹅 | 12 |
| 交通工具 | 汽车、飞机、火箭、船、火车、自行车 | 6 |
| **合计** | | **18** |

**模板数据结构**：

```javascript
Template {
  id: string                    // 如 "cat"
  name: string                  // 如 "小猫"
  category: string              // "animals" | "vehicles"
  baseSize: { width, height }   // 基准尺寸（如 200×200）
  parts: TemplatePart[]         // 30-50 个图形部件
  colorSlots: {                 // 可变颜色位
    [slotName]: {               // 如 "fur"（毛色）
      default: string           // 默认颜色
      field: string             // 对应 DrawingObject 的哪个字段
    }
  }
  variants: {                   // 可选姿态变体
    sit?: TemplatePart[]        // 坐姿
    stand?: TemplatePart[]      // 站姿
    run?: TemplatePart[]        // 跑姿
  }
}

TemplatePart extends DrawingObject {
  // 所有坐标使用相对值（0-1 范围）
  // 运行时: 实际坐标 = relX * actualWidth
  relX: number
  relY: number
  // params 中的尺寸参数也用相对值
}
```

**模板匹配流程**：

```
1. 用户说"画一只小猫"
2. ConversationManager → TemplateLib.search("小猫")
3. 匹配到模板 "cat" → 加载模板 → 根据参数调整颜色/姿态
4. 将模板 parts 转换为 DrawingObject（相对坐标 → 绝对坐标）
5. 执行 batch add 操作
```

**LLM 兜底流程**（模板无匹配时）：

```
1. 用户说"画一只喷火龙"
2. ConversationManager → TemplateLib.search("喷火龙") → 无匹配
3. 进入 LLM 实时生成模式
4. System Prompt 注入Q版绘制规范
5. LLM 输出 batch 操作（30-50 个子对象）
6. 校验 + 执行
```

**模板学习机制**：

- LLM 成功生成的图形组合可保存为新模板
- 触发方式：用户说"记住这个样子" → LLM 输出 `saveTemplate` 操作
- 保存内容：模板名称、parts（绝对坐标转相对坐标）、colorSlots
- 下次遇到类似请求优先匹配已保存的模板
- 用户可管理模板库（查看/删除/导出）

---

## 六、上下文感知系统

### 6.1 发送给 LLM 的完整上下文

```javascript
{
  canvas: { width, height, background },
  currentLayer: number,
  selectedObjectId: string,
  layers: [ { id, name, visible, opacity, objects: [...] } ],
  history: [ { action, name, success } ],      // 最近操作
  conversation: [ { role, content } ]           // 最近 20 轮对话
}
```

### 6.2 四层上下文

| 层级 | 内容 | 作用 |
|------|------|------|
| 画布状态 | 所有图层、对象、属性 | LLM 知道画布上有什么 |
| 选中状态 | 当前选中的对象 ID | LLM 知道"这个"、"它"指什么 |
| 对话历史 | 最近 20 轮对话 | LLM 理解上下文语境 |
| 操作历史 | 最近执行的动作记录 | LLM 知道什么操作成功/失败了 |

### 6.3 上下文压缩策略

- 对象精简：只发送必要属性，省略默认值
- 对话窗口：保留最近 20 轮
- 隐藏图层折叠：只发送对象计数
- 远端小对象省略

### 6.4 LLM 返回的操作类型

```javascript
{ "op": "add", "object": {...} }                     // 新增对象
{ "op": "update", "objectId": "id", "changes": {} }  // 修改对象
{ "op": "delete", "objectId": "id" }                  // 删除对象
{ "op": "move", "objectId": "id", "x": n, "y": n }   // 移动对象
{ "op": "addChild", "parentId": "id", "object": {} }  // 追加子元素
{ "op": "batch", "actions": [...] }                    // 批量操作
{ "op": "saveTemplate", "name": "...", "parts": [...] } // 保存为模板（学习机制）
```

---

## 七、多轮对话系统

### 7.1 数据模型

```javascript
Conversation {
  id: string
  title: string                     // 自动从首条消息生成
  createdAt: timestamp
  updatedAt: timestamp
  messages: Message[]
  canvasState: { ... }              // 画布快照
  thumbnail: string                 // 缩略图（列表展示用）
}

Message {
  id: string
  role: "user" | "assistant" | "system"
  transcript: string                // 语音识别原文
  reply: string                     // 助手回复文字
  actions: Action[]                 // 执行的绘图动作
  status: "pending" | "executing" | "success" | "error" | "retrying"
  errorInfo: string
  timestamp: timestamp
}
```

### 7.2 对话管理能力

| 操作 | 说明 |
|------|------|
| 新建对话 | 清空画布，开始全新创作 |
| 切换对话 | 加载该对话的画布快照 + 对话记录 |
| 删除对话 | 删除对话及其画布数据 |
| 重命名对话 | 修改对话标题 |
| 导出/导入对话 | JSON 格式，可跨设备迁移 |
| 历史回溯 | 时间线面板，点击任意节点恢复 |

### 7.3 界面布局

```
┌──────────────────────────────────────────────────────┐
│  顶栏: [对话列表 ▼] [新建对话] [设置 ⚙]  [🎤 开/关]   │
├────────────────────┬─────────────────────────────────┤
│                    │                                 │
│   对话面板         │         画布区域                 │
│   (ChatPanel)      │        (CanvasArea)             │
│                    │                                 │
│   🤖 回复消息      │      ┌─────────────────┐        │
│   🎤 用户消息      │      │   绘图内容       │        │
│   🤖 回复消息      │      │                 │        │
│                    │      └─────────────────┘        │
│   ┌──────────────┐ │   状态栏: 图层/对象/选中/撤销   │
│   │ ● 正在听...  │ │                                 │
│   └──────────────┘ │                                 │
├────────────────────┴─────────────────────────────────┤
│  底部: [🎤 按住说话 / 持续监听]    [文字输入框]        │
└──────────────────────────────────────────────────────┘
```

### 7.4 消息展示

每条助手消息展示：
- 回复文字（LLM 流式逐字输出）
- 绘图进度指示（"正在绘制第 5/35 个图形..."）
- 绘制完成后的最终结果
- 执行动作列表（✅ 成功 / ⚠️ 已修正 / ❌ 失败）
- 操作耗时

---

## 八、容错与异常处理

### 8.1 五层容错体系

| 层级 | 机制 | 说明 |
|------|------|------|
| 第一层 | 语音识别容错 | LLM 根据 3 个候选结果 + 上下文选择最合理解读 |
| 第二层 | LLM 输出校验 | Schema 校验：类型合法、参数齐全、数值合理、对象存在 |
| 第三层 | 执行错误自修正 | 校验失败 → 回传错误 → LLM 修正 → 重试（最多 3 轮） |
| 第四层 | 安全兜底 | 危险操作二次确认、自动快照、操作限制（单次≤50子对象）、超时保护 |
| 第五层 | 用户反馈闭环 | 每步状态可视化 + 语音播报 |

### 8.2 容错优先级

```
1. 不执行错误操作（安全第一）
2. 自动修正能修的就修（无感修复）
3. 修不了就追问用户（明确意图）
4. 任何操作都可撤销（兜底回退）
```

### 8.3 用户反馈状态

```
语音识别中:    ● 正在听... (波形动画)
识别中:        ● 正在听... "画一..."（实时更新，波形动画）
识别完成:      "你说了：画一只小猫" ✓
发送给 LLM:    🔄 正在思考... (旋转动画)
LLM 流式回复:  🤖 好的，我来画一只...（逐字流式显示）
LLM 返回:      📐 正在绘制小猫...（第 5/35 个图形）
逐步绘制中:    画布上逐步呈现图形（身体→头→耳朵→眼睛...每步 50-100ms）
绘制完成:      ✅ 小猫画好了！用了 35 个图形（最终消息此时才出现）
需要修正:      🔧 正在自动修正...
修正失败:      ❌ 理解失败，能再说一次吗？
需要确认:      ⚠️ 确定要清空画布吗？说"确认"继续
```

---

## 九、设置系统

### 9.1 LLM 配置

| 配置项 | 说明 |
|--------|------|
| API 地址 | 兼容 OpenAI `/chat/completions` 格式的 URL |
| API Key | 用户的密钥 |
| 模型名称 | 如 gpt-4o, glm-4, deepseek-chat |
| 最大 Token | 默认 4096 |
| 温度 | 默认 0.3（低温度保证输出稳定） |

### 9.2 预设模板

| 预设 | API 地址 | 模型 |
|------|----------|------|
| OpenAI GPT | api.openai.com/v1 | gpt-4o |
| 智谱 GLM | open.bigmodel.cn/api/paas/v4 | glm-4 |
| DeepSeek | api.deepseek.com/v1 | deepseek-chat |
| 通义千问 | dashscope.aliyuncs.com/compatible-mode/v1 | qwen-plus |
| Moonshot | api.moonshot.cn/v1 | moonshot-v1-8k |

### 9.3 语音设置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 识别语言 | 自动 | 中文 / English / 自动检测 |
| 监听模式 | 持续监听 | 持续监听 / 按住说话 |
| 静音超时 | 3 秒 | 静音多久自动提交 |
| 语音播报 | 成功+错误 | 全部 / 成功+错误 / 关闭 |
| 播报速度 | 1.0 | 0.5-2.0 |

### 9.4 画布设置

| 配置项 | 默认值 |
|--------|--------|
| 默认尺寸 | 1200×800 |
| 背景色 | #FFFFFF |
| 自动保存 | 30 秒 |
| 历史上限 | 50 步 |

---

## 十、存储架构

```
localStorage（< 4MB）
├── vdt_settings                    // 全局设置
├── vdt_conversations               // 对话列表索引
├── vdt_conv_{id}                   // 单个对话数据
└── vdt_conv_{id}_thumb             // 对话缩略图

IndexedDB（> 4MB 时自动启用）
├── conversations store             // 对话详情
├── canvas_snapshots store          // 画布快照
└── audio_cache store               // 语音缓存（可选）
```

---

## 十一、文件结构

```
AI 语音绘图工具/
├── index.html                      // 单入口文件
├── css/
│   └── style.css                   // 所有样式
├── js/
│   ├── app.js                      // 入口：初始化所有模块
│   ├── core/
│   │   ├── ConversationManager.js  // 对话管理器（状态中枢）
│   │   ├── VoiceEngine.js          // 语音识别 + 播报
│   │   ├── LLMBridge.js            // LLM API 通信
│   │   ├── DrawEngine.js           // Canvas 渲染引擎
│   │   ├── ObjectStore.js          // 对象/图层存储
│   │   ├── HistoryManager.js       // 撤销/重做/时间线
│   │   ├── ConfigManager.js        // 设置管理
│   │   ├── StorageAdapter.js       // 持久化存储
│   │   └── TemplateLib.js          // Q版模板库管理
│   ├── ui/
│   │   ├── ChatPanel.js            // 对话面板 UI
│   │   ├── CanvasArea.js           // 画布区域 UI
│   │   ├── SettingsPanel.js        // 设置面板 UI
│   │   ├── SidebarPanel.js         // 对话列表侧栏
│   │   └── StatusBar.js            // 底部状态栏
│   ├── prompts/
│   │   └── system-prompt.js        // LLM System Prompt 模板
│   └── utils/
│       ├── validators.js           // 操作校验规则
│       ├── constants.js            // 常量（图形类型/预设等）
│       ├── helpers.js              // 工具函数
│       └── i18n.js                 // 中英文文本映射
├── assets/
│   └── icons/                      // SVG 图标
├── templates/
│   ├── animals/                    // 动物模板 JSON（猫/狗/兔等 12 个）
│   └── vehicles/                   // 交通工具模板 JSON（汽车/飞机等 6 个）
└── docs/
    └── specs/
        └── 2026-06-12-voice-drawing-design.md  // 本文档
```

---

## 十二、浏览器兼容性

| 浏览器 | 语音识别 | Canvas | ES Module | 推荐 |
|--------|----------|--------|-----------|------|
| Chrome 80+ | ✅ | ✅ | ✅ | **最佳体验** |
| Edge 80+ | ✅ | ✅ | ✅ | 推荐 |
| Firefox | ❌ | ✅ | ✅ | 可用文字输入模式 |
| Safari 14+ | ⚠️ | ✅ | ✅ | 语音不稳定 |

---

## 十三、实现状态跟踪

### 计划支持 → 最终实现对照表

| 能力 | 计划 | 实现状态 | 说明 |
|------|------|----------|------|
| 语音识别（Web Speech API） | ✅ | _待实现_ | |
| 语音播报（SpeechSynthesis） | ✅ | _待实现_ | |
| LLM 通信（OpenAI 格式） | ✅ | _待实现_ | |
| 可配置 API（多预设） | ✅ | _待实现_ | |
| 基础图形绘制 | ✅ | _待实现_ | |
| 复杂几何图形 | ✅ | _待实现_ | |
| **Q版风格渲染系统** | ✅ | _待实现_ | 精致Q版：大头、粗描边、高光、腮红 |
| **混合模板系统（模板优先 + LLM 兜底）** | ✅ | _待实现_ | 18 个种子模板（动物12+交通6） |
| **模板学习机制** | ✅ | _待实现_ | LLM 生成效果可保存为新模板 |
| 具象图形（Q版风格） | ✅ | _待实现_ | LLM 按Q版规范实时生成 |
| 文本绘制 | ✅ | _待实现_ | |
| 属性与样式控制 | ✅ | _待实现_ | |
| 变换操作（移动/缩放/旋转） | ✅ | _待实现_ | |
| 选择与定位 | ✅ | _待实现_ | |
| 图层系统 | ✅ | _待实现_ | |
| 撤销/重做 | ✅ | _待实现_ | |
| 组合与布尔运算 | ✅ | _待实现_ | |
| 自由绘制模式 | ✅ | _待实现_ | |
| 二次创作（上下文感知） | ✅ | _待实现_ | |
| 复合指令拆解 | ✅ | _待实现_ | |
| 五层容错体系 | ✅ | _待实现_ | |
| 多轮对话系统 | ✅ | _待实现_ | |
| 对话历史管理 | ✅ | _待实现_ | |
| 设置面板 | ✅ | _待实现_ | |
| 数据持久化（localStorage + IndexedDB） | ✅ | _待实现_ | |
| 导出 PNG/JPG/SVG | ✅ | _待实现_ | |
| 中英文双语支持 | ✅ | _待实现_ | |

> 实现状态将在开发过程中逐步更新。
