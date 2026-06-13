// ObjectStore.js — 对象/图层存储，管理所有 DrawingObject 和 Layer
import { generateId, deepClone } from '../utils/helpers.js';

export class ObjectStore {
  constructor() {
    /** @type {Map<string, DrawingObject>} */
    this._index = new Map();
    /** @type {Layer[]} */
    this.layers = [];
    this.selectedObjectId = null;
    this.currentLayerId = null;
    this._clipboard = null;
    this._initDefaultLayer();
  }

  // ========== 初始化 ==========
  _initDefaultLayer() {
    const layer = createLayer('图层 1');
    this.layers.push(layer);
    this.currentLayerId = layer.id;
  }

  // ========== 图层操作 ==========
  addLayer(name) {
    const layer = createLayer(name || `图层 ${this.layers.length + 1}`);
    this.layers.push(layer);
    return layer;
  }

  deleteLayer(layerId) {
    if (this.layers.length <= 1) return false;
    const idx = this.layers.findIndex(l => l.id === layerId);
    if (idx === -1) return false;
    // 移除该图层所有对象的索引
    for (const obj of this.layers[idx].objects) {
      this._removeFromIndex(obj);
    }
    this.layers.splice(idx, 1);
    if (this.currentLayerId === layerId) {
      this.currentLayerId = this.layers[0].id;
    }
    return true;
  }

  switchLayer(layerId) {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) {
      this.currentLayerId = layerId;
      return true;
    }
    return false;
  }

  reorderLayer(layerId, newIndex) {
    const idx = this.layers.findIndex(l => l.id === layerId);
    if (idx === -1) return false;
    const [layer] = this.layers.splice(idx, 1);
    this.layers.splice(newIndex, 0, layer);
    return true;
  }

  toggleLayerVisibility(layerId) {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) { layer.visible = !layer.visible; return true; }
    return false;
  }

  setLayerOpacity(layerId, opacity) {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) { layer.opacity = opacity; return true; }
    return false;
  }

  getCurrentLayer() {
    return this.layers.find(l => l.id === this.currentLayerId) || this.layers[0];
  }

  getLayerById(layerId) {
    return this.layers.find(l => l.id === layerId);
  }

  // ========== 对象 CRUD ==========
  addObject(obj, layerId) {
    const layer = layerId ? this.getLayerById(layerId) : this.getCurrentLayer();
    if (!layer) return null;
    layer.objects.push(obj);
    this._addToIndex(obj);
    // 递归索引 children
    if (obj.children) {
      for (const child of obj.children) this._addToIndex(child);
    }
    return obj;
  }

  getObject(objectId) {
    return this._index.get(objectId) || null;
  }

  updateObject(objectId, changes) {
    const obj = this._index.get(objectId);
    if (!obj) return null;
    Object.assign(obj, changes);
    return obj;
  }

  deleteObject(objectId) {
    for (const layer of this.layers) {
      const idx = layer.objects.findIndex(o => o.id === objectId);
      if (idx !== -1) {
        const [removed] = layer.objects.splice(idx, 1);
        this._removeFromIndex(removed);
        if (this.selectedObjectId === objectId) this.selectedObjectId = null;
        return removed;
      }
      // 也在 children 中查找
      for (const parent of layer.objects) {
        if (parent.children) {
          const ci = parent.children.findIndex(c => c.id === objectId);
          if (ci !== -1) {
            const [removed] = parent.children.splice(ci, 1);
            this._removeFromIndex(removed);
            if (this.selectedObjectId === objectId) this.selectedObjectId = null;
            return removed;
          }
        }
      }
    }
    return null;
  }

  // ========== 变换操作 ==========
  moveObject(objectId, x, y) {
    return this.updateObject(objectId, { x, y });
  }

  scaleObject(objectId, sx, sy) {
    const obj = this.getObject(objectId);
    if (!obj) return null;
    obj.scaleX = (obj.scaleX || 1) * sx;
    obj.scaleY = (obj.scaleY || 1) * sy;
    return obj;
  }

  rotateObject(objectId, deg) {
    const obj = this.getObject(objectId);
    if (!obj) return null;
    obj.rotation = (obj.rotation || 0) + deg;
    return obj;
  }

  flipObject(objectId, axis) {
    const obj = this.getObject(objectId);
    if (!obj) return null;
    if (axis === 'horizontal') obj.scaleX = -(obj.scaleX || 1);
    else obj.scaleY = -(obj.scaleY || 1);
    return obj;
  }

  centerObject(objectId, canvasWidth, canvasHeight) {
    const obj = this.getObject(objectId);
    if (!obj) return null;
    // 简易居中：将对象中心移到画布中心
    const bbox = this._getObjectBBox(obj);
    obj.x = (canvasWidth / 2) - bbox.width / 2;
    obj.y = (canvasHeight / 2) - bbox.height / 2;
    return obj;
  }

  // ========== 选择操作 ==========
  selectObject(objectId) {
    if (this._index.has(objectId)) {
      this.selectedObjectId = objectId;
      return true;
    }
    return false;
  }

  selectAll() {
    // 返回当前图层所有对象 ID
    const layer = this.getCurrentLayer();
    return layer ? layer.objects.map(o => o.id) : [];
  }

  deselectAll() {
    this.selectedObjectId = null;
  }

  getSelectedObject() {
    return this.selectedObjectId ? this.getObject(this.selectedObjectId) : null;
  }

  // ========== 组合操作 ==========
  groupObjects(objectIds) {
    const parent = createDrawingObject('composite', '组合');
    parent.children = [];
    for (const layer of this.layers) {
      for (let i = layer.objects.length - 1; i >= 0; i--) {
        if (objectIds.includes(layer.objects[i].id)) {
          const [obj] = layer.objects.splice(i, 1);
          parent.children.push(obj);
        }
      }
    }
    if (parent.children.length === 0) return null;
    // 计算组合中心
    const xs = parent.children.map(c => c.x);
    const ys = parent.children.map(c => c.y);
    parent.x = Math.min(...xs);
    parent.y = Math.min(...ys);
    this.addObject(parent);
    return parent;
  }

  ungroupObject(objectId) {
    const obj = this.getObject(objectId);
    if (!obj || obj.type !== 'composite' || !obj.children) return null;
    const children = [...obj.children];
    obj.children = [];
    this.deleteObject(objectId);
    for (const child of children) {
      child.layer = this.currentLayerId;
      this.addObject(child);
    }
    return children;
  }

  // ========== 复制/粘贴 ==========
  duplicateObject(objectId) {
    const obj = this.getObject(objectId);
    if (!obj) return null;
    const copy = deepClone(obj);
    copy.id = generateId('obj');
    copy.name = `${obj.name || obj.type} 副本`;
    copy.x = (copy.x || 0) + 20;
    copy.y = (copy.y || 0) + 20;
    // 重新生成 children 的 id
    if (copy.children) {
      this._regenerateIds(copy.children);
    }
    this.addObject(copy);
    return copy;
  }

  copyObject(objectId) {
    const obj = this.getObject(objectId);
    if (!obj) return false;
    this._clipboard = deepClone(obj);
    return true;
  }

  pasteObject() {
    if (!this._clipboard) return null;
    const copy = deepClone(this._clipboard);
    copy.id = generateId('obj');
    copy.x = (copy.x || 0) + 20;
    copy.y = (copy.y || 0) + 20;
    if (copy.children) this._regenerateIds(copy.children);
    this.addObject(copy);
    return copy;
  }

  // ========== 查询 ==========
  getObjectsByLayer(layerId) {
    const layer = this.getLayerById(layerId);
    return layer ? [...layer.objects] : [];
  }

  getAllObjects() {
    return this.layers.flatMap(l => l.objects);
  }

  getState() {
    return deepClone({
      layers: this.layers,
      selectedObjectId: this.selectedObjectId,
      currentLayerId: this.currentLayerId,
    });
  }

  setState(state) {
    this.layers = state.layers;
    this.selectedObjectId = state.selectedObjectId;
    this.currentLayerId = state.currentLayerId;
    this._rebuildIndex();
  }

  clear() {
    this._index.clear();
    this.layers = [];
    this.selectedObjectId = null;
    this._initDefaultLayer();
  }

  // ========== 内部方法 ==========
  _addToIndex(obj) {
    this._index.set(obj.id, obj);
    if (obj.children) {
      for (const child of obj.children) this._addToIndex(child);
    }
  }

  _removeFromIndex(obj) {
    this._index.delete(obj.id);
    if (obj.children) {
      for (const child of obj.children) this._removeFromIndex(child);
    }
  }

  _rebuildIndex() {
    this._index.clear();
    for (const layer of this.layers) {
      for (const obj of layer.objects) {
        this._addToIndex(obj);
      }
    }
  }

  _regenerateIds(children) {
    for (const child of children) {
      child.id = generateId('obj');
      if (child.children) this._regenerateIds(child.children);
    }
  }

  _getObjectBBox(obj) {
    const p = obj.params || {};
    let w = 50, h = 50;
    if (obj.type === 'circle') { w = h = (p.radius || 25) * 2; }
    else if (obj.type === 'rect') { w = p.width || 50; h = p.height || 50; }
    else if (obj.type === 'ellipse') { w = (p.rx || 25) * 2; h = (p.ry || 25) * 2; }
    return { x: obj.x || 0, y: obj.y || 0, width: w, height: h };
  }
}

// ========== 工厂函数 ==========
export function createDrawingObject(type, name, params = {}) {
  return {
    id: generateId('obj'),
    type,
    name: name || type,
    x: params.x || 0,
    y: params.y || 0,
    params: { ...params },
    strokeColor: params.strokeColor || null,
    fillColor: params.fillColor || null,
    fill: params.fill !== undefined ? params.fill : true,
    strokeWidth: params.strokeWidth || null,
    opacity: params.opacity !== undefined ? params.opacity : 1,
    rotation: params.rotation || 0,
    scaleX: params.scaleX || 1,
    scaleY: params.scaleY || 1,
    visible: params.visible !== undefined ? params.visible : true,
    locked: params.locked || false,
    layer: null,
    children: params.children || null,
    path: params.path || null,
    gradient: params.gradient || null,
    shadow: params.shadow || null,
    templateRef: params.templateRef || null,
  };
}

export function createLayer(name) {
  return {
    id: generateId('layer'),
    name: name || '新图层',
    visible: true,
    opacity: 1,
    locked: false,
    objects: [],
  };
}
