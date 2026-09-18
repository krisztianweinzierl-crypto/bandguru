import React, { useState, useEffect } from "react";
import { safeHtml } from "@/utils/sanitize";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, FileCheck, Send, Eye, MoreVertical, Search, ArrowLeft, CheckCircle, XCircle, Clock, Download, Edit, Trash2, Mail, LayoutGrid, List, Columns3 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AngebotForm from "@/components/finanzen/AngebotForm";

export default function AngebotePage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAngebot, setEditingAngebot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [showDropdownId, setShowDropdownId] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedAngebot, setSelectedAngebot] = useState(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusToChange, setStatusToChange] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const queryClient = useQueryClient();
  const { showAlert, showConfirm, AlertDialog } = useAlertDialog();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: angebote = [] } = useQuery({
    queryKey: ['angebote', currentOrgId],
    queryFn: () => base44.entities.Angebot.filter({ org_id: currentOrgId }, '-angebotsdatum'),
    enabled: !!currentOrgId
  });

  const { data: kunden = [] } = useQuery({
    queryKey: ['kunden', currentOrgId],
    queryFn: () => base44.entities.Kunde.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId
  });

  const { data: organisation } = useQuery({
    queryKey: ['organisation', currentOrgId],
    queryFn: async () => {
      const orgs = await base44.entities.Organisation.filter({ id: currentOrgId });
      return orgs[0];
    },
    enabled: !!currentOrgId
  });

  const createAngebotMutation = useMutation({
    mutationFn: async (data) => {
      const prefix = 'ANG';
      const year = new Date().getFullYear();
      const count = angebote.filter((a) =>
        a.angebotsnummer?.startsWith(`${prefix}-${year}`)
      ).length + 1;
      const angebotsnummer = `${prefix}-${year}-${count.toString().padStart(3, '0')}`;

      return await base44.entities.Angebot.create({
        ...data,
        org_id: currentOrgId,
        angebotsnummer
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['angebote'] });
      setShowForm(false);
      setEditingAngebot(null);
    }
  });

  const updateAngebotMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Angebot.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['angebote'] });
      setShowForm(false);
      setEditingAngebot(null);
      setShowDropdownId(null);
      setShowStatusDialog(false);
      setStatusToChange(null);
    }
  });

  const deleteAngebotMutation = useMutation({
    mutationFn: (id) => base44.entities.Angebot.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['angebote'] });
      setShowDropdownId(null);
    }
  });

  const sendAngebotMutation = useMutation({
    mutationFn: async ({ angebot, kunde }) => {
      // Email senden
      await base44.integrations.Core.SendEmail({
        to: kunde.email,
        subject: `Angebot ${angebot.angebotsnummer}`,
        body: `
          <h2>Neues Angebot von ${organisation?.name || 'uns'}</h2>
          <p>Sehr geehrte Damen und Herren,</p>
          <p>anbei erhalten Sie unser Angebot ${angebot.angebotsnummer}.</p>
          <p><strong>Betrag:</strong> ${(angebot.brutto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
          <p><strong>Gültig bis:</strong> ${format(new Date(angebot.gueltig_bis), 'dd. MMMM yyyy', { locale: de })}</p>
          <br/>
          <p>Mit freundlichen Grüßen</p>
        `
      });

      // Status aktualisieren
      return await base44.entities.Angebot.update(angebot.id, {
        status: 'versendet',
        versandt_am: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['angebote'] });
      showAlert({
        title: 'Angebot versendet',
        message: 'Das Angebot wurde erfolgreich per E-Mail versendet.',
        type: 'success'
      });
    },
    onError: (error) => {
      showAlert({
        title: 'Fehler',
        message: 'Angebot konnte nicht versendet werden: ' + error.message,
        type: 'error'
      });
    }
  });

  const filteredAngebote = angebote.filter((a) => {
    const matchesSearch =
      a.angebotsnummer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kunden.find((k) => k.id === a.kunde_id)?.firmenname?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "alle" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const versendeteAngebote = filteredAngebote.filter((a) => a.status === 'versendet');
  const angenommeneAngebote = filteredAngebote.filter((a) => a.status === 'angenommen');
  const abgelaufeneAngebote = filteredAngebote.filter((a) => 
    a.status === 'versendet' && new Date(a.gueltig_bis) < new Date()
  );

  const statusColors = {
    entwurf: "bg-muted text-foreground",
    versendet: "status-blue",
    angenommen: "status-green",
    abgelehnt: "status-red",
    abgelaufen: "status-orange"
  };

  const handleSubmit = (data) => {
    if (editingAngebot) {
      updateAngebotMutation.mutate({ id: editingAngebot.id, data });
    } else {
      createAngebotMutation.mutate(data);
    }
  };

  const handleEdit = (angebot) => {
    setEditingAngebot(angebot);
    setShowForm(true);
    setShowDropdownId(null);
  };

  const handleDelete = async (angebot) => {
    const confirmed = await showConfirm({
      title: 'Angebot löschen',
      message: `Möchtest du das Angebot "${angebot.angebotsnummer}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`,
      type: 'warning',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen'
    });

    if (confirmed) {
      deleteAngebotMutation.mutate(angebot.id);
    }
  };

  const handleChangeStatus = (angebot) => {
    setStatusToChange(angebot);
    setShowStatusDialog(true);
    setShowDropdownId(null);
  };

  const handleStatusSubmit = (newStatus) => {
    if (!statusToChange) return;
    updateAngebotMutation.mutate({
      id: statusToChange.id,
      data: { status: newStatus }
    });
  };

  const handleView = (angebot) => {
    setSelectedAngebot(angebot);
    setShowDetailsDialog(true);
    setShowDropdownId(null);
  };

  const handleSend = async (angebot) => {
    const kunde = kunden.find((k) => k.id === angebot.kunde_id);
    
    if (!kunde?.email) {
      showAlert({
        title: 'Keine E-Mail-Adresse',
        message: 'Der Kunde hat keine E-Mail-Adresse hinterlegt.',
        type: 'error'
      });
      return;
    }

    const confirmed = await showConfirm({
      title: 'Angebot versenden',
      message: `Möchtest du das Angebot "${angebot.angebotsnummer}" an ${kunde.email} versenden?`,
      type: 'info',
      confirmText: 'Senden',
      cancelText: 'Abbrechen'
    });

    if (confirmed) {
      sendAngebotMutation.mutate({ angebot, kunde });
    }
    setShowDropdownId(null);
  };

  const handleExportPDF = (angebot) => {
    const kunde = kunden.find((k) => k.id === angebot.kunde_id);
    const brandColor = organisation?.primary_color || '#10B981';
    const orgAdresseZeile = (organisation?.adresse || '').replace(/\n/g, ' · ');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            margin: 22mm 18mm 28mm 18mm;
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
          .header-left {
            flex: 1;
          }
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
          .header-right {
            text-align: right;
          }
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
          table.positions thead tr {
            background: #f8fafc;
          }
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
          table.positions td.description-cell .pos-desc p {
            margin: 0 0 4px 0;
          }
          table.positions td.description-cell .pos-desc p:last-child {
            margin-bottom: 0;
          }
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
          .totals-row.total span:last-child {
            color: ${brandColor};
          }
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
          .closing p {
            margin: 0 0 4px 0;
          }
          .closing .signoff {
            margin-top: 18px;
            font-weight: 600;
            color: #1e293b;
          }
          .footer {
            position: fixed;
            bottom: 8mm;
            left: 18mm;
            right: 18mm;
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
              <tr><td>Angebots-Nr.</td><td>${angebot.angebotsnummer}</td></tr>
              <tr><td>Datum</td><td>${format(new Date(angebot.angebotsdatum), 'dd.MM.yyyy', { locale: de })}</td></tr>
              <tr><td>Gültig bis</td><td>${format(new Date(angebot.gueltig_bis), 'dd.MM.yyyy', { locale: de })}</td></tr>
            </table>
          </div>
        </div>

        <h1 class="title">Angebot ${angebot.angebotsnummer}</h1>

        ${angebot.kunde_notizen ? `<p class="intro">${angebot.kunde_notizen}</p>` : ''}

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
            ${angebot.positionen?.map((pos, idx) => `
              <tr>
                <td class="pos num">${idx + 1}.</td>
                <td class="description-cell">
                  ${pos.bezeichnung ? `<p class="pos-title">${pos.bezeichnung}</p>` : ''}
                  <div class="pos-desc">${pos.beschreibung || ''}</div>
                </td>
                <td class="num">${(pos.menge || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} ${pos.einheit || 'Stk'}</td>
                <td class="num">${(pos.einzelpreis || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
                <td class="num">${((pos.menge || 0) * (pos.einzelpreis || 0)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Nettobetrag</span>
            <span>${(angebot.netto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
          </div>
          <div class="totals-row">
            <span>Umsatzsteuer ${angebot.positionen?.[0]?.steuersatz || 19}%</span>
            <span>${(angebot.steuer_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
          </div>
          <div class="totals-row total">
            <span>Gesamtbetrag</span>
            <span>${(angebot.brutto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
          </div>
        </div>

        ${angebot.zahlungsbedingungen ? `
          <div class="conditions">
            <h3>Zahlungsbedingungen</h3>
            <p>${angebot.zahlungsbedingungen}</p>
          </div>
        ` : ''}

        <div class="closing">
          <p>Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.</p>
          <p>Wir freuen uns auf Ihre Rückmeldung.</p>
          <p class="signoff">Mit freundlichen Grüßen<br>${organisation?.name || ''}</p>
        </div>

        <div class="footer">
          ${organisation?.name || ''}${orgAdresseZeile ? ' · ' + orgAdresseZeile : ''}${organisation?.steuernummer ? ' · USt-IdNr: ' + organisation.steuernummer : ''}
        </div>
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
  };

  const AngebotCard = ({ angebot }) => {
    const kunde = kunden.find((k) => k.id === angebot.kunde_id);
    const isAbgelaufen = new Date(angebot.gueltig_bis) < new Date() && angebot.status === 'versendet';

    return (
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-semibold text-base">{angebot.angebotsnummer}</h3>
                <Badge className={statusColors[angebot.status]}>
                  {angebot.status}
                </Badge>
                {isAbgelaufen && (
                  <Badge className="status-orange">
                    <Clock className="w-3 h-3 mr-1" />
                    Abgelaufen
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{kunde?.firmenname || 'Kunde unbekannt'}</p>
            </div>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdownId(showDropdownId === angebot.id ? null : angebot.id);
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>

              {showDropdownId === angebot.id && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdownId(null);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChangeStatus(angebot);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Status ändern</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(angebot);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-t"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Angebot bearbeiten</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(angebot);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-sm text-red-600 border-t"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Angebot löschen</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              <span>Erstellt: {format(new Date(angebot.angebotsdatum), 'dd. MMM yyyy', { locale: de })}</span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Betrag</p>
              <p className="text-lg font-bold text-foreground">
                {(angebot.brutto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gültig bis:</span>
              <span className={`font-medium ${isAbgelaufen ? 'text-orange-600' : 'text-foreground'}`}>
                {format(new Date(angebot.gueltig_bis), 'dd. MMM yyyy', { locale: de })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 min-w-[80px]"
              onClick={() => handleView(angebot)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ansehen
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleExportPDF(angebot)}
              className="flex-1 min-w-[60px]"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            {angebot.status === 'entwurf' && (
              <Button 
                size="sm" 
                className="flex-1 min-w-[100px] bg-blue-600 hover:bg-blue-700"
                onClick={() => handleSend(angebot)}
              >
                <Send className="w-4 h-4 mr-2" />
                Senden
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const AngebotListRow = ({ angebot }) => {
    const kunde = kunden.find((k) => k.id === angebot.kunde_id);
    const isAbgelaufen = new Date(angebot.gueltig_bis) < new Date() && angebot.status === 'versendet';

    return (
      <div
        className="flex items-center justify-between gap-3 p-4 border-b last:border-0 hover:bg-muted transition-colors cursor-pointer"
        onClick={() => handleView(angebot)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{angebot.angebotsnummer}</h3>
            <Badge className={statusColors[angebot.status] + " shrink-0"}>
              {angebot.status}
            </Badge>
            {isAbgelaufen && (
              <Badge className="status-orange shrink-0">
                <Clock className="w-3 h-3 mr-1" />
                Abgelaufen
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
            <span className="truncate">{kunde?.firmenname || 'Kunde unbekannt'}</span>
            <span className="shrink-0">· Gültig bis {format(new Date(angebot.gueltig_bis), 'dd. MMM yyyy', { locale: de })}</span>
          </div>
        </div>
        <p className="text-lg font-bold text-foreground shrink-0 whitespace-nowrap">
          {(angebot.brutto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </p>
        <div className="flex gap-1 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => handleExportPDF(angebot)} title="PDF Export">
            <Download className="w-4 h-4" />
          </Button>
          {angebot.status === 'entwurf' && (
            <Button variant="ghost" size="icon" onClick={() => handleSend(angebot)} title="Senden">
              <Send className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDropdownId(showDropdownId === angebot.id ? null : angebot.id)}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>

          {showDropdownId === angebot.id && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdownId(null)}
              />
              <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                <button
                  onClick={() => handleChangeStatus(angebot)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                >
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Status ändern</span>
                </button>
                <button
                  onClick={() => handleEdit(angebot)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-t"
                >
                  <Edit className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Angebot bearbeiten</span>
                </button>
                <button
                  onClick={() => handleDelete(angebot)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-sm text-red-600 border-t"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Angebot löschen</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const kanbanStages = [
    { status: 'entwurf', label: 'Entwurf', color: '#94A3B8' },
    { status: 'versendet', label: 'Versendet', color: '#3B82F6' },
    { status: 'angenommen', label: 'Angenommen', color: '#10B981' },
    { status: 'abgelehnt', label: 'Abgelehnt', color: '#EF4444' }
  ];

  const handleKanbanDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    updateAngebotMutation.mutate({
      id: draggableId,
      data: { status: destination.droppableId }
    });
  };

  const AngebotKanbanCard = ({ angebot }) => {
    const kunde = kunden.find((k) => k.id === angebot.kunde_id);
    const isAbgelaufen = new Date(angebot.gueltig_bis) < new Date() && angebot.status === 'versendet';

    return (
      <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => handleView(angebot)}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm text-foreground truncate">{angebot.angebotsnummer}</h4>
            {isAbgelaufen && (
              <Badge className="status-orange shrink-0 text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Abgelaufen
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{kunde?.firmenname || 'Kunde unbekannt'}</p>
          <p className="text-sm font-bold text-foreground">
            {(angebot.brutto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-xs text-muted-foreground">
            Gültig bis {format(new Date(angebot.gueltig_bis), 'dd. MMM yyyy', { locale: de })}
          </p>
        </CardContent>
      </Card>
    );
  };

  const AngebotKanbanView = () => (
    <DragDropContext onDragEnd={handleKanbanDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanStages.map((stage) => {
          const stageAngebote = filteredAngebote.filter((a) => a.status === stage.status);
          return (
            <div key={stage.status} className="flex-shrink-0 w-80">
              <div className="bg-card rounded-lg shadow-sm border border-border">
                <div
                  className="p-4 border-b"
                  style={{
                    backgroundColor: stage.color + '15',
                    borderTopColor: stage.color,
                    borderTopWidth: '3px'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{stage.label}</h3>
                    <Badge variant="secondary" className="text-xs">{stageAngebote.length}</Badge>
                  </div>
                </div>
                <Droppable droppableId={stage.status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 space-y-3 min-h-[200px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-muted'
                      }`}
                      style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}
                    >
                      {stageAngebote.map((angebot, index) => (
                        <Draggable key={angebot.id} draggableId={angebot.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? 'ring-2 ring-blue-400 rounded-lg' : ''}
                            >
                              <AngebotKanbanCard angebot={angebot} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );

  return (
    <>
      <AlertDialog />
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl('Finanzen'))}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zu Finanzen
          </Button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Angebote</h1>
              <p className="text-muted-foreground">Erstelle und verwalte deine Angebote</p>
            </div>
            <Button
              onClick={() => {
                setEditingAngebot(null);
                setShowForm(true);
              }}
              style={{ backgroundColor: 'rgb(var(--primary))' }}
              className="hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neues Angebot
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Versendet</p>
                  <p className="text-2xl font-bold text-foreground">{versendeteAngebote.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Send className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Angenommen</p>
                  <p className="text-2xl font-bold text-green-600">{angenommeneAngebote.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Abgelaufen</p>
                  <p className="text-2xl font-bold text-orange-600">{abgelaufeneAngebote.length}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Angebote durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-card"
              >
                <option value="alle">Alle Status</option>
                <option value="entwurf">Entwurf</option>
                <option value="versendet">Versendet</option>
                <option value="angenommen">Angenommen</option>
                <option value="abgelehnt">Abgelehnt</option>
                <option value="abgelaufen">Abgelaufen</option>
              </select>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "kanban" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("kanban")}
                >
                  <Columns3 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {showForm && (
          <div className="mb-6">
            <AngebotForm
              angebot={editingAngebot}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingAngebot(null);
              }}
              kunden={kunden}
            />
          </div>
        )}

        {/* Status ändern Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="max-w-md">
            {statusToChange && (
              <>
                <DialogHeader>
                  <DialogTitle>Status ändern</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-semibold">{statusToChange.angebotsnummer}</p>
                    <p className="text-sm text-muted-foreground">
                      Aktueller Status: <Badge className={statusColors[statusToChange.status]}>{statusToChange.status}</Badge>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Neuer Status:</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleStatusSubmit('entwurf')}
                        className={`w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors ${
                          statusToChange.status === 'entwurf' ? 'border-border bg-muted' : 'border-border'
                        }`}
                      >
                        <Badge className={statusColors.entwurf}>Entwurf</Badge>
                      </button>
                      <button
                        onClick={() => handleStatusSubmit('versendet')}
                        className={`w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 transition-colors ${
                          statusToChange.status === 'versendet' ? 'border-blue-400 bg-blue-50' : 'border-border'
                        }`}
                      >
                        <Badge className={statusColors.versendet}>Versendet</Badge>
                      </button>
                      <button
                        onClick={() => handleStatusSubmit('angenommen')}
                        className={`w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-green-50 transition-colors ${
                          statusToChange.status === 'angenommen' ? 'border-green-400 bg-green-50' : 'border-border'
                        }`}
                      >
                        <Badge className={statusColors.angenommen}>Angenommen</Badge>
                      </button>
                      <button
                        onClick={() => handleStatusSubmit('abgelehnt')}
                        className={`w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-red-50 transition-colors ${
                          statusToChange.status === 'abgelehnt' ? 'border-red-400 bg-red-50' : 'border-border'
                        }`}
                      >
                        <Badge className={statusColors.abgelehnt}>Abgelehnt</Badge>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedAngebot && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <DialogTitle className="text-2xl mb-2">
                        {selectedAngebot.angebotsnummer}
                      </DialogTitle>
                      <Badge className={statusColors[selectedAngebot.status]}>
                        {selectedAngebot.status}
                      </Badge>
                    </div>
                    {organisation && (
                      <div className="text-right text-sm">
                        <p className="font-semibold text-foreground">{organisation.name}</p>
                        {organisation.adresse && (
                          <p className="text-muted-foreground text-xs mt-1 whitespace-pre-line">{organisation.adresse}</p>
                        )}
                        {organisation.steuernummer && (
                          <p className="text-muted-foreground text-xs mt-1">Steuernr.: {organisation.steuernummer}</p>
                        )}
                      </div>
                    )}
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Kunde & Daten */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground uppercase mb-2">Kunde</p>
                      <p className="font-semibold text-foreground">
                        {kunden.find((k) => k.id === selectedAngebot.kunde_id)?.firmenname || 'Unbekannt'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground uppercase mb-2">Datum</p>
                      <p className="text-foreground">
                        Erstellt: {format(new Date(selectedAngebot.angebotsdatum), 'dd. MMMM yyyy', { locale: de })}
                      </p>
                      <p className="text-foreground">
                        Gültig bis: {format(new Date(selectedAngebot.gueltig_bis), 'dd. MMMM yyyy', { locale: de })}
                      </p>
                    </div>
                  </div>

                  {/* Positionen */}
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase mb-3">Positionen</p>
                    <div className="space-y-2">
                     {selectedAngebot.positionen?.map((pos, idx) => (
                       <div key={idx} className="p-3 bg-muted rounded-lg">
                         {pos.bezeichnung && (
                           <p className="font-bold text-foreground mb-2 pb-2 border-b">{pos.bezeichnung}</p>
                         )}
                         <div className="flex justify-between items-start mb-1">
                           <div 
                             className="font-medium prose prose-sm max-w-none flex-1"
                             {...safeHtml(pos.beschreibung)}
                           />
                           <p className="font-semibold ml-4">
                             {((pos.menge || 0) * (pos.einzelpreis || 0)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                           </p>
                         </div>
                         <p className="text-sm text-muted-foreground">
                           {pos.menge} {pos.einheit || 'Stk'} × {(pos.einzelpreis || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                         </p>
                       </div>
                     ))}
                    </div>
                  </div>

                  {/* Summen */}
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Netto:</span>
                      <span className="font-medium">{(selectedAngebot.netto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">MwSt.:</span>
                      <span className="font-medium">{(selectedAngebot.steuer_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Gesamt:</span>
                      <span>{(selectedAngebot.brutto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                  </div>

                  {/* Zahlungsbedingungen */}
                  {selectedAngebot.zahlungsbedingungen && (
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground uppercase mb-2">Zahlungsbedingungen</p>
                      <p className="text-foreground whitespace-pre-wrap">{selectedAngebot.zahlungsbedingungen}</p>
                    </div>
                  )}

                  {/* Notizen */}
                  {selectedAngebot.kunde_notizen && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Notizen für Kunde</p>
                      <p className="text-sm text-blue-700 whitespace-pre-wrap">{selectedAngebot.kunde_notizen}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => handleExportPDF(selectedAngebot)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Export
                    </Button>
                    {selectedAngebot.status === 'entwurf' && (
                      <Button
                        onClick={() => handleSend(selectedAngebot)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Senden
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Angebote Grid/List/Kanban */}
        {filteredAngebote.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAngebote.map((angebot) => (
                <AngebotCard key={angebot.id} angebot={angebot} />
              ))}
            </div>
          ) : viewMode === "list" ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                {filteredAngebote.map((angebot) => (
                  <AngebotListRow key={angebot.id} angebot={angebot} />
                ))}
              </CardContent>
            </Card>
          ) : (
            <AngebotKanbanView />
          )
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FileCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold mb-2">Keine Angebote gefunden</h3>
              <p className="text-muted-foreground mb-4">Erstelle dein erstes Angebot</p>
              <Button onClick={() => setShowForm(true)} style={{ backgroundColor: 'rgb(var(--primary))' }} className="hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Neues Angebot
              </Button>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </>
  );
}