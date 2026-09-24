import { $, $$, showToast } from './dom.js';
import { state, setProfile } from './state.js';
import { saveProfileRemote } from './sync.js';
import { calculateAge, feetInchesToCm, cmToFeetInches } from './formulas.js';

export function renderProfileBar() {
  const p = state.profile;
  const nameEl = $('#display-name');
  const metaEl = $('#display-meta');
  const avatarEl = $('#display-avatar');

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

export function openProfileModal() {
  const dialog = $('#profile-dialog');
  if (!dialog) return;

  const p = state.profile || {};
  const nameEl = $('#profile-name');
  const birthEl = $('#profile-birthdate');
  const sexEl = $('#profile-sex');
  const heightEl = $('#profile-height');
  const targetWeightEl = $('#profile-target-weight');
  const cadenceEl = $('#profile-cadence');

  if (nameEl) nameEl.value = p.name || '';
  if (birthEl) birthEl.value = p.birthDate ? p.birthDate.split('T')[0] : '';
  if (sexEl) sexEl.value = p.sex || 'male';
  if (heightEl) heightEl.value = p.heightCm || '';

  if (p.heightCm) {
    const { feet, inches } = cmToFeetInches(p.heightCm);
    const ftEl = $('#profile-height-ft');
    const inEl = $('#profile-height-in');
    if (ftEl) ftEl.value = feet;
    if (inEl) inEl.value = inches;
  }

  if (targetWeightEl) targetWeightEl.value = p.targetWeightKg || '';
  if (cadenceEl) cadenceEl.value = p.checkinCadence || 'weekly';

  // Default unit tab to cm
  $$('.height-unit-btn').forEach(b => b.classList.remove('active'));
  $('.height-unit-btn[data-unit="cm"]')?.classList.add('active');
  const cmWrapper = $('#height-input-cm');
  const ftWrapper = $('#height-input-ft');
  if (cmWrapper) cmWrapper.style.display = 'block';
  if (ftWrapper) ftWrapper.style.display = 'none';

  dialog.showModal();
}

export function closeProfileModal() {
  const dialog = $('#profile-dialog');
  if (dialog && dialog.open) {
    dialog.close();
  }
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  let height = Number($('#profile-height')?.value);
  if (!height) {
    const f = Number($('#profile-height-ft')?.value);
    const i = Number($('#profile-height-in')?.value);
    if (f > 0) {
      height = feetInchesToCm(f, i);
    }
  }

  const profile = {
    name: $('#profile-name')?.value.trim() || '',
    birthDate: $('#profile-birthdate')?.value || '',
    sex: $('#profile-sex')?.value || 'male',
    heightCm: height,
    targetWeightKg: $('#profile-target-weight')?.value ? Number($('#profile-target-weight').value) : null,
    checkinCadence: $('#profile-cadence')?.value || 'weekly'
  };

  setProfile(profile);
  closeProfileModal();
  showToast('Profile updated');

  try {
    await saveProfileRemote(profile);
  } catch (err) {
    console.error('Remote profile save failed:', err);
  }
}

export function initProfileDialog() {
  $('#btn-edit-profile')?.addEventListener('click', openProfileModal);
  $('#profile-form')?.addEventListener('submit', handleProfileSubmit);
  $('#btn-close-profile')?.addEventListener('click', closeProfileModal);

  // Height unit switcher (cm vs ft/in)
  $$('.height-unit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      $$('.height-unit-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const unit = e.target.dataset.unit;
      const cmWrapper = $('#height-input-cm');
      const ftWrapper = $('#height-input-ft');
      if (unit === 'ft') {
        if (cmWrapper) cmWrapper.style.display = 'none';
        if (ftWrapper) ftWrapper.style.display = 'grid';
        const cmVal = Number($('#profile-height')?.value);
        if (cmVal > 0) {
          const { feet, inches } = cmToFeetInches(cmVal);
          const ftEl = $('#profile-height-ft');
          const inEl = $('#profile-height-in');
          if (ftEl) ftEl.value = feet;
          if (inEl) inEl.value = inches;
        }
      } else {
        if (cmWrapper) cmWrapper.style.display = 'block';
        if (ftWrapper) ftWrapper.style.display = 'none';
        const f = Number($('#profile-height-ft')?.value);
        const i = Number($('#profile-height-in')?.value);
        if (f > 0) {
          const cmEl = $('#profile-height');
          if (cmEl) cmEl.value = feetInchesToCm(f, i);
        }
      }
    });
  });

  const syncFtToCm = () => {
    const f = Number($('#profile-height-ft')?.value);
    const i = Number($('#profile-height-in')?.value);
    if (f > 0) {
      const cmEl = $('#profile-height');
      if (cmEl) cmEl.value = feetInchesToCm(f, i);
    }
  };

  $('#profile-height-ft')?.addEventListener('input', syncFtToCm);
  $('#profile-height-in')?.addEventListener('input', syncFtToCm);

  $('#profile-height')?.addEventListener('input', (e) => {
    const cm = Number(e.target.value);
    if (cm > 0) {
      const { feet, inches } = cmToFeetInches(cm);
      const ftEl = $('#profile-height-ft');
      const inEl = $('#profile-height-in');
      if (ftEl) ftEl.value = feet;
      if (inEl) inEl.value = inches;
    }
  });
}
