import { $, showToast } from './dom.js';
import { submitAuth, syncRemoteData } from './sync.js';

export function openAuthModal() {
  const dialog = $('#auth-dialog');
  if (dialog && !dialog.open) {
    dialog.showModal();
  }
}

export function closeAuthModal() {
  const dialog = $('#auth-dialog');
  if (dialog && dialog.open) {
    dialog.close();
  }
}

export function initAuthDialog({ onAuthSuccess } = {}) {
  const form = $('#auth-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordInput = $('#auth-password');
    const password = passwordInput ? passwordInput.value : '';

    try {
      await submitAuth(password);
      closeAuthModal();
      showToast('Unlocked successfully');
      if (typeof onAuthSuccess === 'function') {
        onAuthSuccess();
      } else {
        syncRemoteData();
      }
    } catch (err) {
      showToast(err.message || 'Incorrect password');
    }
  });
}
