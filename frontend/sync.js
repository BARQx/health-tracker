import { state, setProfile, setRecords } from './state.js';
import { showToast } from './dom.js';

export async function checkAuth() {
  const res = await fetch('/api/auth');
  if (res.ok) {
    return await res.json();
  }
  return { authenticated: false };
}

export async function submitAuth(password) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Incorrect password');
  }
  return await res.json();
}

export async function fetchProfile() {
  const res = await fetch('/api/profile');
  if (!res.ok) {
    throw new Error(`Failed to fetch profile (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function saveProfileRemote(profile) {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save profile');
  }
  return await res.json();
}

export async function fetchRecords() {
  const res = await fetch('/api/records');
  if (!res.ok) {
    throw new Error(`Failed to fetch records (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function saveRecordRemote(record) {
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save record');
  }
  return await res.json();
}

export async function deleteRecordRemote(date) {
  const res = await fetch(`/api/records?date=${encodeURIComponent(date)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete record');
  }
  return await res.json();
}

export async function exportData(format) {
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
    console.error('Export error:', err);
  }
}

export async function syncRemoteData({ onAuthRequired, onProfileSetupRequired } = {}) {
  try {
    const authData = await checkAuth();
    if (authData.authenticated === false) {
      if (typeof onAuthRequired === 'function') {
        onAuthRequired();
      }
      return;
    }
  } catch (err) {
    console.warn('Auth check failed, working in offline/cached mode:', err);
    return;
  }

  // Fetch profile (independent of records)
  try {
    const profileData = await fetchProfile();
    if (profileData.profile) {
      setProfile(profileData.profile);
    } else if (!state.profile && typeof onProfileSetupRequired === 'function') {
      onProfileSetupRequired();
    }
  } catch (err) {
    console.warn('Profile sync failed, using cached profile:', err);
  }

  // Fetch records (independent of profile)
  try {
    const recordsData = await fetchRecords();
    if (Array.isArray(recordsData.records)) {
      setRecords(recordsData.records);
    }
  } catch (err) {
    console.warn('Records sync failed, using cached records:', err);
  }
}
