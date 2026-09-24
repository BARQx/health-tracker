import { $ } from '../dom.js';
import { state } from '../state.js';
import { openLogModal } from '../record-modal.js';

export function renderCheckinBanner() {
  const banner = $('#checkin-banner');
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

  $('#btn-banner-log')?.addEventListener('click', () => openLogModal());
}
