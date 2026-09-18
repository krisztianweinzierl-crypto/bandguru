import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const eur = (value) => (value || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

export const formatDokumentDatum = (value) => format(new Date(value), 'dd.MM.yyyy', { locale: de });

/**
 * Öffnet ein Druckfenster mit einem einheitlich gestalteten Geschäftsdokument
 * (Angebot, Rechnung). Der Nutzer speichert es über "Als PDF speichern".
 */
export function printBusinessDocument({
  titel,
  nummer,
  metaZeilen,
  kunde,
  organisation,
  positionen,
  nettoBetrag,
  steuerBetrag,
  bruttoBetrag,
  extraSummen = [],
  intro,
  bedingungenTitel = 'Zahlungsbedingungen',
  bedingungen,
  abschlussZeilen
}) {
  const brandColor = organisation?.primary_color || '#10B981';
  const orgAdresseZeile = (organisation?.adresse || '').replace(/\n/g, ' · ');
  const footerText = [
    organisation?.name,
    orgAdresseZeile,
    organisation?.steuernummer ? 'USt-IdNr: ' + organisation.steuernummer : ''
  ].filter(Boolean).join(' · ');
  const supportsMarginBoxes = /Chrome\//.test(navigator.userAgent);

  const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${titel} ${nummer}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4;
            margin: 22mm 18mm 24mm 18mm;
            ${supportsMarginBoxes && footerText ? `@bottom-center {
              content: ${JSON.stringify(footerText)};
              font-family: 'Plus Jakarta Sans', Arial, sans-serif;
              font-size: 7.5pt;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 6px;
              margin-top: 12mm;
              width: 100%;
              vertical-align: top;
            }` : ''}
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Plus Jakarta Sans', Arial, sans-serif;
            color: #1e293b;
            font-size: 10.5pt;
            line-height: 1.5;
            margin: 0;
          }
          .letterhead {
            font-size: 7.5pt;
            color: #94a3b8;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin-bottom: 28px;
            letter-spacing: 0.2px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 30px;
            margin-bottom: 36px;
          }
          .header-left { flex: 1; }
          .header-left .label {
            font-size: 8pt;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin: 0 0 8px 0;
          }
          .header-left .to-name {
            font-weight: 700;
            font-size: 12pt;
            color: #1e293b;
            margin-bottom: 4px;
          }
          .header-left p {
            margin: 2px 0;
            font-size: 10pt;
            color: #475569;
          }
          .header-right { text-align: right; }
          .header-right img {
            max-width: 150px;
            max-height: 64px;
            margin-bottom: 14px;
          }
          .meta-table {
            border-collapse: collapse;
            margin-left: auto;
          }
          .meta-table td {
            font-size: 9.5pt;
            padding: 2px 0 2px 20px;
            white-space: nowrap;
          }
          .meta-table td:first-child {
            color: #94a3b8;
            padding-left: 0;
          }
          .meta-table td:last-child {
            font-weight: 600;
            color: #1e293b;
            text-align: right;
          }
          h1.title {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 14pt;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 20px 0;
          }
          .intro {
            font-size: 10.5pt;
            color: #334155;
            white-space: pre-line;
            margin-bottom: 28px;
            max-width: 560px;
          }
          table.positions {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
          }
          table.positions thead tr { background: #f8fafc; }
          table.positions th {
            color: #64748b;
            padding: 10px 10px;
            text-align: left;
            font-size: 8.5pt;
            font-weight: 700;
            border-bottom: 2px solid #e2e8f0;
          }
          table.positions th.num,
          table.positions td.num {
            text-align: right;
            white-space: nowrap;
          }
          table.positions th.pos,
          table.positions td.pos {
            width: 28px;
            color: #94a3b8;
          }
          table.positions td {
            padding: 12px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 9.8pt;
            vertical-align: top;
          }
          table.positions td.description-cell .pos-title {
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 3px 0;
          }
          table.positions td.description-cell .pos-desc {
            color: #64748b;
            font-size: 9.3pt;
            line-height: 1.5;
          }
          table.positions td.description-cell .pos-desc p { margin: 0 0 4px 0; }
          table.positions td.description-cell .pos-desc p:last-child { margin-bottom: 0; }
          table.positions tr { page-break-inside: avoid; }
          .totals, .conditions, .closing { page-break-inside: avoid; }
          .totals {
            margin-top: 18px;
            margin-left: auto;
            width: 300px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 4px;
            font-size: 10pt;
            color: #475569;
          }
          .totals-row.total {
            background: #f8fafc;
            border-radius: 6px;
            margin-top: 6px;
            padding: 10px 12px;
            font-size: 12pt;
            font-weight: 800;
            color: #1e293b;
          }
          .totals-row.total span:last-child { color: ${brandColor}; }
          .conditions {
            margin-top: 44px;
            padding-top: 18px;
            border-top: 1px solid #e2e8f0;
            clear: both;
          }
          .conditions h3 {
            color: #1e293b;
            font-size: 9.5pt;
            font-weight: 700;
            margin: 0 0 8px 0;
          }
          .conditions p {
            font-size: 9.5pt;
            line-height: 1.6;
            color: #64748b;
            white-space: pre-line;
            margin: 0;
          }
          .closing {
            margin-top: 32px;
            font-size: 10pt;
            color: #334155;
          }
          .closing p { margin: 0 0 4px 0; }
          .closing .signoff {
            margin-top: 18px;
            font-weight: 600;
            color: #1e293b;
          }
          .footer-flow {
            margin-top: 40px;
            text-align: center;
            font-size: 7.5pt;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="letterhead">${organisation?.name || ''}${orgAdresseZeile ? ' · ' + orgAdresseZeile : ''}</div>

        <div class="header">
          <div class="header-left">
            <p class="label">An</p>
            <div class="to-name">${kunde?.firmenname || 'Unbekannt'}</div>
            ${kunde?.ansprechpartner ? `<p>${kunde.ansprechpartner}</p>` : ''}
            ${kunde?.adresse ? `<p style="white-space: pre-line;">${kunde.adresse}</p>` : ''}
            ${kunde?.email ? `<p>${kunde.email}</p>` : ''}
          </div>
          <div class="header-right">
            ${organisation?.logo_url ? `<img src="${organisation.logo_url}" alt="Logo">` : ''}
            <table class="meta-table">
              ${metaZeilen.map(([label, wert]) => `<tr><td>${label}</td><td>${wert}</td></tr>`).join('')}
            </table>
          </div>
        </div>

        <h1 class="title">${titel} ${nummer}</h1>

        ${intro ? `<p class="intro">${intro}</p>` : ''}

        <table class="positions">
          <thead>
            <tr>
              <th class="pos">Pos.</th>
              <th>Beschreibung</th>
              <th class="num">Menge</th>
              <th class="num">Einzelpreis</th>
              <th class="num">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            ${(positionen || []).map((pos, idx) => `
              <tr>
                <td class="pos num">${idx + 1}.</td>
                <td class="description-cell">
                  ${pos.bezeichnung ? `<p class="pos-title">${pos.bezeichnung}</p>` : ''}
                  <div class="pos-desc">${pos.beschreibung || ''}</div>
                </td>
                <td class="num">${(pos.menge || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} ${pos.einheit || 'Stk'}</td>
                <td class="num">${eur(pos.einzelpreis)}</td>
                <td class="num">${eur((pos.menge || 0) * (pos.einzelpreis || 0))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Nettobetrag</span>
            <span>${eur(nettoBetrag)}</span>
          </div>
          <div class="totals-row">
            <span>Umsatzsteuer ${positionen?.[0]?.steuersatz || 19}%</span>
            <span>${eur(steuerBetrag)}</span>
          </div>
          <div class="totals-row total">
            <span>Gesamtbetrag</span>
            <span>${eur(bruttoBetrag)}</span>
          </div>
          ${extraSummen.map(([label, wert]) => `
          <div class="totals-row">
            <span>${label}</span>
            <span>${eur(wert)}</span>
          </div>`).join('')}
        </div>

        ${bedingungen ? `
          <div class="conditions">
            <h3>${bedingungenTitel}</h3>
            <p>${bedingungen}</p>
          </div>
        ` : ''}

        <div class="closing">
          ${abschlussZeilen.map((zeile) => `<p>${zeile}</p>`).join('')}
          <p class="signoff">Mit freundlichen Grüßen<br>${organisation?.name || ''}</p>
        </div>

        ${!supportsMarginBoxes && footerText ? `<div class="footer-flow">${footerText}</div>` : ''}
      </body>
      </html>
    `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
