import './Sidebar.css';

// 1. Aggiungiamo isAdmin tra le props in ingresso
const Sidebar = ({ 
  utenteNome, 
  handleLogout, 
  onApriNuovaPrenotazione, 
  onAttivaVistaGlobale, 
  vistaGlobale,
  isAdmin 
}) => {

  const getIniziali = (nome) => {
    if (!nome) return "U";
    const parti = nome.split(" ");
    if (parti.length > 1) return (parti[0][0] + parti[1][0]).toUpperCase();
    return parti[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="sidebar">
      {/* Intestazione Sidebar */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">Dashboard</h2>
        <p className="sidebar-subtitle">Gestione Sale SZN</p>
      </div>

      {/* Profilo Utente */}
      <div className="user-profile-card">
        <div className="user-avatar">
          {getIniziali(utenteNome)}
        </div>
        <div className="user-info">
          <p className="user-name">{utenteNome}</p>
          <p className="user-role">Account Microsoft 365</p>
        </div>
      </div>

      {/* Sezione Centrale: Menu di Navigazione */}
      <div style={{ flexGrow: 1 }}>
        <button 
          className={`bottone-menu ${vistaGlobale ? 'attivo' : ''}`}
          onClick={onAttivaVistaGlobale}
        >
          <span style={{ fontSize: '1.2rem' }}>🗓️</span> Tabellone Globale
        </button>

        {/* RENDERING CONDIZIONALE: Il bottone appare SOLO se isAdmin è true */}
        {isAdmin && (
          <button 
            className="bottone-menu primario"
            onClick={onApriNuovaPrenotazione}
          >
            + Nuova Prenotazione
          </button>
        )}
      </div>

      {/* Fondo della Sidebar: Esci */}
      <div style={{ borderTop: "1px solid #e1dfdd", paddingTop: "15px" }}>
         <button className="bottone-menu" onClick={handleLogout}>
            🚪 Esci
         </button>
      </div>
    </div>
  );
};

export default Sidebar;