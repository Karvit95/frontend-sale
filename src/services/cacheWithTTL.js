// cacheWithTTL.js — Cache in sessionStorage con Time-To-Live configurabile
// TTL predefinito: 2 minuti (120.000 ms) per garantire freschezza con Outlook
const TTL_DEFAULT = 2 * 60 * 1000;

// Regex ISO-8601 per intercettare date serializzate in JSON
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

/**
 * Funzione reviver per JSON.parse: ricostruisce oggetti Date nativi
 * a partire dalle stringhe ISO serializzate (in particolare per i campi start ed end).
 */
export function dateReviver(key, value) {
  if (typeof value === "string" && (key === "start" || key === "end" || ISO_DATE_REGEX.test(value))) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

/**
 * Legge un valore dalla cache. Se scaduto o assente, restituisce null.
 * @param {string} key — Chiave univoca per il dato
 * @param {number} ttlMs — Durata di validità in millisecondi (default 2 min)
 * @param {function} reviver — Funzione reviver per JSON.parse (default: dateReviver)
 * @returns {any|null} — Dato parsato oppure null
 */
export function getFromCache(key, ttlMs = TTL_DEFAULT, reviver = dateReviver) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const { data, timestamp } = JSON.parse(raw, reviver);

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

/**
 * Rimuove dalla cache tutte le chiavi che iniziano con il prefisso indicato.
 * Utile quando non si conoscono a priori tutte le chiavi coinvolte da
 * un'operazione — tipicamente una serie ricorrente, che può toccare
 * più mesi/giorni diversi (impossibile calcolarli con precisione lato
 * frontend senza duplicare la logica di espansione della ricorrenza,
 * che vive correttamente solo sul backend).
 * @param {string} prefix
 */
export function clearCacheByPrefix(prefix) {
  try {
    const chiaviDaRimuovere = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) {
        chiaviDaRimuovere.push(key);
      }
    }
    chiaviDaRimuovere.forEach(key => sessionStorage.removeItem(key));
  } catch (e) {
    console.warn("Impossibile pulire la cache per prefisso:", prefix, e);
  }
}
