import { useState, useEffect } from "react";

const GIORNI_SETTIMANA = [
  { value: "Monday", label: "Lunedì" },
  { value: "Tuesday", label: "Martedì" },
  { value: "Wednesday", label: "Mercoledì" },
  { value: "Thursday", label: "Giovedì" },
  { value: "Friday", label: "Venerdì" },
  { value: "Saturday", label: "Sabato" },
];

const TIPI_RICORRENZA = [
  { value: "", label: "Nessuna ricorrenza" },
  { value: "daily", label: "Giornaliera" },
  { value: "weekly", label: "Settimanale" },
  { value: "monthly", label: "Mensile" },
];

const FormPrenotazione = ({ 
  isOpen, 
  onClose, 
  salaSelezionata, 
  sale, 
  onSalva, 
  eventoDaModificare 
}) => {
  
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [giorno, setGiorno] = useState("");       
  const [oraInizio, setOraInizio] = useState(""); 
  const [oraFine, setOraFine] = useState("");     
  const [sala, setSala] = useState("");

  // Campi ricorrenza
  const [pattern, setPattern] = useState("");
  const [giorniSettimana, setGiorniSettimana] = useState([]);
  const [dataFine, setDataFine] = useState("");

  const [tipoModifica, setTipoModifica] = useState("SERIE"); // SERIE o SINGOLA per modifica
  const [mostraSceltaModifica, setMostraSceltaModifica] = useState(false);

  useEffect(() => {
    if (eventoDaModificare && isOpen) {
      // Se l'evento è ricorrente, potrebbero servirci entrambe le modalità
      const eRicorrente = eventoDaModificare.resource?.ricorrente === true;
      if (eRicorrente) {
        setMostraSceltaModifica(true);
        setTipoModifica("SERIE");
      } else {
        setMostraSceltaModifica(false);
        setTipoModifica("SERIE");
      }

      setTitolo(eventoDaModificare.title || "");
      setDescrizione(eventoDaModificare.resource?.descrizione || "");
      
      if (eventoDaModificare.start && eventoDaModificare.end) {
        const formatDate = (date) => {
          if (typeof date === 'string') return date;
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        const startStr = formatDate(eventoDaModificare.start);
        const endStr = formatDate(eventoDaModificare.end);

        setGiorno(startStr.split('T')[0]); 
        setOraInizio(startStr.split('T')[1].substring(0, 5)); 
        setOraFine(endStr.split('T')[1].substring(0, 5));
      }
      
      const emailSalaEvento = eventoDaModificare.resource?.location?.locationEmailAddress 
                           || eventoDaModificare.resource?.salaEmail;
      setSala(emailSalaEvento || salaSelezionata || "");

      // In modifica di una serie ricorrente, preserva il pattern originale
      // per poter reinviare la ricorrenza al backend (altrimenti il PATCH
      // cancellerebbe la ricorrenza dall'evento master).
      if (eRicorrente) {
        setPattern(eventoDaModificare.resource?.pattern || "");
        setGiorniSettimana([]);
        setDataFine("");
      } else {
        setPattern("");
        setGiorniSettimana([]);
        setDataFine("");
      }

    } else if (isOpen) {
      setTitolo("");
      setDescrizione("");
      setGiorno("");
      setOraInizio("");
      setOraFine("");
      setSala(salaSelezionata || (sale.length > 0 ? sale[0].email : ""));
      // Reset ricorrenza
      setPattern("");
      setGiorniSettimana([]);
      setDataFine("");
      setMostraSceltaModifica(false);
      setTipoModifica("SERIE");
    }
  }, [eventoDaModificare, isOpen, salaSelezionata, sale]);

  const toggleGiorno = (giorno) => {
    setGiorniSettimana(prev =>
      prev.includes(giorno)
        ? prev.filter(g => g !== giorno)
        : [...prev, giorno]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { 
        titolo, 
        descrizione,
        start: `${giorno}T${oraInizio}:00`, 
        end: `${giorno}T${oraFine}:00`, 
        salaEmail: sala,
        ...(eventoDaModificare && { 
            salaEmailOriginale: eventoDaModificare.resource?.salaEmail 
                              || eventoDaModificare.resource?.location?.locationEmailAddress
        })
    };

    // Aggiungi campi ricorrenza se attiva
    if (pattern) {
      payload.pattern = pattern;
      payload.intervallo = 1; // sempre 1
      payload.dataFine = dataFine;
      if (pattern === "weekly") {
        payload.giorniSettimana = giorniSettimana;
      }
    }

    // Se stiamo modificando un evento ricorrente, indica il tipo e l'ID del series
    // master: senza quest'ultimo, "modifica tutta la serie" toccherebbe solo
    // l'occorrenza su cui hai cliccato (in Graph l'effetto dipende da QUALE ID usi).
    if (eventoDaModificare && mostraSceltaModifica) {
      payload.tipoModifica = tipoModifica;
      payload.seriesMasterId = eventoDaModificare.resource?.seriesMasterId;
    }

    onSalva(payload, eventoDaModificare?.id);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">
            {eventoDaModificare ? "Modifica Prenotazione" : "Nuova Prenotazione"}
          </h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        {mostraSceltaModifica && (
          <div className="form-group" style={{ backgroundColor: "#fff3cd", padding: "10px", borderRadius: "6px", marginBottom: "12px" }}>
            <label className="form-label">Tipo modifica:</label>
            <select 
              className="form-select"
              value={tipoModifica} 
              onChange={(e) => setTipoModifica(e.target.value)}
            >
              <option value="SERIE">Modifica tutta la serie</option>
              <option value="SINGOLA">Modifica solo questa occorrenza</option>
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Titolo Riunione:</label>
            <input 
              type="text" 
              className="form-input"
              value={titolo} 
              onChange={(e) => setTitolo(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descrizione (opzionale):</label>
            <textarea 
              className="form-textarea"
              value={descrizione} 
              onChange={(e) => setDescrizione(e.target.value)}
              rows={3}
              placeholder="Inserisci una descrizione per la riunione..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Giorno:</label>
            <input 
              type="date" 
              className="form-input"
              value={giorno} 
              onChange={(e) => setGiorno(e.target.value)} 
              required 
              disabled={mostraSceltaModifica && tipoModifica === "SERIE"}
            />
          </div>

          <div className="form-row form-group">
            <div style={{ flex: 1 }}>
              <label className="form-label">Ora Inizio:</label>
              <input 
                type="time" 
                className="form-input"
                value={oraInizio} 
                onChange={(e) => setOraInizio(e.target.value)} 
                required 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Ora Fine:</label>
              <input 
                type="time" 
                className="form-input"
                value={oraFine} 
                onChange={(e) => setOraFine(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sala:</label>
            <select 
              className="form-select"
              value={sala} 
              onChange={(e) => setSala(e.target.value)} 
              required
            >
              <option value="" disabled>-- Seleziona una sala --</option>
              {sale.map((s) => (
                <option key={s.id} value={s.email}>{s.nome}</option>
              ))}
            </select>
          </div>

          {/* Sezione ricorrenza - visibile in creazione o in modifica SERIE */}
          {(!eventoDaModificare || (eventoDaModificare && pattern)) && (
            <>
              <hr style={{ margin: "16px 0" }} />
              <div className="form-group">
                <label className="form-label">Ricorrenza:</label>
                <select 
                  className="form-select"
                  value={pattern} 
                  onChange={(e) => setPattern(e.target.value)}
                  disabled={!!eventoDaModificare}
                >
                  {TIPI_RICORRENZA.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>

              {pattern && (
                <>
                  {pattern === "weekly" && (
                    <div className="form-group">
                      <label className="form-label">Giorni della settimana:</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {GIORNI_SETTIMANA.map((g) => (
                          <label key={g.value} style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                            <input 
                              type="checkbox"
                              checked={giorniSettimana.includes(g.value)}
                              onChange={() => toggleGiorno(g.value)}
                              disabled={!!eventoDaModificare}
                            />
                            {g.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Data fine ricorrenza:</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={dataFine} 
                      onChange={(e) => setDataFine(e.target.value)} 
                      required={!!pattern}
                    />
                  </div>
                </>
              )}
            </>
          )}
          
          <button type="submit" className="btn-primary" style={{ marginTop: "16px" }}>
            {eventoDaModificare ? "Aggiorna Prenotazione" : "Prenota Sala"}
          </button>
        </form>
      </div>
    </>
  );
};

export default FormPrenotazione;