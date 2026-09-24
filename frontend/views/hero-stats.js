import { $ } from '../dom.js';
import { state } from '../state.js';
import { calculatePaceAndProgress, calculateGoalForecast } from '../formulas.js';

export function renderHeroStats() {
  const records = state.records;
  const targetWeight = state.profile?.targetWeightKg;
  const currentWeightEl = $('#stat-current-weight');
  const deltaEl = $('#stat-weight-delta');
  const paceEl = $('#stat-weekly-pace');
  const totalProgressEl = $('#stat-total-progress');
  const targetEl = $('#stat-target-diff');
  const targetSubEl = $('#stat-target-subtext');

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
