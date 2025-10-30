
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Music, Mail, Phone, Euro, Edit, Trash2, MoreVertical, LayoutGrid, List, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MusikerForm from "@/components/musiker/MusikerForm";

export default function MusikerPage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMusiker, setEditingMusiker] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("alle");
  const [showDropdownId, setShowDropdownId] = useState(null);
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? "grid" : "list");
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: musiker = [] } = useQuery({
    queryKey: ['musiker', currentOrgId],
    queryFn: () => base44.entities.Musiker.filter({ org_id: currentOrgId }, '-created_date'),
    enabled: !!currentOrgId,
  });

  const createMusikerMutation = useMutation({
    mutationFn: (data) => base44.entities.Musiker.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musiker'] });
      setShowForm(false);
      setEditingMusiker(null);
    },
  });

  const updateMusikerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Musiker.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musiker'] });
      setShowForm(false);
      setEditingMusiker(null);
      setShowDropdownId(null);
    },
  });

  const deleteMusikerMutation = useMutation({
    mutationFn: (id) => base44.entities.Musiker.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musiker'] });
      setShowDropdownId(null);
    },
  });

  const filteredMusiker = musiker.filter(m => {
    const matchesSearch = m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.instrumente?.some(i => i.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          false; // Ensure boolean
    const matchesInstrument = instrumentFilter === "alle" || 
                              m.instrumente?.includes(instrumentFilter) ||
                              false; // Ensure boolean
    return matchesSearch && matchesInstrument;
  });

  const allInstrumente = [...new Set(musiker.flatMap(m => m.instrumente || []))].sort();

  const handleSubmit = (data) => {
    if (editingMusiker) {
      updateMusikerMutation.mutate({ id: editingMusiker.id, data });
    } else {
      createMusikerMutation.mutate(data);
    }
  };

  const handleEdit = (musiker) => {
    setEditingMusiker(musiker);
    setShowForm(true);
    setShowDropdownId(null);
  };

  const handleDelete = (musiker) => {
    if (confirm(`Möchtest du ${musiker.name} wirklich löschen?`)) {
      deleteMusikerMutation.mutate(musiker.id);
    }
  };

  const handleCardClick = (musikerId) => {
    navigate(createPageUrl(`MusikerDetail?id=${musikerId}`));
  };

  const MusikerCard = ({ musiker }) => {
    const initials = musiker.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'M';
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
    const color = colors[Math.abs(musiker.name?.charCodeAt(0) || 0) % colors.length];

    return (
      <Card 
        className="hover:shadow-lg transition-all duration-200 cursor-pointer relative"
        onClick={() => handleCardClick(musiker.id)}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 ${color} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1 truncate">{musiker.name}</CardTitle>
              {musiker.instrumente && musiker.instrumente.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {musiker.instrumente.slice(0, 2).map((instrument, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {instrument}
                    </Badge>
                  ))}
                  {musiker.instrumente.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{musiker.instrumente.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdownId(showDropdownId === musiker.id ? null : musiker.id);
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>

              {showDropdownId === musiker.id && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdownId(null);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(musiker);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Musiker bearbeiten</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(musiker);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-sm text-red-600 border-t"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Musiker löschen</span>
                    </button>
                  </div>
                </>
              )}
            </div>
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
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <Euro className="w-4 h-4" />
              <span>{musiker.tagessatz_netto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / Tag</span>
            </div>
          )}
          {musiker.genre && musiker.genre.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Music className="w-4 h-4 text-gray-400" />
              <span className="truncate">{musiker.genre.join(', ')}</span>
            </div>
          )}
          {!musiker.aktiv && (
            <Badge variant="outline" className="mt-2 text-xs">Inaktiv</Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  const MusikerListItem = ({ musiker }) => {
    const initials = musiker.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'M';
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
    const color = colors[Math.abs(musiker.name?.charCodeAt(0) || 0) % colors.length];

    return (
      <div 
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 flex items-center gap-4 cursor-pointer"
        onClick={() => handleCardClick(musiker.id)}
      >
        <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
          {initials}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 truncate">{musiker.name}</h3>
              {musiker.instrumente && musiker.instrumente.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {musiker.instrumente.map((instrument, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {instrument}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {!musiker.aktiv && (
              <Badge variant="outline" className="flex-shrink-0 text-xs">Inaktiv</Badge>
            )}
            <div className="relative flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdownId(showDropdownId === musiker.id ? null : musiker.id);
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>

              {showDropdownId === musiker.id && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdownId(null);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(musiker);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Musiker bearbeiten</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(musiker);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-sm text-red-600 border-t"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Musiker löschen</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {musiker.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                <span className="truncate">{musiker.email}</span>
              </div>
            )}
            {musiker.telefon && (
              <div className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                <span>{musiker.telefon}</span>
              </div>
            )}
            {musiker.tagessatz_netto && (
              <div className="flex items-center gap-1 font-medium text-green-600">
                <Euro className="w-4 h-4" />
                <span>{musiker.tagessatz_netto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / Tag</span>
              </div>
            )}
            {musiker.genre && musiker.genre.length > 0 && (
              <div className="flex items-center gap-1">
                <Music className="w-4 h-4" />
                <span className="truncate">{musiker.genre.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Musiker</h1>
            <p className="text-gray-600">Verwalte dein Musiker-Portfolio</p>
          </div>
          <Button 
            onClick={() => {
              setEditingMusiker(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Musiker hinzufügen
          </Button>
        </div>

        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Musiker durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={instrumentFilter} onValueChange={setInstrumentFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Instrumente filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Instrumente</SelectItem>
                  {allInstrumente.map((instrument) => (
                    <SelectItem key={instrument} value={instrument}>
                      {instrument}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-white shadow-sm" : ""}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-white shadow-sm" : ""}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {showForm && (
          <div className="mb-6">
            <MusikerForm
              musiker={editingMusiker}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingMusiker(null);
              }}
            />
          </div>
        )}

        {filteredMusiker.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMusiker.map((m) => (
                <MusikerCard key={m.id} musiker={m} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMusiker.map((m) => (
                <MusikerListItem key={m.id} musiker={m} />
              ))}
            </div>
          )
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Musiker gefunden</h3>
              <p className="text-gray-500 mb-4">Füge deinen ersten Musiker hinzu</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Musiker hinzufügen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
