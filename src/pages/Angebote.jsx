import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, FileCheck, Send, Eye, MoreVertical, Search, ArrowLeft, CheckCircle, XCircle, Clock, Download, Edit, Trash2, Mail } from "lucide-react";
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
    entwurf: "bg-gray-100 text-gray-800",
    versendet: "bg-blue-100 text-blue-800",
    angenommen: "bg-green-100 text-green-800",
    abgelehnt: "bg-red-100 text-red-800",
    abgelaufen: "bg-orange-100 text-orange-800"
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
      confirmText: 'Versenden',
      cancelText: 'Abbrechen'
    });

    if (confirmed) {
      sendAngebotMutation.mutate({ angebot, kunde });
    }
    setShowDropdownId(null);
  };

  const handleExportPDF = (angebot) => {
    const kunde = kunden.find((k) => k.id === angebot.kunde_id);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            margin: 20mm 15mm;
          }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            color: #333;
            font-size: 10pt;
            line-height: 1.4;
            margin: 0;
            padding: 0;
          }
          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .company-info {
            font-size: 8pt;
            line-height: 1.5;
            color: #666;
          }
          .company-info strong {
            color: #000;
            display: block;
            font-size: 9pt;
            margin-bottom: 3px;
          }
          .logo {
            max-width: 120px;
            max-height: 60px;
            margin-bottom: 10px;
          }
          .document-meta {
            text-align: right;
            font-size: 8pt;
            color: #666;
            line-height: 1.6;
          }
          .document-meta .title {
            font-size: 9pt;
            font-weight: bold;
            color: #000;
            margin-bottom: 5px;
          }
          .addresses {
            display: table;
            width: 100%;
            margin: 30px 0;
          }
          .address-column {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 20px;
          }
          .recipient-address {
            margin-bottom: 30px;
          }
          .small-text {
            font-size: 7pt;
            color: #999;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 2px;
            margin-bottom: 5px;
          }
          .recipient-address p {
            margin: 2px 0;
            font-size: 10pt;
          }
          .recipient-address .name {
            font-weight: bold;
            font-size: 11pt;
            margin-bottom: 5px;
          }
          .meta-table {
            width: 100%;
            font-size: 9pt;
            margin-bottom: 20px;
          }
          .meta-table td {
            padding: 3px 0;
          }
          .meta-table td:first-child {
            color: #666;
            width: 150px;
          }
          .meta-table td:last-child {
            font-weight: 600;
            text-align: right;
          }
          .greeting {
            margin: 30px 0 20px 0;
            font-size: 10pt;
          }
          .intro-text {
            margin-bottom: 25px;
            font-size: 10pt;
            line-height: 1.6;
          }
          table.items { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0 30px 0;
            font-size: 9pt;
          }
          table.items thead {
            background-color: #f5f5f5;
          }
          table.items th { 
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #ddd;
            font-size: 8pt;
            text-transform: uppercase;
            color: #666;
            letter-spacing: 0.3px;
          }
          table.items th:nth-child(2),
          table.items th:nth-child(3),
          table.items th:nth-child(4) {
            text-align: right;
            width: 100px;
          }
          table.items tbody tr {
            border-bottom: 1px solid #e5e5e5;
          }
          table.items td { 
            padding: 12px 8px;
            vertical-align: top;
          }
          table.items td:nth-child(2),
          table.items td:nth-child(3),
          table.items td:nth-child(4) {
            text-align: right;
            white-space: nowrap;
          }
          .item-title {
            font-weight: 600;
            margin-bottom: 4px;
            font-size: 10pt;
          }
          .item-details {
            font-size: 9pt;
            color: #666;
            line-height: 1.5;
            margin-top: 5px;
          }
          .totals-table { 
            width: 300px;
            margin-left: auto;
            margin-top: 20px;
            font-size: 10pt;
            border-collapse: collapse;
          }
          .totals-table td {
            padding: 8px 0;
            border-bottom: 1px solid #e5e5e5;
          }
          .totals-table td:first-child {
            text-align: left;
            color: #666;
          }
          .totals-table td:last-child {
            text-align: right;
            font-weight: 600;
          }
          .totals-table tr.subtotal td {
            background-color: #f9f9f9;
            padding: 8px 10px;
          }
          .totals-table tr.total {
            border-top: 2px solid #333;
            font-weight: bold;
            font-size: 12pt;
          }
          .totals-table tr.total td {
            padding: 12px 10px;
            background-color: #f5f5f5;
            border-bottom: none;
          }
          .closing-text {
            margin-top: 40px;
            font-size: 10pt;
            line-height: 1.6;
          }
          .signature {
            margin-top: 30px;
            font-size: 10pt;
          }
          .page-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            border-top: 1px solid #e0e0e0;
            padding-top: 10px;
            font-size: 7pt;
            color: #666;
            text-align: center;
            background: white;
          }
        </style>
      </head>
      <body>
        <div class="page-header">
          <div>
            ${organisation?.logo_url ? `<img src="${organisation.logo_url}" alt="Logo" class="logo">` : ''}
            <div class="company-info">
              <strong>${organisation?.name || ''}</strong>
              ${organisation?.adresse ? organisation.adresse.split('\n').map(line => `<div>${line}</div>`).join('') : ''}
            </div>
          </div>
          <div class="document-meta">
            <div class="title">Angebots-Nr. ${angebot.angebotsnummer}</div>
            <div>Datum: ${format(new Date(angebot.angebotsdatum), 'dd.MM.yyyy', { locale: de })}</div>
            <div>Gültig bis: ${format(new Date(angebot.gueltig_bis), 'dd.MM.yyyy', { locale: de })}</div>
            ${angebot.kunde_referenz ? `<div>Referenz: ${angebot.kunde_referenz}</div>` : ''}
          </div>
        </div>

        <div class="addresses">
          <div class="address-column">
            <div class="small-text">${organisation?.name || ''} - ${organisation?.adresse?.split('\n')[0] || ''}</div>
            <div class="recipient-address">
              <div class="name">${kunde?.firmenname || 'Unbekannt'}</div>
              ${kunde?.ansprechpartner ? `<p>${kunde.ansprechpartner}</p>` : ''}
              ${kunde?.adresse ? kunde.adresse.split('\n').map(line => `<p>${line}</p>`).join('') : ''}
            </div>
          </div>
          <div class="address-column">
            <table class="meta-table">
              <tr>
                <td>Angebots-Nr.</td>
                <td>${angebot.angebotsnummer}</td>
              </tr>
              <tr>
                <td>Datum</td>
                <td>${format(new Date(angebot.angebotsdatum), 'dd.MM.yyyy', { locale: de })}</td>
              </tr>
              ${angebot.kunde_referenz ? `
                <tr>
                  <td>Referenz</td>
                  <td>${angebot.kunde_referenz}</td>
                </tr>
              ` : ''}
              ${kunde?.firmenname ? `
                <tr>
                  <td>Ihr Ansprechpartner</td>
                  <td>${organisation?.name || ''}</td>
                </tr>
              ` : ''}
            </table>
          </div>
        </div>

        <h2 style="font-size: 14pt; margin: 30px 0 15px 0;">Angebot ${angebot.angebotsnummer}</h2>

        <div class="greeting">
          Hallo ${kunde?.ansprechpartner ? kunde.ansprechpartner.split(' ')[0] : ''},
        </div>

        <div class="intro-text">
          vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen das gewünschte freibleibende Angebot:
        </div>

        <table class="items">
          <thead>
            <tr>
              <th>Pos.</th>
              <th style="text-align: left;">Beschreibung</th>
              <th>Menge</th>
              <th>Einzelpreis</th>
              <th>Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            ${angebot.positionen?.map((pos, idx) => {
              // HTML aus ReactQuill-Editor entfernen
              const cleanDescription = pos.beschreibung?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') || '';
              const lines = cleanDescription.split('\n').filter(line => line.trim());
              const title = lines[0] || '';
              const details = lines.slice(1).join('\n');

              return `
              <tr>
                <td style="vertical-align: top; font-weight: 600;">${idx + 1}.</td>
                <td>
                  <div class="item-title">${title}</div>
                  ${details ? `<div class="item-details">${details}</div>` : ''}
                </td>
                <td>${pos.menge} ${pos.einheit || 'Stk'}</td>
                <td>${(pos.einzelpreis || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
                <td style="font-weight: 600;">${((pos.menge || 0) * (pos.einzelpreis || 0)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
              </tr>
            `}).join('') || ''}
          </tbody>
        </table>

        <table class="totals-table">
          <tr class="subtotal">
            <td>Gesamtbetrag netto</td>
            <td>${(angebot.netto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
          </tr>
          <tr class="subtotal">
            <td>Umsatzsteuer ${angebot.positionen?.[0]?.steuersatz || 19}%</td>
            <td>${(angebot.steuer_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
          </tr>
          <tr class="total">
            <td>Gesamtbetrag brutto</td>
            <td>${(angebot.brutto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
          </tr>
        </table>

        <div style="clear: both;"></div>

        ${angebot.zahlungsbedingungen || angebot.kunde_notizen ? `
          <div style="margin-top: 40px; padding: 15px; background: #f9f9f9; border-left: 3px solid #666;">
            ${angebot.zahlungsbedingungen ? `<p style="margin: 0 0 10px 0; font-size: 10pt; line-height: 1.6;">${angebot.zahlungsbedingungen}</p>` : ''}
            ${angebot.kunde_notizen ? `<p style="margin: 0; font-size: 10pt; line-height: 1.6;">${angebot.kunde_notizen}</p>` : ''}
          </div>
        ` : ''}

        <div class="closing-text">
          Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.<br>
          Wir bedanken uns sehr für Ihr Vertrauen.
        </div>

        <div class="signature">
          Mit freundlichen Grüßen<br>
          <strong>${organisation?.name || ''}</strong>
        </div>

        <div class="page-footer">
          ${organisation?.name || ''} ${organisation?.adresse ? '- ' + organisation.adresse.split('\n').join(' - ') : ''} 
          ${organisation?.steuernummer ? '- USt.-ID: ' + organisation.steuernummer : ''}
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
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{angebot.angebotsnummer}</h3>
                <Badge className={statusColors[angebot.status]}>
                  {angebot.status}
                </Badge>
                {isAbgelaufen && (
                  <Badge className="bg-orange-100 text-orange-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Abgelaufen
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">{kunde?.firmenname || 'Kunde unbekannt'}</p>
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
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(angebot);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
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
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span>Erstellt: {format(new Date(angebot.angebotsdatum), 'dd. MMM yyyy', { locale: de })}</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Betrag</p>
              <p className="text-xl font-bold text-gray-900">
                {(angebot.brutto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Gültig bis:</span>
              <span className={`font-medium ${isAbgelaufen ? 'text-orange-600' : 'text-gray-900'}`}>
                {format(new Date(angebot.gueltig_bis), 'dd. MMM yyyy', { locale: de })}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => handleView(angebot)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ansehen
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleExportPDF(angebot)}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            {angebot.status === 'entwurf' && (
              <Button 
                size="sm" 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => handleSend(angebot)}
              >
                <Send className="w-4 h-4 mr-2" />
                Versenden
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <AlertDialog />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 md:p-8">
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
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Angebote</h1>
              <p className="text-gray-600">Erstelle und verwalte deine Angebote</p>
            </div>
            <Button
              onClick={() => {
                setEditingAngebot(null);
                setShowForm(true);
              }}
              style={{ backgroundColor: '#223a5e' }}
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
                  <p className="text-sm text-gray-600">Versendet</p>
                  <p className="text-2xl font-bold text-gray-900">{versendeteAngebote.length}</p>
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
                  <p className="text-sm text-gray-600">Angenommen</p>
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
                  <p className="text-sm text-gray-600">Abgelaufen</p>
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                className="px-4 py-2 border rounded-lg bg-white"
              >
                <option value="alle">Alle Status</option>
                <option value="entwurf">Entwurf</option>
                <option value="versendet">Versendet</option>
                <option value="angenommen">Angenommen</option>
                <option value="abgelehnt">Abgelehnt</option>
                <option value="abgelaufen">Abgelaufen</option>
              </select>
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
                        <p className="font-semibold text-gray-900">{organisation.name}</p>
                        {organisation.adresse && (
                          <p className="text-gray-600 text-xs mt-1 whitespace-pre-line">{organisation.adresse}</p>
                        )}
                        {organisation.steuernummer && (
                          <p className="text-gray-500 text-xs mt-1">Steuernr.: {organisation.steuernummer}</p>
                        )}
                      </div>
                    )}
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Kunde & Daten */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Kunde</p>
                      <p className="font-semibold text-gray-900">
                        {kunden.find((k) => k.id === selectedAngebot.kunde_id)?.firmenname || 'Unbekannt'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Datum</p>
                      <p className="text-gray-700">
                        Erstellt: {format(new Date(selectedAngebot.angebotsdatum), 'dd. MMMM yyyy', { locale: de })}
                      </p>
                      <p className="text-gray-700">
                        Gültig bis: {format(new Date(selectedAngebot.gueltig_bis), 'dd. MMMM yyyy', { locale: de })}
                      </p>
                    </div>
                  </div>

                  {/* Positionen */}
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Positionen</p>
                    <div className="space-y-2">
                      {selectedAngebot.positionen?.map((pos, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium">{pos.beschreibung}</p>
                            <p className="font-semibold">
                              {((pos.menge || 0) * (pos.einzelpreis || 0)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">
                            {pos.menge} {pos.einheit || 'Stk'} × {(pos.einzelpreis || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summen */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Netto:</span>
                      <span className="font-medium">{(selectedAngebot.netto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">MwSt.:</span>
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
                      <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Zahlungsbedingungen</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedAngebot.zahlungsbedingungen}</p>
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
                        Versenden
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Angebote Grid */}
        {filteredAngebote.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAngebote.map((angebot) => (
              <AngebotCard key={angebot.id} angebot={angebot} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FileCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Angebote gefunden</h3>
              <p className="text-gray-500 mb-4">Erstelle dein erstes Angebot</p>
              <Button onClick={() => setShowForm(true)} style={{ backgroundColor: '#223a5e' }} className="hover:opacity-90">
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