// helpers.js — 通用工具函数 + Q版专用工具

import { QB_PALETTE } from './constants.js';

// ========== ID 生成器 ==========
let _counter = 0;
export function generateId(prefix = 'obj') {
  _counter++;
  return `${prefix}_${String(_counter).padStart(4, '0')}`;
}

// ========== 数值工具 ==========
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function deepClone(obj) {
  return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
}

// ========== 防抖/节流 ==========
export function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function throttle(fn, ms) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      return fn.apply(this, args);
    }
  };
}

// ========== 时间格式化 ==========
export function formatTimestamp(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ========== 颜色工具 ==========
export const colorKeywords = {
  '红': '#ef4444', '红色': '#ef4444', '大红': '#dc2626',
  '蓝': '#3b82f6', '蓝色': '#3b82f6', '深蓝': '#1d4ed8',
  '绿': '#22c55e', '绿色': '#22c55e', '深绿': '#16a34a',
  '黄': '#eab308', '黄色': '#eab308', '金黄': '#f59e0b',
  '橙': '#f97316', '橙色': '#f97316',
  '紫': '#a855f7', '紫色': '#a855f7', '深紫': '#7c3aed',
  '粉': '#ec4899', '粉色': '#ec4899', '粉红': '#f472b6',
  '黑': '#1e1e1e', '黑色': '#1e1e1e',
  '白': '#ffffff', '白色': '#ffffff',
  '灰': '#6b7280', '灰色': '#6b7280', '深灰': '#374151',
  '棕': '#92400e', '棕色': '#92400e', '褐色': '#78350f',
  '青': '#06b6d4', '青色': '#06b6d4',
  '品红': '#d946ef', '洋红': '#d946ef',
};

export function normalizeColor(color) {
  if (!color) return '#000000';
  if (color.startsWith('#')) return color;
  if (colorKeywords[color]) return colorKeywords[color];
  return color;
}

// ========== 模板坐标工具 ==========
export function relToAbs(relVal, baseSize) {
  return relVal * baseSize;
}

export function absToRel(absVal, baseSize) {
  return baseSize > 0 ? absVal / baseSize : 0;
}

// ========== Q版专用工具 ==========
export function randomQBColor(category) {
  const colors = QB_PALETTE[category];
  if (!colors || colors.length === 0) return '#fbbf24';
  return colors[Math.floor(Math.random() * colors.length)];
}

export function generateHighlights(eyeX, eyeY, eyeRadius) {
  const r = clamp(eyeRadius * 0.35, 2, 4);
  const r2 = clamp(eyeRadius * 0.18, 1.5, 2.5);
  return [
    { x: eyeX + eyeRadius * 0.25, y: eyeY - eyeRadius * 0.25, radius: r, opacity: 0.9 },
    { x: eyeX - eyeRadius * 0.15, y: eyeY + eyeRadius * 0.1, radius: r2, opacity: 0.5 },
  ];
}

// ========== 延时工具 ==========
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== 边界框计算 ==========
export function computeBoundingBox(objects) {
  if (!objects || objects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const obj of objects) {
    const x = obj.x || 0;
    const y = obj.y || 0;
    const p = obj.params || {};
    let right = x, bottom = y;
    if (obj.type === 'circle') { right = x + (p.radius || 0) * 2; bottom = y + (p.radius || 0) * 2; }
    else if (obj.type === 'rect') { right = x + (p.width || 0); bottom = y + (p.height || 0); }
    else if (obj.type === 'ellipse') { right = x + (p.rx || 0) * 2; bottom = y + (p.ry || 0) * 2; }
    else { right = x + 50; bottom = y + 50; }
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ========== 中文关键词匹配 ==========
export function fuzzyMatch(keyword, targets) {
  if (!keyword) return null;
  const kw = keyword.toLowerCase().trim();
  // 精确匹配
  for (const t of targets) {
    if (t.name === kw || t.id === kw) return { target: t, confidence: 1.0 };
  }
  // 别名匹配
  for (const t of targets) {
    if (t.aliases && t.aliases.some(a => a.toLowerCase() === kw)) {
      return { target: t, confidence: 0.9 };
    }
  }
  // 包含匹配
  for (const t of targets) {
    if (t.name.includes(kw) || kw.includes(t.name)) {
      return { target: t, confidence: 0.7 };
    }
    if (t.aliases && t.aliases.some(a => a.includes(kw) || kw.includes(a))) {
      return { target: t, confidence: 0.6 };
    }
  }
  return null;
}
