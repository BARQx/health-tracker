import { $, $$ } from './dom.js';
import { state, setTimeframe, setChartMode } from './state.js';
import { HealthChart } from './chart.js';
import { calculateAge, enrichRecordsWithDeltas } from './formulas.js';
import { onThemeChange } from './theme.js';

let chartInstance = null;

export function initChartController() {
  const canvas = $('#trend-canvas');
  if (canvas) {
    chartInstance = new HealthChart(canvas);
  }

  // Redraw chart when theme switches between light and dark
  onThemeChange(() => {
    if (chartInstance) {
      chartInstance.render();
    }
  });

  // Timeframe pills
  $$('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      $$('.timeframe-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      setTimeframe(e.target.dataset.timeframe, true);
    });
  });

  // Metric mode pills (weight | fat | bmi)
  $$('.metric-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      $$('.metric-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      setChartMode(e.target.dataset.metric);
    });
  });
}

export function updateChart() {
  if (!chartInstance) return;

  const records = state.records;
  if (!records || records.length === 0) {
    chartInstance.setData([], state.profile?.targetWeightKg, state.chartMode);
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
        $$('.timeframe-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.timeframe === tf);
        });
        break;
      }
    }
  }

  chartInstance.setData(filtered, state.profile?.targetWeightKg, state.chartMode);
}
