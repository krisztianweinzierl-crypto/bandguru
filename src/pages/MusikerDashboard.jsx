import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  MapPin,
  Euro,
  AlertCircle,
  FileText,
  Music
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function MusikerDashboard() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMusiker, setCurrentMusiker] = useState(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [selectedEventMusiker, setSelectedEventMusiker] = useState(null);
  const [responseType, setResponseType] = useState(null);
  const [bedingungen Akzeptiert, setBedingungAccepted] = useState(false);
  const [ablehnungsgrund, setAblehnungsgrund] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const orgId = localStorage.getItem('currentOrgId');
      setCurrentOrgId(orgId);
      
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Finde Musiker-Profil basierend auf User
      const musikerList = await base44.entities.Musiker.filter({ 
        org_id: orgId,
        email: user.email
      });
      if (musikerList.length > 0) {
        setCurrentMusiker(musikerList[0]);
      }
    };
    loadUser();
  }, []);

  const { data: eventMusiker = [] } = useQuery({
    queryKey: ['eventMusiker', currentMusiker?.id],
    queryFn: () => base44.entities.EventMusiker.filter({ musiker_id: currentMusiker.id }),
    enabled: !!currentMusiker?.id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', eventMusiker],
    queryFn: async () => {
      const eventIds = [...new Set(eventMusiker.map(em => em.event_id))];
      const eventsPromises = eventIds.map(id => 
        base44.entities.Event.filter({ id }).then(res => res[0])
      );
      return await Promise.all(eventsPromises);
    },
    enabled: eventMusiker.length > 0,
  });

  const updateEventMusikerMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.EventMusiker.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventMusiker'] });
      setShowResponseDialog(false);
      setSelectedEventMusiker(null);
      setResponseType(null);
      setBedingungAccepted(false);
      setAblehnungsgrund("");
    },
  });

  const offeneAnfragen = eventMusiker.filter(em => em.status === 'angefragt');
  const optionaleAnfragen = eventMusiker.filter(em => em.status === 'optional');
  const bestaetigteEvents = eventMusiker.filter(em => em.status === 'zugesagt');

  const handleOpenResponseDialog = (em, type) => {
    setSelectedEventMusiker(em);
    setResponseType(type);
    setShowResponseDialog(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedEventMusiker) return;

    const updateData = {
      status: responseType,
      antwort_datum: new Date().toISOString(),
    };

    if (responseType === 'zugesagt') {
      if (selectedEventMusiker.buchungsbedingungen && !bedingungAccepted) {
        alert("Bitte akzeptiere die Buchungsbedingungen");
        return;
      }
      updateData.buchungsbedingungen_akzeptiert = true;
    }

    if (responseType === 'abgelehnt' && ablehnungsgrund) {
      updateData.ablehnungsgrund = ablehnungsgrund;
    }

    updateEventMusikerMutation.mutate({
      id: selectedEventMusiker.id,
      data: updateData
    });
  };

  const getEventForEventMusiker = (em) => {
    return events.find(e => e.id === em.event_id);
  };

  const statusColors = {
    angefragt: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-400" },
    optional: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-400" },
    zugesagt: { bg: "bg-green-100", text: "text-green-800", border: "border-green-400" },
    abgelehnt: { bg: "bg-red-100", text: "text-red-800", border: "border-red-400" }
  };

  const AnfrageCard = ({ em, event }) => {
    if (!event) return null;

    const statusStyle = statusColors[em.status] || statusColors.angefragt;

    return (
      <Card className={`border-l-4 ${statusStyle.border} hover:shadow-lg transition-all`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <CardTitle className="text-lg mb-1">{event.titel}</CardTitle>
              <Badge className={`${statusStyle.bg} ${statusStyle.text}`}>
                {em.status === 'angefragt' && '⏳ Offen'}
                {em.status === 'optional' && '❓ Optional'}
                {em.status === 'zugesagt' && '✅ Zugesagt'}
                {em.status === 'abgelehnt' && '❌ Abgelehnt'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(event.datum_von), 'dd. MMMM yyyy', { locale: de })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(event.datum_von), 'HH:mm', { locale: de })} Uhr</span>
            </div>
            {event.ort_name && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{event.ort_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Music className="w-4 h-4" />
              <span className="font-medium">{em.rolle}</span>
            </div>
            {em.gage_netto && (
              <div className="flex items-center gap-2 text-gray-600">
                <Euro className="w-4 h-4" />
                <span className="font-medium">€{em.gage_netto.toFixed(2)}</span>
              </div>
            )}
          </div>

          {em.notizen && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">{em.notizen}</p>
            </div>
          )}

          {em.buchungsbedingungen && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-1">Buchungsbedingungen:</p>
                  <p className="text-sm text-amber-700">{em.buchungsbedingungen}</p>
                </div>
              </div>
            </div>
          )}

          {em.status === 'angefragt' && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => handleOpenResponseDialog(em, 'zugesagt')}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Zusagen
              </Button>
              <Button
                onClick={() => handleOpenResponseDialog(em, 'optional')}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Optional
              </Button>
              <Button
                onClick={() => handleOpenResponseDialog(em, 'abgelehnt')}
                variant="outline"
                className="flex-1 text-red-600 hover:text-red-700 hover:border-red-600"
                size="sm"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Ablehnen
              </Button>
            </div>
          )}

          {em.status === 'optional' && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => handleOpenResponseDialog(em, 'zugesagt')}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Zusagen
              </Button>
              <Button
                onClick={() => handleOpenResponseDialog(em, 'abgelehnt')}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Ablehnen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Willkommen zurück{currentMusiker ? `, ${currentMusiker.name}` : ''}! 🎵
          </h1>
          <p className="text-gray-600">Deine Buchungsanfragen und Events im Überblick</p>
        </div>

        {/* Statistik-Kacheln */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Offene Anfragen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-4xl font-bold text-orange-600">{offeneAnfragen.length}</p>
                <AlertCircle className="w-12 h-12 text-orange-300" />
              </div>
              <p className="text-sm text-gray-500 mt-2">Warten auf deine Antwort</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Optional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-4xl font-bold text-blue-600">{optionaleAnfragen.length}</p>
                <HelpCircle className="w-12 h-12 text-blue-300" />
              </div>
              <p className="text-sm text-gray-500 mt-2">Noch nicht festgelegt</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Bestätigt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-4xl font-bold text-green-600">{bestaetigteEvents.length}</p>
                <CheckCircle2 className="w-12 h-12 text-green-300" />
              </div>
              <p className="text-sm text-gray-500 mt-2">Zugesagte Events</p>
            </CardContent>
          </Card>
        </div>

        {/* Offene Anfragen */}
        {offeneAnfragen.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Offene Buchungsanfragen ({offeneAnfragen.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offeneAnfragen.map(em => (
                <AnfrageCard key={em.id} em={em} event={getEventForEventMusiker(em)} />
              ))}
            </div>
          </div>
        )}

        {/* Optionale Anfragen */}
        {optionaleAnfragen.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Optionale Anfragen ({optionaleAnfragen.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {optionaleAnfragen.map(em => (
                <AnfrageCard key={em.id} em={em} event={getEventForEventMusiker(em)} />
              ))}
            </div>
          </div>
        )}

        {/* Bestätigte Events */}
        {bestaetigteEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Bestätigte Events ({bestaetigteEvents.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bestaetigteEvents.map(em => (
                <AnfrageCard key={em.id} em={em} event={getEventForEventMusiker(em)} />
              ))}
            </div>
          </div>
        )}

        {/* Keine Anfragen */}
        {offeneAnfragen.length === 0 && optionaleAnfragen.length === 0 && bestaetigteEvents.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Music className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Buchungsanfragen</h3>
              <p className="text-gray-500">Du hast aktuell keine offenen oder bestätigten Buchungsanfragen</p>
            </CardContent>
          </Card>
        )}

        {/* Response Dialog */}
        <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {responseType === 'zugesagt' && '✅ Anfrage zusagen'}
                {responseType === 'optional' && '❓ Als optional markieren'}
                {responseType === 'abgelehnt' && '❌ Anfrage ablehnen'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {selectedEventMusiker && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <p className="font-semibold">
                    {getEventForEventMusiker(selectedEventMusiker)?.titel}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedEventMusiker.rolle} • €{selectedEventMusiker.gage_netto?.toFixed(2)}
                  </p>
                </div>
              )}

              {responseType === 'zugesagt' && selectedEventMusiker?.buchungsbedingungen && (
                <div className="space-y-3">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="font-semibold text-sm text-amber-900 mb-2">Buchungsbedingungen:</p>
                    <p className="text-sm text-amber-800 whitespace-pre-wrap">
                      {selectedEventMusiker.buchungsbedingungen}
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id="accept-terms"
                      checked={bedingungAccepted}
                      onCheckedChange={setBedingungAccepted}
                      className="mt-0.5"
                    />
                    <label htmlFor="accept-terms" className="text-sm cursor-pointer">
                      Ich akzeptiere die Buchungsbedingungen und verpflichte mich, bei diesem Event zu spielen.
                    </label>
                  </div>
                </div>
              )}

              {responseType === 'optional' && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Du markierst diese Anfrage als "optional". Das bedeutet, dass du noch nicht sicher zusagen kannst, aber grundsätzlich verfügbar bist.
                  </p>
                </div>
              )}

              {responseType === 'abgelehnt' && (
                <div className="space-y-2">
                  <Label htmlFor="grund">Grund für Ablehnung (optional)</Label>
                  <Textarea
                    id="grund"
                    value={ablehnungsgrund}
                    onChange={(e) => setAblehnungsgrund(e.target.value)}
                    placeholder="z.B. Bereits anderweitig gebucht, zu weite Anreise..."
                    rows={3}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowResponseDialog(false);
                  setBedingungAccepted(false);
                  setAblehnungsgrund("");
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSubmitResponse}
                disabled={updateEventMusikerMutation.isPending}
                className={
                  responseType === 'zugesagt' ? 'bg-green-600 hover:bg-green-700' :
                  responseType === 'optional' ? 'bg-blue-600 hover:bg-blue-700' :
                  'bg-red-600 hover:bg-red-700'
                }
              >
                {responseType === 'zugesagt' && 'Zusagen'}
                {responseType === 'optional' && 'Als optional markieren'}
                {responseType === 'abgelehnt' && 'Ablehnen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}