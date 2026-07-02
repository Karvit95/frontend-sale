// cacheWithTTL.js — Cache in sessionStorage con Time-To-Live configurabile
// TTL predefinito: 15 minuti (900.000 ms)
const TTL_DEFAULT = 15 * 60 * 1000;

/**
 * Legge un valore dalla cache. Se scaduto o assente, restituisce null.
 * @param {string} key — Chiave univoca per il dato
 * @param {number} ttlMs — Durata di validità in millisecondi (default 15 min)
 * @returns {any|null} — Dato parsato oppure null
 */
export function getFromCache(key, ttlMs = TTL_DEFAULT) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const { data, timestamp } = JSON.parse(raw);

    // Verifica scadenza
    if (Date.now() - timestamp > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }

    return data;
  } catch {
    // Cache corrotta: pulisci e restituisci null
    sessionStorage.removeItem(key);
    return null;
  }
}

/**
 * Salva un valore nella cache con timestamp corrente.
 * @param {string} key — Chiave univoca
 * @param {any} data — Dato da salvare (verrà serializzato in JSON)
 */
export function setInCache(key, data) {
  try {
    const entry = { data, timestamp: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn("Impossibile scrivere in sessionStorage:", e);
  }
}

/**
 * Rimuove una chiave dalla cache (invalida forzatamente).
 * @param {string} key — Chiave da rimuovere
 */
export function clearCache(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (e) {
    console.warn("Impossibile rimuovere da sessionStorage:", e);
  }
}