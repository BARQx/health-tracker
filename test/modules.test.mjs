import test from 'node:test';
import assert from 'node:assert/strict';

// Set up mock localStorage for node environment before importing state
const mockStore = {};
globalThis.localStorage = {
  getItem: (key) => mockStore[key] ?? null,
  setItem: (key, val) => { mockStore[key] = String(val); },
  removeItem: (key) => { delete mockStore[key]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }
};

import {
  state,
  subscribe,
  setProfile,
  setRecords,
  addOrUpdateRecord,
  removeRecord,
  setTimeframe,
  setChartMode,
  setFormulaTab
} from '../frontend/state.js';

import {
  formatDisplayDate,
  groupRecordsByYear
} from '../frontend/views/history-view.js';

test('state management: reactivity, subscribers and updates', () => {
  let subscriberCalled = 0;
  const unsubscribe = subscribe(() => {
    subscriberCalled++;
  });

  // Test setProfile
  setProfile({ name: 'Alex', heightCm: 175, birthDate: '1995-05-10', sex: 'male' });
  assert.equal(state.profile.name, 'Alex');
  assert.equal(subscriberCalled, 1);
  assert.ok(mockStore.health_profile.includes('Alex'));

  // Test setRecords
  const sampleRecords = [
    { date: '2026-01-01', weight: 80.5 },
    { date: '2026-01-05', weight: 80.0 }
  ];
  setRecords(sampleRecords);
  assert.equal(state.records.length, 2);
  assert.equal(subscriberCalled, 2);

  // Test addOrUpdateRecord - new record
  addOrUpdateRecord({ date: '2026-01-10', weight: 79.5 });
  assert.equal(state.records.length, 3);
  assert.equal(state.records[2].weight, 79.5);
  assert.equal(subscriberCalled, 3);

  // Test addOrUpdateRecord - update existing record
  addOrUpdateRecord({ date: '2026-01-10', weight: 79.2 });
  assert.equal(state.records.length, 3);
  assert.equal(state.records[2].weight, 79.2);
  assert.equal(subscriberCalled, 4);

  // Test removeRecord
  removeRecord('2026-01-05');
  assert.equal(state.records.length, 2);
  assert.equal(state.records.find(r => r.date === '2026-01-05'), undefined);
  assert.equal(subscriberCalled, 5);

  // Test setTimeframe, chartMode, formulaTab
  setTimeframe('90d', true);
  assert.equal(state.timeframe, '90d');
  assert.equal(state.hasExplicitTimeframeSelection, true);

  setChartMode('fat');
  assert.equal(state.chartMode, 'fat');

  setFormulaTab('bmi');
  assert.equal(state.formulaTab, 'bmi');

  // Test unsubscribe
  unsubscribe();
  setChartMode('weight');
  assert.equal(subscriberCalled, 8); // No extra call after unsubscribe
});

test('history-view: formatDisplayDate correctly parses ISO dates', () => {
  const result = formatDisplayDate('2026-09-24');
  assert.equal(result.formatted, 'Sep 24, 2026');
  assert.equal(result.weekday, 'Thu');
});

test('history-view: groupRecordsByYear groups and calculates correctly', () => {
  const records = [
    { date: '2025-06-15', weight: 85.0 },
    { date: '2026-01-01', weight: 82.0 },
    { date: '2026-03-10', weight: 79.5 }
  ];

  const { validRecords, yearGroups } = groupRecordsByYear(records);
  assert.equal(validRecords.length, 3);
  // Descending sort
  assert.equal(validRecords[0].date, '2026-03-10');
  assert.equal(validRecords[2].date, '2025-06-15');

  assert.ok(yearGroups['2026']);
  assert.ok(yearGroups['2025']);
  assert.equal(yearGroups['2026'].length, 2);
  assert.equal(yearGroups['2025'].length, 1);
});
