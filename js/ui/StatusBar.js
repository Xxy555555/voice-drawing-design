// StatusBar.js — 底部状态栏 UI 组件

export class StatusBar {
  constructor() {
    this._elLayer = document.getElementById('status-layer');
    this._elObjects = document.getElementById('status-objects');
    this._elSelected = document.getElementById('status-selected');
    this._elUndo = document.getElementById('status-undo');
  }

  update({ layer, objectCount, selected, undoCount }) {
    if (this._elLayer) this._elLayer.textContent = `图层：${layer}`;
    if (this._elObjects) this._elObjects.textContent = `对象：${objectCount}`;
    if (this._elSelected) this._elSelected.textContent = `选中：${selected}`;
    if (this._elUndo) this._elUndo.textContent = `可撤销：${undoCount} 步`;
  }
}
