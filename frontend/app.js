/**
 * HealthTracker - Main Application Orchestrator
 */

import { $ } from './dom.js';
import { subscribe } from './state.js';
import { initTheme, toggleTheme } from './theme.js';
import { initChartController, updateChart } from './chart-controller.js';
import { initAuthDialog, openAuthModal } from './auth.js';
import { initProfileDialog, openProfileModal, renderProfileBar } from './profile.js';
import { initRecordModal } from './record-modal.js';
import { renderCheckinBanner } from './views/cadence-banner.js';
import { renderHeroStats } from './views/hero-stats.js';
import { renderFormulas, initFormulaTabs } from './views/formulas-view.js';
import { renderHistory } from './views/history-view.js';
import { syncRemoteData, exportData } from './sync.js';

function renderApp() {
  renderProfileBar();
  renderCheckinBanner();
  renderHeroStats();
  updateChart();
  renderFormulas();
  renderHistory();
}

function initEventHandlers() {
  // Theme toggle
  $('#btn-toggle-theme')?.addEventListener('click', toggleTheme);

  // Backup & Export
  $('#btn-export-json')?.addEventListener('click', () => exportData('json'));
  $('#btn-export-csv')?.addEventListener('click', () => exportData('csv'));
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize presentation & theme
  initTheme();

  // Initialize interactive controllers & dialogs
  initChartController();
  initAuthDialog({
    onAuthSuccess: () => syncRemoteData({
      onAuthRequired: openAuthModal,
      onProfileSetupRequired: openProfileModal
    })
  });
  initProfileDialog();
  initRecordModal();
  initFormulaTabs();
  initEventHandlers();

  // Reactive view binding
  subscribe(renderApp);

  // Initial render from local cache
  renderApp();

  // Cloud sync
  syncRemoteData({
    onAuthRequired: openAuthModal,
    onProfileSetupRequired: openProfileModal
  });
});
