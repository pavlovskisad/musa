let userId = null;

const unitsKey = () => userId ? `musa_units_${userId}` : 'musa_units';
const settingsKey = () => userId ? `musa_settings_${userId}` : 'musa_settings';

export const setStorageUserId = (id) => { userId = id; };

export const loadUnits = () => {
  try {
    const raw = localStorage.getItem(unitsKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveUnits = (units) => {
  try {
    localStorage.setItem(unitsKey(), JSON.stringify(units));
  } catch {}
};

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

export const clearAll = () => {
  try {
    localStorage.removeItem(unitsKey());
    localStorage.removeItem(settingsKey());
  } catch {}
};
