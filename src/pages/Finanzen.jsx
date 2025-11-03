
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Euro, // Changed from DollarSign to Euro
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  AlertCircle,
  Calendar,
  Receipt,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function FinanzenPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [timeRange, setTimeRange] = useState("month"); // month, quarter, year

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: rechnungen = [] } = useQuery({
    queryKey: ['rechnungen', currentOrgId],
    queryFn: () => base44.entities.Rechnung.filter({ org_id: currentOrgId }, '-rechnungsdatum'),
    enabled: !!currentOrgId,
  });

  const { data: ausgaben = [] } = useQuery({
    queryKey: ['ausgaben', currentOrgId],
    queryFn: () => base44.entities.Ausgabe.filter({ org_id: currentOrgId }, '-datum'),
    enabled: !!currentOrgId,
  });

  const { data: zahlungen = [] } = useQuery({
    queryKey: ['zahlungen', currentOrgId],
    queryFn: () => base44.entities.Zahlung.filter({ org_id: currentOrgId }, '-zahlungsdatum'),
    enabled: !!currentOrgId,
  });

  // Berechnungen
  const gesamtEinnahmen = rechnungen
    .filter(r => r.status === 'bezahlt')
    .reduce((sum, r) => sum + (r.brutto_betrag || 0), 0);

  const offeneRechnungen = rechnungen
    .filter(r => ['versendet', 'teilweise_bezahlt', 'überfällig'].includes(r.status))
    .reduce((sum, r) => sum + ((r.brutto_betrag || 0) - (r.bezahlt_betrag || 0)), 0);

  const gesamtAusgaben = ausgaben
    .filter(a => a.status === 'bezahlt')
    .reduce((sum, a => sum + (a.betrag || 0), 0);

  const gewinn = gesamtEinnahmen - gesamtAusgaben;

  const ueberfaelligeRechnungen = rechnungen.filter(r => 
    r.status === 'überfällig' || 
    (r.status === 'versendet' && new Date(r.faelligkeitsdatum) < new Date())
  ).length;

  const statusColors = {
    entwurf: "bg-gray-100 text-gray-800",
    versendet: "bg-blue-100 text-blue-800",
    teilweise_bezahlt: "bg-yellow-100 text-yellow-800",
    bezahlt: "bg-green-100 text-green-800",
    überfällig: "bg-red-100 text-red-800",
    storniert: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Finanzen</h1>
            <p className="text-gray-600">Übersicht über Einnahmen, Ausgaben und Rechnungen</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("Rechnungen")}>
              <Button className="bg-slate-800 hover:bg-slate-900 text-white">
                <FileText className="w-4 h-4 mr-2" />
                Rechnungen
              </Button>
            </Link>
            <Link to={createPageUrl("Ausgaben")}>
              <Button 
                variant="outline"
                style={{ 
                  borderColor: '#E4C590', 
                  color: '#E4C590' 
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(228, 197, 144, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Ausgaben
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                {((gewinn / gesamtEinnahmen) * 100 || 0).toFixed(1)}% Gewinnmarge
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
              {ueberfaelligeRechnungen > 0 && (
                <div className="flex items-center gap-1 mt-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{ueberfaelligeRechnungen} überfällig</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="uebersicht" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
            <TabsTrigger value="rechnungen">Rechnungen</TabsTrigger>
            <TabsTrigger value="ausgaben">Ausgaben</TabsTrigger>
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
                  {rechnungen.slice(0, 5).map((rechnung) => (
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
                  ))}
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
                  {ausgaben.slice(0, 5).map((ausgabe) => (
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
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rechnungen Tab */}
          <TabsContent value="rechnungen">
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Rechnungsverwaltung</h3>
                <p className="text-gray-500 mb-4">
                  Erstelle und verwalte deine Rechnungen
                </p>
                <Link to={createPageUrl("Rechnungen")}>
                  <Button>Zu den Rechnungen</Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ausgaben Tab */}
          <TabsContent value="ausgaben">
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Ausgabenverwaltung</h3>
                <p className="text-gray-500 mb-4">
                  Verfolge alle deine Ausgaben und Kosten
                </p>
                <Link to={createPageUrl("Ausgaben")}>
                  <Button>Zu den Ausgaben</Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Berichte Tab */}
          <TabsContent value="berichte">
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Finanzberichte</h3>
                <p className="text-gray-500 mb-4">
                  Detaillierte Berichte und Analysen werden hier verfügbar sein
                </p>
                <Button disabled>Bald verfügbar</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
