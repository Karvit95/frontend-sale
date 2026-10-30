import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './msalInstance';

msalInstance.initialize().then(() => {
  const accounts = msalInstance.getAllAccounts();
  if (!msalInstance.getActiveAccount() && accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
      msalInstance.setActiveAccount(event.payload.account);
    }
  });

  // FONDAMENTALE: Questa riga intercetta il codice nell'URL,
  // elabora il token, imposta l'account attivo (SEC-21) e fa chiudere il popup in automatico!
  msalInstance.handleRedirectPromise().then((response) => {
    if (response?.account) {
      msalInstance.setActiveAccount(response.account);
    }
  }).catch(err => {
    console.error("Errore durante il redirect MSAL:", err);
  });

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>,
  )
});
