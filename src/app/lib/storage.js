// Persist userId so loadUnits() on cold start reads the right per-user key
// (Privy auth resolves async — without this, initial render reads an empty
// `musa_units` key and a subsequent saveUnits([]) wipes real data.)
let userId = (() => {
  try { return localStorage.getItem('musa_user_id'); } catch { return null; }
})();
let accessToken = null;

const unitsKey = () => userId ? `musa_units_${userId}` : 'musa_units';
const settingsKey = () => userId ? `musa_settings_${userId}` : 'musa_settings';

export const setStorageUserId = (id) => {
  userId = id;
  try { localStorage.setItem('musa_user_id', id); } catch {}
};
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
  const cached = loadUnits();
  if (!isOnline()) return cached;
  try {
    const res = await fetch('/api/units', { headers: headers() });
    if (!res.ok) return cached;
    const units = await res.json();
    // Don't wipe a non-empty cache with an empty API response — could be a
    // stale DB read or a unit that hasn't finished syncing. Trust local in
    // that case; real DB updates will overwrite on next non-empty fetch.
    if (units.length === 0 && cached.length > 0) return cached;
    localStorage.setItem(unitsKey(), JSON.stringify(units));
    return units;
  } catch {
    return cached;
  }
};

export const saveUnits = (units) => {
  try {
    localStorage.setItem(unitsKey(), JSON.stringify(units));
  } catch {}
};

export const createUnit = async (unit) => {
  if (!isOnline()) {
    saveUnits([unit, ...loadUnits()]);
    return { ok: true, offline: true };
  }
  try {
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(unit),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error || `HTTP ${res.status}`, detail: body.detail };
    }
    const data = await res.json();
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: 'Network error', detail: String(err.message || err) };
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

export const claimUnit = async (unitId, gramsClaimed) => {
  if (!isOnline()) return;
  try {
    await fetch(`/api/units/${unitId}/claim`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ gramsClaimed }),
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
