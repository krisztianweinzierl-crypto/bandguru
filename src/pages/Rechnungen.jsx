import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus,
  FileText,
  Download,
  Send,
  Eye,
  MoreVertical,
  Search,
  Filter,
  Euro,
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Edit,
  Mail,
  Grid,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import RechnungForm from "@/components/finanzen/RechnungForm";

export default function RechnungenPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedEventId = urlParams.get('event_id');
  
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRechnung, setEditingRechnung] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [selectedRechnung, setSelectedRechnung] = useState(null);
  const [viewRechnung, setViewRechnung] = useState(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  // Automatisch Formular öffnen wenn event_id in URL
  useEffect(() => {
    if (preselectedEventId && !showForm && !editingRechnung) {
      setShowForm(true);
    }
  }, [preselectedEventId]);

  const { data: rechnungen = [] } = useQuery({
    queryKey: ['rechnungen', currentOrgId],
    queryFn: () => base44.entities.Rechnung.filter({ org_id: currentOrgId }, '-rechnungsdatum'),
    enabled: !!currentOrgId
  });

  const { data: kunden = [] } = useQuery({
    queryKey: ['kunden', currentOrgId],
    queryFn: () => base44.entities.Kunde.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', currentOrgId],
    queryFn: () => base44.entities.Event.filter({ org_id: currentOrgId }),
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

  const createRechnungMutation = useMutation({
    mutationFn: async (data) => {
      // Rechnungsnummer generieren
      const prefix = organisation?.rechnungspraefix || 'RG';
      const year = new Date().getFullYear();
      const count = rechnungen.filter((r) =>
        r.rechnungsnummer?.startsWith(`${prefix}-${year}`)
      ).length + 1;
      const rechnungsnummer = `${prefix}-${year}-${count.toString().padStart(3, '0')}`;

      return await base44.entities.Rechnung.create({
        ...data,
        org_id: currentOrgId,
        rechnungsnummer
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rechnungen'] });
      setShowForm(false);
      setEditingRechnung(null);
    }
  });

  const updateRechnungMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Rechnung.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rechnungen'] });
      setShowForm(false);
      setEditingRechnung(null);
    }
  });

  const versendenMutation = useMutation({
    mutationFn: async (rechnungId) => {
      return await base44.entities.Rechnung.update(rechnungId, {
        status: 'versendet',
        versandt_am: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rechnungen'] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const updateData = { status };
      if (status === 'bezahlt') {
        updateData.bezahlt_am = new Date().toISOString();
        updateData.bezahlt_betrag = selectedRechnung?.brutto_betrag || 0;
      }
      return await base44.entities.Rechnung.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rechnungen'] });
      setShowStatusDialog(false);
      setSelectedRechnung(null);
      setNewStatus("");
    }
  });

  const filteredRechnungen = rechnungen.filter((r) => {
    const matchesSearch =
      r.rechnungsnummer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kunden.find((k) => k.id === r.kunde_id)?.firmenname?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "alle" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const offeneRechnungen = filteredRechnungen.filter((r) =>
    ['versendet', 'teilweise_bezahlt'].includes(r.status)
  );
  const ueberfaelligeRechnungen = filteredRechnungen.filter((r) =>
    r.status === 'überfällig' ||
    (r.status === 'versendet' && new Date(r.faelligkeitsdatum) < new Date())
  );
  const bezahlteRechnungen = filteredRechnungen.filter((r) => r.status === 'bezahlt');

  const statusColors = {
    entwurf: "bg-gray-100 text-gray-800",
    versendet: "bg-blue-100 text-blue-800",
    teilweise_bezahlt: "bg-yellow-100 text-yellow-800",
    bezahlt: "bg-green-100 text-green-800",
    überfällig: "bg-red-100 text-red-800",
    storniert: "bg-gray-100 text-gray-800"
  };

  const handleSubmit = (data) => {
    if (editingRechnung) {
      updateRechnungMutation.mutate({ id: editingRechnung.id, data });
    } else {
      createRechnungMutation.mutate(data);
    }
  };

  const handleEdit = (rechnung) => {
    if (rechnung.status !== 'entwurf') {
      setSelectedRechnung(rechnung);
      setShowEditWarning(true);
    } else {
      setEditingRechnung(rechnung);
      setShowForm(true);
    }
  };

  const confirmEdit = () => {
    setEditingRechnung(selectedRechnung);
    setShowForm(true);
    setShowEditWarning(false);
    setSelectedRechnung(null);
  };

  const handleVersenden = async (rechnung) => {
    await versendenMutation.mutateAsync(rechnung.id);
    alert('Rechnung wurde als versendet markiert');
  };

  const handleView = (rechnung) => {
    setViewRechnung(rechnung);
  };

  const handleDownloadPDF = async (rechnung) => {
    try {
      if (rechnung.pdf_url) {
        window.open(rechnung.pdf_url, '_blank');
        return;
      }

      // PDF generieren
      const response = await base44.functions.invoke('generateRechnungPDF', {
        rechnungId: rechnung.id
      });

      if (response.data.success && response.data.pdf_url) {
        // Cache aktualisieren
        queryClient.invalidateQueries({ queryKey: ['rechnungen'] });
        // PDF öffnen
        window.open(response.data.pdf_url, '_blank');
      } else {
        alert('Fehler beim Generieren des PDFs');
      }
    } catch (error) {
      console.error('PDF Error:', error);
      alert('Fehler beim Generieren des PDFs: ' + error.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = () => {
    if (!newStatus || !selectedRechnung) return;
    updateStatusMutation.mutate({ id: selectedRechnung.id, status: newStatus });
  };

  const RechnungCard = ({ rechnung }) => {
    const kunde = kunden.find((k) => k.id === rechnung.kunde_id);
    const isUeberfaellig = new Date(rechnung.faelligkeitsdatum) < new Date() &&
      rechnung.status === 'versendet';

    return (
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{rechnung.rechnungsnummer}</h3>
                <Badge className={statusColors[rechnung.status]}>
                  {rechnung.status}
                </Badge>
                {isUeberfaellig &&
                  <Badge className="bg-red-100 text-red-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Überfällig
                  </Badge>
                }
              </div>
              <p className="text-sm text-gray-600">{kunde?.firmenname || 'Kunde unbekannt'}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(rechnung)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Bearbeiten
                </DropdownMenuItem>
                {rechnung.status === 'entwurf' && (
                  <DropdownMenuItem onClick={() => handleVersenden(rechnung)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Versenden
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setSelectedRechnung(rechnung);
                  setNewStatus(rechnung.status);
                  setShowStatusDialog(true);
                }}>
                  Status ändern
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDownloadPDF(rechnung)}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF herunterladen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(rechnung.rechnungsdatum), 'dd. MMM yyyy', { locale: de })}</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Betrag</p>
              <p className="text-xl font-bold text-gray-900">
                {(rechnung.brutto_betrag || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
            </div>
          </div>

          {rechnung.status !== 'bezahlt' &&
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Fällig am:</span>
                <span className={`font-medium ${isUeberfaellig ? 'text-red-600' : 'text-gray-900'}`}>
                  {format(new Date(rechnung.faelligkeitsdatum), 'dd. MMM yyyy', { locale: de })}
                </span>
              </div>
            </div>
          }

          <div className="flex gap-2 pt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => handleView(rechnung)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ansehen
            </Button>
            {rechnung.status === 'entwurf' &&
              <Button 
                size="sm" 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => handleVersenden(rechnung)}
              >
                <Send className="w-4 h-4 mr-2" />
                Versenden
              </Button>
            }
            {rechnung.status !== 'entwurf' &&
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => handleDownloadPDF(rechnung)}
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            }
          </div>
        </CardContent>
      </Card>);

  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
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
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Rechnungen</h1>
              <p className="text-gray-600">Erstelle und verwalte deine Rechnungen</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              style={{ backgroundColor: '#223a5e' }}
              className="text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neue Rechnung
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Offen</p>
                  <p className="text-2xl font-bold text-gray-900">{offeneRechnungen.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Überfällig</p>
                  <p className="text-2xl font-bold text-red-600">{ueberfaelligeRechnungen.length}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bezahlt</p>
                  <p className="text-2xl font-bold text-green-600">{bezahlteRechnungen.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
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
                  placeholder="Rechnungen durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10" />

              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white">

                <option value="alle">Alle Status</option>
                <option value="entwurf">Entwurf</option>
                <option value="versendet">Versendet</option>
                <option value="teilweise_bezahlt">Teilweise bezahlt</option>
                <option value="bezahlt">Bezahlt</option>
                <option value="überfällig">Überfällig</option>
                <option value="storniert">Storniert</option>
              </select>
              <div className="flex gap-2 border rounded-lg p-1 bg-gray-50">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="gap-2">

                  <List className="w-4 h-4" />
                  Liste
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="gap-2">

                  <Grid className="w-4 h-4" />
                  Karten
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {showForm &&
          <div className="mb-6">
            <RechnungForm
              rechnung={editingRechnung || (preselectedEventId ? { event_id: preselectedEventId } : null)}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingRechnung(null);
              }}
              kunden={kunden}
              events={events} />

          </div>
        }

        {/* Edit Warning Dialog */}
        <AlertDialog open={showEditWarning} onOpenChange={setShowEditWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rechnung bearbeiten</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>⚠️ <strong>Rechtlicher Hinweis:</strong></p>
                <p>
                  Das Bearbeiten einer bereits versendeten Rechnung ist rechtlich problematisch, 
                  da Rechnungen nach Versand als Buchhaltungsbelege gelten und nicht mehr verändert werden sollten.
                </p>
                <p>
                  Bei Änderungen sollte stattdessen eine Stornorechnung erstellt und eine neue, 
                  korrigierte Rechnung ausgestellt werden.
                </p>
                <p className="font-medium">
                  Möchtest du trotzdem fortfahren?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowEditWarning(false);
                setSelectedRechnung(null);
              }}>
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmEdit} className="bg-orange-600 hover:bg-orange-700">
                Ja, bearbeiten
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialog>

          {/* Status Change Dialog */}
          <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
          <DialogHeader>
            <DialogTitle>Status ändern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Neuer Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="entwurf">Entwurf</option>
                <option value="versendet">Versendet</option>
                <option value="teilweise_bezahlt">Teilweise bezahlt</option>
                <option value="bezahlt">Bezahlt</option>
                <option value="überfällig">Überfällig</option>
                <option value="storniert">Storniert</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleStatusChange}>
              Status ändern
            </Button>
          </div>
          </DialogContent>
          </Dialog>

          {/* View/Preview Dialog */}
        <Dialog open={!!viewRechnung} onOpenChange={(open) => !open && setViewRechnung(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full">
            <DialogHeader className="print:hidden">
              <DialogTitle>Rechnungsvorschau</DialogTitle>
            </DialogHeader>
            {viewRechnung && (() => {
              const kunde = kunden.find((k) => k.id === viewRechnung.kunde_id);
              return (
                <div className="bg-white p-8 print:p-0" id="rechnung-preview">
                  {/* Organisation Header */}
                  <div className="mb-8 text-sm text-gray-600">
                    {organisation?.name && <p className="font-semibold text-gray-900">{organisation.name}</p>}
                    {organisation?.adresse && <p className="whitespace-pre-line">{organisation.adresse}</p>}
                  </div>

                  {/* Rechnung Titel */}
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h1 className="text-3xl font-bold mb-4">RECHNUNG</h1>
                      <div className="text-sm space-y-1">
                        <p><span className="font-semibold">Rechnungsnummer:</span> {viewRechnung.rechnungsnummer}</p>
                        <p><span className="font-semibold">Rechnungsdatum:</span> {format(new Date(viewRechnung.rechnungsdatum), 'dd. MMMM yyyy', { locale: de })}</p>
                        <p><span className="font-semibold">Fälligkeitsdatum:</span> {format(new Date(viewRechnung.faelligkeitsdatum), 'dd. MMMM yyyy', { locale: de })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {kunde && (
                        <div className="text-sm">
                          <p className="font-semibold text-gray-900">{kunde.firmenname}</p>
                          {kunde.ansprechpartner && <p className="text-gray-600">{kunde.ansprechpartner}</p>}
                          {kunde.adresse && <p className="text-gray-600 whitespace-pre-line">{kunde.adresse}</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Positionen */}
                  <div className="mb-8">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left py-2 font-semibold">Beschreibung</th>
                          <th className="text-right py-2 font-semibold w-20">Menge</th>
                          <th className="text-right py-2 font-semibold w-24">Einzelpreis</th>
                          <th className="text-right py-2 font-semibold w-24">Gesamt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewRechnung.positionen?.map((pos, index) => (
                          <tr key={index} className="border-b border-gray-200">
                           <td className="py-3">{pos.beschreibung}</td>
                           <td className="py-3 text-right">{pos.menge} {pos.einheit}</td>
                           <td className="py-3 text-right">{(pos.einzelpreis || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                           <td className="py-3 text-right font-semibold">
                             {((pos.menge || 0) * (pos.einzelpreis || 0)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                           </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summen */}
                  <div className="flex justify-end mb-8">
                    <div className="w-64">
                      <div className="flex justify-between py-2 border-b">
                       <span>Nettobetrag:</span>
                       <span className="font-semibold">{(viewRechnung.netto_betrag || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                       <span>zzgl. MwSt.:</span>
                       <span className="font-semibold">{(viewRechnung.steuer_betrag || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                      </div>
                      <div className="flex justify-between py-3 border-t-2 border-gray-800">
                       <span className="text-lg font-bold">Gesamtbetrag:</span>
                       <span className="text-lg font-bold">{(viewRechnung.brutto_betrag || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                      </div>
                    </div>
                  </div>

                  {/* Zahlungsbedingungen */}
                  {viewRechnung.zahlungsbedingungen && (
                    <div className="mb-6 text-sm text-gray-600">
                      <p className="font-semibold mb-2">Zahlungsbedingungen:</p>
                      <p className="whitespace-pre-line">{viewRechnung.zahlungsbedingungen}</p>
                    </div>
                  )}

                  {/* Kundennotizen */}
                  {viewRechnung.kunde_notizen && (
                    <div className="mb-6 text-sm text-gray-600">
                      <p className="whitespace-pre-line">{viewRechnung.kunde_notizen}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-8 print:hidden">
                    <Button onClick={handlePrint} className="flex-1">
                      Drucken
                    </Button>
                    <Button onClick={() => handleDownloadPDF(viewRechnung)} variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Als PDF
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Rechnungen Grid/List */}
        {filteredRechnungen.length > 0 ? (
          viewMode === "list" ? (
            /* List View */
            <Card className="border-none shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rechnungsnummer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kunde
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Datum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fällig
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Betrag
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRechnungen.map((rechnung) => {
                      const kunde = kunden.find((k) => k.id === rechnung.kunde_id);
                      const isUeberfaellig = new Date(rechnung.faelligkeitsdatum) < new Date() && rechnung.status === 'versendet';
                      return (
                        <tr key={rechnung.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">
                                {rechnung.rechnungsnummer}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {kunde?.firmenname || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(rechnung.rechnungsdatum), "dd.MM.yyyy", { locale: de })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${isUeberfaellig ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                              {format(new Date(rechnung.faelligkeitsdatum), "dd.MM.yyyy", { locale: de })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={statusColors[rechnung.status]}>
                              {rechnung.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold text-gray-900">
                              {(rechnung.brutto_betrag || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(rechnung)}>

                                <Eye className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(rechnung)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Bearbeiten
                                  </DropdownMenuItem>
                                  {rechnung.status === "entwurf" && (
                                    <DropdownMenuItem onClick={() => handleVersenden(rechnung)}>
                                      <Mail className="w-4 h-4 mr-2" />
                                      Versenden
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedRechnung(rechnung);
                                      setNewStatus(rechnung.status);
                                      setShowStatusDialog(true);
                                    }}>

                                    Status ändern
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDownloadPDF(rechnung)}>
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF herunterladen
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRechnungen.map((rechnung) =>
                <RechnungCard key={rechnung.id} rechnung={rechnung} />
              )}
            </div>
          )
        ) :

          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Rechnungen gefunden</h3>
              <p className="text-gray-500 mb-4">Erstelle deine erste Rechnung</p>
              <Button onClick={() => setShowForm(true)} className="bg-[#223a5e] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-9">
                <Plus className="w-4 h-4 mr-2" />
                Neue Rechnung
              </Button>
            </CardContent>
          </Card>
        }
      </div>
    </div>);

}