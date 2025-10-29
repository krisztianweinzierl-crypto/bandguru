
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Edit,
  Mail,
  ExternalLink,
  Clock,
  Users as UsersIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import EventForm from "@/components/events/EventForm";

export default function EventDetailPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ id: eventId });
      return events[0];
    },
    enabled: !!eventId,
  });

  const { data: kunde } = useQuery({
    queryKey: ['kunde', event?.kunde_id],
    queryFn: async () => {
      if (!event?.kunde_id) return null;
      const kunden = await base44.entities.Kunde.filter({ id: event.kunde_id });
      return kunden[0];
    },
    enabled: !!event?.kunde_id,
  });

  const { data: kunden = [] } = useQuery({
    queryKey: ['kunden', event?.org_id],
    queryFn: () => base44.entities.Kunde.filter({ org_id: event.org_id }),
    enabled: !!event?.org_id,
  });

  const { data: eventMusiker = [] } = useQuery({
    queryKey: ['eventMusiker', eventId],
    queryFn: () => base44.entities.EventMusiker.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const updateEventMutation = useMutation({
    mutationFn: async (eventData) => {
      console.log("Aktualisiere Event:", eventData);
      return await base44.entities.Event.update(eventId, eventData);
    },
    onSuccess: (data) => {
      console.log("Event erfolgreich aktualisiert:", data);
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error("Fehler beim Aktualisieren:", error);
      alert("Fehler beim Aktualisieren des Events: " + (error.message || "Unbekannter Fehler"));
    }
  });

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Event...</p>
      </div>
    );
  }

  const statusColors = {
    entwurf: { bg: "bg-gray-100", text: "text-gray-800", label: "Entwurf" },
    angefragt: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Wartet auf Musiker" },
    bestätigt: { bg: "bg-green-100", text: "text-green-800", label: "Bestätigt" },
    durchgeführt: { bg: "bg-blue-100", text: "text-blue-800", label: "Durchgeführt" },
    abgerechnet: { bg: "bg-purple-100", text: "text-purple-800", label: "Abgerechnet" },
    storniert: { bg: "bg-red-100", text: "text-red-800", label: "Storniert" }
  };

  const statusInfo = statusColors[event.status] || statusColors.entwurf;

  const handleAddToCalendar = () => {
    const startDate = new Date(event.datum_von);
    const endDate = new Date(event.datum_bis);
    
    const formatDateForCalendar = (date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, '');
    };

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.titel)}&dates=${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}&details=${encodeURIComponent(event.oeffentliche_notizen || '')}&location=${encodeURIComponent(event.ort_adresse || event.ort_name || '')}`;
    
    window.open(calendarUrl, '_blank');
  };

  const handleContactCustomer = () => {
    if (kunde?.email) {
      window.location.href = `mailto:${kunde.email}?subject=${encodeURIComponent('Event: ' + event.titel)}`;
    }
  };

  const openInMaps = () => {
    const address = event.ort_adresse || event.ort_name;
    if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const handleUpdateSubmit = (data) => {
    updateEventMutation.mutate(data);
  };

  // Wenn im Bearbeitungsmodus, zeige das Formular
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="gap-2 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Übersicht
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Event bearbeiten</h1>
            <p className="text-gray-600">{event.titel}</p>
          </div>
          <EventForm
            event={event}
            onSubmit={handleUpdateSubmit}
            onCancel={() => setIsEditing(false)}
            kunden={kunden}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          {/* Back Button & Status */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl('Events'))}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            <Badge className={`${statusInfo.bg} ${statusInfo.text} border-none`}>
              {statusInfo.label}
            </Badge>
          </div>

          {/* Title & Actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{event.titel}</h1>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddToCalendar}
                className="gap-2"
              >
                <Calendar className="w-4 h-4" />
                Zu Google Kalender
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                <Edit className="w-4 h-4" />
                Event bearbeiten
              </Button>
              {kunde && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleContactCustomer}
                  className="gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Kunde kontaktieren
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="musiker">Musiker</TabsTrigger>
            <TabsTrigger value="bandbuilder">Band Builder</TabsTrigger>
            <TabsTrigger value="aufgaben">Aufgaben</TabsTrigger>
            <TabsTrigger value="finanzen">Finanzen</TabsTrigger>
            <TabsTrigger value="verwaltung">Verwaltung</TabsTrigger>
          </TabsList>

          {/* Übersicht Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Details Card */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-xl">Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Datum */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Datum</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {format(new Date(event.datum_von), 'dd. MMMM yyyy', { locale: de })}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {format(new Date(event.datum_von), 'HH:mm')} - {format(new Date(event.datum_bis), 'HH:mm')} Uhr
                      </div>
                    </div>
                  </div>

                  {/* Veranstaltungsort */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Veranstaltungsort</p>
                      <p className="text-lg font-semibold text-gray-900">{event.ort_name || 'Nicht angegeben'}</p>
                      {event.ort_adresse && (
                        <p className="text-sm text-gray-600 mt-1">{event.ort_adresse}</p>
                      )}
                    </div>
                  </div>

                  {/* Kunde */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Kunde</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {kunde ? kunde.firmenname : 'Kein Kunde verknüpft'}
                      </p>
                      {kunde?.ansprechpartner && (
                        <p className="text-sm text-gray-600 mt-1">{kunde.ansprechpartner}</p>
                      )}
                    </div>
                  </div>

                  {/* Event-Typ */}
                  {event.event_typ && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <UsersIcon className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Event-Typ</p>
                        <p className="text-lg font-semibold text-gray-900">{event.event_typ}</p>
                        {event.anzahl_gaeste && (
                          <p className="text-sm text-gray-600 mt-1">{event.anzahl_gaeste} Gäste erwartet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Zusätzliche Infos */}
                {(event.get_in_zeit || event.soundcheck_zeit || event.dresscode) && (
                  <div className="mt-8 pt-6 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Weitere Informationen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {event.get_in_zeit && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Get-In Zeit</p>
                          <p className="text-sm font-medium text-gray-900">{event.get_in_zeit} Uhr</p>
                        </div>
                      )}
                      {event.soundcheck_zeit && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Soundcheck</p>
                          <p className="text-sm font-medium text-gray-900">{event.soundcheck_zeit} Uhr</p>
                        </div>
                      )}
                      {event.dresscode && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Dresscode</p>
                          <p className="text-sm font-medium text-gray-900">{event.dresscode}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Event Location Card */}
            {(event.ort_name || event.ort_adresse) && (
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-gray-700" />
                      <CardTitle className="text-xl">Event Location</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openInMaps}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      In Maps öffnen
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-700 mb-4">{event.ort_adresse || event.ort_name}</p>
                  
                  {/* Map Placeholder */}
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-12 text-center">
                    <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 font-medium mb-2">{event.ort_adresse || event.ort_name}</p>
                    <button
                      onClick={openInMaps}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      View on Google Maps
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notizen */}
            {(event.oeffentliche_notizen || event.interne_notizen) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {event.oeffentliche_notizen && (
                  <Card className="border-none shadow-lg">
                    <CardHeader className="border-b">
                      <CardTitle className="text-lg">Öffentliche Notizen</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-gray-700 whitespace-pre-wrap">{event.oeffentliche_notizen}</p>
                    </CardContent>
                  </Card>
                )}
                {event.interne_notizen && (
                  <Card className="border-none shadow-lg">
                    <CardHeader className="border-b">
                      <CardTitle className="text-lg">Interne Notizen</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-gray-700 whitespace-pre-wrap">{event.interne_notizen}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Platzhalter für andere Tabs */}
          <TabsContent value="musiker">
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Musiker-Verwaltung</h3>
                <p className="text-gray-500">Diese Funktion wird in Kürze verfügbar sein</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bandbuilder">
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Band Builder</h3>
                <p className="text-gray-500">Diese Funktion wird in Kürze verfügbar sein</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aufgaben">
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Aufgaben</h3>
                <p className="text-gray-500">Diese Funktion wird in Kürze verfügbar sein</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finanzen">
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Finanzen</h3>
                <p className="text-gray-500">Diese Funktion wird in Kürze verfügbar sein</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verwaltung">
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Verwaltung</h3>
                <p className="text-gray-500">Diese Funktion wird in Kürze verfügbar sein</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
