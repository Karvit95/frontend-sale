// src/components/Header.jsx
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const Header = ({ utenteNome }) => {
  // Estraiamo solo il nome proprio per il saluto (es. "Carlo" da "Carlo Vitale")
  const nomeProprio = utenteNome ? utenteNome.split(' ')[0] : 'Utente';
  const dataOdierna = format(new Date(), "EEEE, d MMMM yyyy", { locale: it });

  return (
    <div className="header-container">
      <h1 className="header-greeting">Buongiorno, {nomeProprio}</h1>
      <p className="header-date">{dataOdierna}</p>
    </div>
  );
};

export default Header;