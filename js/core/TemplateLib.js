// TemplateLib.js — Q版模板库管理（加载/匹配/实例化/保存）
import { generateId, relToAbs, absToRel, deepClone, fuzzyMatch, computeBoundingBox } from '../utils/helpers.js';
import { TEMPLATE_CATEGORIES } from '../utils/constants.js';

export class TemplateLib {
  constructor() {
    /** @type {Map<string, Template>} */
    this.templates = new Map();
  }

  async init() {
    // 加载内置动物模板
    await this._loadCategory('animals', '/templates/animals/');
    // 加载内置交通工具模板
    await this._loadCategory('vehicles', '/templates/vehicles/');
    // 加载自定义模板（从 localStorage，Phase 5 实现）
    console.log(`✅ 模板库加载完成：${this.templates.size} 个模板`);
  }

  async _loadCategory(category, basePath) {
    // 尝试加载已知模板文件
    const knownTemplates = {
      animals: ['cat', 'dog', 'rabbit', 'panda', 'bird', 'fish', 'bear', 'mouse', 'tiger', 'lion', 'fox', 'penguin'],
      vehicles: ['car', 'plane', 'rocket', 'ship', 'train', 'bicycle'],
    };
    const files = knownTemplates[category] || [];
    for (const id of files) {
      try {
        const resp = await fetch(`${basePath}${id}.json`);
        if (resp.ok) {
          const data = await resp.json();
          data.category = category;
          this.templates.set(id, data);
        }
      } catch (e) {
        // 模板文件不存在，跳过
      }
    }
  }

  // ========== 模板匹配 ==========
  search(keyword) {
    if (!keyword) return { matched: false, template: null, confidence: 0 };
    const targets = [];
    for (const [id, t] of this.templates) {
      targets.push({ id, name: t.name, aliases: t.aliases || [], template: t });
    }
    const result = fuzzyMatch(keyword, targets);
    if (result) {
      return { matched: true, template: result.target.template, confidence: result.confidence };
    }
    return { matched: false, template: null, confidence: 0 };
  }

  // ========== 模板实例化 ==========
  instantiate(templateId, options = {}) {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const {
      size = { width: template.baseSize?.width || 200, height: template.baseSize?.height || 200 },
      position = { x: 0, y: 0 },
      colorOverrides = {},
      variant,
    } = options;

    // 选择变体 parts
    let parts = template.parts || [];
    if (variant && template.variants && template.variants[variant]) {
      parts = template.variants[variant];
    }

    // 转换相对坐标 → 绝对坐标，应用颜色覆盖
    const objects = deepClone(parts).map(part => {
      const obj = { ...part };
      // 相对坐标转绝对
      if (obj.relX !== undefined) obj.x = relToAbs(obj.relX, size.width) + position.x;
      if (obj.relY !== undefined) obj.y = relToAbs(obj.relY, size.height) + position.y;
      delete obj.relX;
      delete obj.relY;
      // params 中的尺寸也转换
      if (obj.params) {
        for (const key of Object.keys(obj.params)) {
          if (typeof obj.params[key] === 'object' && obj.params[key]._rel) {
            obj.params[key] = relToAbs(obj.params[key]._rel, size.width);
          }
        }
      }
      // 颜色覆盖
      if (obj.colorSlot && colorOverrides[obj.colorSlot]) {
        const color = colorOverrides[obj.colorSlot];
        if (obj.fill === false) {
          obj.strokeColor = color;
        } else {
          obj.fillColor = color;
        }
      }
      // 确保有 id
      if (!obj.id) obj.id = generateId('obj');
      obj.templateRef = templateId;
      return obj;
    });

    return objects;
  }

  // ========== 模板保存 ==========
  saveAsTemplate(name, objects, boundingBox) {
    const bbox = boundingBox || computeBoundingBox(objects);
    const parts = deepClone(objects).map(obj => {
      const part = { ...obj };
      // 绝对坐标转相对
      part.relX = absToRel(obj.x - bbox.x, bbox.width);
      part.relY = absToRel(obj.y - bbox.y, bbox.height);
      delete part.x;
      delete part.y;
      // params 中尺寸转相对
      if (part.params) {
        for (const key of Object.keys(part.params)) {
          if (typeof part.params[key] === 'number' && key !== 'radius' && part.params[key] > 1) {
            part.params[key] = { _rel: absToRel(part.params[key], bbox.width) };
          }
        }
      }
      delete part.templateRef;
      return part;
    });

    // 自动识别 colorSlots
    const colorSlots = {};
    const colorCounts = {};
    for (const obj of objects) {
      if (obj.fillColor) {
        colorCounts[obj.fillColor] = (colorCounts[obj.fillColor] || 0) + 1;
      }
    }
    // 出现最多的颜色作为主色
    let maxColor = null, maxCount = 0;
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count > maxCount) { maxColor = color; maxCount = count; }
    }
    if (maxColor) {
      colorSlots.main = { default: maxColor, field: 'fillColor' };
    }

    const template = {
      id: generateId('tpl'),
      name,
      category: TEMPLATE_CATEGORIES.CUSTOM,
      baseSize: { width: bbox.width, height: bbox.height },
      parts,
      colorSlots,
      aliases: [name],
      variants: {},
    };

    this.templates.set(template.id, template);
    return template;
  }

  // ========== 管理方法 ==========
  deleteTemplate(id) {
    return this.templates.delete(id);
  }

  listTemplates(category) {
    const result = [];
    for (const [id, t] of this.templates) {
      if (!category || t.category === category) {
        result.push({ id, name: t.name, category: t.category });
      }
    }
    return result;
  }

  getTemplateNames() {
    const names = [];
    for (const [id, t] of this.templates) {
      names.push({ id, name: t.name, aliases: t.aliases || [] });
    }
    return names;
  }

  exportTemplate(id) {
    const t = this.templates.get(id);
    return t ? JSON.stringify(t, null, 2) : null;
  }

  importTemplate(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.id || !data.name || !data.parts) return null;
      data.category = data.category || TEMPLATE_CATEGORIES.CUSTOM;
      this.templates.set(data.id, data);
      return data;
    } catch {
      return null;
    }
  }
}
