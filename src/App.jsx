import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

import Calendario from "./components/Calendario";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { api } from "./services/api";
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

  const ottieniToken = async () => {
    try {
      return await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
    } catch (error) {
      console.warn("Token silent failed, tentativo con popup:", error);
      try {
        return await instance.acquireTokenPopup({ ...loginRequest, account: accounts[0] });
      } catch (popupError) {
        throw popupError;
      }
    }
  };

  const handleSalvaPrenotazione = async (payload, idEventoDaModificare) => {
    try {
      const response = await ottieniToken();
      
      if (idEventoDaModificare) {
        await api.modificaPrenotazione(response.accessToken, idEventoDaModificare, payload);
      } else {
        await api.creaPrenotazione(response.accessToken, payload);
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
      const response = await ottieniToken();
      await api.cancellaPrenotazione(response.accessToken, id, emailSala);
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
      
      // Controlla cache in sessionStorage
      const cacheSale = sessionStorage.getItem("cache_sale");
      if (cacheSale) {
        try {
          const datiCache = JSON.parse(cacheSale);
          setSale(datiCache);
          if (datiCache.length > 0) setSalaSelezionata(datiCache[0].email);
          return; // Salta la chiamata API
        } catch (e) {
          // Cache corrotta, ignora e ricarica
          sessionStorage.removeItem("cache_sale");
        }
      }
      
      setLoading(true);
      ottieniToken()
      .then((response) => api.getSale(response.accessToken))
      .then((data) => {
        if (smontato) return;
        sessionStorage.setItem("cache_sale", JSON.stringify(data));
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
      
      ottieniToken()
      .then((response) => {
        if (vistaGlobale) {
          return api.getPrenotazioniTutteSale(response.accessToken, inizio, fine);
        } else {
          return api.getPrenotazioni(response.accessToken, salaSelezionata, inizio, fine);
        }
      })
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

  if (inProgress === "startup" || inProgress === "handleRedirect" || inProgress === "login") return <div className="fullscreen-message"><h2>Verifica... ⏳</h2></div>;
  if (inProgress === "logout") return <div className="fullscreen-message"><h2>Disconnessione... 👋</h2></div>;

  const currentAccount = accounts[0];
  const ruoliUtente = currentAccount?.idTokenClaims?.roles || [];
  const isAdmin = ruoliUtente.includes("RoomBooking.Admin");
  
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
            // PASSAGGIO PROP: Invia l'autorizzazione alla Sidebar
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