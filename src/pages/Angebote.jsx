import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, FileCheck, Send, Eye, MoreVertical, Search, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AngebotForm from "@/components/finanzen/AngebotForm";

export default function AngebotePage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const queryClient = useQueryClient();

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
    createAngebotMutation.mutate(data);
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
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
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
            <Button variant="outline" size="sm" className="flex-1">
              <Eye className="w-4 h-4 mr-2" />
              Ansehen
            </Button>
            {angebot.status === 'entwurf' && (
              <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
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
              onClick={() => setShowForm(true)}
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
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              kunden={kunden}
            />
          </div>
        )}

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
  );
}