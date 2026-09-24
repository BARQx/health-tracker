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
  calculateTrendWeights,
  calculatePaceAndProgress,
  enrichRecordsWithDeltas,
  feetInchesToCm,
  cmToFeetInches,
  calculateGoalForecast,
  sanitizeRecords
} from './formulas.js';

// --- State Management ---
const state = {
  profile: storage.get('health_profile', null),
  records: sanitizeRecords(storage.get('health_records', [])),
  timeframe: '30d',
  hasExplicitTimeframeSelection: false,
  chartMode: 'weight',
  formulaTab: 'all',
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
      state.hasExplicitTimeframeSelection = true;
      updateChart();
      renderHeroStats();
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

  // Formula tab selector pills
  document.querySelectorAll('.formula-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.formula-tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.formulaTab = e.target.dataset.tab;
      renderFormulas();
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

  // Height unit switcher (cm vs ft/in)
  document.querySelectorAll('.height-unit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.height-unit-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const unit = e.target.dataset.unit;
      const cmWrapper = document.getElementById('height-input-cm');
      const ftWrapper = document.getElementById('height-input-ft');
      if (unit === 'ft') {
        if (cmWrapper) cmWrapper.style.display = 'none';
        if (ftWrapper) ftWrapper.style.display = 'grid';
        const cmVal = Number(document.getElementById('profile-height')?.value);
        if (cmVal > 0) {
          const { feet, inches } = cmToFeetInches(cmVal);
          const ftEl = document.getElementById('profile-height-ft');
          const inEl = document.getElementById('profile-height-in');
          if (ftEl) ftEl.value = feet;
          if (inEl) inEl.value = inches;
        }
      } else {
        if (cmWrapper) cmWrapper.style.display = 'block';
        if (ftWrapper) ftWrapper.style.display = 'none';
        const f = Number(document.getElementById('profile-height-ft')?.value);
        const i = Number(document.getElementById('profile-height-in')?.value);
        if (f > 0) {
          const cmEl = document.getElementById('profile-height');
          if (cmEl) cmEl.value = feetInchesToCm(f, i);
        }
      }
    });
  });

  const syncFtToCm = () => {
    const f = Number(document.getElementById('profile-height-ft')?.value);
    const i = Number(document.getElementById('profile-height-in')?.value);
    if (f > 0) {
      const cmEl = document.getElementById('profile-height');
      if (cmEl) cmEl.value = feetInchesToCm(f, i);
    }
  };

  document.getElementById('profile-height-ft')?.addEventListener('input', syncFtToCm);
  document.getElementById('profile-height-in')?.addEventListener('input', syncFtToCm);

  document.getElementById('profile-height')?.addEventListener('input', (e) => {
    const cm = Number(e.target.value);
    if (cm > 0) {
      const { feet, inches } = cmToFeetInches(cm);
      const ftEl = document.getElementById('profile-height-ft');
      const inEl = document.getElementById('profile-height-in');
      if (ftEl) ftEl.value = feet;
      if (inEl) inEl.value = inches;
    }
  });
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
        state.records = sanitizeRecords(recordsData.records);
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
  if (p.heightCm) {
    const { feet, inches } = cmToFeetInches(p.heightCm);
    const ftEl = document.getElementById('profile-height-ft');
    const inEl = document.getElementById('profile-height-in');
    if (ftEl) ftEl.value = feet;
    if (inEl) inEl.value = inches;
  }
  document.getElementById('profile-target-weight').value = p.targetWeightKg || '';
  const cadenceEl = document.getElementById('profile-cadence');
  if (cadenceEl) cadenceEl.value = p.checkinCadence || 'weekly';

  // Default unit tab to cm
  document.querySelectorAll('.height-unit-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.height-unit-btn[data-unit="cm"]')?.classList.add('active');
  const cmWrapper = document.getElementById('height-input-cm');
  const ftWrapper = document.getElementById('height-input-ft');
  if (cmWrapper) cmWrapper.style.display = 'block';
  if (ftWrapper) ftWrapper.style.display = 'none';

  dialog.showModal();
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  let height = Number(document.getElementById('profile-height').value);
  if (!height) {
    const f = Number(document.getElementById('profile-height-ft')?.value);
    const i = Number(document.getElementById('profile-height-in')?.value);
    if (f > 0) {
      height = feetInchesToCm(f, i);
    }
  }

  const profile = {
    name: document.getElementById('profile-name').value.trim(),
    birthDate: document.getElementById('profile-birthdate').value,
    sex: document.getElementById('profile-sex').value,
    heightCm: height,
    targetWeightKg: document.getElementById('profile-target-weight').value ? Number(document.getElementById('profile-target-weight').value) : null,
    checkinCadence: document.getElementById('profile-cadence')?.value || 'weekly'
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
    const res = await fetch(`/api/records?date=${encodeURIComponent(date)}`, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('Remote delete failed:', errData);
      showToast(errData.error || 'Server sync failed for deletion');
    }
  } catch (err) {
    console.error('Remote delete failed:', err);
    showToast('Offline: record removed locally');
  }
}

// --- Render Main Application ---
function renderApp() {
  renderProfileBar();
  renderCheckinBanner();
  renderHeroStats();
  updateChart();
  renderFormulas();
  renderHistory();
}

function renderCheckinBanner() {
  const banner = document.getElementById('checkin-banner');
  if (!banner) return;

  const records = state.records;
  if (!records || records.length === 0) {
    banner.style.display = 'none';
    return;
  }

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const daysAgo = Math.max(0, Math.round((Date.now() - new Date(latest.date).getTime()) / 86400000));

  const cadence = state.profile?.checkinCadence || 'weekly';
  const cadenceDays = cadence === 'monthly' ? 30 : (cadence === 'biweekly' ? 14 : 7);
  const cadenceLabel = cadence === 'monthly' ? 'Monthly' : (cadence === 'biweekly' ? 'Bi-weekly' : 'Weekly');

  banner.style.display = 'flex';

  if (daysAgo >= cadenceDays) {
    banner.className = 'checkin-banner due';
    banner.innerHTML = `
      <div class="checkin-banner-content">
        <span>⏰</span>
        <span>
          <strong>${cadenceLabel} Weigh-in Due</strong> · Last recorded ${daysAgo} days ago (${latest.date}). Step on the scale to keep your streak!
        </span>
      </div>
      <button type="button" class="checkin-banner-action" id="btn-banner-log">➕ Log Weigh-in</button>
    `;
  } else {
    const daysLeft = cadenceDays - daysAgo;
    banner.className = 'checkin-banner on-track';
    banner.innerHTML = `
      <div class="checkin-banner-content">
        <span>✓</span>
        <span>
          <strong>On Track</strong> · Logged ${daysAgo === 0 ? 'today' : `${daysAgo}d ago`} (${latest.weight.toFixed(2)} kg). Next ${cadenceLabel.toLowerCase()} check-in in ~${daysLeft}d.
        </span>
      </div>
      <button type="button" class="checkin-banner-action" id="btn-banner-log">➕ Log Check-in</button>
    `;
  }

  document.getElementById('btn-banner-log')?.addEventListener('click', () => openLogModal());
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
  const paceEl = document.getElementById('stat-weekly-pace');
  const totalProgressEl = document.getElementById('stat-total-progress');
  const targetEl = document.getElementById('stat-target-diff');
  const targetSubEl = document.getElementById('stat-target-subtext');

  if (!records || records.length === 0) {
    if (currentWeightEl) currentWeightEl.innerHTML = '-- <small>kg</small>';
    if (deltaEl) deltaEl.textContent = 'No records logged yet';
    if (paceEl) paceEl.innerHTML = '-- <small>kg/wk</small>';
    if (totalProgressEl) totalProgressEl.textContent = 'Overall change: --';
    if (targetEl) targetEl.textContent = targetWeight ? `Target: ${targetWeight.toFixed(2)} kg` : '--';
    if (targetSubEl) targetSubEl.textContent = 'Goal Weight Tracking';
    return;
  }

  const pace = calculatePaceAndProgress(records, state.timeframe);

  // Card 1: Latest Weight
  if (currentWeightEl) {
    currentWeightEl.innerHTML = `${pace.latestWeight.toFixed(2)} <small>kg</small>`;
  }

  if (deltaEl) {
    if (pace.previousWeight !== null) {
      const isLoss = pace.diff <= 0;
      const arrow = isLoss ? '▼' : '▲';
      const sign = pace.diff > 0 ? '+' : '';
      const colorClass = isLoss ? 'delta-negative' : 'delta-positive';
      deltaEl.className = `stat-subtext ${colorClass}`;
      deltaEl.textContent = `${arrow} ${sign}${pace.diff.toFixed(2)} kg in ${pace.daysElapsed} days`;
    } else {
      deltaEl.className = 'stat-subtext';
      deltaEl.textContent = 'First logged check-in';
    }
  }

  // Card 2: Weekly Pace (normalized to 7 days)
  if (paceEl) {
    if (pace.previousWeight !== null) {
      const isLoss = pace.weeklyRate <= 0;
      const sign = pace.weeklyRate > 0 ? '+' : '';
      const colorClass = isLoss ? 'delta-negative' : 'delta-positive';
      paceEl.innerHTML = `<span class="${colorClass}">${sign}${pace.weeklyRate.toFixed(2)}</span> <small>kg/wk</small>`;
    } else {
      paceEl.innerHTML = `0.00 <small>kg/wk</small>`;
    }
  }

  if (totalProgressEl) {
    const isLoss = pace.timeframeChange <= 0;
    const sign = pace.timeframeChange > 0 ? '+' : '';
    const colorClass = isLoss ? 'delta-negative' : 'delta-positive';
    totalProgressEl.innerHTML = `${pace.timeframeLabel}: <strong class="${colorClass}">${sign}${pace.timeframeChange.toFixed(2)} kg</strong>`;
  }

  // Card 3: Target Progress & Forecast
  if (targetEl) {
    if (targetWeight) {
      const diffToTarget = Number((pace.latestWeight - targetWeight).toFixed(2));
      const latestDateStr = records[records.length - 1]?.date;
      const forecast = calculateGoalForecast(pace.latestWeight, targetWeight, pace.weeklyRate, latestDateStr);

      if (diffToTarget > 0) {
        targetEl.textContent = `${diffToTarget.toFixed(2)} kg to goal`;
        if (targetSubEl) {
          if (forecast && forecast.status === 'on_track') {
            const dateStr = forecast.estimatedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            targetSubEl.innerHTML = `Est. <strong>${dateStr}</strong> (~${forecast.weeksNeeded} wks)`;
          } else {
            targetSubEl.textContent = `Target: ${targetWeight.toFixed(2)} kg`;
          }
        }
      } else {
        targetEl.textContent = `Goal Reached! 🎉`;
        if (targetSubEl) {
          targetSubEl.textContent = `${Math.abs(diffToTarget).toFixed(2)} kg below target`;
        }
      }
    } else {
      targetEl.textContent = 'No goal set';
      if (targetSubEl) targetSubEl.textContent = 'Set a target in profile';
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

  const heightCm = state.profile?.heightCm || 170;
  const age = state.profile?.birthDate ? calculateAge(state.profile.birthDate) : 30;
  const sex = state.profile?.sex || 'male';

  // Compute exact point-to-point deltas and metrics across full historical records
  const enriched = enrichRecordsWithDeltas(records, heightCm, age, sex);

  // Timeframe filter helper
  const now = new Date();
  const filterByTf = (tf) => {
    if (tf === '7d') return enriched.filter(r => new Date(r.date) >= new Date(now.getTime() - 7 * 86400000));
    if (tf === '30d') return enriched.filter(r => new Date(r.date) >= new Date(now.getTime() - 30 * 86400000));
    if (tf === '90d') return enriched.filter(r => new Date(r.date) >= new Date(now.getTime() - 90 * 86400000));
    if (tf === '1y') return enriched.filter(r => new Date(r.date) >= new Date(now.getTime() - 365 * 86400000));
    return enriched;
  };

  let filtered = filterByTf(state.timeframe);

  // If current timeframe has 0 entries and user didn't explicitly pick it,
  // gracefully auto-expand to the most relevant timeframe that contains records
  if (filtered.length === 0 && enriched.length > 0 && !state.hasExplicitTimeframeSelection) {
    const fallbackTfs = ['30d', '90d', '1y', 'all'];
    for (const tf of fallbackTfs) {
      const candidates = filterByTf(tf);
      if (candidates.length > 0) {
        state.timeframe = tf;
        filtered = candidates;
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.timeframe === tf);
        });
        break;
      }
    }
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
      <div class="formula-table-card" style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 2.5rem 1rem;">
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

  const activeTab = state.formulaTab || 'all';

  const bmiCard = `
    <div class="formula-table-card">
      <div class="formula-table-card-header">
        <h3>⚖️ Body Mass Index (BMI)</h3>
        <span class="badge ${category.badgeClass}">${category.category}</span>
      </div>
      <table class="formula-table">
        <thead>
          <tr>
            <th>Formula / Metric</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span class="formula-name">Standard WHO BMI</span>
              <span class="formula-note">Clinical standard: Weight (kg) / Height (m)²</span>
            </td>
            <td><span class="formula-val">${stdBmi.toFixed(2)}</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Oxford "New" BMI</span>
              <span class="formula-note">Trefethen formula: Scales height to 2.5</span>
            </td>
            <td><span class="formula-val">${nBmi.toFixed(2)}</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">BMI Prime</span>
              <span class="formula-note">Ratio to 25.0 upper limit (${prime < 1 ? 'Under normal max' : 'Over normal max'})</span>
            </td>
            <td><span class="formula-val">${prime.toFixed(2)}</span></td>
          </tr>
        </tbody>
      </table>
      <div class="formula-table-footer">
        Standard WHO category: 18.5 – 24.9 is Normal weight.
      </div>
    </div>
  `;

  const fatCard = `
    <div class="formula-table-card">
      <div class="formula-table-card-header">
        <h3>🧬 Body Fat Percentage (%BF)</h3>
        <span class="badge badge-normal">~${bfDeurenberg.toFixed(1)}%</span>
      </div>
      <table class="formula-table">
        <thead>
          <tr>
            <th>Formula / Estimator</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span class="formula-name">Deurenberg (1991)</span>
              <span class="formula-note">Adult regression model based on BMI & Age</span>
            </td>
            <td><span class="formula-val">${bfDeurenberg.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Gallagher (1996)</span>
              <span class="formula-note">Clinical multi-ethnic regression study</span>
            </td>
            <td><span class="formula-val">${bfGallagher.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">CUN-BAE (Navarra 2012)</span>
              <span class="formula-note">Non-linear body adiposity estimator</span>
            </td>
            <td><span class="formula-val">${bfCunBae.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Lean Body Mass</span>
              <span class="formula-note">Fat-free muscle, bone, and water mass</span>
            </td>
            <td><span class="formula-val" style="color: #38bdf8;">${compDeurenberg.leanMassKg.toFixed(1)} kg</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Estimated Fat Mass</span>
              <span class="formula-note">Total adipose body weight</span>
            </td>
            <td><span class="formula-val" style="color: #f59e0b;">${compDeurenberg.fatMassKg.toFixed(1)} kg</span></td>
          </tr>
        </tbody>
      </table>
      <div class="formula-table-footer">
        Estimates biological adiposity without requiring skinfold calipers or DEXA scans.
      </div>
    </div>
  `;

  const ibwCard = `
    <div class="formula-table-card">
      <div class="formula-table-card-header">
        <h3>🎯 Ideal Weight Standards (IBW)</h3>
        <span class="badge badge-normal">${ibw.average.toFixed(1)} kg avg</span>
      </div>
      <table class="formula-table">
        <thead>
          <tr>
            <th>Clinical Standard</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span class="formula-name">Devine Formula (1974)</span>
              <span class="formula-note">Pharmacology dosing baseline</span>
            </td>
            <td><span class="formula-val">${ibw.devine.toFixed(1)} kg</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Robinson Formula (1983)</span>
              <span class="formula-note">Metabolic rate revision</span>
            </td>
            <td><span class="formula-val">${ibw.robinson.toFixed(1)} kg</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Miller Formula (1983)</span>
              <span class="formula-note">Adjusted for lean muscle frame</span>
            </td>
            <td><span class="formula-val">${ibw.miller.toFixed(1)} kg</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Hamwi Formula (1964)</span>
              <span class="formula-note">Clinical thumb-rule standard</span>
            </td>
            <td><span class="formula-val">${ibw.hamwi.toFixed(1)} kg</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">WHO Healthy Range</span>
              <span class="formula-note">Standard BMI 18.5 – 24.9 window</span>
            </td>
            <td><span class="formula-val">${ibw.healthyRange[0].toFixed(1)} – ${ibw.healthyRange[1].toFixed(1)} kg</span></td>
          </tr>
        </tbody>
      </table>
      <div class="formula-table-footer">
        Calculates reference target weights used in clinical pharmacology and sports science.
      </div>
    </div>
  `;

  const tdeeCard = `
    <div class="formula-table-card">
      <div class="formula-table-card-header">
        <h3>🔥 Metabolic Energy (BMR/TDEE)</h3>
        <span class="badge badge-normal">${bmrMifflin} kcal</span>
      </div>
      <table class="formula-table">
        <thead>
          <tr>
            <th>Energy Metric</th>
            <th>Daily Burn</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span class="formula-name">Mifflin-St Jeor (BMR)</span>
              <span class="formula-note">Resting expenditure at complete rest</span>
            </td>
            <td><span class="formula-val">${bmrMifflin} kcal/day</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Revised Harris-Benedict</span>
              <span class="formula-note">Resting energy expenditure (1984)</span>
            </td>
            <td><span class="formula-val">${bmrHarris} kcal/day</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Sedentary Maintenance (TDEE)</span>
              <span class="formula-note">Desk work / Little or no exercise (1.2×)</span>
            </td>
            <td><span class="formula-val">${tdee.sedentary} kcal/day</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Moderate Exercise (TDEE)</span>
              <span class="formula-note">Active training 3–5 days/week (1.55×)</span>
            </td>
            <td><span class="formula-val">${tdee.moderate} kcal/day</span></td>
          </tr>
        </tbody>
      </table>
      <div class="formula-table-footer">
        Resting burn (BMR) plus total daily maintenance calories with activity.
      </div>
    </div>
  `;

  let html = '';
  if (activeTab === 'bmi') html = bmiCard;
  else if (activeTab === 'fat') html = fatCard;
  else if (activeTab === 'ibw') html = ibwCard;
  else if (activeTab === 'tdee') html = tdeeCard;
  else html = bmiCard + fatCard + ibwCard + tdeeCard;

  container.innerHTML = html;
}

// --- History List Rendering ---
function formatDisplayDate(dateStr) {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      formatted: `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
      weekday: dayNames[d.getDay()]
    };
  } catch {
    return { formatted: dateStr, weekday: '' };
  }
}

function renderHistory() {
  const container = document.getElementById('history-list-container');
  if (!container) return;

  const validRecords = (state.records || [])
    .filter(r => r && r.date && r.weight !== null && r.weight !== undefined)
    .sort((a, b) => String(b.date).localeCompare(String(a.date))); // Descending by date

  if (validRecords.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No weight logs found. Tap "+ Log Weight" to start.</div>';
    return;
  }

  try {
    // Group records by Year
    const yearGroups = {};
    for (const r of validRecords) {
      const year = String(r.date).split('-')[0] || 'Unknown';
      if (!yearGroups[year]) yearGroups[year] = [];
      yearGroups[year].push(r);
    }

    const sortedYears = Object.keys(yearGroups).sort((a, b) => b.localeCompare(a));

    container.innerHTML = sortedYears.map((year, idx) => {
      const list = yearGroups[year];
      // list is sorted descending: list[0] is latest in year, list[list.length - 1] is first in year
      const startWeight = Number(list[list.length - 1].weight || 0);
      const endWeight = Number(list[0].weight || 0);
      const net = Number((endWeight - startWeight).toFixed(2));
      const isLoss = net <= 0;
      const arrow = isLoss ? '▼' : '▲';
      const sign = net > 0 ? '+' : '';
      const colorClass = isLoss ? 'delta-negative' : 'delta-positive';
      const netBadge = list.length > 1
        ? `<span class="history-year-badge ${colorClass}">${arrow} ${sign}${net.toFixed(2)} kg</span>`
        : '';

      // Expand current/latest year by default, collapse older years (e.g. 2021)
      const isCollapsed = idx > 0;

      const itemsHtml = list.map((r) => {
        const chronoIdx = state.records.findIndex(rec => rec.date === r.date);
        let diffMarkup = '';
        if (chronoIdx > 0) {
          const prevRec = state.records[chronoIdx - 1];
          const prevWeight = Number(prevRec?.weight || 0);
          const currWeight = Number(r.weight || 0);
          const diff = Number((currWeight - prevWeight).toFixed(2));
          const itemLoss = diff <= 0;
          const itemArrow = itemLoss ? '▼' : '▲';
          const itemSign = diff > 0 ? '+' : '';
          const itemColorClass = itemLoss ? 'delta-negative' : 'delta-positive';
          diffMarkup = `<div class="history-delta ${itemColorClass}">${itemArrow} ${itemSign}${diff.toFixed(2)} kg</div>`;
        } else {
          diffMarkup = `<div class="history-delta" style="color: var(--color-text-muted);">Baseline</div>`;
        }

        const dateInfo = formatDisplayDate(r.date);
        const tagsMarkup = (Array.isArray(r.tags) ? r.tags : []).map(t => `<span class="tag-badge">${t}</span>`).join('');
        const numWeight = Number(r.weight || 0);

        return `
          <div class="history-item">
            <div class="history-left">
              <div class="history-date">
                <span>${dateInfo.formatted}</span>
                ${dateInfo.weekday ? `<span class="history-weekday">${dateInfo.weekday}</span>` : ''}
              </div>
              <div class="history-sub">
                ${tagsMarkup ? `<div class="history-tags">${tagsMarkup}</div>` : ''}
                ${r.notes ? `<div class="history-notes" title="${r.notes}">${r.notes}</div>` : ''}
              </div>
            </div>
            <div class="history-right">
              <div class="history-metric">
                <div class="history-val">${numWeight.toFixed(2)}<span class="history-unit">kg</span></div>
                ${diffMarkup}
              </div>
              <div class="history-actions">
                <button class="btn-item-action" data-edit-date="${r.date}" title="Edit entry" aria-label="Edit entry">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn-item-action btn-item-delete" data-delete-date="${r.date}" title="Delete entry" aria-label="Delete entry">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="history-year-group ${isCollapsed ? 'collapsed' : ''}" data-year="${year}">
          <div class="history-year-header">
            <div class="history-year-title">
              <span>📅 ${year}</span>
              <span class="history-year-badge">${list.length} check-in${list.length === 1 ? '' : 's'}</span>
            </div>
            <div class="history-year-meta">
              ${netBadge}
              <span class="history-year-chevron">▼</span>
            </div>
          </div>
          <div class="history-year-entries">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error rendering history list:', err);
    container.innerHTML = '<div style="text-align: center; color: var(--color-danger); padding: 1.5rem;">Failed to render weight log history.</div>';
  }

  // Wire collapse toggles
  container.querySelectorAll('.history-year-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      hdr.closest('.history-year-group')?.classList.toggle('collapsed');
    });
  });

  // Wire edit and delete buttons
  container.querySelectorAll('[data-edit-date]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openLogModal(btn.dataset.editDate);
    });
  });

  container.querySelectorAll('[data-delete-date]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteRecord(btn.dataset.deleteDate);
    });
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
