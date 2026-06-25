import { useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, getDaysInMonth, subMonths, addMonths, subDays, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendario.css';

const locales = { 'it': it };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// --- LA NOSTRA TOOLBAR ---
const CustomToolbar = ({ date, onNavigate, vistaGlobale }) => {
  const mesi = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];
  
  const annoVisualizzato = date.getFullYear();
  const anni = Array.from({ length: 21 }, (_, i) => annoVisualizzato - 10 + i);

  return (
    <div className="rbc-toolbar">
      {/* Bottoni di Sinistra */}
      <span className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate('TODAY')}>
          {vistaGlobale ? "Oggi" : "Mese Corrente"}
        </button>
        <button type="button" onClick={() => onNavigate('PREV')}>Precedente</button>
        <button type="button" onClick={() => onNavigate('NEXT')}>Successivo</button>
      </span>

      {/* Centro: Selettori e data esatta */}
      <span className="rbc-toolbar-label" style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
        
        {vistaGlobale && (
          <span style={{ fontWeight: "600", fontSize: "1.1rem", color: "#0078D4", textTransform: "capitalize" }}>
            {format(date, "EEEE dd MMMM yyyy", { locale: it })}
          </span>
        )}

        {vistaGlobale ? (
          <input 
            type="date" 
            className="toolbar-select"
            value={format(date, 'yyyy-MM-dd')}
            onChange={(e) => {
              if (e.target.value) {
                const [anno, mese, giorno] = e.target.value.split('-');
                const nuovaData = new Date(anno, mese - 1, giorno);
                onNavigate('DATE', nuovaData);
              }
            }}
          />
        ) : (
          <>
            <select
              className="toolbar-select"
              value={date.getMonth()}
              onChange={(e) => {
                const nuovaData = new Date(date);
                nuovaData.setMonth(parseInt(e.target.value, 10));
                onNavigate('DATE', nuovaData);
              }}
            >
              {mesi.map((mese, index) => (
                <option key={index} value={index}>{mese}</option>
              ))}
            </select>

            <select
              className="toolbar-select"
              value={annoVisualizzato}
              onChange={(e) => {
                const nuovaData = new Date(date);
                nuovaData.setFullYear(parseInt(e.target.value, 10));
                onNavigate('DATE', nuovaData);
              }}
            >
              {anni.map((anno) => (
                <option key={anno} value={anno}>{anno}</option>
              ))}
            </select>
          </>
        )}
      </span>
    </div>
  );
};

// --- COMPONENTE PRINCIPALE ---
const Calendario = ({ eventi, data, onNavigate, onEdit, onDelete, vistaGlobale, sale }) => {
  const inizioMese = startOfMonth(data);
  const giorniDelMese = getDaysInMonth(data);

  const gestisciNavigazione = (nuovaData, vista, azione) => {
    if (azione === 'PREV') {
      onNavigate(vistaGlobale ? subDays(data, 1) : subMonths(data, 1));
    } else if (azione === 'NEXT') {
      onNavigate(vistaGlobale ? addDays(data, 1) : addMonths(data, 1));
    } else if (azione === 'TODAY') {
      onNavigate(new Date());
    } else {
      onNavigate(nuovaData);
    }
  };

  const risorseCalendario = useMemo(() => {
    if (!vistaGlobale || !sale) return undefined;
    return sale.map(s => ({ 
      id: String(s.email).trim().toLowerCase(), 
      title: s.nome 
    }));
  }, [vistaGlobale, sale]);

  // VISTA AGENDA: Utilizziamo le nuove classi Ghost
  const CustomAgendaEvent = ({ event }) => (
    <div className="agenda-event-row">
      <span className="agenda-event-title">{event.title}</span>
      {event.resource?.modificabile !== false && (
        <div className="agenda-event-actions">
          <button onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(event); }} className="btn-ghost-primary">
            ✏️ Modifica
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(event.id); }} className="btn-ghost-danger">
            🗑️ Cancella
          </button>
        </div>
      )}
    </div>
  );

  // VISTA GIORNALIERA: Utilizziamo bottoncini compatti semitrasparenti
  const CustomDayEvent = ({ event }) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: "2px" }}>
      <span style={{ fontWeight: "600", fontSize: "0.85rem" }}>{event.title}</span>
      {event.resource?.modificabile !== false && (
        <div style={{ display: "flex", gap: "4px", marginTop: "auto" }}>
          <button onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(event); }} className="btn-ghost-sm" title="Modifica">✏️</button>
          <button onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(event.id); }} className="btn-ghost-sm" title="Cancella">🗑️</button>
        </div>
      )}
    </div>
  );

  const minTime = new Date();
  minTime.setHours(8, 0, 0);

  const maxTime = new Date();
  maxTime.setHours(20, 0, 0);

  return (
    <div style={{ height: '850px', backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
      <Calendar
        localizer={localizer}
        events={eventi}
        
        view={vistaGlobale ? 'day' : 'agenda'} 
        views={['agenda', 'day']} 
        date={vistaGlobale ? data : inizioMese} 
        length={vistaGlobale ? undefined : giorniDelMese} 
        
        min={minTime}
        max={maxTime}
        
        resources={risorseCalendario}
        resourceIdAccessor="id" 
        
        onNavigate={gestisciNavigazione}
        
        components={{
          toolbar: (props) => <CustomToolbar {...props} vistaGlobale={vistaGlobale} />,
          agenda: { event: CustomAgendaEvent },
          event: CustomDayEvent 
        }}
        
        culture="it"
        messages={{
          noEventsInRange: "Nessuna prenotazione trovata.",
          date: "Data",
          time: "Orario",
          event: "Riunione"
        }}
      />
    </div>
  );
};

export default Calendario;