import { storage } from './storage.js';
import { HealthChart } from './chart.js';
import {
  calculateAge,
  standardBmi,
  oxfordBmi,
  bmiPrime,
  getBmiCategory,
  deurenbergBodyFat,
  gallagherBodyFat,
  cunBaeBodyFat,
  calculateBodyComposition,
  calculateIdealBodyWeight,
  mifflinStJeorBmr,
  revisedHarrisBenedictBmr,
  calculateTdee,
  calculateTrendWeights
} from './formulas.js';

// --- State Management ---
const state = {
  profile: storage.get('health_profile', null),
  records: storage.get('health_records', []),
  timeframe: '30d',
  chartMode: 'weight',
  isAuthenticated: true,
  chart: null
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initChart();
  initEventHandlers();
  renderApp();
  syncRemoteData();
});

// --- Theme Management ---
function initTheme() {
  const savedTheme = storage.get('health_theme', null);
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const activeTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', activeTheme);
  updateThemeIcon(activeTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  storage.set('health_theme', next);
  updateThemeIcon(next);
  if (state.chart) {
    state.chart.render();
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
}

// --- Chart Initialization ---
function initChart() {
  const canvas = document.getElementById('trend-canvas');
  if (canvas) {
    state.chart = new HealthChart(canvas);
  }
}

// --- Toast Alerts ---
function showToast(message) {
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

// --- Event Handlers ---
function initEventHandlers() {
  // Theme button
  document.getElementById('btn-toggle-theme')?.addEventListener('click', toggleTheme);

  // Profile modal
  document.getElementById('btn-edit-profile')?.addEventListener('click', openProfileModal);
  document.getElementById('profile-form')?.addEventListener('submit', handleProfileSubmit);
  document.getElementById('btn-close-profile')?.addEventListener('click', () => {
    document.getElementById('profile-dialog')?.close();
  });

  // Log entry modal
  document.getElementById('btn-open-log-modal')?.addEventListener('click', () => openLogModal());
  document.getElementById('log-form')?.addEventListener('submit', handleLogSubmit);
  document.getElementById('btn-close-log')?.addEventListener('click', () => {
    document.getElementById('log-dialog')?.close();
  });

  // Timeframe pills
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.timeframe = e.target.dataset.timeframe;
      updateChart();
    });
  });

  // Metric mode pills (weight | fat | bmi)
  document.querySelectorAll('.metric-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.metric-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.chartMode = e.target.dataset.metric;
      updateChart();
    });
  });

  // Quick tag chips in entry modal
  document.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.target.classList.toggle('active');
    });
  });

  // Export buttons
  document.getElementById('btn-export-json')?.addEventListener('click', () => exportData('json'));
  document.getElementById('btn-export-csv')?.addEventListener('click', () => exportData('csv'));

  // Auth unlock modal
  document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit);
}

// --- Data Synchronization ---
async function syncRemoteData() {
  try {
    const authRes = await fetch('/api/auth');
    if (authRes.ok) {
      const authData = await authRes.json();
      if (authData.authenticated === false) {
        document.getElementById('auth-dialog')?.showModal();
        return;
      }
    }

    // Fetch profile
    const profileRes = await fetch('/api/profile');
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      if (profileData.profile) {
        state.profile = profileData.profile;
        storage.set('health_profile', state.profile);
      } else if (!state.profile) {
        // If no profile exists, prompt user to set it up
        openProfileModal();
      }
    }

    // Fetch records
    const recordsRes = await fetch('/api/records');
    if (recordsRes.ok) {
      const recordsData = await recordsRes.json();
      if (Array.isArray(recordsData.records)) {
        state.records = recordsData.records;
        storage.set('health_records', state.records);
      }
    }

    renderApp();
  } catch (err) {
    console.warn('Working in offline/cached mode:', err);
  }
}

// --- Auth Submission ---
async function handleAuthSubmit(e) {
  e.preventDefault();
  const password = document.getElementById('auth-password').value;
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (res.ok) {
      document.getElementById('auth-dialog')?.close();
      showToast('Unlocked successfully');
      syncRemoteData();
    } else {
      const err = await res.json();
      showToast(err.error || 'Incorrect password');
    }
  } catch {
    showToast('Failed to connect to authentication service');
  }
}

// --- Profile Modal & Handlers ---
function openProfileModal() {
  const dialog = document.getElementById('profile-dialog');
  if (!dialog) return;
  const p = state.profile || {};
  document.getElementById('profile-name').value = p.name || '';
  document.getElementById('profile-birthdate').value = p.birthDate ? p.birthDate.split('T')[0] : '';
  document.getElementById('profile-sex').value = p.sex || 'male';
  document.getElementById('profile-height').value = p.heightCm || '';
  document.getElementById('profile-target-weight').value = p.targetWeightKg || '';
  dialog.showModal();
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  const profile = {
    name: document.getElementById('profile-name').value.trim(),
    birthDate: document.getElementById('profile-birthdate').value,
    sex: document.getElementById('profile-sex').value,
    heightCm: Number(document.getElementById('profile-height').value),
    targetWeightKg: document.getElementById('profile-target-weight').value ? Number(document.getElementById('profile-target-weight').value) : null
  };

  state.profile = profile;
  storage.set('health_profile', profile);
  renderApp();
  document.getElementById('profile-dialog')?.close();
  showToast('Profile updated');

  try {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
  } catch (err) {
    console.error('Remote profile save failed:', err);
  }
}

// --- Log Weight Modal & Handlers ---
function openLogModal(dateToEdit = null) {
  const dialog = document.getElementById('log-dialog');
  if (!dialog) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const targetDate = dateToEdit || todayStr;
  const existing = state.records.find(r => r.date === targetDate);

  document.getElementById('log-date').value = targetDate;
  document.getElementById('log-weight').value = existing ? existing.weight.toFixed(2) : '';
  document.getElementById('log-notes').value = existing?.notes || '';

  const activeTags = new Set(existing?.tags || []);
  document.querySelectorAll('.tag-chip').forEach(chip => {
    chip.classList.toggle('active', activeTags.has(chip.dataset.tag));
  });

  dialog.showModal();
}

async function handleLogSubmit(e) {
  e.preventDefault();
  const date = document.getElementById('log-date').value;
  const weight = Number(document.getElementById('log-weight').value);
  const notes = document.getElementById('log-notes').value.trim() || null;
  const tags = Array.from(document.querySelectorAll('.tag-chip.active')).map(chip => chip.dataset.tag);

  if (!date || isNaN(weight) || weight <= 0) {
    showToast('Please enter a valid weight');
    return;
  }

  // Update locally first
  const existingIdx = state.records.findIndex(r => r.date === date);
  const record = { date, weight: Number(weight.toFixed(2)), notes, tags, measurements: {} };

  if (existingIdx >= 0) {
    state.records[existingIdx] = record;
  } else {
    state.records.push(record);
  }

  state.records.sort((a, b) => a.date.localeCompare(b.date));
  storage.set('health_records', state.records);

  renderApp();
  document.getElementById('log-dialog')?.close();
  showToast(`Logged ${weight.toFixed(2)} kg on ${date}`);

  try {
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
  } catch (err) {
    console.error('Remote record sync failed:', err);
  }
}

async function deleteRecord(date) {
  if (!confirm(`Delete record for ${date}?`)) return;
  state.records = state.records.filter(r => r.date !== date);
  storage.set('health_records', state.records);
  renderApp();
  showToast('Record deleted');

  try {
    await fetch(`/api/records?date=${date}`, { method: 'DELETE' });
  } catch (err) {
    console.error('Remote delete failed:', err);
  }
}

// --- Render Main Application ---
function renderApp() {
  renderProfileBar();
  renderHeroStats();
  updateChart();
  renderFormulas();
  renderHistory();
}

function renderProfileBar() {
  const p = state.profile;
  const nameEl = document.getElementById('display-name');
  const metaEl = document.getElementById('display-meta');
  const avatarEl = document.getElementById('display-avatar');

  if (!p) {
    if (nameEl) nameEl.textContent = 'Set up your profile';
    if (metaEl) metaEl.textContent = 'Tap edit to add height, birthdate & sex';
    if (avatarEl) avatarEl.textContent = '?';
    return;
  }

  const age = calculateAge(p.birthDate);
  const sexLabel = p.sex === 'female' ? 'Female' : 'Male';
  if (nameEl) nameEl.textContent = p.name;
  if (metaEl) metaEl.textContent = `${age} yrs · ${sexLabel} · ${p.heightCm} cm`;
  if (avatarEl) avatarEl.textContent = p.name.charAt(0).toUpperCase();
}

function renderHeroStats() {
  const records = state.records;
  const targetWeight = state.profile?.targetWeightKg;
  const currentWeightEl = document.getElementById('stat-current-weight');
  const deltaEl = document.getElementById('stat-weight-delta');
  const trendEl = document.getElementById('stat-trend-weight');
  const targetEl = document.getElementById('stat-target-diff');

  if (!records || records.length === 0) {
    if (currentWeightEl) currentWeightEl.innerHTML = '-- <small>kg</small>';
    if (deltaEl) deltaEl.textContent = 'No records logged yet';
    if (trendEl) trendEl.textContent = '-- kg';
    if (targetEl) targetEl.textContent = targetWeight ? `Target: ${targetWeight.toFixed(2)} kg` : '--';
    return;
  }

  const smoothed = calculateTrendWeights(records);
  const latest = smoothed[smoothed.length - 1];
  const previous = smoothed.length > 1 ? smoothed[smoothed.length - 2] : null;

  if (currentWeightEl) {
    currentWeightEl.innerHTML = `${latest.weight.toFixed(2)} <small>kg</small>`;
  }

  if (deltaEl && previous) {
    const diff = latest.weight - previous.weight;
    const sign = diff >= 0 ? '+' : '';
    const className = diff <= 0 ? 'delta-negative' : 'delta-positive';
    deltaEl.className = `stat-subtext ${className}`;
    deltaEl.textContent = `${sign}${diff.toFixed(2)} kg vs previous entry`;
  } else if (deltaEl) {
    deltaEl.textContent = 'First logged entry';
  }

  if (trendEl) {
    trendEl.textContent = `${latest.trendWeight.toFixed(2)} kg`;
  }

  if (targetEl) {
    if (targetWeight) {
      const diffToTarget = latest.weight - targetWeight;
      const targetStr = diffToTarget > 0 ? `${diffToTarget.toFixed(2)} kg to goal` : `Goal reached! (+${Math.abs(diffToTarget).toFixed(2)} kg)`;
      targetEl.textContent = targetStr;
    } else {
      targetEl.textContent = 'No goal set';
    }
  }
}

// --- Chart Updates & Timeframe Filtering ---
function updateChart() {
  if (!state.chart) return;
  const records = state.records;
  if (!records || records.length === 0) {
    state.chart.setData([], state.profile?.targetWeightKg, state.chartMode);
    return;
  }

  const smoothed = calculateTrendWeights(records);
  const heightCm = state.profile?.heightCm || 170;
  const age = state.profile?.birthDate ? calculateAge(state.profile.birthDate) : 30;
  const sex = state.profile?.sex || 'male';

  // Enrich with BMI and Body Fat %
  const enriched = smoothed.map(r => {
    const bmi = standardBmi(r.weight, heightCm);
    const bmiTrend = standardBmi(r.trendWeight, heightCm);
    const bodyFat = deurenbergBodyFat(bmi, age, sex);
    const bodyFatTrend = deurenbergBodyFat(bmiTrend, age, sex);
    return {
      ...r,
      bmi,
      bmiTrend,
      bodyFat,
      bodyFatTrend
    };
  });

  // Filter by timeframe
  let filtered = enriched;
  const now = new Date();
  if (state.timeframe === '7d') {
    const cut = new Date(now.getTime() - 7 * 86400000);
    filtered = enriched.filter(r => new Date(r.date) >= cut);
  } else if (state.timeframe === '30d') {
    const cut = new Date(now.getTime() - 30 * 86400000);
    filtered = enriched.filter(r => new Date(r.date) >= cut);
  } else if (state.timeframe === '90d') {
    const cut = new Date(now.getTime() - 90 * 86400000);
    filtered = enriched.filter(r => new Date(r.date) >= cut);
  } else if (state.timeframe === '1y') {
    const cut = new Date(now.getTime() - 365 * 86400000);
    filtered = enriched.filter(r => new Date(r.date) >= cut);
  }

  state.chart.setData(filtered, state.profile?.targetWeightKg, state.chartMode);
}

// --- Formula Comparison Card Rendering ---
function renderFormulas() {
  const records = state.records;
  const p = state.profile;
  const container = document.getElementById('formula-cards-container');
  if (!container) return;

  if (!p || !p.heightCm || records.length === 0) {
    container.innerHTML = `
      <div class="formula-card" style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted);">
        Add profile details (height, age, sex) and log weight to unlock multi-formula analysis.
      </div>
    `;
    return;
  }

  const latestWeight = records[records.length - 1].weight;
  const age = calculateAge(p.birthDate);
  const sex = p.sex;
  const heightCm = p.heightCm;

  // BMI calculations
  const stdBmi = standardBmi(latestWeight, heightCm);
  const nBmi = oxfordBmi(latestWeight, heightCm);
  const prime = bmiPrime(stdBmi);
  const category = getBmiCategory(stdBmi);

  // Body Fat calculations
  const bfDeurenberg = deurenbergBodyFat(stdBmi, age, sex);
  const bfGallagher = gallagherBodyFat(stdBmi, age, sex);
  const bfCunBae = cunBaeBodyFat(stdBmi, age, sex);
  const compDeurenberg = calculateBodyComposition(latestWeight, bfDeurenberg);

  // Ideal Body Weight calculations
  const ibw = calculateIdealBodyWeight(heightCm, sex);

  // BMR & TDEE
  const bmrMifflin = mifflinStJeorBmr(latestWeight, heightCm, age, sex);
  const bmrHarris = revisedHarrisBenedictBmr(latestWeight, heightCm, age, sex);
  const tdee = calculateTdee(bmrMifflin);

  container.innerHTML = `
    <!-- BMI Formulas -->
    <div class="formula-card">
      <div class="formula-card-header">
        <h3>⚖️ Body Mass Index (BMI)</h3>
        <span class="badge ${category.badgeClass}">${category.category}</span>
      </div>
      <div class="formula-row">
        <span class="label">Standard WHO BMI:</span>
        <span class="value">${stdBmi.toFixed(2)}</span>
      </div>
      <div class="formula-row">
        <span class="label">Oxford "New" BMI:</span>
        <span class="value">${nBmi.toFixed(2)}</span>
      </div>
      <div class="formula-row">
        <span class="label">BMI Prime:</span>
        <span class="value">${prime.toFixed(2)} (${prime < 1 ? 'Under normal max' : 'Over normal max'})</span>
      </div>
      <div class="formula-description">
        Standard WHO uses weight/height². Oxford formula scales height to 2.5 to avoid distorting taller or shorter heights.
      </div>
    </div>

    <!-- Body Fat % Estimations -->
    <div class="formula-card">
      <div class="formula-card-header">
        <h3>🧬 Body Fat Percentage</h3>
        <span class="badge badge-normal">~${bfDeurenberg.toFixed(1)}%</span>
      </div>
      <div class="formula-row">
        <span class="label">Deurenberg (1991):</span>
        <span class="value">${bfDeurenberg.toFixed(1)}%</span>
      </div>
      <div class="formula-row">
        <span class="label">Gallagher (1996):</span>
        <span class="value">${bfGallagher.toFixed(1)}%</span>
      </div>
      <div class="formula-row">
        <span class="label">CUN-BAE (Navarra 2012):</span>
        <span class="value">${bfCunBae.toFixed(1)}%</span>
      </div>
      <div class="formula-row">
        <span class="label">Lean Body Mass:</span>
        <span class="value">${compDeurenberg.leanMassKg.toFixed(1)} kg</span>
      </div>
      <div class="formula-row">
        <span class="label">Estimated Fat Mass:</span>
        <span class="value">${compDeurenberg.fatMassKg.toFixed(1)} kg</span>
      </div>
      <div class="formula-description">
        Estimates biological adiposity using regression modeling across BMI, age, and sex distributions.
      </div>
    </div>

    <!-- Ideal Body Weight -->
    <div class="formula-card">
      <div class="formula-card-header">
        <h3>🎯 Ideal Weight Standards</h3>
        <span class="badge badge-normal">${ibw.average.toFixed(1)} kg avg</span>
      </div>
      <div class="formula-row">
        <span class="label">Devine (1974):</span>
        <span class="value">${ibw.devine.toFixed(1)} kg</span>
      </div>
      <div class="formula-row">
        <span class="label">Robinson (1983):</span>
        <span class="value">${ibw.robinson.toFixed(1)} kg</span>
      </div>
      <div class="formula-row">
        <span class="label">Miller (1983):</span>
        <span class="value">${ibw.miller.toFixed(1)} kg</span>
      </div>
      <div class="formula-row">
        <span class="label">WHO Healthy Range:</span>
        <span class="value">${ibw.healthyRange[0].toFixed(1)} - ${ibw.healthyRange[1].toFixed(1)} kg</span>
      </div>
      <div class="formula-description">
        Calculates reference target weights used in clinical pharmacology and sports science.
      </div>
    </div>

    <!-- BMR & Daily Maintenance Calories -->
    <div class="formula-card">
      <div class="formula-card-header">
        <h3>🔥 Metabolic Energy (BMR/TDEE)</h3>
        <span class="badge badge-normal">${bmrMifflin} kcal</span>
      </div>
      <div class="formula-row">
        <span class="label">Mifflin-St Jeor (Resting):</span>
        <span class="value">${bmrMifflin} kcal/day</span>
      </div>
      <div class="formula-row">
        <span class="label">Harris-Benedict (Resting):</span>
        <span class="value">${bmrHarris} kcal/day</span>
      </div>
      <div class="formula-row">
        <span class="label">Sedentary Maintenance:</span>
        <span class="value">${tdee.sedentary} kcal/day</span>
      </div>
      <div class="formula-row">
        <span class="label">Moderate Exercise (3-5x/wk):</span>
        <span class="value">${tdee.moderate} kcal/day</span>
      </div>
      <div class="formula-description">
        Energy burned at complete rest (BMR), plus estimated total daily burn with activity (TDEE).
      </div>
    </div>
  `;
}

// --- History List Rendering ---
function renderHistory() {
  const container = document.getElementById('history-list-container');
  if (!container) return;

  const records = [...state.records].reverse(); // Most recent first
  if (records.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--color-text-muted); padding: 1.5rem;">No weight logs found.</div>';
    return;
  }

  container.innerHTML = records.map((r, i) => {
    const nextRec = records[i + 1];
    let diffMarkup = '';
    if (nextRec) {
      const diff = r.weight - nextRec.weight;
      const sign = diff >= 0 ? '+' : '';
      const colorClass = diff <= 0 ? 'delta-negative' : 'delta-positive';
      diffMarkup = `<small class="${colorClass}">(${sign}${diff.toFixed(2)})</small>`;
    }

    const tagsMarkup = (r.tags || []).map(t => `<span class="tag-badge">${t}</span>`).join('');

    return `
      <div class="history-item">
        <div>
          <div class="history-date">${r.date}</div>
          ${tagsMarkup ? `<div class="history-tags">${tagsMarkup}</div>` : ''}
          ${r.notes ? `<div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px;">${r.notes}</div>` : ''}
        </div>
        <div class="history-weight">
          <div class="history-val">${r.weight.toFixed(2)} kg ${diffMarkup}</div>
          <div class="history-actions">
            <button class="btn-item-action" data-edit-date="${r.date}" title="Edit entry">✏️</button>
            <button class="btn-item-action btn-item-delete" data-delete-date="${r.date}" title="Delete entry">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Wire edit and delete buttons
  container.querySelectorAll('[data-edit-date]').forEach(btn => {
    btn.addEventListener('click', () => openLogModal(btn.dataset.editDate));
  });

  container.querySelectorAll('[data-delete-date]').forEach(btn => {
    btn.addEventListener('click', () => deleteRecord(btn.dataset.deleteDate));
  });
}

// --- Export JSON / CSV ---
async function exportData(format) {
  try {
    const res = await fetch(`/api/export?format=${format}`);
    if (!res.ok) throw new Error('Export request failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health_tracker_export.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Exported ${format.toUpperCase()}`);
  } catch (err) {
    showToast('Failed to export data');
    console.error(err);
  }
}
