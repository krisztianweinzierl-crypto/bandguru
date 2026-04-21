import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Euro,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  AlertCircle,
  Calendar,
  Receipt,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck,
  Plus,
  ArrowRight,
  CheckCircle,
  DollarSign,
  Clock } from
"lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function FinanzenPage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [timeRange, setTimeRange] = useState("month"); // month, quarter, year

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: rechnungen = [] } = useQuery({
    queryKey: ['rechnungen', currentOrgId],
    queryFn: () => base44.entities.Rechnung.filter({ org_id: currentOrgId }, '-rechnungsdatum'),
    enabled: !!currentOrgId
  });

  const { data: angebote = [] } = useQuery({
    queryKey: ['angebote', currentOrgId],
    queryFn: () => base44.entities.Angebot.filter({ org_id: currentOrgId }, '-angebotsdatum'),
    enabled: !!currentOrgId
  });

  const { data: ausgaben = [] } = useQuery({
    queryKey: ['ausgaben', currentOrgId],
    queryFn: () => base44.entities.Ausgabe.filter({ org_id: currentOrgId }, '-datum'),
    enabled: !!currentOrgId
  });

  const { data: zahlungen = [] } = useQuery({
    queryKey: ['zahlungen', currentOrgId],
    queryFn: () => base44.entities.Zahlung.filter({ org_id: currentOrgId }, '-zahlungsdatum'),
    enabled: !!currentOrgId
  });

  const { data: kunden = [] } = useQuery({
    queryKey: ['kunden', currentOrgId],
    queryFn: () => base44.entities.Kunde.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId
  });

  const { data: eventMusiker = [] } = useQuery({
    queryKey: ['eventMusiker', currentOrgId],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ org_id: currentOrgId });
      const eventIds = events.map(e => e.id);
      if (eventIds.length === 0) return [];
      
      const allEventMusiker = await Promise.all(
        eventIds.map(id => base44.entities.EventMusiker.filter({ event_id: id, status: 'zugesagt' }))
      );
      return allEventMusiker.flat();
    },
    enabled: !!currentOrgId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', currentOrgId],
    queryFn: () => base44.entities.Event.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const { data: musiker = [] } = useQuery({
    queryKey: ['musiker', currentOrgId],
    queryFn: () => base44.entities.Musiker.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  // Berechnungen
  const gesamtEinnahmen = rechnungen.
  filter((r) => r.status === 'bezahlt').
  reduce((sum, r) => sum + (r.brutto_betrag || 0), 0);

  const offeneRechnungen = rechnungen.
  filter((r) => ['versendet', 'teilweise_bezahlt', 'überfällig'].includes(r.status)).
  reduce((sum, r) => sum + ((r.brutto_betrag || 0) - (r.bezahlt_betrag || 0)), 0);

  // Musiker-Kosten aus Events berechnen (Gagen + Fahrtkosten + weitere Kosten)
  const musikerKosten = eventMusiker.reduce((sum, em) => {
    const weitereKosten = (em.weitere_kosten || []).reduce((s, k) => s + (k.betrag || 0), 0);
    return sum + (em.gage_netto || 0) + (em.spesen || 0) + weitereKosten;
  }, 0);

  const gesamtAusgaben = ausgaben.
  filter((a) => a.status === 'bezahlt').
  reduce((sum, a) => sum + (a.betrag || 0), 0) + musikerKosten;

  const gewinn = gesamtEinnahmen - gesamtAusgaben;

  const ueberfaelligeRechnungen = rechnungen.filter((r) =>
  r.status === 'überfällig' ||
  r.status === 'versendet' && new Date(r.faelligkeitsdatum) < new Date()
  ).length;

  const offeneAngebote = angebote.length;
  const angenommeneAngebote = angebote.filter((a) => a.status === 'angenommen').length;

  const statusColors = {
    entwurf: "bg-gray-100 text-gray-800",
    versendet: "bg-blue-100 text-blue-800",
    teilweise_bezahlt: "bg-yellow-100 text-yellow-800",
    bezahlt: "bg-green-100 text-green-800",
    überfällig: "bg-red-100 text-red-800",
    storniert: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-3 md:p-8 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Finanzen</h1>
            <p className="text-gray-600">Übersicht über Einnahmen, Ausgaben und Rechnungen</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("Rechnungen")}>
              <Button className="bg-[#223a5e] text-white px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-slate-900">
                <FileText className="w-4 h-4 mr-2" />
                Rechnungen
              </Button>
            </Link>
            <Link to={createPageUrl("Ausgaben")}>
              <Button
                variant="outline"
                style={{
                  borderColor: '#8D99AE',
                  color: '#8D99AE'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(141, 153, 174, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>

                <Receipt className="w-4 h-4 mr-2" />
                Ausgaben
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 mb-6 md:mb-8">
          {/* Gesamteinnahmen */}
          <Card className="relative overflow-hidden border-none shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 rounded-full opacity-10 transform translate-x-8 -translate-y-8" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">Gesamteinnahmen</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {gesamtEinnahmen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <ArrowUpRight className="w-4 h-4" />
                <span>Bezahlte Rechnungen</span>
              </div>
            </CardContent>
          </Card>

          {/* Gesamtausgaben */}
          <Card className="relative overflow-hidden border-none shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full opacity-10 transform translate-x-8 -translate-y-8" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">Gesamtausgaben</CardTitle>
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {gesamtAusgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-red-600">
                <ArrowDownRight className="w-4 h-4" />
                <span>Alle Ausgaben</span>
              </div>
            </CardContent>
          </Card>

          {/* Gewinn/Verlust */}
          <Card className="relative overflow-hidden border-none shadow-lg">
            <div className={`absolute top-0 right-0 w-32 h-32 ${gewinn >= 0 ? 'bg-blue-500' : 'bg-orange-500'} rounded-full opacity-10 transform translate-x-8 -translate-y-8`} />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">Gewinn/Verlust</CardTitle>
                <div className={`p-2 ${gewinn >= 0 ? 'bg-blue-100' : 'bg-orange-100'} rounded-lg`}>
                  <Euro className={`w-5 h-5 ${gewinn >= 0 ? 'text-blue-600' : 'text-orange-600'}`} /> {/* Changed from DollarSign to Euro */}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${gewinn >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {gewinn.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {(gewinn / gesamtEinnahmen * 100 || 0).toFixed(1)}% Gewinnmarge
              </p>
            </CardContent>
          </Card>

          {/* Offene Rechnungen */}
          <Card className="relative overflow-hidden border-none shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500 rounded-full opacity-10 transform translate-x-8 -translate-y-8" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">Offene Forderungen</CardTitle>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {offeneRechnungen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
              {ueberfaelligeRechnungen > 0 &&
              <div className="flex items-center gap-1 mt-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{ueberfaelligeRechnungen} überfällig</span>
                </div>
              }
            </CardContent>
          </Card>

          {/* Angebote */}
          <Card className="relative overflow-hidden border-none shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full opacity-10 transform translate-x-8 -translate-y-8" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">Angebote</CardTitle>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <FileCheck className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{offeneAngebote}</p>
              <p className="text-sm text-gray-500 mt-2">
                {angenommeneAngebote} angenommen
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="uebersicht" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
            <TabsTrigger value="berichte">Berichte</TabsTrigger>
          </TabsList>



          {/* Übersicht Tab */}
          <TabsContent value="uebersicht" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Letzte Rechnungen */}
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle>Aktuelle Rechnungen</CardTitle>
                    <Link to={createPageUrl("Rechnungen")}>
                      <Button variant="ghost" size="sm">Alle anzeigen</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {rechnungen.slice(0, 5).map((rechnung) =>
                  <div key={rechnung.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{rechnung.rechnungsnummer}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(rechnung.rechnungsdatum), 'dd. MMM yyyy', { locale: de })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">
                          {(rechnung.brutto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </p>
                        <Badge className={statusColors[rechnung.status]}>
                          {rechnung.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Letzte Ausgaben */}
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle>Aktuelle Ausgaben</CardTitle>
                    <Link to={createPageUrl("Ausgaben")}>
                      <Button variant="ghost" size="sm">Alle anzeigen</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Musiker-Kosten pro Event */}
                  {events
                    .filter(event => {
                      const kosten = eventMusiker
                        .filter(em => em.event_id === event.id)
                        .reduce((sum, em) => {
                          const weitereKosten = (em.weitere_kosten || []).reduce((s, k) => s + (k.betrag || 0), 0);
                          return sum + (em.gage_netto || 0) + (em.spesen || 0) + weitereKosten;
                        }, 0);
                      return kosten > 0;
                    })
                    .slice(0, 3)
                    .map((event) => {
                      const kosten = eventMusiker
                        .filter(em => em.event_id === event.id)
                        .reduce((sum, em) => {
                          const weitereKosten = (em.weitere_kosten || []).reduce((s, k) => s + (k.betrag || 0), 0);
                          return sum + (em.gage_netto || 0) + (em.spesen || 0) + weitereKosten;
                        }, 0);
                      
                      return (
                        <div key={event.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Musiker-Kosten: {event.titel}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">gage</Badge>
                              <span className="text-sm text-gray-500">
                                {format(new Date(event.datum_von), 'dd. MMM yyyy', { locale: de })}
                              </span>
                            </div>
                          </div>
                          <p className="font-semibold text-red-600">
                            -{kosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </p>
                        </div>
                      );
                    })
                  }
                  
                  {/* Sonstige Ausgaben */}
                  {ausgaben.slice(0, 5).map((ausgabe) =>
                  <div key={ausgabe.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{ausgabe.titel}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {ausgabe.kategorie}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {format(new Date(ausgabe.datum), 'dd. MMM yyyy', { locale: de })}
                          </span>
                        </div>
                      </div>
                      <p className="font-semibold text-red-600">
                        -{(ausgabe.betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Berichte Tab */}
          <TabsContent value="berichte" className="space-y-6">
            {/* Monatsvergleich */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Einnahmen vs. Ausgaben (letzten 12 Monate)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(() => {
                      const now = new Date();
                      const months = [];
                      
                      for (let i = 11; i >= 0; i--) {
                        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const monthKey = format(month, 'yyyy-MM');
                        
                        const monthRechnungen = rechnungen.filter(r => 
                          r.rechnungsdatum && r.rechnungsdatum.startsWith(monthKey) && r.status === 'bezahlt'
                        );
                        const monthAusgaben = ausgaben.filter(a => 
                          a.datum && a.datum.startsWith(monthKey)
                        );
                        
                        // Musiker-Kosten für den Monat
                        const monthEvents = events.filter(e => 
                          e.datum_von && e.datum_von.startsWith(monthKey)
                        );
                        const monthMusikerKosten = eventMusiker
                          .filter(em => monthEvents.some(e => e.id === em.event_id))
                          .reduce((sum, em) => {
                            const weitereKosten = (em.weitere_kosten || []).reduce((s, k) => s + (k.betrag || 0), 0);
                            return sum + (em.gage_netto || 0) + (em.spesen || 0) + weitereKosten;
                          }, 0);
                        
                        months.push({
                          name: format(month, 'MMM yy', { locale: de }),
                          Einnahmen: monthRechnungen.reduce((sum, r) => sum + (r.brutto_betrag || 0), 0),
                          Ausgaben: monthAusgaben.reduce((sum, a) => sum + (a.betrag || 0), 0) + monthMusikerKosten
                        });
                      }
                      
                      return months;
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      />
                      <Legend />
                      <Bar dataKey="Einnahmen" fill="#10b981" />
                      <Bar dataKey="Ausgaben" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Ausgaben nach Kategorien */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Ausgaben nach Kategorien</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const kategorien = {};
                          ausgaben.forEach(a => {
                            const kat = a.kategorie || 'sonstiges';
                            kategorien[kat] = (kategorien[kat] || 0) + (a.betrag || 0);
                          });
                          
                          // Musiker-Kosten hinzufügen
                          if (musikerKosten > 0) {
                            kategorien['gage'] = (kategorien['gage'] || 0) + musikerKosten;
                          }
                          
                          return Object.entries(kategorien).map(([name, value]) => ({
                            name: name.charAt(0).toUpperCase() + name.slice(1),
                            value
                          }));
                        })()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(() => {
                          const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
                          const kategorien = {};
                          ausgaben.forEach(a => {
                            const kat = a.kategorie || 'sonstiges';
                            kategorien[kat] = (kategorien[kat] || 0) + (a.betrag || 0);
                          });
                          
                          // Musiker-Kosten hinzufügen
                          if (musikerKosten > 0) {
                            kategorien['gage'] = (kategorien['gage'] || 0) + musikerKosten;
                          }
                          
                          return Object.keys(kategorien).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ));
                        })()}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Kunden */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Top 5 Kunden nach Umsatz</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const kundenUmsatz = {};
                    
                    rechnungen.filter(r => r.status === 'bezahlt').forEach(r => {
                      const kunde = kunden.find(k => k.id === r.kunde_id);
                      const kundenName = kunde?.firmenname || 'Unbekannt';
                      kundenUmsatz[kundenName] = (kundenUmsatz[kundenName] || 0) + (r.brutto_betrag || 0);
                    });
                    
                    return Object.entries(kundenUmsatz)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([name, umsatz], index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                            </div>
                            <span className="font-medium">{name}</span>
                          </div>
                          <span className="text-lg font-bold text-gray-900">
                            {umsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                      ));
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Zahlungsmoral */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Rechnungsstatus</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Bezahlt</span>
                      <span className="font-bold text-green-600">
                        {rechnungen.filter(r => r.status === 'bezahlt').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Versendet</span>
                      <span className="font-bold text-blue-600">
                        {rechnungen.filter(r => r.status === 'versendet').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Überfällig</span>
                      <span className="font-bold text-red-600">
                        {ueberfaelligeRechnungen}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Entwurf</span>
                      <span className="font-bold text-gray-600">
                        {rechnungen.filter(r => r.status === 'entwurf').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Angebotsstatus</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Angenommen</span>
                      <span className="font-bold text-green-600">
                        {angebote.filter(a => a.status === 'angenommen').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Versendet</span>
                      <span className="font-bold text-blue-600">
                        {angebote.filter(a => a.status === 'versendet').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Abgelehnt</span>
                      <span className="font-bold text-red-600">
                        {angebote.filter(a => a.status === 'abgelehnt').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Entwurf</span>
                      <span className="font-bold text-gray-600">
                        {angebote.filter(a => a.status === 'entwurf').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>);

}