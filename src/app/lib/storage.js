let userId = null;
let accessToken = null;

const unitsKey = () => userId ? `musa_units_${userId}` : 'musa_units';
const settingsKey = () => userId ? `musa_settings_${userId}` : 'musa_settings';

export const setStorageUserId = (id) => { userId = id; };
export const setAccessToken = (token) => { accessToken = token; };

const isOnline = () => !!accessToken;

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`,
});

// --- Units ---

export const loadUnits = () => {
  try {
    const raw = localStorage.getItem(unitsKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const fetchUnits = async () => {
  if (!isOnline()) return loadUnits();
  try {
    const res = await fetch('/api/units', { headers: headers() });
    if (!res.ok) return loadUnits();
    const units = await res.json();
    localStorage.setItem(unitsKey(), JSON.stringify(units));
    return units;
  } catch {
    return loadUnits();
  }
};

export const saveUnits = (units) => {
  try {
    localStorage.setItem(unitsKey(), JSON.stringify(units));
  } catch {}
};

export const createUnit = async (unit) => {
  saveUnits([unit, ...loadUnits()]);
  if (!isOnline()) return null;
  try {
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(unit),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const exitUnit = async (unitId, exitedAt, gramsAtExit) => {
  if (!isOnline()) return;
  try {
    await fetch(`/api/units/${unitId}/exit`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ exitedAt, gramsAtExit }),
    });
  } catch {}
};

// --- Settings (local only for now) ---

export const loadSettings = () => {
  try {
    const raw = localStorage.getItem(settingsKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(settingsKey(), JSON.stringify(settings));
  } catch {}
};

// --- Reset ---

export const clearAll = async () => {
  try {
    localStorage.removeItem(unitsKey());
    localStorage.removeItem(settingsKey());
  } catch {}
  if (!isOnline()) return;
  try {
    await fetch('/api/units', { method: 'DELETE', headers: headers() });
  } catch {}
};
