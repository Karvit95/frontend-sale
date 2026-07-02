import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";

// Istanza unica di MSAL, condivisa da main.jsx (per il Provider React)
// e da services/authFetch.js (per procurarsi il token senza passare da un componente).
export const msalInstance = new PublicClientApplication(msalConfig);