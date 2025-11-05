
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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
  CheckCircle } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import RechnungForm from "@/components/finanzen/RechnungForm";

export default function RechnungenPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

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
  r.status === 'versendet' && new Date(r.faelligkeitsdatum) < new Date()
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
    createRechnungMutation.mutate(data);
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
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
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
                {(rechnung.brutto_betrag || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
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
            <Button variant="outline" size="sm" className="flex-1">
              <Eye className="w-4 h-4 mr-2" />
              Ansehen
            </Button>
            {rechnung.status === 'entwurf' &&
            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" />
                Versenden
              </Button>
            }
            {rechnung.status !== 'entwurf' &&
            <Button variant="outline" size="sm" className="flex-1">
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
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
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {showForm &&
        <div className="mb-6">
            <RechnungForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            kunden={kunden} />

          </div>
        }

        {/* Rechnungen Grid */}
        {filteredRechnungen.length > 0 ?
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRechnungen.map((rechnung) =>
          <RechnungCard key={rechnung.id} rechnung={rechnung} />
          )}
          </div> :

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
