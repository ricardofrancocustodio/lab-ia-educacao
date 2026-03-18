const Cache = {
  get(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;

      const { value, expires } = JSON.parse(raw);
      if (Date.now() > expires) {
        sessionStorage.removeItem(key);
        return null;
      }

      return value;
    } catch {
      return null;
    }
  },

  set(key, value, ttlSeconds = 300) {
    const payload = {
      value,
      expires: Date.now() + ttlSeconds * 1000
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  },

  clearPrefix(prefix) {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => sessionStorage.removeItem(k));
  }
};

window.Cache = Cache; // 👈 torna global
