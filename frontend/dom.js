/**
 * DOM query helpers and UI toast notifications
 */

export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

export function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * Shows a toast with an Undo button. Returns a promise:
 * - resolves `true` if the timer expires (action committed)
 * - resolves `false` if the user clicks Undo (action reverted)
 * @param {string} message
 * @param {number} [durationMs=5000]
 * @returns {Promise<boolean>}
 */
export function showUndoToast(message, durationMs = 5000) {
  const container = document.getElementById('toast-container');
  if (!container) return Promise.resolve(true);

  return new Promise(resolve => {
    const toast = document.createElement('div');
    toast.className = 'toast toast-undo';

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    const undoBtn = document.createElement('button');
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = 'Undo';

    const progressBar = document.createElement('div');
    progressBar.className = 'toast-progress';
    progressBar.style.animationDuration = `${durationMs}ms`;

    toast.append(textSpan, undoBtn, progressBar);
    container.appendChild(toast);

    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
      resolve(true);
    }, durationMs);

    undoBtn.addEventListener('click', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      toast.remove();
      resolve(false);
    });
  });
}
