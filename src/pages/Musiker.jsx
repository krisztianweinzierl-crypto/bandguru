import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Music, Mail, Phone, DollarSign, Languages, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import MusikerForm from "@/components/musiker/MusikerForm";

export default function MusikerPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: musiker = [], isLoading } = useQuery({
    queryKey: ['musiker', currentOrgId],
    queryFn: () => base44.entities.Musiker.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const createMusikerMutation = useMutation({
    mutationFn: (data) => base44.entities.Musiker.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musiker'] });
      setShowForm(false);
    },
  });

  const filteredMusiker = musiker.filter(m => 
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.instrumente?.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeMusiker = filteredMusiker.filter(m => m.aktiv);
  const inactiveMusiker = filteredMusiker.filter(m => !m.aktiv);

  const handleSubmit = (data) => {
    createMusikerMutation.mutate(data);
  };

  const MusikerCard = ({ musiker }) => {
    const initials = musiker.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'M';
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
    const color = colors[Math.abs(musiker.name?.charCodeAt(0) || 0) % colors.length];

    return (
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <Avatar className={`w-14 h-14 ${color} text-white text-lg font-bold`}>
              <AvatarFallback className={color}>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1 truncate">{musiker.name}</CardTitle>
              {musiker.instrumente && musiker.instrumente.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {musiker.instrumente.map((instrument, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {instrument}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {!musiker.aktiv && (
              <Badge variant="outline" className="bg-gray-100">
                Inaktiv
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {musiker.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{musiker.email}</span>
            </div>
          )}
          {musiker.telefon && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{musiker.telefon}</span>
            </div>
          )}
          {musiker.tagessatz_netto && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{musiker.tagessatz_netto}€ / Tag</span>
            </div>
          )}
          {musiker.genre && musiker.genre.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Music className="w-4 h-4 text-gray-400" />
              <span className="truncate">{musiker.genre.join(', ')}</span>
            </div>
          )}
          {musiker.sprachen && musiker.sprachen.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Languages className="w-4 h-4 text-gray-400" />
              <span className="truncate">{musiker.sprachen.join(', ')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Musiker</h1>
            <p className="text-gray-600">Verwalte deinen Musiker-Pool</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Musiker hinzufügen
          </Button>
        </div>

        {/* Suche */}
        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Musiker oder Instrument suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Musiker Form */}
        {showForm && (
          <div className="mb-6">
            <MusikerForm 
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Musiker Grid */}
        {activeMusiker.length > 0 ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Aktive Musiker ({activeMusiker.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {activeMusiker.map((m) => (
                <MusikerCard key={m.id} musiker={m} />
              ))}
            </div>
          </>
        ) : !showForm && (
          <Card className="border-dashed mb-8">
            <CardContent className="p-12 text-center">
              <Music className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Musiker gefunden</h3>
              <p className="text-gray-500 mb-4">Füge deinen ersten Musiker hinzu</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Musiker hinzufügen
              </Button>
            </CardContent>
          </Card>
        )}

        {inactiveMusiker.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">
              Inaktive Musiker ({inactiveMusiker.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveMusiker.map((m) => (
                <MusikerCard key={m.id} musiker={m} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}