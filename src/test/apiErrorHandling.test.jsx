import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { authFetch } from '../services/authFetch';
import App from '../App';
import { api } from '../services/api';

const DEFAULT_ADMIN_ROLE = ['RoomBooking', 'Admin'].join('.');

// Riferimenti STABILI per evitare cicli infiniti di re-render nei hook useEffect
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

// Mock di MSAL React per controllare lo stato di autenticazione nei test
vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: mockMsalInstanceObj,
    accounts: mockAccountsList,
    inProgress: 'none',
  }),
}));

// Mock di msalInstance usato internamente da authFetch
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

// Mock del modulo api per simulare risposte e fallimenti del backend
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

describe('API Error Handling & Resilience Tests', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('authFetch Service - HTTP Status Code Error Propagation', () => {
    it('dovrebbe gestire HTTP 400 Bad Request estraendo il messaggio di validazione', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Dati non validi: orari fuori dalla fascia consentita' }),
      });

      await expect(authFetch('/api/prenotazioni', { method: 'POST' })).rejects.toThrow(
        'Dati non validi: orari fuori dalla fascia consentita'
      );
    });

    it('dovrebbe gestire HTTP 401 Unauthorized segnalando token scaduto o non valido', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token JWT scaduto o firma non valida' }),
      });

      await expect(authFetch('/api/sale')).rejects.toThrow(
        'Token JWT scaduto o firma non valida'
      );
    });

    it('dovrebbe gestire HTTP 403 Forbidden per tentativi di accesso non autorizzato (IDOR)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Accesso negato: non puoi modificare prenotazioni di altri utenti' }),
      });

      await expect(authFetch('/api/prenotazioni/999', { method: 'PATCH' })).rejects.toThrow(
        'Accesso negato: non puoi modificare prenotazioni di altri utenti'
      );
    });

    it('dovrebbe gestire HTTP 409 Conflict per tentativi di double-booking concorrente', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Conflitto: la sala è già prenotata nello slot richiesto' }),
      });

      await expect(authFetch('/api/prenotazioni', { method: 'POST' })).rejects.toThrow(
        'Conflitto: la sala è già prenotata nello slot richiesto'
      );
    });

    it('dovrebbe gestire HTTP 500 Internal Server Error con payload JSON di errore', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error', message: 'Errore interno nel gateway Microsoft Graph' }),
      });

      await expect(authFetch('/api/prenotazioni')).rejects.toThrow(
        'Errore interno nel gateway Microsoft Graph'
      );
    });

    it('dovrebbe applicare il messaggio di fallback se il backend 500 risponde con HTML o body non-JSON (senza crash JSON.parse)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });

      const fallback = 'Errore personalizzato di connessione con il backend';
      await expect(authFetch('/api/sale', {}, fallback)).rejects.toThrow(fallback);
    });
  });

  describe('UI Visual Error Handling in App Component', () => {
    it('dovrebbe mostrare messaggio di errore visivo nel DOM in caso di fallimento getSale (senza crash o schermata bianca)', async () => {
      api.getSale.mockRejectedValue(new Error('Errore di connessione col backend per le sale'));

      let rendered;
      await act(async () => {
        rendered = render(<App />);
      });

      const { container } = rendered;

      // Verifica che la pagina non crashi e mostri il messaggio di errore
      await waitFor(() => {
        const errorElement = container.querySelector('.text-error');
        expect(errorElement).not.toBeNull();
        expect(errorElement.textContent).toContain('Errore: Errore di connessione col backend per le sale');
      });

      // L\'intestazione e il saluto utente devono rimanere visibili (no white-screen)
      expect(container.querySelector('.header-greeting')).not.toBeNull();
      expect(container.querySelector('.sidebar')).not.toBeNull();
    });

    it('dovrebbe mostrare un Toast di notifica errore quando il recupero eventi fallisce (HTTP 500 o Graph Down)', async () => {
      const mockSale = [
        { id: '1', nome: 'Sala SZN Centrale', email: 'sala.centrale@szn.it' },
      ];
      api.getSale.mockResolvedValue(mockSale);
      api.getPrenotazioni.mockRejectedValue(new Error('Downstream Microsoft Graph failure: 503 Service Unavailable'));

      let rendered;
      await act(async () => {
        rendered = render(<App />);
      });

      const { container } = rendered;

      await waitFor(() => {
        const toast = container.querySelector('.toast.toast-error');
        expect(toast).not.toBeNull();
        expect(toast.textContent).toContain('Errore recupero eventi: Downstream Microsoft Graph failure');
      });

      // Il selettore di sala e la UI devono restare navigabili
      expect(container.querySelector('.select-sala')).not.toBeNull();
    });

    it('dovrebbe mostrare Toast di errore quando il salvataggio prenotazione fallisce con 409 Conflitto', async () => {
      const mockSale = [
        { id: '1', nome: 'Sala SZN Centrale', email: 'sala.centrale@szn.it' },
      ];
      api.getSale.mockResolvedValue(mockSale);
      api.getPrenotazioni.mockResolvedValue([]);
      api.creaPrenotazione.mockRejectedValue(new Error('409 Conflitto: Sala già occupata da un altro utente'));

      let rendered;
      await act(async () => {
        rendered = render(<App />);
      });

      const { container } = rendered;

      // Attendi che il caricamento iniziale termini
      await waitFor(() => {
        expect(container.querySelector('.btn-refresh')).not.toBeNull();
      });

      // Apri il form cliccando "+ Nuova Prenotazione" nella sidebar
      const btnNuova = container.querySelector('.bottone-menu.primario');
      expect(btnNuova).not.toBeNull();
      await act(async () => {
        fireEvent.click(btnNuova);
      });

      // Compila il form
      const inputTitolo = container.querySelector('input.form-input[type="text"]');
      const inputGiorno = container.querySelector('input[type="date"]');
      const timeInputs = container.querySelectorAll('input[type="time"]');

      await act(async () => {
        fireEvent.change(inputTitolo, { target: { value: 'Riunione Concorrente' } });
        fireEvent.change(inputGiorno, { target: { value: '2026-11-05' } });
        fireEvent.change(timeInputs[0], { target: { value: '10:00' } });
        fireEvent.change(timeInputs[1], { target: { value: '11:00' } });
      });

      // Invia il form
      const form = container.querySelector('form');
      await act(async () => {
        fireEvent.submit(form);
      });

      // Verifica che appaia il Toast di errore con il messaggio 409
      await waitFor(() => {
        const toast = container.querySelector('.toast.toast-error');
        expect(toast).not.toBeNull();
        expect(toast.textContent).toContain('Errore durante il salvataggio: 409 Conflitto');
      });

      // Il form deve rimanere visibile consentendo la correzione
      expect(container.querySelector('.modal-content')).not.toBeNull();
    });

    it('dovrebbe consentire all\'utente di chiudere la notifica Toast cliccando sulla X', async () => {
      const mockSale = [
        { id: '1', nome: 'Sala SZN Centrale', email: 'sala.centrale@szn.it' },
      ];
      api.getSale.mockResolvedValue(mockSale);
      api.getPrenotazioni.mockRejectedValue(new Error('Errore di timeout'));

      let rendered;
      await act(async () => {
        rendered = render(<App />);
      });

      const { container } = rendered;

      await waitFor(() => {
        expect(container.querySelector('.toast.toast-error')).not.toBeNull();
      });

      const closeButton = container.querySelector('.toast-close');
      expect(closeButton).not.toBeNull();

      await act(async () => {
        fireEvent.click(closeButton);
      });

      expect(container.querySelector('.toast.toast-error')).toBeNull();
    });
  });
});
