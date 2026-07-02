import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './msalInstance';

msalInstance.initialize().then(() => {
  
  // FONDAMENTALE: Questa riga intercetta il codice nell'URL, 
  // elabora il token e fa chiudere il popup in automatico!
  msalInstance.handleRedirectPromise().catch(err => {
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