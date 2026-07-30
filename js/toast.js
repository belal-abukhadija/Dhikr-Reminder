import { t } from './i18n.js';

let toastEl = null;
let snackEl = null;
let toastTimer = null;
let snackTimer = null;

export function mountToastHost() {
  if (toastEl) return;

  toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');

  snackEl = document.createElement('div');
  snackEl.className = 'snackbar';
  snackEl.setAttribute('role', 'alert');
  snackEl.innerHTML = '<span class="snackbar-text"></span><button type="button" class="snackbar-action"></button>';

  document.body.append(toastEl, snackEl);
}

export function showToast(message) {
  mountToastHost();
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function hideUndo() {
  clearTimeout(snackTimer);
  snackEl.classList.remove('show');
}

/** A destructive action with a real, focusable Undo affordance. */
export function showUndo(message, onUndo, { timeout = 6000 } = {}) {
  mountToastHost();
  snackEl.querySelector('.snackbar-text').textContent = message;

  const action = snackEl.querySelector('.snackbar-action');
  action.textContent = t('undo');
  // Replace the node so any listener from a previous undo is dropped.
  const fresh = action.cloneNode(true);
  action.replaceWith(fresh);
  fresh.addEventListener('click', () => { hideUndo(); onUndo(); });

  snackEl.classList.add('show');
  clearTimeout(snackTimer);
  snackTimer = setTimeout(hideUndo, timeout);
}
