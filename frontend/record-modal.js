import { $, $$, showToast } from './dom.js';
import { state, addOrUpdateRecord, removeRecord } from './state.js';
import { saveRecordRemote, deleteRecordRemote } from './sync.js';

export function openLogModal(dateToEdit = null) {
  const dialog = $('#log-dialog');
  if (!dialog) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const targetDate = dateToEdit || todayStr;
  const existing = state.records.find(r => r.date === targetDate);

  const dateEl = $('#log-date');
  const weightEl = $('#log-weight');
  const notesEl = $('#log-notes');

  if (dateEl) dateEl.value = targetDate;
  if (weightEl) weightEl.value = existing ? existing.weight.toFixed(2) : '';
  if (notesEl) notesEl.value = existing?.notes || '';

  const activeTags = new Set(existing?.tags || []);
  $$('.tag-chip').forEach(chip => {
    chip.classList.toggle('active', activeTags.has(chip.dataset.tag));
  });

  dialog.showModal();
}

export function closeLogModal() {
  const dialog = $('#log-dialog');
  if (dialog && dialog.open) {
    dialog.close();
  }
}

async function handleLogSubmit(e) {
  e.preventDefault();
  const dateEl = $('#log-date');
  const weightEl = $('#log-weight');
  const notesEl = $('#log-notes');

  const date = dateEl ? dateEl.value : '';
  const weight = weightEl ? Number(weightEl.value) : NaN;
  const notes = notesEl ? (notesEl.value.trim() || null) : null;
  const tags = $$('.tag-chip.active').map(chip => chip.dataset.tag);

  if (!date || isNaN(weight) || weight <= 0) {
    showToast('Please enter a valid weight');
    return;
  }

  const record = {
    date,
    weight: Number(weight.toFixed(2)),
    notes,
    tags,
    measurements: {}
  };

  addOrUpdateRecord(record);
  closeLogModal();
  showToast(`Logged ${weight.toFixed(2)} kg on ${date}`);

  try {
    await saveRecordRemote(record);
  } catch (err) {
    console.error('Remote record sync failed:', err);
  }
}

export async function handleDeleteRecord(date) {
  if (!confirm(`Delete record for ${date}?`)) return;

  removeRecord(date);
  showToast('Record deleted');

  try {
    await deleteRecordRemote(date);
  } catch (err) {
    console.error('Remote delete failed:', err);
    showToast(err.message || 'Offline: record removed locally');
  }
}

export function initRecordModal() {
  $('#btn-open-log-modal')?.addEventListener('click', () => openLogModal());
  $('#log-form')?.addEventListener('submit', handleLogSubmit);
  $('#btn-close-log')?.addEventListener('click', closeLogModal);

  // Quick tag chips in entry modal
  $$('.tag-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.target.classList.toggle('active');
    });
  });
}
