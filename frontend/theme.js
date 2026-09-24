import { storage } from './storage.js';
import { $ } from './dom.js';

let themeChangeListeners = [];

export function onThemeChange(listener) {
  themeChangeListeners.push(listener);
}

export function initTheme() {
  const savedTheme = storage.get('health_theme', null);
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const activeTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', activeTheme);
  updateThemeIcon(activeTheme);

  // Listen to system changes if user hasn't set an explicit preference
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!storage.get('health_theme', null)) {
      const next = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      updateThemeIcon(next);
      themeChangeListeners.forEach(fn => fn(next));
    }
  });
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  storage.set('health_theme', next);
  updateThemeIcon(next);
  themeChangeListeners.forEach(fn => fn(next));
}

export function updateThemeIcon(theme) {
  const icon = $('#theme-toggle-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
}
