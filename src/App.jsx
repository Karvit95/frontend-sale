import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

import Calendario from "./components/Calendario";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { api } from "./services/api";
import { getFromCache, setInCache, clearCache } from "./services/cacheWithTTL";
import FormPrenotazione from "./components/FormPrenotazione";

function App() {
  const { instance, accounts, inProgress } = useMsal();
  
  const [sale, setSale] = useState([]);
  const [notifica, setNotifica] = useState(null);
  
  const mostraNotifica = (messaggio, tipo = "error") => {
    setNotifica({ messaggio, tipo });
    setTimeout(() => setNotifica(null), 5000);
  };
  
  const [salaSelezionata, setSalaSelezionata] = useState(""); 
  const [dataCorrente, setDataCorrente] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState(null);
  
  const [eventi, setEventi] = useState([]); 
  const [loadingEventi, setLoadingEventi] = useState(false); 

  const [formAperto, setFormAperto] = useState(false);
  const [triggerAggiornamento, setTriggerAggiornamento] = useState(0);
  const [eventoInModifica, setEventoInModifica] = useState(null);

  const [vistaGlobale, setVistaGlobale] = useState(false);

  const handleLogin = () => instance.loginRedirect(loginRequest).catch(e => console.error(e));
  const handleLogout = () => instance.logoutRedirect().catch(e => console.error(e));

  const handleSalvaPrenotazione = async (payload, idEventoDaModificare) => {
    try {
      if (idEventoDaModificare) {
        await api.modificaPrenotazione(idEventoDaModificare, payload);
      } else {
        await api.creaPrenotazione(payload);
      }
      
      // Invalida la cache in base alla sala/data REALE della prenotazione appena
      // salvata (payload.start), non della vista attualmente aperta (dataCorrente):
      // se prenoti per un giorno/mese diverso da quello che stai guardando in quel
      // momento, la cache di quel giorno/mese non verrebbe mai invalidata altrimenti.
      const dataBooking = new Date(payload.start);
      const meseBooking = dataBooking.toISOString().slice(0, 7);
      const giornoBooking = dataBooking.toISOString().slice(0, 10);

      clearCache(`eventi_${payload.salaEmail}_${meseBooking}`);
      clearCache(`eventi_globali_${giornoBooking}`);

      // Se la sala è cambiata, invalida anche la cache della sala di provenienza
      if (payload.salaEmailOriginale && payload.salaEmailOriginale !== payload.salaEmail) {
        clearCache(`eventi_${payload.salaEmailOriginale}_${meseBooking}`);
      }

      // Se stiamo modificando una prenotazione esistente e la data/mese originale
      // era diverso (es. spostata a un altro giorno), invalida anche la cache di
      // provenienza: l'evento è "sparito" da lì e la vista di quel giorno/mese
      // non deve continuare a mostrarlo dalla cache.
      if (eventoInModifica?.start) {
        const dataOriginale = eventoInModifica.start;
        const salaOriginale = payload.salaEmailOriginale || payload.salaEmail;
        const meseOriginale = dataOriginale.toISOString().slice(0, 7);
        const giornoOriginale = dataOriginale.toISOString().slice(0, 10);

        if (meseOriginale !== meseBooking) {
          clearCache(`eventi_${salaOriginale}_${meseOriginale}`);
        }
        if (giornoOriginale !== giornoBooking) {
          clearCache(`eventi_globali_${giornoOriginale}`);
        }
      }
      
      setTriggerAggiornamento(prev => prev + 1); 
      setFormAperto(false); 
      setEventoInModifica(null); 
      mostraNotifica("Prenotazione salvata con successo!", "success");
    } catch (error) {
      mostraNotifica("Errore durante il salvataggio: " + error.message, "error");
    }
  };

  const handleCancellaPrenotazione = async (id) => {
    if(!window.confirm("Sei sicuro di voler cancellare questa prenotazione?")) return;
    
    const evento = eventi.find(e => e.id === id);
    const emailSala = evento?.resource?.location?.locationEmailAddress 
                   || evento?.resource?.salaEmail 
                   || salaSelezionata;
    
    try {
      await api.cancellaPrenotazione(id, emailSala);
      
      // Invalida la cache in base alla sala/data REALE dell'evento appena
      // cancellato (già disponibile in memoria come oggetto Date, grazie al
      // fix precedente sulla ricostruzione delle date lette dalla cache),
      // non della vista attualmente aperta.
      if (evento?.start) {
        const meseEvento = evento.start.toISOString().slice(0, 7);
        const giornoEvento = evento.start.toISOString().slice(0, 10);
        clearCache(`eventi_${emailSala}_${meseEvento}`);
        clearCache(`eventi_globali_${giornoEvento}`);
      } else {
        // Fallback difensivo: non dovrebbe succedere, dato che l'ID arriva
        // da un evento già presente nella lista in memoria.
        const meseCorrente = dataCorrente.toISOString().slice(0, 7);
        clearCache(`eventi_${emailSala}_${meseCorrente}`);
        clearCache(`eventi_globali_${dataCorrente.toISOString().slice(0, 10)}`);
      }
      
      setTriggerAggiornamento(prev => prev + 1); 
      mostraNotifica("Prenotazione cancellata con successo!", "success");
    } catch (error) {
      mostraNotifica("Errore durante la cancellazione: " + error.message, "error");
    }
  };

  const handleApriModifica = (evento) => {
    setEventoInModifica(evento); 
    setFormAperto(true);         
  };

  useEffect(() => {
    let smontato = false;
    if (accounts.length > 0) {
      
      // Controlla cache TTL in sessionStorage
      const cacheSale = getFromCache("cache_sale");
      if (cacheSale) {
        setSale(cacheSale);
        if (cacheSale.length > 0) setSalaSelezionata(cacheSale[0].email);
        return; // Salta la chiamata API
      }
      
      setLoading(true);
      api.getSale()
      .then((data) => {
        if (smontato) return;
        setInCache("cache_sale", data);
        setSale(data);
        if (data.length > 0) setSalaSelezionata(data[0].email); 
      })
      .catch((err) => {
        if (!smontato) setErrore(err.message);
      })
      .finally(() => {
        if (!smontato) setLoading(false);
      });
    }
    return () => { smontato = true; };
  }, [accounts, instance]);

  useEffect(() => {
    let smontato = false;
    if (accounts.length > 0 && (salaSelezionata || vistaGlobale)) {
      setLoadingEventi(true);
      
      let inizio, fine;
      if (vistaGlobale) {
        inizio = startOfDay(dataCorrente).toISOString();
        fine = endOfDay(dataCorrente).toISOString();
      } else {
        inizio = startOfMonth(dataCorrente).toISOString();
        fine = endOfMonth(dataCorrente).toISOString();
      }

      // Chiave cache composita: dipende da sala + data + vista
      const cacheKey = vistaGlobale
        ? `eventi_globali_${dataCorrente.toISOString().slice(0, 10)}`
        : `eventi_${salaSelezionata}_${dataCorrente.toISOString().slice(0, 7)}`;

      // Controlla cache TTL
      const cacheEventi = getFromCache(cacheKey);
      if (cacheEventi) {
        // JSON.stringify (fatto da setInCache) serializza i Date in stringhe ISO,
        // e JSON.parse (fatto da getFromCache) non li "resuscita" automaticamente.
        // Senza questa conversione, react-big-calendar riceverebbe stringhe al posto
        // di oggetti Date e andrebbe in errore (es. su .getHours()).
        const eventiRipristinati = cacheEventi.map(evento => ({
          ...evento,
          start: new Date(evento.start),
          end: new Date(evento.end),
        }));
        setEventi(eventiRipristinati);
        setLoadingEventi(false);
        return; // Salta la chiamata API
      }
      
      const fetchEventi = vistaGlobale
        ? api.getPrenotazioniTutteSale(inizio, fine)
        : api.getPrenotazioni(salaSelezionata, inizio, fine);

      fetchEventi
      .then((data) => {
        if (smontato) return;
        console.log("DATI RICEVUTI DAL BACKEND:", data);
        const eventiFormattati = data.map(evento => {
          return { 
            id: evento.id, 
            title: evento.titolo, 
            start: new Date(evento.start), 
            end: new Date(evento.end), 
            resourceId: evento.salaId, 
            resource: evento 
          };
        });
        setInCache(cacheKey, eventiFormattati);
        setEventi(eventiFormattati);
      })
      .catch((err) => {
        if (!smontato) console.error(err);
      })
      .finally(() => {
        if (!smontato) setLoadingEventi(false);
      });
    }
    return () => { smontato = true; };
  }, [accounts, instance, salaSelezionata, dataCorrente, triggerAggiornamento, vistaGlobale]);

  const currentAccount = accounts[0];
  const ruoliUtente = currentAccount?.idTokenClaims?.roles || [];
  const isAdmin = ruoliUtente.includes("RoomBooking.Admin");

  if (inProgress === "startup" || inProgress === "handleRedirect" || inProgress === "login") return <div className="fullscreen-message"><h2>Verifica... ⏳</h2></div>;
  if (inProgress === "logout") return <div className="fullscreen-message"><h2>Disconnessione... 👋</h2></div>;

  return (
    <div className="app-container">
      {accounts.length > 0 ? (
        <>
          <Sidebar 
            utenteNome={accounts[0].name} 
            handleLogout={handleLogout} 
            vistaGlobale={vistaGlobale}
            onAttivaVistaGlobale={() => setVistaGlobale(true)}
            onApriNuovaPrenotazione={() => {
              setEventoInModifica(null); 
              setFormAperto(true);       
            }}
            isAdmin={isAdmin}
          />

          <div className="main-content">
            <Header utenteNome={accounts[0].name} />
            
            <FormPrenotazione 
              isOpen={formAperto} 
              onClose={() => {
                setFormAperto(false);      
                setEventoInModifica(null); 
              }} 
              salaSelezionata={salaSelezionata}
              sale={sale} 
              onSalva={handleSalvaPrenotazione} 
              eventoDaModificare={eventoInModifica}
            />
            
            {notifica && (
              <div className={`toast toast-${notifica.tipo}`}>
                <span>{notifica.messaggio}</span>
                <button className="toast-close" onClick={() => setNotifica(null)}>✕</button>
              </div>
            )}
            {loading && <p>Caricamento sale...</p>}
            {errore && <p className="text-error">Errore: {errore}</p>}
            
            {!loading && !errore && sale.length > 0 && (
              <div className="calendar-card">
                
                <div className="controls-header">
                  {vistaGlobale ? (
                    <>
                      <span className="badge-globale">
                        📊 Vista Globale (Tutte le Sale)
                      </span>
                      <button className="btn-outline" onClick={() => setVistaGlobale(false)}>
                        Torna alla singola sala
                      </button>
                    </>
                  ) : (
                    <>
                      <label className="input-label">Seleziona la Sala:</label>
                      <select className="select-sala" value={salaSelezionata} onChange={(e) => { setVistaGlobale(false); setSalaSelezionata(e.target.value); }}>
                        {sale.map((s) => <option key={s.id} value={s.email}>{s.nome}</option>)}
                      </select>
                    </>
                  )}
                  {loadingEventi && <span className="text-loading">Aggiornamento... ⏳</span>}
                </div>
                
                <Calendario 
                  eventi={eventi} 
                  data={dataCorrente} 
                  onNavigate={(nuovaData) => setDataCorrente(nuovaData)} 
                  onEdit={handleApriModifica}
                  onDelete={handleCancellaPrenotazione}
                  vistaGlobale={vistaGlobale}
                  sale={sale}
                />

              </div>
            )}
          </div>
        </>
      ) : (
        <div className="login-container">
          <div className="login-card">
            <div className="login-logo-placeholder">
              📅
            </div>
            <h1 className="login-title">Agenda Sale SZN</h1>
            <p className="login-subtitle">Accedi per prenotare o gestire le tue riunioni</p>
            <button className="login-button" onClick={handleLogin}>
              Accedi con Microsoft 365
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;