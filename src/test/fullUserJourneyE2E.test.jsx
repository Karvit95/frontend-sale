import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import { api } from '../services/api';

const DEFAULT_ADMIN_ROLE = ['RoomBooking', 'Admin'].join('.');

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

describe('Frontend End-to-End User Journeys (E2E)', () => {
  const mockSaleList = [
    { id: '1', nome: 'Sala Dohrn', email: 'sala.dohrn@szn.it' },
    { id: '2', nome: 'Sala Medusa', email: 'sala.medusa@szn.it' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockAccountsList[0].idTokenClaims.roles = [DEFAULT_ADMIN_ROLE];
    api.getSale.mockResolvedValue(mockSaleList);
    api.getPrenotazioni.mockResolvedValue([]);
    api.getPrenotazioniTutteSale.mockResolvedValue({
      prenotazioni: [],
      saleNonDisponibili: [],
      parziale: false,
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('E2E-FE-01 (P0): Percorso Completo Creazione Prenotazione da Interfaccia Utente', async () => {
    api.creaPrenotazione.mockResolvedValue({
      id: 'created-e2e-1',
      titolo: 'Riunione Direttivo Straordinario',
      start: '2026-11-15T10:00:00',
      end: '2026-11-15T11:00:00',
      salaId: '1',
    });

    let rendered;
    await act(async () => {
      rendered = render(<App />);
    });

    const { container } = rendered;

    // Attesa caricamento dashboard
    await waitFor(() => {
      expect(container.querySelector('.btn-refresh')).not.toBeNull();
    });

    // 1. Clicca "+ Nuova Prenotazione" nella sidebar
    const btnNuova = container.querySelector('.bottone-menu.primario');
    expect(btnNuova).not.toBeNull();
    await act(async () => {
      fireEvent.click(btnNuova);
    });

    // 2. Verifica che il modal del form sia aperto
    const modal = container.querySelector('.modal-content');
    expect(modal).not.toBeNull();

    // 3. Compila il modulo
    const inputTitolo = container.querySelector('input.form-input[type="text"]');
    const inputGiorno = container.querySelector('input[type="date"]');
    const timeInputs = container.querySelectorAll('input[type="time"]');

    await act(async () => {
      fireEvent.change(inputTitolo, { target: { value: 'Riunione Direttivo Straordinario' } });
      fireEvent.change(inputGiorno, { target: { value: '2026-11-15' } });
      fireEvent.change(timeInputs[0], { target: { value: '10:00' } });
      fireEvent.change(timeInputs[1], { target: { value: '11:00' } });
    });

    // 4. Invia il form
    const form = container.querySelector('form');
    await act(async () => {
      fireEvent.submit(form);
    });

    // 5. Verifica chiamata API e toast di successo
    await waitFor(() => {
      expect(api.creaPrenotazione).toHaveBeenCalledTimes(1);
      const toastSuccess = container.querySelector('.toast.toast-success');
      expect(toastSuccess).not.toBeNull();
      expect(toastSuccess.textContent).toContain('Prenotazione salvata con successo!');
    });
  });

  it('E2E-FE-02 (P0): Percorso Resilienza Tabellone Globale — Fallimento Parziale -> Banner -> Riprova -> Ripristino', async () => {
    // 1a chiamata: risultato parziale
    api.getPrenotazioniTutteSale.mockResolvedValueOnce({
      prenotazioni: [
        {
          id: 'evt-1',
          titolo: 'Evento Sala Dohrn',
          start: '2026-11-15T09:00:00.000Z',
          end: '2026-11-15T10:00:00.000Z',
          salaId: '1',
        },
      ],
      saleNonDisponibili: [
        { salaEmail: 'sala.medusa@szn.it', salaNome: 'Sala Medusa', motivo: 'TIMEOUT' },
      ],
      parziale: true,
    });

    // 2a chiamata (dopo riprova): risultato completo
    api.getPrenotazioniTutteSale.mockResolvedValueOnce({
      prenotazioni: [
        {
          id: 'evt-1',
          titolo: 'Evento Sala Dohrn',
          start: '2026-11-15T09:00:00.000Z',
          end: '2026-11-15T10:00:00.000Z',
          salaId: '1',
        },
        {
          id: 'evt-2',
          titolo: 'Evento Sala Medusa',
          start: '2026-11-15T14:00:00.000Z',
          end: '2026-11-15T15:00:00.000Z',
          salaId: '2',
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

    // Naviga al Tabellone Globale
    const btnTabellone = container.querySelector('.bottone-menu:not(.primario)');
    await act(async () => {
      fireEvent.click(btnTabellone);
    });

    // Verifica comparsa del banner di avviso
    await waitFor(() => {
      const banner = container.querySelector('.banner-warning');
      expect(banner).not.toBeNull();
      expect(banner.textContent).toContain('Sala Medusa');
    });

    // Clicca sul pulsante "Riprova" nel banner
    const btnRiprova = container.querySelector('.btn-retry-banner');
    expect(btnRiprova).not.toBeNull();

    await act(async () => {
      fireEvent.click(btnRiprova);
    });

    // Verifica che il banner scompaia a seguito del recupero completo
    await waitFor(() => {
      expect(container.querySelector('.banner-warning')).toBeNull();
      expect(api.getPrenotazioniTutteSale).toHaveBeenCalledTimes(2);
    });
  });

  it('E2E-FE-03 (P0): Percorso Navigazione Utente Standard — Consultazione e Protezione RBAC', async () => {
    // Utente standard senza ruolo admin
    mockAccountsList[0].idTokenClaims.roles = ['RoomBooking.User'];

    let rendered;
    await act(async () => {
      rendered = render(<App />);
    });

    const { container } = rendered;

    // Attendi caricamento
    await waitFor(() => {
      expect(container.querySelector('.select-sala')).not.toBeNull();
    });

    // Verifica che il pulsante "+ Nuova Prenotazione" sia completamente escluso dal DOM
    const btnNuova = container.querySelector('.bottone-menu.primario');
    expect(btnNuova).toBeNull();

    // Il selettore di sala e il calendario rimangono navigabili per consultazione
    const selectSala = container.querySelector('.select-sala');
    expect(selectSala).not.toBeNull();
    expect(selectSala.value).toBe('sala.dohrn@szn.it');
  });
});
