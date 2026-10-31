# Agenda Sale SZN - Frontend

Applicazione frontend React 19 + Vite per la consultazione e gestione delle prenotazioni sale riunioni della Stazione Zoologica Anton Dohrn (SZN).

## Variabili d'Ambiente

Copia il file `.env.example` in `.env` (o `.env.local`) per personalizzare la configurazione:

| Variabile | Descrizione | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Endpoint base delle API backend | `/api` |
| `VITE_ADMIN_ROLE` | Ruolo app claim (Entra ID) per i privilegi admin nella UI | `RoomBooking.Admin` |

> [!IMPORTANT]
> **Sicurezza e Autorizzazione:**
> La variabile `VITE_ADMIN_ROLE` controlla esclusivamente la visibilità condizionale dei pulsanti e controlli nell'interfaccia utente (come il pulsante *Nuova Prenotazione* nella sidebar).
> L'autorizzazione reale per tutte le operazioni di scrittura e modifica (creazione, modifica, cancellazione) è sempre verificata e applicata in modo non scavalcabile dal backend Spring Boot tramite la configurazione `app.admin-role`.

## Script Disponibili

- `npm run dev`: avvia il server di sviluppo Vite
- `npm run build`: compila l'applicazione per la produzione
- `npm run lint`: esegue la verifica statica ESLint
- `npm test`: esegue la suite di test automatizzati con Vitest
