// i18n.js — 中英文文本映射

const ZH = {
  // 应用
  'app.title': 'AI 语音绘图工具',
  'app.version': '版本',

  // 顶栏
  'topbar.new': '＋ 新建对话',
  'topbar.settings': '设置',
  'topbar.voice.on': '语音开启',
  'topbar.voice.off': '语音关闭',

  // 状态栏
  'status.layer': '图层',
  'status.objects': '对象',
  'status.selected': '选中',
  'status.undo': '可撤销',
  'status.none': '无',

  // 对话面板
  'chat.placeholder': '输入指令或按🎤语音控制...',
  'chat.send': '发送',
  'chat.template.used': '使用了模板',

  // 语音状态
  'voice.listening': '正在听...',
  'voice.recognized': '识别完成',
  'voice.thinking': '正在思考...',
  'voice.drawing': '正在绘制',
  'voice.draw_progress': '第 {current}/{total} 个图形',
  'voice.draw_complete': '绘制完成！',
  'voice.draw_failed': '绘制失败',
  'voice.correcting': '正在自动修正...',
  'voice.retry': '重试中...',
  'voice.confirm': '确定要{action}吗？',
  'voice.not_supported': '当前浏览器不支持语音识别，请使用文字输入',

  // 消息
  'msg.success': '操作成功',
  'msg.error': '操作失败',
  'msg.partial': '部分成功',
  'msg.retry_exhausted': '重试次数已用尽，请重新描述',

  // 设置
  'settings.llm': 'LLM 设置',
  'settings.llm.url': 'API 地址',
  'settings.llm.key': 'API Key',
  'settings.llm.model': '模型名称',
  'settings.llm.max_tokens': '最大 Token',
  'settings.llm.temperature': '温度',
  'settings.llm.presets': '预设模板',
  'settings.llm.test': '测试连接',
  'settings.llm.test_success': '连接成功！',
  'settings.llm.test_fail': '连接失败',
  'settings.voice': '语音设置',
  'settings.voice.language': '识别语言',
  'settings.voice.mode': '监听模式',
  'settings.voice.mode.continuous': '持续监听',
  'settings.voice.mode.push': '按住说话',
  'settings.voice.silence': '静音超时(秒)',
  'settings.voice.speech_level': '播报级别',
  'settings.voice.speech_level.all': '全部',
  'settings.voice.speech_level.success_error': '成功+错误',
  'settings.voice.speech_level.none': '关闭',
  'settings.voice.speech_rate': '播报速度',
  'settings.canvas': '画布设置',
  'settings.canvas.width': '宽度',
  'settings.canvas.height': '高度',
  'settings.canvas.background': '背景色',
  'settings.canvas.auto_save': '自动保存(秒)',
  'settings.canvas.max_history': '历史上限',
  'settings.qb_style': 'Q版风格',
  'settings.qb_style.stroke_width': '描边粗细',
  'settings.qb_style.blush': '腮红',
  'settings.qb_style.highlight': '高光',
  'settings.qb_style.on': '开',
  'settings.qb_style.off': '关',
  'settings.save': '保存',
  'settings.reset': '重置',

  // 侧栏
  'sidebar.title': '对话历史',
  'sidebar.new': '新建对话',
  'sidebar.rename': '重命名',
  'sidebar.delete': '删除',
  'sidebar.export': '导出',

  // 确认
  'confirm.title': '确认操作',
  'confirm.cancel': '取消',
  'confirm.ok': '确认',
  'confirm.clear_canvas': '确定要清空画布吗？所有未保存的内容将丢失。',
  'confirm.delete_object': '确定要删除选中的对象吗？',

  // 模板
  'template.saved': '模板"{name}"已保存！',
  'template.not_found': '未找到匹配的模板，将由 AI 实时生成',
  'template.match': '匹配到模板',

  // 错误
  'error.network': '网络错误，请检查连接',
  'error.api': 'API 错误',
  'error.json': '响应格式错误',
  'error.timeout': '请求超时，请重试',
  'error.no_llm': '请先在设置中配置 LLM API',
  'error.unknown': '未知错误',
};

const EN = {
  'app.title': 'AI Voice Drawing Tool',
  'topbar.new': '＋ New Chat',
  'voice.listening': 'Listening...',
  'voice.thinking': 'Thinking...',
  'voice.draw_complete': 'Drawing complete!',
  'settings.save': 'Save',
  'settings.reset': 'Reset',
  'confirm.ok': 'OK',
  'confirm.cancel': 'Cancel',
};

let _lang = 'zh';

export function t(key, params) {
  const texts = _lang === 'zh' ? ZH : EN;
  let text = texts[key] || ZH[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

export function setLang(lang) {
  _lang = lang;
}

export function getLang() {
  return _lang;
}
