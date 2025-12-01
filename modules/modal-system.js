/**
 * 模态框系统 - 统一的系统提示和确认对话框
 * Modal System - Unified system alerts and confirmation dialogs
 */

export class ModalSystem {
  constructor(modalEl) {
    this.modalEl = modalEl;
    this.modalTitle = document.getElementById('modal-title');
    this.modalText = document.getElementById('modal-text');
    this.btnConfirm = document.getElementById('modal-btn-confirm');
    this.btnCancel = document.getElementById('modal-btn-cancel');
  }

  /**
   * 显示模态框
   */
  show(text, isConfirm = false, onConfirm = null) {
    if (!this.modalEl) return;

    this.modalText.textContent = text;
    this.modalTitle.textContent = isConfirm ? '系统确认' : '系统提示';

    if (isConfirm) {
      this.btnCancel.classList.remove('hidden');
    } else {
      this.btnCancel.classList.add('hidden');
    }

    // 清理旧的事件监听器
    const oldConfirm = this.btnConfirm;
    const newConfirm = oldConfirm.cloneNode(true);
    oldConfirm.parentNode.replaceChild(newConfirm, oldConfirm);
    this.btnConfirm = newConfirm;

    const oldCancel = this.btnCancel;
    const newCancel = oldCancel.cloneNode(true);
    oldCancel.parentNode.replaceChild(newCancel, oldCancel);
    this.btnCancel = newCancel;

    // 添加新的事件监听器
    this.btnConfirm.onclick = () => {
      this.hide();
      if (onConfirm) onConfirm();
    };

    this.btnCancel.onclick = () => {
      this.hide();
    };

    this.modalEl.classList.remove('hidden');
  }

  /**
   * 隐藏模态框
   */
  hide() {
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
  }

  /**
   * 显示提示框
   */
  alert(text) {
    this.show(text, false);
  }

  /**
   * 显示确认框
   */
  confirm(text, callback) {
    this.show(text, true, callback);
  }
}

/**
 * 初始化全局模态框函数
 */
export function initGlobalModalFunctions(modalSystem) {
  window.sysAlert = (text) => modalSystem.alert(text);
  window.sysConfirm = (text, callback) => modalSystem.confirm(text, callback);
}
