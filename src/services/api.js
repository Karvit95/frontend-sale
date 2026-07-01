// src/services/api.js

const BASE_URL = "http://localhost:8080/api";

// Estrae il messaggio d'errore dal body JSON del backend, con fallback generico
async function leggiErrore(response, messaggioFallback) {
  try {
    const body = await response.json();
    return body.message || body.error || messaggioFallback;
  } catch {
    return messaggioFallback;
  }
}

export const api = {

  getSale: async (token) => {
    const response = await fetch(`${BASE_URL}/sale`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(await leggiErrore(response, "Errore di connessione col backend per le sale"));
    }
    return response.json();
  },

  getPrenotazioni: async (token, salaEmail, dataInizio, dataFine) => {
    const url = `${BASE_URL}/prenotazioni?salaEmail=${salaEmail}&dataInizio=${dataInizio}&dataFine=${dataFine}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(await leggiErrore(response, "Errore nel recupero delle prenotazioni"));
    }
    return response.json();
  },

  getPrenotazioniTutteSale: async (token, inizio, fine) => {
    const url = `${BASE_URL}/prenotazioni/tutte?dataInizio=${encodeURIComponent(inizio)}&dataFine=${encodeURIComponent(fine)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(await leggiErrore(response, "Errore durante il recupero delle prenotazioni di tutte le sale"));
    }
    return response.json();
  },

  creaPrenotazione: async (token, datiPrenotazione) => {
    const response = await fetch(`${BASE_URL}/prenotazioni`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(datiPrenotazione)
    });

    if (!response.ok) {
      throw new Error(await leggiErrore(response, "Errore durante la creazione della prenotazione."));
    }
    return response.json();
  },

  cancellaPrenotazione: async (token, id, salaEmail) => {
    const url = `${BASE_URL}/prenotazioni/${id}?salaEmail=${encodeURIComponent(salaEmail)}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(await leggiErrore(response, "Errore durante la cancellazione"));
    }
  },

  modificaPrenotazione: async (token, id, payload) => {
    const response = await fetch(`${BASE_URL}/prenotazioni/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await leggiErrore(response, "Errore durante la modifica"));
    }
    return response.json();
  }

};