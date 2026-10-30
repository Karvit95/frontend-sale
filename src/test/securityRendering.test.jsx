import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import DettaglioPrenotazione from '../components/DettaglioPrenotazione';
import FormPrenotazione from '../components/FormPrenotazione';
import Calendario from '../components/Calendario';

describe('Security Rendering & XSS Prevention Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DettaglioPrenotazione Component - XSS Sanitization', () => {
    it('dovrebbe renderizzare il titolo come testo puro senza iniettare elementi HTML o eseguire script', () => {
      const maliciousTitle = '<img src=x onerror="alert(1)"><script>alert("xss-title")</script>Riunione Sicurezza';
      const evento = {
        id: 'evt-1',
        title: maliciousTitle,
        start: new Date('2026-11-01T10:00:00'),
        end: new Date('2026-11-01T11:00:00'),
        resource: {
          descrizione: 'Descrizione standard',
          modificabile: true,
        },
      };

      const { container } = render(
        <DettaglioPrenotazione
          isOpen={true}
          onClose={() => {}}
          evento={evento}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      // Verifica che il titolo contenga la stringa testuale
      const titleElement = container.querySelector('.modal-title');
      expect(titleElement).not.toBeNull();
      expect(titleElement.textContent).toBe(maliciousTitle);

      // Verifica che nessun tag <img> o <script> sia stato iniettato nel DOM del titolo
      expect(titleElement.querySelectorAll('img').length).toBe(0);
      expect(titleElement.querySelectorAll('script').length).toBe(0);
    });

    it('dovrebbe sanificare la descrizione con DOMPurify rimuovendo tag pericolosi come <img> onerror e <script>', () => {
      const maliciousDesc = '<p>Nota valida</p><img src=x onerror="alert(1)"><script>alert("xss")</script><svg onload="alert(1)"></svg><iframe src="javascript:alert(1)"></iframe>';
      const evento = {
        id: 'evt-2',
        title: 'Meeting Test',
        start: new Date('2026-11-01T10:00:00'),
        end: new Date('2026-11-01T11:00:00'),
        resource: {
          descrizione: maliciousDesc,
          modificabile: true,
        },
      };

      const { container } = render(
        <DettaglioPrenotazione
          isOpen={true}
          onClose={() => {}}
          evento={evento}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      const descContainer = container.querySelector('.prenotazione-descrizione');
      expect(descContainer).not.toBeNull();

      // Tag permessi come <p> devono essere preservati
      expect(descContainer.querySelector('p')).not.toBeNull();
      expect(descContainer.textContent).toContain('Nota valida');

      // Tag malevoli devono essere stati completamente eliminati da DOMPurify
      expect(descContainer.querySelectorAll('img').length).toBe(0);
      expect(descContainer.querySelectorAll('script').length).toBe(0);
      expect(descContainer.querySelectorAll('svg').length).toBe(0);
      expect(descContainer.querySelectorAll('iframe').length).toBe(0);
      expect(descContainer.innerHTML).not.toContain('onerror');
      expect(descContainer.innerHTML).not.toContain('onload');
    });

    it('dovrebbe neutralizzare link malevoli javascript: e applicare rel="noopener noreferrer" sui tag <a>', () => {
      const descConLink = '<p>Visita <a href="javascript:alert(1)">Link Malevolo</a> o <a href="https://example.szn.it">Sito Ufficiale</a></p>';
      const evento = {
        id: 'evt-3',
        title: 'Meeting Link Test',
        start: new Date('2026-11-01T10:00:00'),
        end: new Date('2026-11-01T11:00:00'),
        resource: {
          descrizione: descConLink,
          modificabile: true,
        },
      };

      const { container } = render(
        <DettaglioPrenotazione
          isOpen={true}
          onClose={() => {}}
          evento={evento}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      const links = container.querySelectorAll('.prenotazione-descrizione a');
      expect(links.length).toBeGreaterThan(0);

      // Verifica che nessun link abbia href="javascript:..."
      links.forEach((link) => {
        const href = link.getAttribute('href');
        if (href) {
          expect(href.toLowerCase()).not.toContain('javascript:');
          expect(href.toLowerCase()).toMatch(/^(https?:|mailto:)/);
        }
        // Verifica protezione Reverse Tabnabbing (SEC-18)
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        expect(link.getAttribute('target')).toBe('_blank');
      });
    });

    it('dovrebbe gestire descrizioni nulle, undefined o con caratteri speciali senza crash', () => {
      const evento = {
        id: 'evt-4',
        title: 'Meeting Special & < > " \' Characters',
        start: new Date('2026-11-01T10:00:00'),
        end: new Date('2026-11-01T11:00:00'),
        resource: {
          descrizione: null,
          modificabile: false,
        },
      };

      const { container } = render(
        <DettaglioPrenotazione
          isOpen={true}
          onClose={() => {}}
          evento={evento}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      expect(container.querySelector('.modal-title').textContent).toBe('Meeting Special & < > " \' Characters');
      expect(container.querySelector('.prenotazione-descrizione')).toBeNull();
    });
  });

  describe('FormPrenotazione Component - Safe Inputs Handling', () => {
    const mockSale = [
      { id: '1', nome: 'Sala Blu', email: 'sala.blu@szn.it' },
      { id: '2', nome: 'Sala Rossa', email: 'sala.rossa@szn.it' },
    ];

    it('dovrebbe accettare input contenenti payload XSS trattandoli come stringhe letterali sicure senza iniezione DOM', async () => {
      const onSalvaMock = vi.fn();
      const maliciousPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';

      const { container } = render(
        <FormPrenotazione
          isOpen={true}
          onClose={() => {}}
          salaSelezionata="sala.blu@szn.it"
          sale={mockSale}
          onSalva={onSalvaMock}
          eventoDaModificare={null}
        />
      );

      const inputTitolo = container.querySelector('input.form-input[type="text"]');
      const textareaDesc = container.querySelector('textarea.form-textarea');

      await act(async () => {
        fireEvent.change(inputTitolo, { target: { value: maliciousPayload } });
        fireEvent.change(textareaDesc, { target: { value: maliciousPayload } });
      });

      expect(inputTitolo.value).toBe(maliciousPayload);
      expect(textareaDesc.value).toBe(maliciousPayload);

      // Verifica che nessun tag script o img sia stato creato nel DOM
      expect(container.querySelectorAll('script').length).toBe(0);
      expect(container.querySelectorAll('img').length).toBe(0);

      // Simula submit
      const inputGiorno = container.querySelector('input[type="date"]');
      const inputOraInizio = container.querySelectorAll('input[type="time"]')[0];
      const inputOraFine = container.querySelectorAll('input[type="time"]')[1];

      await act(async () => {
        fireEvent.change(inputGiorno, { target: { value: '2026-11-05' } });
        fireEvent.change(inputOraInizio, { target: { value: '09:00' } });
        fireEvent.change(inputOraFine, { target: { value: '10:00' } });
      });

      const form = container.querySelector('form');
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(onSalvaMock).toHaveBeenCalledTimes(1);
      const args = onSalvaMock.mock.calls[0][0];
      expect(args.titolo).toBe(maliciousPayload);
      expect(args.descrizione).toBe(maliciousPayload);
    });

    it('dovrebbe popolare i campi in modalità modifica senza eseguire payload malevoli', () => {
      const maliciousEvent = {
        id: 'evt-mod-1',
        title: '<svg/onload=alert("edit-title")>',
        start: new Date('2026-11-05T09:00:00'),
        end: new Date('2026-11-05T10:00:00'),
        resource: {
          descrizione: '<img src=x onerror=alert("edit-desc")>',
          salaEmail: 'sala.blu@szn.it',
        },
      };

      const { container } = render(
        <FormPrenotazione
          isOpen={true}
          onClose={() => {}}
          salaSelezionata="sala.blu@szn.it"
          sale={mockSale}
          onSalva={() => {}}
          eventoDaModificare={maliciousEvent}
        />
      );

      const inputTitolo = container.querySelector('input.form-input[type="text"]');
      const textareaDesc = container.querySelector('textarea.form-textarea');

      expect(inputTitolo.value).toBe('<svg/onload=alert("edit-title")>');
      expect(textareaDesc.value).toBe('<img src=x onerror=alert("edit-desc")>');

      // Nessun elemento SVG attivo o img con handler onerror nel DOM
      expect(container.querySelectorAll('svg').length).toBe(0);
      expect(container.querySelectorAll('img').length).toBe(0);
    });
  });

  describe('Calendario Component - Secure Rendering in Agenda and Day Views', () => {
    const saleList = [
      { id: '1', nome: 'Sala Blu', email: 'sala.blu@szn.it' },
    ];

    it('dovrebbe renderizzare titoli e descrizioni in vista Agenda senza eseguire payload HTML', () => {
      const maliciousEvent = {
        id: 'cal-evt-1',
        title: '<script>alert("xss-cal-title")</script><img src=x onerror=alert(1)>Titolo Meeting',
        start: new Date(2026, 10, 5, 9, 0),
        end: new Date(2026, 10, 5, 10, 0),
        resource: {
          organizzatoreNome: '<b onmouseover=alert(1)>Mario Rossi</b>',
          descrizione: '<p>Descrizione <b>formattata</b></p><img src=x onerror=alert(2)><script>alert("evil")</script>',
          salaEmail: 'sala.blu@szn.it',
          modificabile: true,
        },
      };

      const { container } = render(
        <Calendario
          eventi={[maliciousEvent]}
          data={new Date(2026, 10, 5)}
          onNavigate={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          vistaGlobale={false}
          sale={saleList}
        />
      );

      // In vista agenda, la descrizione viene passata a stripHtml(DOMPurify con ALLOWED_TAGS: [])
      const agendaTitle = container.querySelector('.agenda-event-title');
      if (agendaTitle) {
        expect(agendaTitle.querySelectorAll('script').length).toBe(0);
        expect(agendaTitle.querySelectorAll('img').length).toBe(0);
        expect(agendaTitle.textContent).toContain('Titolo Meeting');
      }

      const agendaDesc = container.querySelector('.agenda-event-description');
      if (agendaDesc) {
        // Tutti i tag devono essere rimossi da stripHtml
        expect(agendaDesc.querySelectorAll('img').length).toBe(0);
        expect(agendaDesc.querySelectorAll('script').length).toBe(0);
        expect(agendaDesc.querySelectorAll('b').length).toBe(0);
        expect(agendaDesc.textContent).toContain('Descrizione formattata');
        expect(agendaDesc.innerHTML).not.toContain('<img');
        expect(agendaDesc.innerHTML).not.toContain('<script');
      }
    });

    it('dovrebbe renderizzare titoli in vista Giornaliera senza iniettare elementi malevoli', () => {
      const maliciousEvent = {
        id: 'cal-evt-2',
        title: '<img src=x onerror=alert("day-xss")>Giornata Lavorativa',
        start: new Date(2026, 10, 5, 9, 0),
        end: new Date(2026, 10, 5, 10, 0),
        resourceId: 'sala.blu@szn.it',
        resource: {
          salaEmail: 'sala.blu@szn.it',
          modificabile: false,
        },
      };

      const { container } = render(
        <Calendario
          eventi={[maliciousEvent]}
          data={new Date(2026, 10, 5)}
          onNavigate={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          vistaGlobale={true}
          sale={saleList}
        />
      );

      // Verifica che nessun tag img sia stato iniettato
      expect(container.querySelectorAll('img').length).toBe(0);
      expect(container.querySelectorAll('script').length).toBe(0);
    });
  });
});
