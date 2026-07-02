import { msalInstance } from "../msalInstance";
import { loginRequest } from "../authConfig";

// Recupera un token valido per l'utente attualmente loggato.
// Prova prima in silenzioso (usa la cache MSAL / refresh token), e solo se
// serve un'interazione (es. consenso scaduto, MFA) apre il popup.
async function ottieniToken() {
  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];

  if (!account) {
    throw new Error("Nessun utente autenticato. Effettua il login.");
  }

  try {
    const result = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
    return result.accessToken;
  } catch (error) {
    console.warn("Acquisizione token silenziosa fallita, tentativo con popup:", error);
    const result = await msalInstance.acquireTokenPopup({ ...loginRequest, account });
    return result.accessToken;
  }
}

// Estrae il messaggio d'errore dal body JSON del backend, con fallback generico
async function leggiErrore(response, messaggioFallback) {
  try {
    const body = await response.json();
    return body.message || body.error || messaggioFallback;
  } catch {
    return messaggioFallback;
  }
}

// fetch "autenticato": aggiunge da solo l'header Authorization e centralizza
// la gestione degli errori HTTP. Da usare al posto di fetch() diretto in api.js.
export async function authFetch(url, options = {}, messaggioErroreFallback = "Errore di comunicazione con il server") {
  const token = await ottieniToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await leggiErrore(response, messaggioErroreFallback));
  }

  return response;
}