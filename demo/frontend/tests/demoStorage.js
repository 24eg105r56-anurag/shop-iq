export class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

export function setupBrowserStorage() {
  const localStorage = new MemoryStorage();
  globalThis.window = {
    localStorage,
    location: { origin: "http://localhost" },
  };
  return localStorage;
}

export function jsonBody(body) {
  return { body: JSON.stringify(body) };
}
