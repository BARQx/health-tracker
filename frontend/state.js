import { storage } from './storage.js';
import { sanitizeRecords } from './formulas.js';

const listeners = new Set();

export const state = {
  profile: storage.get('health_profile', null),
  records: sanitizeRecords(storage.get('health_records', [])),
  timeframe: '30d',
  hasExplicitTimeframeSelection: false,
  chartMode: 'weight',
  formulaTab: 'all',
  isAuthenticated: true
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify() {
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (err) {
      console.error('Error in state subscriber:', err);
    }
  }
}

export function setProfile(newProfile) {
  state.profile = newProfile;
  storage.set('health_profile', state.profile);
  notify();
}

export function setRecords(newRecords) {
  const sanitized = sanitizeRecords(newRecords);
  sanitized.sort((a, b) => a.date.localeCompare(b.date));
  state.records = sanitized;
  storage.set('health_records', state.records);
  notify();
}

export function addOrUpdateRecord(record) {
  const existingIdx = state.records.findIndex(r => r.date === record.date);
  if (existingIdx >= 0) {
    state.records[existingIdx] = record;
  } else {
    state.records.push(record);
  }
  state.records.sort((a, b) => a.date.localeCompare(b.date));
  storage.set('health_records', state.records);
  notify();
}

export function removeRecord(date) {
  state.records = state.records.filter(r => r.date !== date);
  storage.set('health_records', state.records);
  notify();
}

export function setTimeframe(tf, isExplicit = false) {
  state.timeframe = tf;
  if (isExplicit) {
    state.hasExplicitTimeframeSelection = true;
  }
  notify();
}

export function setChartMode(mode) {
  state.chartMode = mode;
  notify();
}

export function setFormulaTab(tab) {
  state.formulaTab = tab;
  notify();
}
