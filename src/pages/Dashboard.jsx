import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Users, DollarSign, Target, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function Dashboard() {
  const [currentOrgId, setCurrentOrgId] = useState(null);

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: events = [] } = useQuery({
    queryKey: ['events', currentOrgId],
    queryFn: () => base44.entities.Event.filter({ org_id: currentOrgId }, '-datum_von', 10),
    enabled: !!currentOrgId
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben', currentOrgId],
    queryFn: () => base44.entities.Aufgabe.filter({
      org_id: currentOrgId,
      status: { $in: ['offen', 'in_arbeit'] }
    }),
    enabled: !!currentOrgId
  });

  const { data: musiker = [] } = useQuery({
    queryKey: ['musiker', currentOrgId],
    queryFn: () => base44.entities.Musiker.filter({ org_id: currentOrgId, aktiv: true }),
    enabled: !!currentOrgId
  });

  const naechsteEvents = events.filter((e) =>
  new Date(e.datum_von) > new Date() && e.status !== 'storniert'
  ).slice(0, 5);

  const offeneAufgaben = aufgaben.filter((a) => a.status === 'offen').length;
  const inArbeitAufgaben = aufgaben.filter((a) => a.status === 'in_arbeit').length;

  const statusColors = {
    anfrage: { className: "bg-gray-100 text-gray-800", label: "Anfrage" },
    angebot_erstellt: { className: "bg-blue-100 text-blue-800", label: "Angebot erstellt" },
    angebot_angenommen: { className: "bg-indigo-100 text-indigo-800", label: "Angebot angenommen" },
    wartet_auf_bestaetigung: { className: "bg-yellow-100 text-yellow-800", label: "Wartet auf Bestätigung" },
    angefragt: { className: "bg-orange-100 text-orange-800", label: "Wartet auf Musiker" },
    bestätigt: { className: "bg-green-100 text-green-800", label: "Bestätigt" },
    abgesagt: { className: "bg-red-100 text-red-800", label: "Abgesagt" },
    zurückgezogen: { className: "bg-slate-100 text-slate-800", label: "Zurückgezogen" },
    durchgeführt: { className: "bg-blue-100 text-blue-800", label: "Durchgeführt" },
    abgerechnet: { className: "bg-purple-100 text-purple-800", label: "Abgerechnet" }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 md:p-8 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Willkommen zurück! Hier ist deine Übersicht.</p>
        </div>

        {/* Statistik-Kacheln */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 transform translate-x-8 -translate-y-8" style={{ backgroundColor: '#223a5e' }} />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">Nächste Events</CardTitle>
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(34, 58, 94, 0.15)' }}>
                  <Calendar className="w-5 h-5" style={{ color: '#223a5e' }} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{naechsteEvents.length}</p>
              <p className="text-sm text-gray-500 mt-1">Events anstehend</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 rounded-full opacity-10 transform translate-x-8 -translate-y-8" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">Aktive Musiker</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{musiker.length}</p>
              <p className="text-sm text-gray-500 mt-1">Im Pool verfügbar</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full opacity-10 transform translate-x-8 -translate-y-8" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">Offene Aufgaben</CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{offeneAufgaben}</p>
              <p className="text-sm text-gray-500 mt-1">{inArbeitAufgaben} in Arbeit</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500 rounded-full opacity-10 transform translate-x-8 -translate-y-8" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">Alle Events</CardTitle>
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{events.length}</p>
              <p className="text-sm text-gray-500 mt-1">Gesamt</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Nächste Events */}
          <Card className="lg:col-span-2 border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold">Nächste Events</CardTitle>
                <Link to={createPageUrl("Events")}>
                  <Button variant="outline" size="sm">
                    Alle Events
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {naechsteEvents.length > 0 ?
              <div className="divide-y">
                  {naechsteEvents.map((event) =>
                <Link
                  key={event.id}
                  to={createPageUrl(`EventDetail?id=${event.id}`)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">

                      <div className="flex-shrink-0">
                        <div className="bg-[#223a5e] text-white rounded-xl w-14 h-14 from-blue-500 to-indigo-600 flex flex-col items-center justify-center">
                          <span className="text-xs font-medium">
                            {format(new Date(event.datum_von), 'MMM', { locale: de }).toUpperCase()}
                          </span>
                          <span className="text-xl font-bold">
                            {format(new Date(event.datum_von), 'd')}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-sm md:text-base">{event.titel}</h3>
                        <div className="flex items-center gap-1 mt-1 text-xs md:text-sm text-gray-500 truncate">
                          <Clock className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          {format(new Date(event.datum_von), 'HH:mm')} Uhr
                          {event.ort_name && <span className="truncate"> • {event.ort_name}</span>}
                        </div>
                      </div>
                      <Badge className={`text-xs flex-shrink-0 ${statusColors[event.status]?.className || "bg-gray-100 text-gray-800"}`}>
                        {statusColors[event.status]?.label || event.status}
                      </Badge>
                    </Link>
                )}
                </div> :

              <div className="p-8 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Keine anstehenden Events</p>
                  <Link to={createPageUrl("Events")}>
                    <Button variant="link" className="mt-2">
                      Event erstellen
                    </Button>
                  </Link>
                </div>
              }
            </CardContent>
          </Card>

          {/* Schnellaktionen */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="text-xl font-bold">Schnellaktionen</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Link to={createPageUrl("Events")}>
                <Button className="w-full justify-start text-white hover:opacity-90" style={{ backgroundColor: '#223a5e' }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Event erstellen
                </Button>
              </Link>
              <Link to={createPageUrl("Musiker")}>
                <Button variant="outline" className="w-full justify-start border-[#223a5e] text-[#223a5e] hover:bg-[#223a5e]/10">
                  <Users className="w-4 h-4 mr-2" />
                  Musiker hinzufügen
                </Button>
              </Link>
              <Link to={createPageUrl("Kunden")}>
                <Button variant="outline" className="w-full justify-start border-[#223a5e] text-[#223a5e] hover:bg-[#223a5e]/10">
                  <Target className="w-4 h-4 mr-2" />
                  Kunde anlegen
                </Button>
              </Link>
              <Link to={createPageUrl("Aufgaben")}>
                <Button variant="outline" className="w-full justify-start border-[#223a5e] text-[#223a5e] hover:bg-[#223a5e]/10">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aufgabe erstellen
                </Button>
              </Link>
            </CardContent>

            {/* Offene Aufgaben Preview */}
            {aufgaben.length > 0 &&
            <>
                <div className="border-t p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Offene Aufgaben</h3>
                  <div className="space-y-2">
                    {aufgaben.slice(0, 5).map((aufgabe) =>
                  <div key={aufgabe.id} className="flex items-start gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    aufgabe.prioritaet === 'hoch' ? 'bg-red-500' :
                    aufgabe.prioritaet === 'normal' ? 'bg-yellow-500' :
                    'bg-green-500'}`
                    } />
                        <p className="flex-1 text-gray-700">{aufgabe.titel}</p>
                      </div>
                  )}
                  </div>
                  <Link to={createPageUrl("Aufgaben")}>
                    <Button variant="link" className="w-full mt-2 text-sm">
                      Alle Aufgaben anzeigen
                    </Button>
                  </Link>
                </div>
              </>
            }
          </Card>
        </div>
      </div>
    </div>);

}