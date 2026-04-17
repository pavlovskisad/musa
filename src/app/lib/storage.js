const STORAGE_KEY = 'musa_units';
const SETTINGS_KEY = 'musa_settings';

export const loadUnits = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveUnits = (units) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  } catch {
    // quota exceeded or private browsing — silent fail
  }
};

export const loadSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // silent fail
  }
};

export const clearAll = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // silent fail
  }
};
