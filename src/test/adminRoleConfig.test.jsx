import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import App from '../App';

const DEFAULT_FALLBACK_ROLE = ['RoomBooking', 'Admin'].join('.');
const CUSTOM_ROLE = 'Custom.RoomAdmin';

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
    idTokenClaims: { roles: [] },
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
    getSale: vi.fn().mockResolvedValue([
      { id: '1', nome: 'Sala SZN', email: 'sala@szn.it' },
    ]),
    getPrenotazioni: vi.fn().mockResolvedValue([]),
    getPrenotazioniTutteSale: vi.fn().mockResolvedValue({ prenotazioni: [], saleNonDisponibili: [], parziale: false }),
    creaPrenotazione: vi.fn(),
    modificaPrenotazione: vi.fn(),
    cancellaPrenotazione: vi.fn(),
  },
}));

describe('Configurabilità ruolo admin via VITE_ADMIN_ROLE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('con VITE_ADMIN_ROLE personalizzato, utente con quel ruolo vede i controlli admin', async () => {
    vi.stubEnv('VITE_ADMIN_ROLE', CUSTOM_ROLE);
    mockAccountsList[0].idTokenClaims.roles = [CUSTOM_ROLE];

    let rendered;
    await act(async () => {
      rendered = render(<App />);
    });

    const { container } = rendered;
    await waitFor(() => {
      const btnNuova = container.querySelector('.bottone-menu.primario');
      expect(btnNuova).not.toBeNull();
      expect(btnNuova.textContent).toContain('Nuova Prenotazione');
    });
  });

  it('con VITE_ADMIN_ROLE personalizzato, utente con ruolo predefinito di fallback NON vede i controlli admin', async () => {
    vi.stubEnv('VITE_ADMIN_ROLE', CUSTOM_ROLE);
    mockAccountsList[0].idTokenClaims.roles = [DEFAULT_FALLBACK_ROLE];

    let rendered;
    await act(async () => {
      rendered = render(<App />);
    });

    const { container } = rendered;
    await waitFor(() => {
      expect(container.querySelector('.sidebar')).not.toBeNull();
    });

    const btnNuova = container.querySelector('.bottone-menu.primario');
    expect(btnNuova).toBeNull();
  });

  it('senza VITE_ADMIN_ROLE configurato, ricade sul ruolo predefinito di fallback', async () => {
    mockAccountsList[0].idTokenClaims.roles = [DEFAULT_FALLBACK_ROLE];

    let rendered;
    await act(async () => {
      rendered = render(<App />);
    });

    const { container } = rendered;
    await waitFor(() => {
      const btnNuova = container.querySelector('.bottone-menu.primario');
      expect(btnNuova).not.toBeNull();
      expect(btnNuova.textContent).toContain('Nuova Prenotazione');
    });
  });
});
