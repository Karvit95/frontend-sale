// src/services/api.js

const BASE_URL = "http://localhost:8080/api";

export const api = {
  
  // Metodo per recuperare la lista delle sale
  getSale: async (token) => {
    const response = await fetch(`${BASE_URL}/sale`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error("Errore di connessione col backend per le sale");
    }
    return response.json();
  },

  // Metodo per recuperare le prenotazioni
  getPrenotazioni: async (token, salaEmail, dataInizio, dataFine) => {
    const url = `${BASE_URL}/prenotazioni?salaEmail=${salaEmail}&dataInizio=${dataInizio}&dataFine=${dataFine}`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error("Errore nel recupero delle prenotazioni");
    }
    return response.json();
  },

  getPrenotazioniTutteSale: async (token, inizio, fine) => {
    // Componiamo l'URL puntando al nuovo endpoint con i query parameters richiesti dal BE
    const url = `${BASE_URL}/prenotazioni/tutte?dataInizio=${encodeURIComponent(inizio)}&dataFine=${encodeURIComponent(fine)}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error("Errore durante il recupero delle prenotazioni di tutte le sale");
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
      throw new Error("Errore durante la creazione della prenotazione. La sala potrebbe essere occupata.");
    }
    return response.json();
  },

  // Cancellazione
  cancellaPrenotazione: async (token, id, salaEmail) => {
    const url = `${BASE_URL}/prenotazioni/${id}?salaEmail=${encodeURIComponent(salaEmail)}`;
    
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) throw new Error("Errore durante la cancellazione");
  },

  // Modifica
  modificaPrenotazione: async (token, id, payload) => {
    const response = await fetch(`${BASE_URL}/prenotazioni/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Errore durante la modifica");
    return response.json();
  }

};