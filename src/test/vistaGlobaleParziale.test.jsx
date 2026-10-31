import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import { api } from '../services/api';

const DEFAULT_ADMIN_ROLE = ['RoomBooking', 'Admin'].join('.');
import { authFetch } from '../services/authFetch';

const mockMsalInstanceObj = {
  loginRedirect: vi.fn(),
  logoutRedirect: vi.fn(),
  getActiveAccount: () => ({
    username: 'mario.rossi@szn.it',
    name: 'Mario Rossi',
  }),
  getAllAccounts: () => [
    {
      username: 'mario.rossi@szn.it',
      name: 'Mario Rossi',
    },
  ],
  acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'valid-test-jwt-token' }),
  acquireTokenPopup: vi.fn().mockResolvedValue({ accessToken: 'valid-test-jwt-token-popup' }),
};

const mockAccountsList = [
  {
    username: 'mario.rossi@szn.it',
    name: 'Mario Rossi',
    idTokenClaims: { roles: [DEFAULT_ADMIN_ROLE] },
  },
];

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: mockMsalInstanceObj,
    accounts: mockAccountsList,
    inProgress: 'none',
  }),
}));

vi.mock('../msalInstance', () => ({
  msalInstance: {
    getActiveAccount: vi.fn(() => ({
      username: 'mario.rossi@szn.it',
      name: 'Mario Rossi',
    })),
    getAllAccounts: vi.fn(() => [
      {
        username: 'mario.rossi@szn.it',
        name: 'Mario Rossi',
      },
    ]),
    acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'valid-test-jwt-token' }),
    acquireTokenPopup: vi.fn().mockResolvedValue({ accessToken: 'valid-test-jwt-token-popup' }),
  },
}));

vi.mock('../services/authFetch', () => ({
  authFetch: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: {
    getSale: vi.fn(),
    getPrenotazioni: vi.fn(),
    getPrenotazioniTutteSale: vi.fn(),
    creaPrenotazione: vi.fn(),
    modificaPrenotazione: vi.fn(),
    cancellaPrenotazione: vi.fn(),
  },
}));

describe('Vista Globale con Risultato Parziale', () => {
  const mockSale = [
    { id: '1', nome: 'Sala Blu', email: 'sala.blu@szn.it' },
    { id: '2', nome: 'Sala Rossa', email: 'sala.rossa@szn.it' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    api.getSale.mockResolvedValue(mockSale);
    api.getPrenotazioni.mockResolvedValue([]);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('api.getPrenotazioniTutteSale normalizzazione', () => {
    it('normalizza risposta array (backend legacy) in oggetto completo con parziale=false', async () => {
      // Importiamo l'implementazione reale senza mock
      const realApiModule = await vi.importActual('../services/api');
      authFetch.mockResolvedValue({
        json: async () => [{ id: 'evt-1', titolo: 'Evento Legacy' }],
      });

      const res = await realApiModule.api.getPrenotazioniTutteSale('2026-11-01', '2026-11-02');
      expect(res).toEqual({
        prenotazioni: [{ id: 'evt-1', titolo: 'Evento Legacy' }],
        saleNonDisponibili: [],
        parziale: false,
      });
    });

    it('gestisce risposta strutturata parziale con saleNonDisponibili', async () => {
      const realApiModule = await vi.importActual('../services/api');
      authFetch.mockResolvedValue({
        json: async () => ({
          prenotazioni: [{ id: 'evt-2', titolo: 'Evento Attivo' }],
          saleNonDisponibili: [{ salaEmail: 'sala.rossa@szn.it', salaNome: 'Sala Rossa', motivo: 'TIMEOUT' }],
          parziale: true,
        }),
      });

      const res = await realApiModule.api.getPrenotazioniTutteSale('2026-11-01', '2026-11-02');
      expect(res.parziale).toBe(true);
      expect(res.prenotazioni.length).toBe(1);
      expect(res.saleNonDisponibili.length).toBe(1);
      expect(res.saleNonDisponibili[0].salaEmail).toBe('sala.rossa@szn.it');
    });

    it('gestisce risposta anomala senza prenotazioni trattandola come lista vuota', async () => {
      const realApiModule = await vi.importActual('../services/api');
      authFetch.mockResolvedValue({
        json: async () => ({
          parziale: false,
        }),
      });

      const res = await realApiModule.api.getPrenotazioniTutteSale('2026-11-01', '2026-11-02');
      expect(res.prenotazioni).toEqual([]);
      expect(res.saleNonDisponibili).toEqual([]);
      expect(res.parziale).toBe(false);
    });
  });

  describe('Comportamento UI App in Vista Globale', () => {
    it('risposta parziale: mostra banner con nomi sale e NON scrive in cache', async () => {
      api.getPrenotazioniTutteSale.mockResolvedValue({
        prenotazioni: [
          {
            id: 'evt-1',
            titolo: 'Riunione Sala Blu',
            start: '2026-11-01T10:00:00.000Z',
            end: '2026-11-01T11:00:00.000Z',
            salaId: '1',
          },
        ],
        saleNonDisponibili: [
          { salaEmail: 'sala.rossa@szn.it', salaNome: 'Sala Rossa', motivo: 'TIMEOUT' },
        ],
        parziale: true,
      });

      let rendered;
      await act(async () => {
        rendered = render(<App />);
      });

      const { container } = rendered;

      // Passa a Vista Globale
      const btnTabellone = container.querySelector('.bottone-menu:not(.primario)');
      expect(btnTabellone).not.toBeNull();
      await act(async () => {
        fireEvent.click(btnTabellone);
      });

      // Attendi che il banner appaia
      await waitFor(() => {
        const banner = container.querySelector('.banner-warning');
        expect(banner).not.toBeNull();
        expect(banner.getAttribute('role')).toBe('status');
        expect(banner.textContent).toContain('Alcune sale non sono state caricate (Sala Rossa): gli eventi mostrati potrebbero essere incompleti.');
      });

      // Verifica che NON sia stato salvato nulla in sessionStorage per la chiave globale
      const keys = Object.keys(sessionStorage);
      const globalCacheKeys = keys.filter(k => k.startsWith('eventi_globali_'));
      expect(globalCacheKeys.length).toBe(0);
    });

    it('risposta completa: non mostra banner e salva in cache', async () => {
      api.getPrenotazioniTutteSale.mockResolvedValue({
        prenotazioni: [
          {
            id: 'evt-1',
            titolo: 'Riunione Completa',
            start: '2026-11-01T10:00:00.000Z',
            end: '2026-11-01T11:00:00.000Z',
            salaId: '1',
          },
        ],
        saleNonDisponibili: [],
        parziale: false,
      });

      let rendered;
      await act(async () => {
        rendered = render(<App />);
      });

      const { container } = rendered;

      // Passa a Vista Globale
      const btnTabellone = container.querySelector('.bottone-menu:not(.primario)');
      await act(async () => {
        fireEvent.click(btnTabellone);
      });

      await waitFor(() => {
        expect(container.querySelector('.badge-globale')).not.toBeNull();
      });

      // Banner non deve essere presente
      expect(container.querySelector('.banner-warning')).toBeNull();

      // Cache globale deve essere valorizzata
      const keys = Object.keys(sessionStorage);
      const globalCacheKeys = keys.filter(k => k.startsWith('eventi_globali_'));
      expect(globalCacheKeys.length).toBeGreaterThan(0);
    });

    it('risposta come array (retrocompatibilità): funziona correttamente senza banner', async () => {
      api.getPrenotazioniTutteSale.mockResolvedValue({
        prenotazioni: [
          {
            id: 'evt-array',
            titolo: 'Evento da Array Legacy',
            start: '2026-11-01T10:00:00.000Z',
            end: '2026-11-01T11:00:00.000Z',
            salaId: '1',
          },
        ],
        saleNonDisponibili: [],
        parziale: false,
      });

      let rendered;
      await act(async () => {
        rendered = render(<App />);
      });

      const { container } = rendered;

      const btnTabellone = container.querySelector('.bottone-menu:not(.primario)');
      await act(async () => {
        fireEvent.click(btnTabellone);
      });

      await waitFor(() => {
        expect(container.querySelector('.badge-globale')).not.toBeNull();
      });

      expect(container.querySelector('.banner-warning')).toBeNull();
    });

    it('click su "Riprova" nel banner esegue una nuova chiamata a getPrenotazioniTutteSale', async () => {
      api.getPrenotazioniTutteSale.mockResolvedValue({
        prenotazioni: [],
        saleNonDisponibili: [
          { salaEmail: 'sala.rossa@szn.it', salaNome: 'Sala Rossa', motivo: 'TIMEOUT' },
        ],
        parziale: true,
      });

      let rendered;
      await act(async () => {
        rendered = render(<App />);
      });

      const { container } = rendered;

      const btnTabellone = container.querySelector('.bottone-menu:not(.primario)');
      await act(async () => {
        fireEvent.click(btnTabellone);
      });

      await waitFor(() => {
        expect(container.querySelector('.banner-warning')).not.toBeNull();
      });

      const callsBefore = api.getPrenotazioniTutteSale.mock.calls.length;

      // Clicca sul pulsante Riprova
      const btnRiprova = container.querySelector('.banner-warning button');
      expect(btnRiprova).not.toBeNull();
      expect(btnRiprova.textContent).toContain('Riprova');

      await act(async () => {
        fireEvent.click(btnRiprova);
      });

      await waitFor(() => {
        expect(api.getPrenotazioniTutteSale.mock.calls.length).toBeGreaterThan(callsBefore);
      });
    });

    it('passaggio a vista singola sala fa scomparire il banner', async () => {
      api.getPrenotazioniTutteSale.mockResolvedValue({
        prenotazioni: [],
        saleNonDisponibili: [
          { salaEmail: 'sala.rossa@szn.it', salaNome: 'Sala Rossa', motivo: 'TIMEOUT' },
        ],
        parziale: true,
      });

      let rendered;
      await act(async () => {
        rendered = render(<App />);
      });

      const { container } = rendered;

      // Entra in vista globale
      const btnTabellone = container.querySelector('.bottone-menu:not(.primario)');
      await act(async () => {
        fireEvent.click(btnTabellone);
      });

      await waitFor(() => {
        expect(container.querySelector('.banner-warning')).not.toBeNull();
      });

      // Torna alla singola sala
      const btnTornaSingola = container.querySelector('.controls-header button.btn-outline');
      expect(btnTornaSingola).not.toBeNull();
      expect(btnTornaSingola.textContent).toContain('Torna alla singola sala');

      await act(async () => {
        fireEvent.click(btnTornaSingola);
      });

      await waitFor(() => {
        expect(container.querySelector('.banner-warning')).toBeNull();
      });
    });
  });
});
