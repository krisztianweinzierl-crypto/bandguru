import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Music, Mail, Phone, Edit, Trash2, LayoutGrid, List, User, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MusikerForm from "@/components/musiker/MusikerForm";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";

export default function MusikerPage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMusiker, setEditingMusiker] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("alle");
  const [showDropdownId, setShowDropdownId] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const queryClient = useQueryClient();
  const { showConfirm, AlertDialog } = useAlertDialog();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: musiker = [], isLoading } = useQuery({
    queryKey: ['musiker', currentOrgId],
    queryFn: () => base44.entities.Musiker.filter({ org_id: currentOrgId, aktiv: true }),
    enabled: !!currentOrgId
  });

  const createMusikerMutation = useMutation({
    mutationFn: (data) => base44.entities.Musiker.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musiker'] });
      setShowForm(false);
      setEditingMusiker(null);
    }
  });

  const updateMusikerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Musiker.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musiker'] });
      setShowForm(false);
      setEditingMusiker(null);
      setShowDropdownId(null);
    }
  });

  const deleteMusikerMutation = useMutation({
    mutationFn: (id) => base44.entities.Musiker.update(id, { aktiv: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musiker'] });
      setShowDropdownId(null);
    }
  });

  const filteredMusiker = musiker.filter((m) => {
    const matchesSearch =
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInstrument =
      instrumentFilter === "alle" ||
      m.instrumente?.includes(instrumentFilter);
    return matchesSearch && matchesInstrument;
  });

  const allInstrumente = [...new Set(musiker.flatMap((m) => m.instrumente || []))];

  const handleCardClick = (musikerId) => {
    navigate(createPageUrl(`MusikerDetail?id=${musikerId}`));
  };

  const handleEdit = (musiker) => {
    setEditingMusiker(musiker);
    setShowForm(true);
    setShowDropdownId(null);
  };

  const handleDelete = async (musiker) => {
    const confirmed = await showConfirm({
      title: 'Musiker löschen',
      message: `Möchtest du "${musiker.name}" wirklich löschen?\n\nDer Musiker wird als inaktiv markiert und ist nicht mehr sichtbar.`,
      type: 'warning',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen'
    });
    
    if (confirmed) {
      deleteMusikerMutation.mutate(musiker.id);
    }
  };

  const handleSubmit = (data) => {
    if (editingMusiker) {
      updateMusikerMutation.mutate({ id: editingMusiker.id, data });
    } else {
      createMusikerMutation.mutate(data);
    }
  };

  const MusikerCard = ({ musiker }) => {
    return (
      <Card
        className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-purple-500"
        onClick={() => handleCardClick(musiker.id)}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              <Music className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1 truncate">{musiker.name}</CardTitle>
              {musiker.instrumente && musiker.instrumente.length > 0 && (
                <p className="text-sm text-gray-600 truncate">
                  {musiker.instrumente.join(", ")}
                </p>
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
          {musiker.genre && musiker.genre.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {musiker.genre.slice(0, 3).map((g, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {g}
                </Badge>
              ))}
              {musiker.genre.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{musiker.genre.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const MusikerListItem = ({ musiker }) => {
    return (
      <div
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 flex items-center gap-4 cursor-pointer border-l-4 border-l-purple-500"
        onClick={() => handleCardClick(musiker.id)}
      >
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold rounded-lg w-12 h-12 flex items-center justify-center flex-shrink-0">
          <Music className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 truncate">{musiker.name}</h3>
              {musiker.instrumente && musiker.instrumente.length > 0 && (
                <p className="text-sm text-gray-600 truncate">
                  {musiker.instrumente.join(", ")}
                </p>
              )}
            </div>
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
            {musiker.genre && musiker.genre.length > 0 && (
              <div className="flex items-center gap-1">
                {musiker.genre.slice(0, 2).map((g, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {g}
                  </Badge>
                ))}
                {musiker.genre.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{musiker.genre.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Musiker...</p>
      </div>
    );
  }

  return (
    <>
      <AlertDialog />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Musiker</h1>
              <p className="text-gray-600">Verwalte dein Musiker-Netzwerk</p>
            </div>
            <Button
              onClick={() => {
                setEditingMusiker(null);
                setShowForm(true);
              }}
              className="bg-[#223a5e] hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Musiker hinzufügen
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gesamt</p>
                    <p className="text-2xl font-bold">{musiker.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Music className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Instrumente</p>
                    <p className="text-2xl font-bold">{allInstrumente.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Music className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Verfügbar</p>
                    <p className="text-2xl font-bold">{musiker.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6 border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
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
                    <SelectValue />
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
                {filteredMusiker.map((musiker) => (
                  <MusikerCard key={musiker.id} musiker={musiker} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMusiker.map((musiker) => (
                  <MusikerListItem key={musiker.id} musiker={musiker} />
                ))}
              </div>
            )
          ) : (
            <Card className="border-dashed">
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
        </div>
      </div>
    </>
  );
}