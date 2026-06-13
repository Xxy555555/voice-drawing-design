// DrawEngine.js — Canvas 渲染引擎
import { QB_STYLE } from '../utils/constants.js';

export class DrawEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./ObjectStore.js').ObjectStore} objectStore
   */
  constructor(canvas, objectStore) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.objectStore = objectStore;
    this.viewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
    this._showGrid = false;
    this._background = '#FFFFFF';
    this._gradientBg = null;
  }

  // ========== 主渲染 ==========
  render() {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 背景
    if (this._gradientBg) {
      ctx.fillStyle = this._gradientBg;
    } else {
      ctx.fillStyle = this._background;
    }
    ctx.fillRect(0, 0, width, height);

    // 视图变换
    ctx.translate(this.viewTransform.offsetX, this.viewTransform.offsetY);
    ctx.scale(this.viewTransform.scale, this.viewTransform.scale);

    // 按图层顺序渲染
    for (const layer of this.objectStore.layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      for (const obj of layer.objects) {
        if (!obj.visible) continue;
        this._drawObject(ctx, obj);
      }
    }
    ctx.globalAlpha = 1;

    // 选中框
    const sel = this.objectStore.getSelectedObject();
    if (sel && sel.visible) {
      this._drawSelection(ctx, sel);
    }

    // 网格
    if (this._showGrid) this._drawGrid(ctx);

    ctx.restore();
  }

  // ========== 对象分发渲染 ==========
  _drawObject(ctx, obj) {
    ctx.save();
    this._applyTransform(ctx, obj);
    this._applyStyle(ctx, obj);

    switch (obj.type) {
      case 'circle': this._drawCircle(ctx, obj); break;
      case 'rect': this._drawRect(ctx, obj); break;
      case 'ellipse': this._drawEllipse(ctx, obj); break;
      case 'triangle': this._drawTriangle(ctx, obj); break;
      case 'line': this._drawLine(ctx, obj); break;
      case 'polygon': this._drawPolygon(ctx, obj); break;
      case 'arc': this._drawArc(ctx, obj); break;
      case 'text': this._drawText(ctx, obj); break;
      case 'arrow': this._drawArrow(ctx, obj); break;
      case 'bezier': this._drawBezier(ctx, obj); break;
      case 'spiral': this._drawSpiral(ctx, obj); break;
      case 'wave': this._drawWave(ctx, obj); break;
      case 'sine': this._drawSine(ctx, obj); break;
      case 'star': this._drawStar(ctx, obj); break;
      case 'heart': this._drawHeart(ctx, obj); break;
      case 'flower': this._drawFlower(ctx, obj); break;
      case 'gear': this._drawGear(ctx, obj); break;
      case 'cloud': this._drawCloud(ctx, obj); break;
      case 'tree': this._drawTree(ctx, obj); break;
      case 'fractal': this._drawFractal(ctx, obj); break;
      case 'crown': this._drawCrown(ctx, obj); break;
      case 'diamond': this._drawDiamond(ctx, obj); break;
      case 'composite': this._drawComposite(ctx, obj); break;
      case 'path': this._drawPath(ctx, obj); break;
      default: this._drawCircle(ctx, { ...obj, params: { radius: 10 } }); break;
    }

    ctx.restore();
  }

  // ========== 基础图形 ==========

  _drawCircle(ctx, obj) {
    const { radius = 25 } = obj.params || {};
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1, radius), 0, Math.PI * 2);
    if (obj.fill) { ctx.fill(); }
    if (obj.strokeColor !== null || !obj.fill) { ctx.stroke(); }
  }

  _drawRect(ctx, obj) {
    const { width: w = 50, height: h = 50, cornerRadius: cr = 0 } = obj.params || {};
    ctx.beginPath();
    if (cr > 0) {
      const r = Math.min(cr, w / 2, h / 2);
      ctx.moveTo(-w / 2 + r, -h / 2);
      ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
      ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
      ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
      ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
    ctx.closePath();
    if (obj.fill) { ctx.fill(); }
    if (obj.strokeColor !== null || !obj.fill) { ctx.stroke(); }
  }

  _drawEllipse(ctx, obj) {
    const { rx = 25, ry = 18 } = obj.params || {};
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    if (obj.fill) { ctx.fill(); }
    if (obj.strokeColor !== null || !obj.fill) { ctx.stroke(); }
  }

  _drawTriangle(ctx, obj) {
    const { size = 40, points: pts } = obj.params || {};
    ctx.beginPath();
    if (pts && pts.length === 3) {
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
    } else {
      const h = size * Math.sqrt(3) / 2;
      ctx.moveTo(0, -h * 2 / 3);
      ctx.lineTo(-size / 2, h / 3);
      ctx.lineTo(size / 2, h / 3);
    }
    ctx.closePath();
    if (obj.fill) { ctx.fill(); }
    if (obj.strokeColor !== null || !obj.fill) { ctx.stroke(); }
  }

  _drawLine(ctx, obj) {
    const { x2 = 50, y2 = 0 } = obj.params || {};
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  _drawPolygon(ctx, obj) {
    const { sides = 6, radius: r = 25 } = obj.params || {};
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (obj.fill) { ctx.fill(); }
    if (obj.strokeColor !== null || !obj.fill) { ctx.stroke(); }
  }

  _drawArc(ctx, obj) {
    const { radius: r = 25, startAngle = 0, endAngle = Math.PI } = obj.params || {};
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1, r), startAngle, endAngle);
    ctx.stroke();
  }

  _drawText(ctx, obj) {
    const {
      text = '', fontSize = 16, fontFamily = 'sans-serif',
      fontWeight = 'normal', fontStyle = 'normal'
    } = obj.params || {};
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (obj.fill) { ctx.fillText(text, 0, 0); }
    if (obj.strokeColor !== null && !obj.fill) { ctx.strokeText(text, 0, 0); }
  }

  _drawArrow(ctx, obj) {
    const { x2 = 50, y2 = 0, headSize = 10 } = obj.params || {};
    const angle = Math.atan2(y2, x2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // 箭头
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  // ========== 高级几何 ==========

  _drawBezier(ctx, obj) {
    const { points = [] } = obj.params || {};
    if (points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const pt of points) {
      if (pt.cp2x !== undefined) {
        ctx.bezierCurveTo(pt.cp1x, pt.cp1y, pt.cp2x, pt.cp2y, pt.x, pt.y);
      } else if (pt.cp1x !== undefined) {
        ctx.quadraticCurveTo(pt.cp1x, pt.cp1y, pt.x, pt.y);
      } else {
        ctx.lineTo(pt.x, pt.y);
      }
    }
    ctx.stroke();
  }

  _drawSpiral(ctx, obj) {
    const { turns = 3, radius: maxR = 40, spacing = 10 } = obj.params || {};
    ctx.beginPath();
    const steps = turns * 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = turns * Math.PI * 2 * t;
      const r = spacing * t * turns;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  _drawWave(ctx, obj) {
    const { amplitude = 15, wavelength = 40, length = 100 } = obj.params || {};
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= length; x++) {
      ctx.lineTo(x, Math.sin((x / wavelength) * Math.PI * 2) * amplitude);
    }
    ctx.stroke();
  }

  _drawSine(ctx, obj) {
    const { amplitude = 20, frequency = 1, length = 100 } = obj.params || {};
    ctx.beginPath();
    for (let x = 0; x <= length; x++) {
      const y = Math.sin((x / length) * Math.PI * 2 * frequency) * amplitude;
      if (x === 0) ctx.moveTo(x - length / 2, y);
      else ctx.lineTo(x - length / 2, y);
    }
    ctx.stroke();
  }

  _drawStar(ctx, obj) {
    const { outerRadius = 25, innerRadius = 12, points = 5 } = obj.params || {};
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI / points) * i - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (obj.fill) { ctx.fill(); }
    if (obj.strokeColor !== null || !obj.fill) { ctx.stroke(); }
  }

  _drawHeart(ctx, obj) {
    const { size = 20 } = obj.params || {};
    ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(-size, -size * 0.3, -size * 0.5, -size, 0, -size * 0.4);
    ctx.bezierCurveTo(size * 0.5, -size, size, -size * 0.3, 0, size * 0.3);
    ctx.closePath();
    if (obj.fill) { ctx.fill(); }
    if (obj.strokeColor !== null || !obj.fill) { ctx.stroke(); }
  }

  _drawFlower(ctx, obj) {
    const { petals = 5, petalRadius = 15, centerRadius = 6 } = obj.params || {};
    for (let i = 0; i < petals; i++) {
      const angle = (Math.PI * 2 / petals) * i;
      ctx.beginPath();
      ctx.ellipse(
        Math.cos(angle) * petalRadius * 0.5,
        Math.sin(angle) * petalRadius * 0.5,
        petalRadius, petalRadius * 0.5,
        angle, 0, Math.PI * 2
      );
      if (obj.fill) ctx.fill();
      ctx.stroke();
    }
    // 花心
    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
    if (obj.fill) ctx.fill();
    ctx.stroke();
  }

  _drawGear(ctx, obj) {
    const { teeth = 8, outerRadius = 25, innerRadius = 18 } = obj.params || {};
    const toothWidth = Math.PI / teeth;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const angle = (Math.PI * 2 / teeth) * i;
      ctx.lineTo(Math.cos(angle - toothWidth) * outerRadius, Math.sin(angle - toothWidth) * outerRadius);
      ctx.lineTo(Math.cos(angle + toothWidth) * outerRadius, Math.sin(angle + toothWidth) * outerRadius);
      const midAngle = angle + toothWidth + (Math.PI / teeth - toothWidth);
      ctx.lineTo(Math.cos(midAngle) * innerRadius, Math.sin(midAngle) * innerRadius);
    }
    ctx.closePath();
    if (obj.fill) ctx.fill();
    ctx.stroke();
  }

  _drawCloud(ctx, obj) {
    const { width: w = 60, height: h = 30 } = obj.params || {};
    ctx.beginPath();
    ctx.arc(-w * 0.2, 0, h * 0.5, 0, Math.PI * 2);
    ctx.arc(0, -h * 0.2, h * 0.6, 0, Math.PI * 2);
    ctx.arc(w * 0.25, 0, h * 0.45, 0, Math.PI * 2);
    ctx.closePath();
    if (obj.fill) ctx.fill();
    ctx.stroke();
  }

  _drawTree(ctx, obj) {
    const { trunkHeight = 30, canopyRadius = 20 } = obj.params || {};
    // 树干
    ctx.beginPath();
    ctx.rect(-5, 0, 10, trunkHeight);
    if (obj.fill) ctx.fill();
    ctx.stroke();
    // 树冠
    ctx.beginPath();
    ctx.arc(0, -canopyRadius * 0.2, canopyRadius, 0, Math.PI * 2);
    if (obj.fill) ctx.fill();
    ctx.stroke();
  }

  _drawFractal(ctx, obj) {
    const { type = 'koch', depth = 3 } = obj.params || {};
    if (type === 'koch') {
      this._drawKochSnowflake(ctx, depth, 40);
    } else {
      // 简单分形 fallback
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawKochSnowflake(ctx, depth, size) {
    const points = this._kochPoints(depth, size);
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
  }

  _kochPoints(depth, size) {
    if (depth === 0) {
      const h = size * Math.sqrt(3) / 2;
      return [[-size / 2, h / 3], [size / 2, h / 3], [0, -h * 2 / 3]];
    }
    const prev = this._kochPoints(depth - 1, size);
    const result = [];
    for (let i = 0; i < prev.length; i++) {
      const a = prev[i];
      const b = prev[(i + 1) % prev.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const p1 = [a[0] + dx / 3, a[1] + dy / 3];
      const p2 = [a[0] + dx * 2 / 3, a[1] + dy * 2 / 3];
      const peak = [
        p1[0] + (dx * Math.cos(Math.PI / 3) - dy * Math.sin(Math.PI / 3)) / 3,
        p1[1] + (dx * Math.sin(Math.PI / 3) + dy * Math.cos(Math.PI / 3)) / 3,
      ];
      result.push(a, p1, peak, p2);
    }
    return result;
  }

  _drawCrown(ctx, obj) {
    const { width: w = 40, height: h = 30 } = obj.params || {};
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2);
    ctx.lineTo(-w / 2, -h / 4);
    ctx.lineTo(-w / 4, h / 6);
    ctx.lineTo(0, -h / 2);
    ctx.lineTo(w / 4, h / 6);
    ctx.lineTo(w / 2, -h / 4);
    ctx.lineTo(w / 2, h / 2);
    ctx.closePath();
    if (obj.fill) ctx.fill();
    ctx.stroke();
  }

  _drawDiamond(ctx, obj) {
    const { width: w = 30, height: h = 40 } = obj.params || {};
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.closePath();
    if (obj.fill) ctx.fill();
    ctx.stroke();
  }

  _drawComposite(ctx, obj) {
    if (!obj.children) return;
    for (const child of obj.children) {
      ctx.save();
      this._drawObject(ctx, child);
      ctx.restore();
    }
  }

  _drawPath(ctx, obj) {
    const points = obj.path || obj.params?.points || [];
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x || points[0][0], points[0].y || points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x || points[i][0], points[i].y || points[i][1]);
    }
    if (obj.params?.closed) ctx.closePath();
    ctx.stroke();
  }

  // ========== 通用样式 ==========
  _applyStyle(ctx, obj) {
    if (obj.shadow) {
      ctx.shadowColor = obj.shadow.color || 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = obj.shadow.blur || 5;
      ctx.shadowOffsetX = obj.shadow.offsetX || 2;
      ctx.shadowOffsetY = obj.shadow.offsetY || 2;
    }
    if (obj.gradient && obj.gradient.colors) {
      const g = obj.gradient;
      const grad = g.type === 'radial'
        ? ctx.createRadialGradient(0, 0, 0, 0, 0, 50)
        : ctx.createLinearGradient(-30, 0, 30, 0);
      g.colors.forEach((c, i) => grad.addColorStop(i / Math.max(g.colors.length - 1, 1), c));
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = obj.fillColor || '#fbbf24';
    }
    ctx.strokeStyle = obj.strokeColor || QB_STYLE.STROKE_COLOR;
    ctx.lineWidth = obj.strokeWidth || QB_STYLE.STROKE_WIDTH;
    ctx.lineCap = QB_STYLE.LINE_CAP;
    ctx.lineJoin = QB_STYLE.LINE_JOIN;
    ctx.globalAlpha *= (obj.opacity !== undefined ? obj.opacity : 1);
  }

  _applyTransform(ctx, obj) {
    ctx.translate(obj.x || 0, obj.y || 0);
    if (obj.rotation) ctx.rotate(obj.rotation * Math.PI / 180);
    if (obj.scaleX !== undefined && obj.scaleX !== 1) ctx.scale(obj.scaleX, 1);
    if (obj.scaleY !== undefined && obj.scaleY !== 1) ctx.scale(1, obj.scaleY);
  }

  // ========== 选中框 ==========
  _drawSelection(ctx, obj) {
    const bbox = this._getObjBBox(obj);
    const pad = 6;
    ctx.save();
    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = '#6c63ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bbox.x - pad, bbox.y - pad, bbox.w + pad * 2, bbox.h + pad * 2);
    ctx.setLineDash([]);
    // 控制点
    const handles = this._getHandles(bbox, pad);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6c63ff';
    ctx.lineWidth = 1.5;
    for (const h of handles) {
      ctx.fillRect(h.x - 4, h.y - 4, 8, 8);
      ctx.strokeRect(h.x - 4, h.y - 4, 8, 8);
    }
    ctx.restore();
  }

  _getObjBBox(obj) {
    const p = obj.params || {};
    let w = 50, h = 50;
    if (obj.type === 'circle') { w = h = (p.radius || 25) * 2; }
    else if (obj.type === 'rect') { w = p.width || 50; h = p.height || 50; }
    else if (obj.type === 'ellipse') { w = (p.rx || 25) * 2; h = (p.ry || 25) * 2; }
    else if (obj.type === 'line' || obj.type === 'arrow') { w = Math.abs(p.x2 || 50); h = Math.abs(p.y2 || 0); }
    else if (obj.type === 'composite' && obj.children) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const c of obj.children) {
        const cb = this._getObjBBox(c);
        minX = Math.min(minX, cb.x); minY = Math.min(minY, cb.y);
        maxX = Math.max(maxX, cb.x + cb.w); maxY = Math.max(maxY, cb.y + cb.h);
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    return { x: -w / 2, y: -h / 2, w, h };
  }

  _getHandles(bbox, pad) {
    const { x, y, w, h } = bbox;
    return [
      { x: x - pad, y: y - pad },
      { x: x + w / 2, y: y - pad },
      { x: x + w + pad, y: y - pad },
      { x: x + w + pad, y: y + h / 2 },
      { x: x + w + pad, y: y + h + pad },
      { x: x + w / 2, y: y + h + pad },
      { x: x - pad, y: y + h + pad },
      { x: x - pad, y: y + h / 2 },
    ];
  }

  // ========== 网格 ==========
  _drawGrid(ctx) {
    const { width, height } = this.canvas;
    const step = 20;
    ctx.save();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.restore();
  }

  // ========== 视图控制 ==========
  zoom(factor) {
    this.viewTransform.scale *= factor;
    this.render();
  }

  pan(dx, dy) {
    this.viewTransform.offsetX += dx;
    this.viewTransform.offsetY += dy;
    this.render();
  }

  resetView() {
    this.viewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
    this.render();
  }

  toggleGrid() {
    this._showGrid = !this._showGrid;
    this.render();
  }

  // ========== 画布设置 ==========
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }

  setBackground(color) {
    this._background = color;
    this._gradientBg = null;
    this.render();
  }

  setGradientBackground(gradient) {
    this._gradientBg = gradient;
    this.render();
  }

  // ========== 导出 ==========
  exportPNG(scale = 1) {
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = this.canvas.width * scale;
    tmpCanvas.height = this.canvas.height * scale;
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.scale(scale, scale);
    tmpCtx.drawImage(this.canvas, 0, 0);
    return tmpCanvas.toDataURL('image/png');
  }

  // ========== Q版风格渲染方法 ==========

  /**
   * 应用Q版风格默认值到 DrawingObject
   */
  applyQBStyle(obj) {
    if (!obj.strokeColor) obj.strokeColor = QB_STYLE.STROKE_COLOR;
    if (!obj.strokeWidth) obj.strokeWidth = QB_STYLE.STROKE_WIDTH;
    if (obj.fill === undefined) obj.fill = true;
    return obj;
  }

  /**
   * 绘制眼睛高光（白色圆点）
   */
  _drawQBHighlight(ctx, eyeObj) {
    const { radius: r = 8, rx = 8, ry = 8 } = eyeObj.params || {};
    const eyeR = Math.max(r, rx, ry);
    // 主高光
    const hR = Math.min(Math.max(eyeR * 0.35, QB_STYLE.HIGHLIGHT_RADIUS_MIN), QB_STYLE.HIGHLIGHT_RADIUS_MAX);
    ctx.fillStyle = QB_STYLE.HIGHLIGHT_COLOR;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(eyeObj.x + eyeR * 0.25, eyeObj.y - eyeR * 0.25, hR, 0, Math.PI * 2);
    ctx.fill();
    // 副高光
    const hR2 = Math.min(Math.max(eyeR * 0.18, 1.5), QB_STYLE.HIGHLIGHT_RADIUS_MAX);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(eyeObj.x - eyeR * 0.15, eyeObj.y + eyeR * 0.1, hR2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /**
   * 绘制腮红（粉色半透明椭圆）
   */
  _drawQBBlush(ctx, x, y, radiusX, radiusY) {
    ctx.fillStyle = QB_STYLE.BLUSH_COLOR;
    ctx.globalAlpha = QB_STYLE.BLUSH_OPACITY;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /**
   * 绘制Q版鼻子
   * @param {'triangle'|'dot'|'oval'} type
   */
  _drawQBNose(ctx, x, y, type = 'triangle') {
    ctx.fillStyle = '#f472b6';
    ctx.strokeStyle = QB_STYLE.STROKE_COLOR;
    ctx.lineWidth = 1.5;
    if (type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x - 3, y + 2);
      ctx.lineTo(x + 3, y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === 'dot') {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(x, y, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 一次性渲染完整Q版形象（用于模板实例化）
   * @param {Object[]} parts - TemplatePart 数组
   * @param {Object} options - size/position/colorOverrides
   * @returns {import('./ObjectStore.js').DrawingObject} 根对象（composite）
   */
  renderQBFigure(parts, options = {}) {
    const { size = { width: 200, height: 200 }, position = { x: 0, y: 0 }, colorOverrides = {} } = options;
    // 按 drawingOrder 排序
    const sorted = [...parts].sort((a, b) => (a.drawingOrder || 0) - (b.drawingOrder || 0));
    // 应用颜色覆盖和Q版默认值
    for (const part of sorted) {
      if (part.colorSlot && colorOverrides[part.colorSlot]) {
        if (part.fill === false || part.fillColor === null) {
          part.strokeColor = colorOverrides[part.colorSlot];
        } else {
          part.fillColor = colorOverrides[part.colorSlot];
        }
      }
      this.applyQBStyle(part);
    }
    // 添加到 ObjectStore 并渲染
    const root = {
      id: `fig_${Date.now()}`,
      type: 'composite',
      name: 'Q版图形',
      x: position.x, y: position.y,
      params: {},
      strokeColor: null, fillColor: null, fill: false,
      strokeWidth: null, opacity: 1, rotation: 0,
      scaleX: 1, scaleY: 1, visible: true, locked: false,
      layer: null, children: sorted, path: null,
      gradient: null, shadow: null, templateRef: null,
    };
    this.objectStore.addObject(root);
    this.render();
    return root;
  }

  // ========== 逐步绘制动画 ==========

  /**
   * 逐步绘制动画 — 逐个添加对象并渲染
   * @param {Object[]} actions - 操作数组
   * @param {Object} options - stepDelay/onProgress/onComplete
   */
  async animateActions(actions, options = {}) {
    const { stepDelay = 60, onProgress, onComplete } = options;
    const allObjects = [];

    // 提取所有需要添加的对象
    for (const action of actions) {
      if (action.op === 'add' && action.object) {
        allObjects.push(action.object);
      } else if (action.op === 'batch' && action.actions) {
        for (const sub of action.actions) {
          if (sub.object) allObjects.push(sub.object);
        }
      }
    }

    // 逐步添加并渲染
    for (let i = 0; i < allObjects.length; i++) {
      this.applyQBStyle(allObjects[i]);
      this.objectStore.addObject(allObjects[i]);
      this.render();
      if (onProgress) onProgress(i + 1, allObjects.length);
      if (i < allObjects.length - 1) {
        await new Promise(r => setTimeout(r, stepDelay));
      }
    }

    if (onComplete) onComplete(allObjects.length);
  }

  /**
   * 模板专用逐步绘制
   */
  async animateTemplateParts(parts, options = {}) {
    const sorted = [...parts].sort((a, b) => (a.drawingOrder || 0) - (b.drawingOrder || 0));
    return this.animateActions(
      sorted.map(p => ({ op: 'add', object: p })),
      options
    );
  }
}
