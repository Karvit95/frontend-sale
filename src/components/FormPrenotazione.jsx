import { useState, useEffect } from "react";

const FormPrenotazione = ({ 
  isOpen, 
  onClose, 
  salaSelezionata, 
  sale, 
  onSalva, 
  eventoDaModificare 
}) => {
  
  const [titolo, setTitolo] = useState("");
  const [giorno, setGiorno] = useState("");       
  const [oraInizio, setOraInizio] = useState(""); 
  const [oraFine, setOraFine] = useState("");     
  const [sala, setSala] = useState("");

  useEffect(() => {
    if (eventoDaModificare && isOpen) {
      setTitolo(eventoDaModificare.title || "");
      
      const formattaDataLocale = (dataInput) => {
        const d = new Date(dataInput);
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString(); 
      };
      
      if (eventoDaModificare.start && eventoDaModificare.end) {
        const isoInizio = formattaDataLocale(eventoDaModificare.start);
        const isoFine = formattaDataLocale(eventoDaModificare.end);

        setGiorno(isoInizio.split('T')[0]); 
        setOraInizio(isoInizio.split('T')[1].substring(0, 5)); 
        setOraFine(isoFine.split('T')[1].substring(0, 5));
      }
      
      const emailSalaEvento = eventoDaModificare.resource?.location?.locationEmailAddress 
                           || eventoDaModificare.resource?.salaEmail;
      setSala(emailSalaEvento || salaSelezionata || "");

    } else if (isOpen) {
      setTitolo("");
      setGiorno("");
      setOraInizio("");
      setOraFine("");
      setSala(salaSelezionata || (sale.length > 0 ? sale[0].email : ""));
    }
  }, [eventoDaModificare, isOpen, salaSelezionata, sale]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { 
      titolo, 
      start: `${giorno}T${oraInizio}:00`, 
      end: `${giorno}T${oraFine}:00`, 
      salaEmail: sala 
    };
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
            <label className="form-label">Giorno:</label>
            <input 
              type="date" 
              className="form-input"
              value={giorno} 
              onChange={(e) => setGiorno(e.target.value)} 
              required 
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
          
          <button type="submit" className="btn-primary">
            {eventoDaModificare ? "Aggiorna Prenotazione" : "Prenota Sala"}
          </button>
        </form>
      </div>
    </>
  );
};

export default FormPrenotazione;