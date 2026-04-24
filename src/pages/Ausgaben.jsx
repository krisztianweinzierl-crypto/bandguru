import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus,
  Receipt,
  Search,
  Filter,
  Upload,
  Download,
  TrendingDown,
  PieChart,
  ArrowLeft,
  LayoutGrid,
  List } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AusgabeForm from "@/components/finanzen/AusgabeForm";

export default function AusgabenPage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [kategorieFilter, setKategorieFilter] = useState("alle");
  const [viewMode, setViewMode] = useState("list"); // grid or list
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: ausgaben = [] } = useQuery({
    queryKey: ['ausgaben', currentOrgId],
    queryFn: () => base44.entities.Ausgabe.filter({ org_id: currentOrgId }, '-datum'),
    enabled: !!currentOrgId
  });

  const { data: eventMusiker = [] } = useQuery({
    queryKey: ['eventMusiker', currentOrgId],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ org_id: currentOrgId });
      const eventIds = events.map((e) => e.id);
      if (eventIds.length === 0) return [];

      const allEventMusiker = await Promise.all(
        eventIds.map((id) => base44.entities.EventMusiker.filter({ event_id: id, status: 'zugesagt' }))
      );
      return allEventMusiker.flat();
    },
    enabled: !!currentOrgId
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', currentOrgId],
    queryFn: () => base44.entities.Event.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId
  });

  const { data: musiker = [] } = useQuery({
    queryKey: ['musiker', currentOrgId],
    queryFn: () => base44.entities.Musiker.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId
  });

  const createAusgabeMutation = useMutation({
    mutationFn: (data) => base44.entities.Ausgabe.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ausgaben'] });
      setShowForm(false);
    }
  });

  // Musiker-Kosten aus Events als virtuelle Ausgaben erstellen
  const musikerAusgaben = events.map((event) => {
    const kosten = eventMusiker.
    filter((em) => em.event_id === event.id).
    reduce((sum, em) => {
      const weitereKosten = (em.weitere_kosten || []).reduce((s, k) => s + (k.betrag || 0), 0);
      return sum + (em.gage_netto || 0) + (em.spesen || 0) + weitereKosten;
    }, 0);

    if (kosten === 0) return null;

    return {
      id: `event-${event.id}`,
      titel: `Musiker-Kosten: ${event.titel}`,
      kategorie: 'gage',
      betrag: kosten,
      datum: event.datum_von,
      isEventKosten: true,
      event: event
    };
  }).filter(Boolean);

  const alleAusgaben = [...ausgaben, ...musikerAusgaben];

  const filteredAusgaben = alleAusgaben.filter((a) => {
    const matchesSearch = a.titel?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKategorie = kategorieFilter === "alle" || a.kategorie === kategorieFilter;
    return matchesSearch && matchesKategorie;
  }).sort((a, b) => new Date(b.datum) - new Date(a.datum));

  // Statistiken
  const gesamtAusgaben = filteredAusgaben.reduce((sum, a) => sum + (a.betrag || 0), 0);
  const ausgabenNachKategorie = filteredAusgaben.reduce((acc, a) => {
    acc[a.kategorie] = (acc[a.kategorie] || 0) + (a.betrag || 0);
    return acc;
  }, {});

  const kategorieColors = {
    gage: "bg-purple-100 text-purple-800 border-purple-200",
    reisekosten: "bg-blue-100 text-blue-800 border-blue-200",
    unterkunft: "bg-indigo-100 text-indigo-800 border-indigo-200",
    equipment: "bg-orange-100 text-orange-800 border-orange-200",
    marketing: "bg-pink-100 text-pink-800 border-pink-200",
    verwaltung: "bg-gray-100 text-gray-800 border-gray-200",
    steuern: "bg-red-100 text-red-800 border-red-200",
    versicherung: "bg-green-100 text-green-800 border-green-200",
    studio: "bg-yellow-100 text-yellow-800 border-yellow-200",
    software: "bg-cyan-100 text-cyan-800 border-cyan-200",
    sonstiges: "bg-slate-100 text-slate-800 border-slate-200"
  };

  const handleSubmit = (data) => {
    createAusgabeMutation.mutate(data);
  };

  const AusgabeCard = ({ ausgabe }) => {
    const handleClick = () => {
      if (ausgabe.isEventKosten && ausgabe.event) {
        navigate(`${createPageUrl('EventDetail')}?id=${ausgabe.event.id}&tab=finanzen`);
      }
    };

    return (
      <Card
        className={`hover:shadow-lg transition-all duration-200 ${ausgabe.isEventKosten ? 'border-l-4 border-l-purple-500 cursor-pointer hover:scale-[1.02]' : ''}`}
        onClick={handleClick}>
        
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 mb-1">{ausgabe.titel}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={kategorieColors[ausgabe.kategorie]}>
                  {ausgabe.kategorie}
                </Badge>
                {ausgabe.isEventKosten &&
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    Event
                  </Badge>
                }
                <span className="text-sm text-gray-500">
                  {format(new Date(ausgabe.datum), 'dd. MMM yyyy', { locale: de })}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">
                {(ausgabe.betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>

          {ausgabe.isEventKosten &&
          <p className="text-sm text-gray-600 mt-2">
              Gesamtkosten für Musiker bei diesem Event (inkl. Gagen, Fahrtkosten und weitere Kosten)
            </p>
          }

          {ausgabe.notizen && !ausgabe.isEventKosten &&
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{ausgabe.notizen}</p>
          }

          {ausgabe.zahlungsmethode &&
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-sm text-gray-500">Zahlungsmethode:</span>
              <span className="text-sm font-medium">{ausgabe.zahlungsmethode}</span>
            </div>
          }

          {ausgabe.beleg_url &&
          <Button variant="outline" size="sm" className="w-full mt-3">
              <Receipt className="w-4 h-4 mr-2" />
              Beleg anzeigen
            </Button>
          }
        </CardContent>
      </Card>);

  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-3 md:p-8 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl('Finanzen'))}
            className="gap-2 mb-4">
            
            <ArrowLeft className="w-4 h-4" />
            Zurück zu Finanzen
          </Button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Ausgaben</h1>
              <p className="text-gray-600">Verfolge alle deine Kosten und Ausgaben</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700">
              
              <Plus className="w-4 h-4 mr-2" />
              Neue Ausgabe
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Gesamtausgaben</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 text-sm font-bold md:text-3xl truncate">
                {gesamtAusgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
              <p className="text-sm text-gray-500 mt-1">{filteredAusgaben.length} Ausgaben</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Häufigste Kategorie</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(ausgabenNachKategorie).sort((a, b) => ausgabenNachKategorie[b] - ausgabenNachKategorie[a])[0] || '-'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {Object.keys(ausgabenNachKategorie).length} Kategorien
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Durchschnitt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 text-sm font-bold md:text-3xl truncate">
                {(gesamtAusgaben / filteredAusgaben.length || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
              <p className="text-sm text-gray-500 mt-1">Pro Ausgabe</p>
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
                  placeholder="Ausgaben durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10" />

              </div>
              <select
                value={kategorieFilter}
                onChange={(e) => setKategorieFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white">

                <option value="alle">Alle Kategorien</option>
                <option value="gage">Gage</option>
                <option value="reisekosten">Reisekosten</option>
                <option value="unterkunft">Unterkunft</option>
                <option value="equipment">Equipment</option>
                <option value="marketing">Marketing</option>
                <option value="verwaltung">Verwaltung</option>
                <option value="steuern">Steuern</option>
                <option value="versicherung">Versicherung</option>
                <option value="studio">Studio</option>
                <option value="software">Software</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}>
                  
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}>
                  
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {showForm &&
        <div className="mb-6">
            <AusgabeForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)} />

          </div>
        }

        {/* Ausgaben Grid/List */}
        {filteredAusgaben.length > 0 ?
        viewMode === "grid" ?
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAusgaben.map((ausgabe) =>
          <AusgabeCard key={ausgabe.id} ausgabe={ausgabe} />
          )}
            </div> :

        <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                {filteredAusgaben.map((ausgabe, index) =>
            <div
              key={ausgabe.id}
              className={`flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50 transition-colors ${ausgabe.isEventKosten ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (ausgabe.isEventKosten && ausgabe.event) {
                  navigate(`${createPageUrl('EventDetail')}?id=${ausgabe.event.id}&tab=finanzen`);
                }
              }}>
              
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{ausgabe.titel}</h3>
                        {ausgabe.isEventKosten &&
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            Event
                          </Badge>
                  }
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={kategorieColors[ausgabe.kategorie]}>
                          {ausgabe.kategorie}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(ausgabe.datum), 'dd. MMM yyyy', { locale: de })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-red-600">
                      {(ausgabe.betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>
            )}
              </CardContent>
            </Card> :



        <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Ausgaben gefunden</h3>
              <p className="text-gray-500 mb-4">Erfasse deine erste Ausgabe</p>
              <Button onClick={() => setShowForm(true)} className="bg-[#223a5e] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-9">
                <Plus className="w-4 h-4 mr-2" />
                Neue Ausgabe
              </Button>
            </CardContent>
          </Card>
        }
      </div>
    </div>);

}