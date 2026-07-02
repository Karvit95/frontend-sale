// src/services/api.js
import { authFetch } from "./authFetch";

const BASE_URL = "http://localhost:8080/api";

export const api = {

  getSale: async () => {
    const response = await authFetch(
      `${BASE_URL}/sale`,
      {},
      "Errore di connessione col backend per le sale"
    );
    return response.json();
  },

  getPrenotazioni: async (salaEmail, dataInizio, dataFine) => {
    const url = `${BASE_URL}/prenotazioni?salaEmail=${encodeURIComponent(salaEmail)}&dataInizio=${encodeURIComponent(dataInizio)}&dataFine=${encodeURIComponent(dataFine)}`;

    const response = await authFetch(
      url,
      {},
      "Errore nel recupero delle prenotazioni"
    );
    return response.json();
  },

  getPrenotazioniTutteSale: async (dataInizio, dataFine) => {
    const url = `${BASE_URL}/prenotazioni/tutte?dataInizio=${encodeURIComponent(dataInizio)}&dataFine=${encodeURIComponent(dataFine)}`;

    const response = await authFetch(
      url,
      {},
      "Errore durante il recupero delle prenotazioni di tutte le sale"
    );
    return response.json();
  },

  creaPrenotazione: async (datiPrenotazione) => {
    const response = await authFetch(
      `${BASE_URL}/prenotazioni`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datiPrenotazione),
      },
      "Errore durante la creazione della prenotazione."
    );
    return response.json();
  },

  cancellaPrenotazione: async (id, salaEmail) => {
    const url = `${BASE_URL}/prenotazioni/${id}?salaEmail=${encodeURIComponent(salaEmail)}`;

    await authFetch(
      url,
      { method: "DELETE" },
      "Errore durante la cancellazione"
    );
  },

  modificaPrenotazione: async (id, payload) => {
    const response = await authFetch(
      `${BASE_URL}/prenotazioni/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      "Errore durante la modifica"
    );
    return response.json();
  }

};