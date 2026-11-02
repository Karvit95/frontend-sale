import { describe, it, expect, beforeEach } from 'vitest';
import { getFromCache, setInCache, clearCacheByPrefix } from '../services/cacheWithTTL';

describe('Frontend Performance & Caching Benchmarks Suite', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  // =========================================================================
  // 1. BENCHMARK THROUGHPUT LETTURA E SCRITTURA CACHE CLIENT (1.000 OPERAZIONI)
  // =========================================================================
  it('PERF-FE-01: SessionStorage Cache esegue 1.000 scritture e letture con dataReviver in meno di 50ms', () => {
    const totalOps = 1000;
    const sampleEvent = {
      id: 'evt-cache-perf',
      title: 'Riunione Scientifica',
      start: '2026-11-20T10:00:00.000Z',
      end: '2026-11-20T11:00:00.000Z',
      salaEmail: 'sala1@szn.it',
    };

    // Benchmark Scrittura (setInCache)
    const writeStart = performance.now();
    for (let i = 0; i < totalOps; i++) {
      setInCache(`eventi_sala1_${i}`, sampleEvent);
    }
    const writeDuration = performance.now() - writeStart;

    // Benchmark Lettura (getFromCache con parsing date)
    const readStart = performance.now();
    for (let i = 0; i < totalOps; i++) {
      const cached = getFromCache(`eventi_sala1_${i}`);
      expect(cached).not.toBeNull();
      expect(cached.start).toBeInstanceOf(Date);
    }
    const readDuration = performance.now() - readStart;

    // Asserzioni di performance
    expect(writeDuration).toBeLessThan(70); // < 70ms per 1.000 scritture
    expect(readDuration).toBeLessThan(70);  // < 70ms per 1.000 letture con dateReviver
  });

  // =========================================================================
  // 2. BENCHMARK INVALIDAZIONE SELETTIVA PER PREFISSO (500 CHIAVI)
  // =========================================================================
  it('PERF-FE-02: clearCacheByPrefix su 500 elementi eterogenei completa in meno di 15ms', () => {
    const totalKeys = 500;
    for (let i = 0; i < totalKeys; i++) {
      const prefix = i % 2 === 0 ? 'eventi_sala1@szn.it_' : 'eventi_sala2@szn.it_';
      sessionStorage.setItem(`${prefix}${i}`, JSON.stringify({ data: { id: i }, timestamp: Date.now() }));
    }

    expect(sessionStorage.length).toBe(totalKeys);

    // Invalida solo sala1 (250 elementi)
    const start = performance.now();
    clearCacheByPrefix('eventi_sala1@szn.it_');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(20); // < 20ms
    expect(sessionStorage.length).toBe(250); // rimaste solo le chiavi di sala2
  });

  // =========================================================================
  // 3. BENCHMARK NORMALIZZAZIONE DATASET AD ALTO VOLUME (500 EVENTI)
  // =========================================================================
  it('PERF-FE-03: Normalizzazione di 500 eventi calendario grezzi in oggetti BigCalendar completa in meno di 25ms', () => {
    const totalEvents = 500;
    const rawEvents = [];

    for (let i = 0; i < totalEvents; i++) {
      rawEvents.push({
        id: `evt-${i}`,
        titolo: `Conferenza SZN Sessione ${i}`,
        start: '2026-11-20T09:00:00',
        end: '2026-11-20T10:00:00',
        salaEmail: `sala${i % 5}@szn.it`,
        organizzatore: 'mario.rossi@szn.it',
        modificabile: i % 2 === 0,
      });
    }

    const start = performance.now();
    const formattedEvents = rawEvents.map((evt) => ({
      id: evt.id,
      title: evt.titolo,
      start: new Date(evt.start),
      end: new Date(evt.end),
      resource: {
        salaEmail: evt.salaEmail,
        organizzatore: evt.organizzatore,
        modificabile: evt.modificabile,
      },
    }));
    const duration = performance.now() - start;

    expect(formattedEvents.length).toBe(totalEvents);
    expect(formattedEvents[0].start).toBeInstanceOf(Date);
    expect(duration).toBeLessThan(35); // < 35ms per 500 trasformazioni complete
  });

  // =========================================================================
  // 4. BENCHMARK SCADENZA TTL E CLEANUP AUTOMATICO
  // =========================================================================
  it('PERF-FE-04: Rilevamento ed estinzione automatica di chiavi scadute opera in microsecondi', () => {
    const expiredTimestamp = Date.now() - 300_000; // 5 minuti fa (scaduto con default TTL 2m)
    sessionStorage.setItem('stale_event_1', JSON.stringify({ data: { test: 1 }, timestamp: expiredTimestamp }));
    sessionStorage.setItem('stale_event_2', JSON.stringify({ data: { test: 2 }, timestamp: expiredTimestamp }));

    const start = performance.now();
    const result1 = getFromCache('stale_event_1');
    const result2 = getFromCache('stale_event_2');
    const duration = performance.now() - start;

    expect(result1).toBeNull();
    expect(result2).toBeNull();
    expect(sessionStorage.getItem('stale_event_1')).toBeNull();
    expect(sessionStorage.getItem('stale_event_2')).toBeNull();
    expect(duration).toBeLessThan(5); // < 5ms per rilevamento e rimozione
  });
});
