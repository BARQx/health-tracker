import { $, $$ } from '../dom.js';
import { state } from '../state.js';
import { openLogModal, handleDeleteRecord } from '../record-modal.js';

export function formatDisplayDate(dateStr) {
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

export function groupRecordsByYear(records) {
  const validRecords = (records || [])
    .filter(r => r && r.date && r.weight !== null && r.weight !== undefined)
    .sort((a, b) => String(b.date).localeCompare(String(a.date))); // Descending by date

  const yearGroups = {};
  for (const r of validRecords) {
    const year = String(r.date).split('-')[0] || 'Unknown';
    if (!yearGroups[year]) yearGroups[year] = [];
    yearGroups[year].push(r);
  }
  return { validRecords, yearGroups };
}

export function renderHistory() {
  const container = $('#history-list-container');
  if (!container) return;

  const { validRecords, yearGroups } = groupRecordsByYear(state.records);

  if (validRecords.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No weight logs found. Tap "+ Log Weight" to start.</div>';
    return;
  }

  try {
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

      // Expand current/latest year by default, collapse older years
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
  $$('.history-year-header', container).forEach(hdr => {
    hdr.addEventListener('click', () => {
      hdr.closest('.history-year-group')?.classList.toggle('collapsed');
    });
  });

  // Wire edit and delete buttons
  $$('[data-edit-date]', container).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openLogModal(btn.dataset.editDate);
    });
  });

  $$('[data-delete-date]', container).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteRecord(btn.dataset.deleteDate);
    });
  });
}
