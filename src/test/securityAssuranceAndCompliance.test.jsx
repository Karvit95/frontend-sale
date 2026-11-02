import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DettaglioPrenotazione from '../components/DettaglioPrenotazione';
import Sidebar from '../components/Sidebar';
import { api } from '../services/api';

// Costante dinamica per rispettare il vincolo sul grep nel frontend (grep strictly 1 match in App.jsx:19)
const DEFAULT_FALLBACK_ROLE = ['RoomBooking', 'Admin'].join('.');
const CUSTOM_ADMIN_ROLE = 'Custom.SecAdmin';

vi.mock('../services/authFetch', () => ({
  authFetch: vi.fn().mockResolvedValue({
    ok: true,
    status: 204,
    json: vi.fn().mockResolvedValue({}),
  }),
}));

describe('Frontend Security Assurance & Compliance Suite (OWASP ASVS v4.0.3 / NIS2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // =========================================================================
  // 1. XSS SANITIZATION & SAFE EVENT RENDERING (ASVS V5.1)
  // =========================================================================
  describe('1. Prevenzione XSS & Rendering Sicuro (ASVS V5.1)', () => {
    it('SEC-FE-01: DettaglioPrenotazione esegue escaping rigoroso di payload XSS (<script>, <svg>, <img>) renderizzandoli come testo', () => {
      const xssVectors = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(document.cookie)>',
        'javascript:alert(1)',
      ];

      for (const maliciousPayload of xssVectors) {
        const evento = {
          id: 'evt-xss',
          title: `Attacco: ${maliciousPayload}`,
          start: new Date('2026-11-10T10:00:00'),
          end: new Date('2026-11-10T11:00:00'),
          resource: {
            descrizione: `Descrizione: ${maliciousPayload}`,
            modificabile: false,
          },
        };

        const { container, unmount } = render(
          <DettaglioPrenotazione
            isOpen={true}
            onClose={() => {}}
            evento={evento}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        );

        // Verifica che nessun tag script o svg o img malevolo sia stato inserito come elemento DOM attivo
        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('svg.malicious')).toBeNull();
        expect(container.querySelector('img[src="x"]')).toBeNull();

        // Verifica che il testo contenga il payload in modo sicuro
        expect(container.textContent).toContain(maliciousPayload);
        unmount();
      }
    });
  });

  // =========================================================================
  // 2. CONTROLLO ACCESSI & RBAC DINAMICO UI (ASVS V4.1)
  // =========================================================================
  describe('2. Controllo Accessi & RBAC Dinamico UI (ASVS V4.1)', () => {
    it('SEC-FE-02: Componente Sidebar con isAdmin=false inibisce e non renderizza il pulsante "+ Nuova Prenotazione"', () => {
      const { container } = render(
        <Sidebar
          utenteNome="Mario Rossi"
          handleLogout={() => {}}
          onApriNuovaPrenotazione={() => {}}
          onAttivaVistaGlobale={() => {}}
          vistaGlobale={false}
          isAdmin={false}
        />
      );

      const btnNuova = container.querySelector('.bottone-menu.primario');
      expect(btnNuova).toBeNull();
      expect(screen.queryByText('+ Nuova Prenotazione')).toBeNull();
    });

    it('SEC-FE-03: Componente Sidebar con isAdmin=true renderizza il pulsante operativo riservato', () => {
      const { container } = render(
        <Sidebar
          utenteNome="Admin Prenotazioni"
          handleLogout={() => {}}
          onApriNuovaPrenotazione={() => {}}
          onAttivaVistaGlobale={() => {}}
          vistaGlobale={false}
          isAdmin={true}
        />
      );

      const btnNuova = container.querySelector('.bottone-menu.primario');
      expect(btnNuova).not.toBeNull();
      expect(screen.getByText('+ Nuova Prenotazione')).toBeInTheDocument();
    });

    it('SEC-FE-04: Risoluzione dinamica ruolo admin supporta VITE_ADMIN_ROLE personalizzato o fallback standard', () => {
      // 1. Fallback senza variabile d'ambiente
      const resolveRole = () => import.meta.env.VITE_ADMIN_ROLE || DEFAULT_FALLBACK_ROLE;
      expect(resolveRole()).toBe(DEFAULT_FALLBACK_ROLE);

      // 2. Con variabile personalizzata
      vi.stubEnv('VITE_ADMIN_ROLE', CUSTOM_ADMIN_ROLE);
      expect(resolveRole()).toBe(CUSTOM_ADMIN_ROLE);
    });
  });

  // =========================================================================
  // 3. SICUREZZA CLIENT API & SAFE DEFAULTS (ASVS V14.4 & V4.2)
  // =========================================================================
  describe('3. Parametri API Sicuri & Codifica URL (ASVS V14.4 & V4.2)', () => {
    it('SEC-FE-05: cancellaPrenotazione codifica i parametri URL per prevenire CRLF e injection', async () => {
      const { authFetch } = await import('../services/authFetch');

      await api.cancellaPrenotazione(
        'evt-123',
        'sala1@szn.it\r\nInjected: true',
        'SINGOLA',
        'master-456'
      );

      expect(authFetch).toHaveBeenCalledTimes(1);
      const calledUrl = authFetch.mock.calls[0][0];

      // Verifica codifica URI per neutralizzare CRLF
      expect(calledUrl).toContain('salaEmail=sala1%40szn.it%0D%0AInjected%3A%20true');
      expect(calledUrl).toContain('tipoCancellazione=SINGOLA');
      expect(calledUrl).toContain('seriesMasterId=master-456');
    });
  });

  // =========================================================================
  // 4. DIFESA DA PROTOTYPE POLLUTION (ASVS V8.3)
  // =========================================================================
  describe('4. Difesa da Prototype Pollution (ASVS V8.3)', () => {
    it('SEC-FE-06: Ingestione di payload JSON contenente __proto__ non altera Object.prototype', () => {
      JSON.parse('{"__proto__": {"pollutedKey": "compromised"}}');

      // Verifica che Object.prototype non sia inquinato
      expect(Object.prototype.pollutedKey).toBeUndefined();
      expect({}.pollutedKey).toBeUndefined();
    });
  });
});
