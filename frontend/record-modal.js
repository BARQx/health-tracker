import { $, $$, showToast, showUndoToast } from './dom.js';
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

  // Populate measurement fields
  const m = existing?.measurements || {};
  const measurementIds = ['waist', 'hip', 'neck', 'chest', 'arm', 'thigh'];
  measurementIds.forEach(id => {
    const el = $(`#log-${id}`);
    if (el) el.value = m[`${id}Cm`] ?? '';
  });

  // Collapse measurements section by default unless editing existing measurements
  const measFields = $('#measurements-fields');
  const measToggle = $('#btn-toggle-measurements');
  const hasMeasurements = Object.values(m).some(v => v != null && v !== '');
  if (measFields) measFields.style.display = hasMeasurements ? 'grid' : 'none';
  if (measToggle) measToggle.classList.toggle('expanded', hasMeasurements);

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
    measurements: (() => {
      const result = {};
      const measurementIds = ['waist', 'hip', 'neck', 'chest', 'arm', 'thigh'];
      measurementIds.forEach(id => {
        const el = $(`#log-${id}`);
        const val = el ? Number(el.value) : NaN;
        if (!isNaN(val) && val > 0) result[`${id}Cm`] = val;
      });
      return result;
    })()
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
  const record = state.records.find(r => r.date === date);
  if (!record) return;

  // Optimistic removal
  removeRecord(date);

  const committed = await showUndoToast(`Deleted record for ${date}`);

  if (!committed) {
    // User clicked Undo — restore the record locally
    addOrUpdateRecord(record);
    showToast('Record restored');
    return;
  }

  // Timer expired — commit the delete to the server
  try {
    await deleteRecordRemote(date);
  } catch (err) {
    // Remote failed — restore locally to stay consistent
    addOrUpdateRecord(record);
    console.error('Remote delete failed:', err);
    showToast(err.message || 'Failed to delete record');
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

  // Measurements toggle
  $('#btn-toggle-measurements')?.addEventListener('click', () => {
    const fields = $('#measurements-fields');
    const toggle = $('#btn-toggle-measurements');
    if (fields) {
      const isHidden = fields.style.display === 'none';
      fields.style.display = isHidden ? 'grid' : 'none';
      toggle?.classList.toggle('expanded', isHidden);
    }
  });
}
