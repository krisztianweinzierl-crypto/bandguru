import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Building2,
  FileText,
  CreditCard,
  Calendar,
  Tag,
  Send,
  Euro } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import KundenForm from "@/components/kunden/KundenForm";

export default function KundenDetailPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const kundeId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: kunde, isLoading } = useQuery({
    queryKey: ['kunde', kundeId],
    queryFn: async () => {
      const result = await base44.entities.Kunde.filter({ id: kundeId });
      return result[0];
    },
    enabled: !!kundeId
  });

  const { data: organisation } = useQuery({
    queryKey: ['organisation', kunde?.org_id],
    queryFn: async () => {
      const orgs = await base44.entities.Organisation.filter({ id: kunde.org_id });
      return orgs[0];
    },
    enabled: !!kunde?.org_id
  });

  const { data: rechnungen = [] } = useQuery({
    queryKey: ['rechnungen', kundeId],
    queryFn: () => base44.entities.Rechnung.filter({ kunde_id: kundeId }, '-rechnungsdatum'),
    enabled: !!kundeId
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', kundeId],
    queryFn: () => base44.entities.Event.filter({ kunde_id: kundeId }, '-datum_von'),
    enabled: !!kundeId
  });

  const updateKundeMutation = useMutation({
    mutationFn: (data) => base44.entities.Kunde.update(kundeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kunde', kundeId] });
      queryClient.invalidateQueries({ queryKey: ['kunden'] });
      setIsEditing(false);
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!kunde.email) {
        throw new Error("Kunde hat keine E-Mail-Adresse");
      }

      await base44.integrations.Core.SendEmail({
        to: kunde.email,
        subject: `Nachricht von ${organisation.name}`,
        body: `Hallo ${kunde.ansprechpartner || 'Sehr geehrte Damen und Herren'},\n\nwir freuen uns über die Zusammenarbeit mit ${kunde.firmenname}.\n\nBei Fragen stehen wir Ihnen jederzeit zur Verfügung.\n\nMit freundlichen Grüßen\n${organisation.name}`
      });
    },
    onSuccess: () => {
      alert(`Nachricht wurde an ${kunde.email} versendet!`);
    },
    onError: (error) => {
      alert("Fehler beim Versenden: " + error.message);
    }
  });

  if (isLoading || !kunde) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Kunde...</p>
      </div>);

  }

  const handleUpdateSubmit = (data) => {
    updateKundeMutation.mutate(data);
  };

  // Statistiken berechnen
  const gesamtRechnungsbetrag = rechnungen.
  filter((r) => r.status === 'bezahlt').
  reduce((sum, r) => sum + (r.brutto_betrag || 0), 0);

  const offeneRechnungen = rechnungen.filter((r) =>
  ['versendet', 'teilweise_bezahlt', 'überfällig'].includes(r.status)
  );

  // Wenn im Bearbeitungsmodus, zeige das Formular
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button
              variant="default"
              size="default"
              onClick={() => setIsEditing(false)}
              className="gap-2 mb-4 bg-[#223a5e] text-white hover:bg-[#1a2d4a]">

              <ArrowLeft className="w-4 h-4" />
              Zurück zur Übersicht
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Kunde bearbeiten</h1>
            <p className="text-gray-600">{kunde.firmenname}</p>
          </div>
          <KundenForm
            kunde={kunde}
            onSubmit={handleUpdateSubmit}
            onCancel={() => setIsEditing(false)} />

        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full max-w-7xl mx-auto px-3 md:px-8 py-4 md:py-6">
          {/* Back Button */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="default"
              size="default"
              onClick={() => navigate(createPageUrl('Kunden'))}
              className="gap-2 bg-[#223a5e] text-white hover:bg-[#1a2d4a]">

              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
          </div>

          {/* Profile Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="bg-[#223a5e] text-white text-3xl font-bold rounded-lg w-24 h-24 from-green-500 to-emerald-600 flex items-center justify-center">
                {kunde.firmenname?.[0]?.toUpperCase() || 'K'}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{kunde.firmenname}</h1>
                {kunde.ansprechpartner &&
                <p className="text-lg text-gray-600 mb-3">{kunde.ansprechpartner}</p>
                }
                {kunde.tags && kunde.tags.length > 0 &&
                <div className="flex flex-wrap gap-2">
                    {kunde.tags.map((tag, i) =>
                  <Badge key={i} variant="secondary" className="text-sm">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                  )}
                  </div>
                }
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditing(true)} className="bg-[#223a5e] text-primary-foreground px-3 text-xs font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 gap-2 hover:bg-green-700">


                <Edit className="w-4 h-4" />
                Bearbeiten
              </Button>
              {kunde.email &&
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendMessageMutation.mutate()}
                disabled={sendMessageMutation.isPending}
                className="gap-2">

                  <Send className="w-4 h-4" />
                  {sendMessageMutation.isPending ? "Wird versendet..." : "Nachricht senden"}
                </Button>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-7xl mx-auto px-3 md:px-8 py-4 md:py-8">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Kontakt & Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-xl font-bold">Kontaktinformationen</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {kunde.email &&
                <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">E-Mail</p>
                      <a href={`mailto:${kunde.email}`} className="font-medium text-green-600 hover:underline">
                        {kunde.email}
                      </a>
                    </div>
                  </div>
                }

                {kunde.telefon &&
                <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Telefon</p>
                      <a href={`tel:${kunde.telefon}`} className="font-medium text-gray-900">
                        {kunde.telefon}
                      </a>
                    </div>
                  </div>
                }

                {kunde.adresse &&
                <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Adresse</p>
                      <p className="font-medium text-gray-900 whitespace-pre-line">{kunde.adresse}</p>
                    </div>
                  </div>
                }

                {kunde.ust_id &&
                <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">USt-ID</p>
                      <p className="font-medium text-gray-900">{kunde.ust_id}</p>
                    </div>
                  </div>
                }

                {kunde.zahlungsziel_tage &&
                <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Zahlungsziel</p>
                      <p className="font-medium text-gray-900">{kunde.zahlungsziel_tage} Tage</p>
                    </div>
                  </div>
                }
              </CardContent>
            </Card>

            {/* Notizen */}
            {kunde.notizen &&
            <Card className="border-none shadow-lg">
                <CardHeader className="border-b">
                  <CardTitle className="text-xl font-bold">Interne Notizen</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-700 whitespace-pre-wrap">{kunde.notizen}</p>
                </CardContent>
              </Card>
            }

            {/* Events */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-bold">Events</CardTitle>
                  <Badge variant="outline">{events.length} Events</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {events.length > 0 ?
                <div className="divide-y">
                    {events.slice(0, 5).map((event) =>
                  <div
                    key={event.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(createPageUrl(`EventDetail?id=${event.id}`))}>

                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">{event.titel}</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {new Date(event.datum_von).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                          <Badge className={
                      event.status === 'bestätigt' ? 'bg-green-100 text-green-800' :
                      event.status === 'angefragt' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                      }>
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                  )}
                  </div> :

                <div className="p-8 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Keine Events für diesen Kunden</p>
                  </div>
                }
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Finanzielle Übersicht */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">Finanzielle Übersicht</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Gesamtumsatz</p>
                  <p className="text-2xl font-bold text-green-600">
                    {gesamtRechnungsbetrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-1">Rechnungen gesamt</p>
                  <p className="text-xl font-bold text-gray-900">{rechnungen.length}</p>
                </div>

                {offeneRechnungen.length > 0 &&
                <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-1">Offene Rechnungen</p>
                    <p className="text-xl font-bold text-orange-600">{offeneRechnungen.length}</p>
                  </div>
                }
              </CardContent>
            </Card>

            {/* Rechnungen */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold">Rechnungen</CardTitle>
                  <Badge variant="outline">{rechnungen.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {rechnungen.length > 0 ?
                <div className="divide-y max-h-96 overflow-y-auto">
                    {rechnungen.map((rechnung) =>
                  <div key={rechnung.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">{rechnung.rechnungsnummer}</span>
                          <Badge className={
                      rechnung.status === 'bezahlt' ? 'bg-green-100 text-green-800' :
                      rechnung.status === 'versendet' ? 'bg-blue-100 text-blue-800' :
                      rechnung.status === 'überfällig' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                      }>
                            {rechnung.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(rechnung.rechnungsdatum).toLocaleDateString('de-DE')}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {(rechnung.brutto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </p>
                      </div>
                  )}
                  </div> :

                <div className="p-8 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Keine Rechnungen</p>
                  </div>
                }
              </CardContent>
            </Card>

            {/* Statistiken */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">Statistiken</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Events gebucht</p>
                  <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-1">Kundenseit</p>
                  <p className="text-sm text-gray-900">
                    {kunde.created_date ? new Date(kunde.created_date).toLocaleDateString('de-DE') : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>);

}