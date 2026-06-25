import React from 'react';

const DettaglioPrenotazione = ({ isOpen, onClose, evento, onEdit, onDelete }) => {
  if (!isOpen || !evento) return null;

  const inizio = new Date(evento.start).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
  const fine = new Date(evento.end).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });

  const isModificabile = evento.resource?.modificabile !== false; 

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">{evento.title}</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <div style={{ marginBottom: '20px', color: '#605e5c' }}>
          <p style={{ margin: '5px 0' }}><strong>Inizio:</strong> {inizio}</p>
          <p style={{ margin: '5px 0' }}><strong>Fine:</strong> {fine}</p>
          {evento.resource?.descrizione && (
            <p style={{ margin: '15px 0 5px 0', padding: '12px', backgroundColor: '#f3f2f1', borderRadius: '6px', color: '#323130' }}>
              {evento.resource.descrizione}
            </p>
          )}
        </div>

        {isModificabile && (
          <div className="form-row" style={{ marginTop: '20px' }}>
            <button 
              onClick={() => onEdit(evento)}
              className="btn-primary"
              style={{ marginTop: 0 }}
            >
              Modifica
            </button>
            <button 
              onClick={() => {
                if(window.confirm("Sei sicuro di voler cancellare questa prenotazione?")) {
                  onDelete(evento.id);
                }
              }}
              className="btn-danger"
              style={{ marginTop: 0 }}
            >
              Cancella
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default DettaglioPrenotazione;