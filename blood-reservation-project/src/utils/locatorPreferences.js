const STORAGE_KEY = 'bloodLocatorPreferences';

export function readLocatorPreferences() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

export function saveLocatorPreferences(updates) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readLocatorPreferences(), ...updates }));
  } catch {
    // Keep the locator usable if browser storage is unavailable.
  }
}
