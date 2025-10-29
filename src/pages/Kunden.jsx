import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Building2, Mail, Phone, MapPin, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import KundenForm from "../components/kunden/KundenForm";

export default function KundenPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: kunden = [], isLoading } = useQuery({
    queryKey: ['kunden', currentOrgId],
    queryFn: () => base44.entities.Kunde.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const createKundeMutation = useMutation({
    mutationFn: (data) => base44.entities.Kunde.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kunden'] });
      setShowForm(false);
    },
  });

  const filteredKunden = kunden.filter(k => 
    k.firmenname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.ansprechpartner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (data) => {
    createKundeMutation.mutate(data);
  };

  const KundeCard = ({ kunde }) => {
    return (
      <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              {kunde.firmenname?.[0]?.toUpperCase() || 'K'}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1 truncate">{kunde.firmenname}</CardTitle>
              {kunde.ansprechpartner && (
                <p className="text-sm text-gray-600 truncate">{kunde.ansprechpartner}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {kunde.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{kunde.email}</span>
            </div>
          )}
          {kunde.telefon && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{kunde.telefon}</span>
            </div>
          )}
          {kunde.adresse && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="truncate">{kunde.adresse}</span>
            </div>
          )}
          {kunde.tags && kunde.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {kunde.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {kunde.zahlungsziel_tage && (
            <div className="text-xs text-gray-500 mt-2">
              Zahlungsziel: {kunde.zahlungsziel_tage} Tage
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Kunden</h1>
            <p className="text-gray-600">Verwalte deine Kundenkontakte</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Kunde anlegen
          </Button>
        </div>

        {/* Suche */}
        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Kunden durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Kunden Form */}
        {showForm && (
          <div className="mb-6">
            <KundenForm 
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Kunden Grid */}
        {filteredKunden.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKunden.map((kunde) => (
              <KundeCard key={kunde.id} kunde={kunde} />
            ))}
          </div>
        ) : !showForm && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Kunden gefunden</h3>
              <p className="text-gray-500 mb-4">Lege deinen ersten Kunden an</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Kunde anlegen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}