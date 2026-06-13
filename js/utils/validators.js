// validators.js — LLM 操作校验 + Q版风格校验 + 自动补全
import { OP_TYPES, SHAPE_TYPES, QB_STYLE, LIMITS } from './constants.js';
import { generateId } from './helpers.js';

const VALID_OPS = new Set(Object.values(OP_TYPES));
const VALID_TYPES = new Set(Object.values(SHAPE_TYPES));

/**
 * 校验单个操作
 */
export function validateAction(action, objectStore) {
  const errors = [];

  if (!action || !action.op) {
    return { valid: false, errors: ['缺少 op 字段'] };
  }

  if (!VALID_OPS.has(action.op)) {
    return { valid: false, errors: [`未知的操作类型: ${action.op}`] };
  }

  switch (action.op) {
    case OP_TYPES.ADD:
      if (!action.object) { errors.push('add 操作缺少 object 字段'); break; }
      if (!VALID_TYPES.has(action.object.type) && action.object.type !== 'path') {
        errors.push(`未知的图形类型: ${action.object.type}`);
      }
      if (action.object.params === undefined) {
        errors.push('object 缺少 params 字段');
      }
      break;

    case OP_TYPES.UPDATE:
      if (!action.objectId) { errors.push('update 操作缺少 objectId'); break; }
      if (objectStore && !objectStore.getObject(action.objectId)) {
        errors.push(`对象不存在: ${action.objectId}`);
      }
      if (!action.changes || Object.keys(action.changes).length === 0) {
        errors.push('update 操作的 changes 为空');
      }
      break;

    case OP_TYPES.DELETE:
      if (!action.objectId) { errors.push('delete 操作缺少 objectId'); break; }
      if (objectStore && !objectStore.getObject(action.objectId)) {
        errors.push(`对象不存在: ${action.objectId}`);
      }
      break;

    case OP_TYPES.MOVE:
      if (!action.objectId) { errors.push('move 操作缺少 objectId'); break; }
      if (objectStore && !objectStore.getObject(action.objectId)) {
        errors.push(`对象不存在: ${action.objectId}`);
      }
      if (typeof action.x !== 'number' || typeof action.y !== 'number') {
        errors.push('move 操作的 x/y 必须是数字');
      }
      break;

    case OP_TYPES.ADD_CHILD:
      if (!action.parentId) { errors.push('addChild 操作缺少 parentId'); break; }
      if (objectStore && !objectStore.getObject(action.parentId)) {
        errors.push(`父对象不存在: ${action.parentId}`);
      }
      if (!action.object) { errors.push('addChild 操作缺少 object'); }
      break;

    case OP_TYPES.BATCH:
      if (!Array.isArray(action.actions) || action.actions.length === 0) {
        errors.push('batch 操作的 actions 必须是非空数组'); break;
      }
      if (action.actions.length > LIMITS.MAX_CHILDREN_PER_BATCH) {
        errors.push(`batch 子操作数超过限制 (${action.actions.length} > ${LIMITS.MAX_CHILDREN_PER_BATCH})`);
      }
      for (let i = 0; i < action.actions.length; i++) {
        const sub = validateAction(action.actions[i], objectStore);
        if (!sub.valid) {
          errors.push(`batch[${i}]: ${sub.errors.join(', ')}`);
        }
      }
      break;

    case OP_TYPES.USE_TEMPLATE:
      if (!action.templateId) { errors.push('useTemplate 操作缺少 templateId'); }
      // templateId 存在性由 ConversationManager 在执行时检查
      break;

    case OP_TYPES.SAVE_TEMPLATE:
      if (!action.name) { errors.push('saveTemplate 操作缺少 name'); }
      break;

    case OP_TYPES.CLARIFY:
      if (!action.reply) { errors.push('clarify 操作缺少 reply'); }
      break;

    case OP_TYPES.REPLY:
      // 纯回复，无需额外校验
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 校验操作数组
 */
export function validateActions(actions, objectStore) {
  if (!Array.isArray(actions)) {
    return { valid: false, errors: ['actions 必须是数组'], allErrors: [] };
  }
  const allErrors = [];
  let validCount = 0;
  for (let i = 0; i < actions.length; i++) {
    const result = validateAction(actions[i], objectStore);
    if (!result.valid) {
      allErrors.push({ index: i, errors: result.errors });
    } else {
      validCount++;
    }
  }
  return {
    valid: allErrors.length === 0,
    errors: allErrors.map(e => `actions[${e.index}]: ${e.errors.join(', ')}`),
    allErrors,
    validCount,
  };
}

/**
 * 清洗操作，补全默认值
 */
export function sanitizeAction(action) {
  if (!action || !action.object) return action;
  const obj = action.object;

  // 补全描边
  if (!obj.strokeColor) obj.strokeColor = QB_STYLE.STROKE_COLOR;
  if (!obj.strokeWidth) obj.strokeWidth = QB_STYLE.STROKE_WIDTH;

  // 补全 ID
  if (!obj.id) obj.id = generateId('obj');

  // 补全名称
  if (!obj.name) obj.name = obj.type;

  // 补全位置（画布中心）
  if (obj.x === undefined) obj.x = 600;
  if (obj.y === undefined) obj.y = 400;

  // fill 默认 true
  if (obj.fill === undefined) obj.fill = true;

  // opacity 默认 1
  if (obj.opacity === undefined) obj.opacity = 1;

  return action;
}

/**
 * Q版风格自动补全：检查 batch 操作是否缺少Q版要素
 */
export function sanitizeQBStyles(actions) {
  const fixes = [];

  for (const action of actions) {
    if (action.op === OP_TYPES.ADD && action.object) {
      sanitizeAction(action);
    }
    if (action.op === OP_TYPES.BATCH && action.actions) {
      for (const sub of action.actions) {
        if (sub.object) sanitizeAction(sub);
      }

      // 检查是否有"眼睛"但缺少高光
      const parts = action.actions.filter(a => a.object);
      const eyeParts = parts.filter(a =>
        a.object.name?.includes('眼') || a.object.name?.includes('eye')
      );
      const highlightParts = parts.filter(a =>
        a.object.name?.includes('高光') || a.object.name?.includes('highlight')
      );
      const blushParts = parts.filter(a =>
        a.object.name?.includes('腮红') || a.object.name?.includes('blush')
      );

      // 自动补全高光
      if (eyeParts.length > 0 && highlightParts.length < eyeParts.length * 2) {
        for (const eye of eyeParts) {
          const ex = eye.object.x || 0;
          const ey = eye.object.y || 0;
          const er = eye.object.params?.radius || eye.object.params?.rx || 8;
          action.actions.push(
            { op: OP_TYPES.ADD, object: {
              id: generateId('obj'), type: 'circle', name: '高光',
              x: ex + er * 0.25, y: ey - er * 0.25,
              params: { radius: Math.min(Math.max(er * 0.35, 2), 4) },
              fillColor: 'white', fill: true, strokeColor: null,
              strokeWidth: 0, opacity: 0.9, drawingOrder: 50,
            }},
            { op: OP_TYPES.ADD, object: {
              id: generateId('obj'), type: 'circle', name: '副高光',
              x: ex - er * 0.15, y: ey + er * 0.1,
              params: { radius: Math.min(Math.max(er * 0.18, 1.5), 2.5) },
              fillColor: 'white', fill: true, strokeColor: null,
              strokeWidth: 0, opacity: 0.5, drawingOrder: 51,
            }}
          );
          fixes.push(`为 "${eye.object.name}" 自动添加高光`);
        }
      }

      // 自动补全腮红
      if (eyeParts.length > 0 && blushParts.length === 0) {
        const leftEye = eyeParts[0];
        const rightEye = eyeParts.length > 1 ? eyeParts[1] : eyeParts[0];
        const ly = (leftEye.object.y || 0) + (leftEye.object.params?.radius || 8) * 0.5;
        const ry = (rightEye.object.y || 0) + (rightEye.object.params?.radius || 8) * 0.5;
        action.actions.push(
          { op: OP_TYPES.ADD, object: {
            id: generateId('obj'), type: 'ellipse', name: '左腮红',
            x: (leftEye.object.x || 0) - 15, y: ly,
            params: { rx: 8, ry: 5 },
            fillColor: '#fca5a5', fill: true, strokeColor: null,
            strokeWidth: 0, opacity: 0.4, drawingOrder: 52,
          }},
          { op: OP_TYPES.ADD, object: {
            id: generateId('obj'), type: 'ellipse', name: '右腮红',
            x: (rightEye.object.x || 0) + 15, y: ry,
            params: { rx: 8, ry: 5 },
            fillColor: '#fca5a5', fill: true, strokeColor: null,
            strokeWidth: 0, opacity: 0.4, drawingOrder: 52,
          }}
        );
        fixes.push('自动添加腮红');
      }

      // 检查部件数过少
      if (parts.length < 15) {
        fixes.push(`batch 只有 ${parts.length} 个部件，Q版建议 30-50 个`);
      }
    }
  }

  return { actions, fixes };
}
