import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Trash2,
  ChevronRight,
  CheckSquare,
  Edit,
  X,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function EventAufgabenTab({
  aufgaben,
  users,
  event,
  eventId,
  isManager,
  updateAufgabeMutation,
  deleteAufgabeMutation,
  createAufgabeMutation,
  queryClient
}) {
  const [expandedTasks, setExpandedTasks] = useState({});
  const [showAufgabeDialog, setShowAufgabeDialog] = useState(false);
  const [editingAufgabe, setEditingAufgabe] = useState(null);
  const [neueAufgabe, setNeueAufgabe] = useState({ titel: '', beschreibung: '', prioritaet: 'normal', faellig_am: '', zugewiesen_an: '' });
  const [neueUnteraufgaben, setNeueUnteraufgaben] = useState([]);
  const [existingUnteraufgaben, setExistingUnteraufgaben] = useState([]);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState(null); // 'aufgabe' or 'unteraufgabe'

  const prioritaetColors = {
    niedrig: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    hoch: 'bg-red-100 text-red-600'
  };

  const toggleExpand = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleDoubleClick = (aufgabe) => {
    if (!isManager) return;
    setInlineEditId(aufgabe.id);
    setInlineEditValue(aufgabe.titel);
  };

  const handleInlineEditSave = async (aufgabe) => {
    if (inlineEditValue.trim() && inlineEditValue !== aufgabe.titel) {
      await updateAufgabeMutation.mutateAsync({
        id: aufgabe.id,
        data: { titel: inlineEditValue.trim() }
      });
    }
    setInlineEditId(null);
    setInlineEditValue('');
  };

  const handleInlineEditCancel = () => {
    setInlineEditId(null);
    setInlineEditValue('');
  };

  const openEditDialog = (aufgabe) => {
    setEditingAufgabe(aufgabe);
    setNeueAufgabe({
      titel: aufgabe.titel,
      beschreibung: aufgabe.beschreibung || '',
      prioritaet: aufgabe.prioritaet || 'normal',
      faellig_am: aufgabe.faellig_am ? aufgabe.faellig_am.split('T')[0] : '',
      zugewiesen_an: aufgabe.zugewiesen_an || ''
    });
    // Lade existierende Unteraufgaben
    const existingSubs = aufgaben.filter(a => a.parent_task_id === aufgabe.id);
    setExistingUnteraufgaben(existingSubs);
    setNeueUnteraufgaben([]);
    setShowAufgabeDialog(true);
  };

  const hauptAufgaben = aufgaben.filter(a => !a.parent_task_id);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Aufgaben für dieses Event</CardTitle>
          {isManager && (
            <Button
              onClick={() => {
                setEditingAufgabe(null);
                setNeueAufgabe({ titel: '', beschreibung: '', prioritaet: 'normal', faellig_am: '', zugewiesen_an: '' });
                setNeueUnteraufgaben([]);
                setShowAufgabeDialog(true);
              }}
              size="sm"
              className="text-white"
              style={{ backgroundColor: '#223a5e' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Aufgabe hinzufügen
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {hauptAufgaben.length > 0 ? (
          <div className="space-y-2">
            {hauptAufgaben.map((aufgabe) => {
              const zugewiesenerUser = users.find(u => u.id === aufgabe.zugewiesen_an);
              const unteraufgaben = aufgaben.filter(a => a.parent_task_id === aufgabe.id);
              const hasUnteraufgaben = unteraufgaben.length > 0;
              const isExpanded = expandedTasks[aufgabe.id];
              
              return (
                <div key={aufgabe.id} className="border rounded-lg overflow-hidden">
                  <div
                    className={`flex items-center gap-3 p-4 ${
                      aufgabe.status === 'erledigt' ? 'bg-gray-50 opacity-60' : 'bg-white'
                    } hover:bg-gray-50 transition-colors`}
                  >
                    {/* Expand Button */}
                    {hasUnteraufgaben ? (
                      <button
                        onClick={() => toggleExpand(aufgabe.id)}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-0.5 transition-all"
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    ) : (
                      <div className="w-5" />
                    )}

                    {/* Checkbox */}
                    <button
                      onClick={() => updateAufgabeMutation.mutate({
                        id: aufgabe.id,
                        data: { status: aufgabe.status === 'erledigt' ? 'offen' : 'erledigt' }
                      })}
                      className="flex-shrink-0"
                    >
                      {aufgabe.status === 'erledigt' ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400" />
                      )}
                    </button>
                    
                    {/* Titel - Inline Edit oder Normal */}
                    <div 
                      className="flex-1 min-w-0"
                      onDoubleClick={() => handleDoubleClick(aufgabe)}
                    >
                      {inlineEditId === aufgabe.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInlineEditSave(aufgabe);
                              if (e.key === 'Escape') handleInlineEditCancel();
                            }}
                            autoFocus
                            className="h-8"
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleInlineEditSave(aufgabe)}>
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleInlineEditCancel}>
                            <X className="w-4 h-4 text-gray-400" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className={`font-medium ${aufgabe.status === 'erledigt' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {aufgabe.titel}
                            {hasUnteraufgaben && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({unteraufgaben.filter(u => u.status === 'erledigt').length}/{unteraufgaben.length})
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            {aufgabe.faellig_am && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(aufgabe.faellig_am), 'dd.MM.yyyy', { locale: de })}
                              </span>
                            )}
                            {zugewiesenerUser && (
                              <span>@ {zugewiesenerUser.full_name}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    
                    <Badge className={prioritaetColors[aufgabe.prioritaet] || prioritaetColors.normal}>
                      {aufgabe.prioritaet}
                    </Badge>
                    
                    {isManager && inlineEditId !== aufgabe.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(aufgabe)}
                          className="text-gray-400 hover:text-blue-500"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteConfirmId(aufgabe.id);
                            setDeleteConfirmType('aufgabe');
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Unteraufgaben - aufklappbar */}
                  {hasUnteraufgaben && isExpanded && (
                    <div className="bg-gray-50 border-t px-4 py-2 space-y-1">
                      {unteraufgaben.map((sub) => (
                        <div 
                          key={sub.id} 
                          className="flex items-center gap-3 ml-6 border-l-2 border-gray-200 pl-4 py-2 hover:bg-gray-100 rounded-r transition-colors"
                          onDoubleClick={() => handleDoubleClick(sub)}
                        >
                          <button
                            onClick={() => updateAufgabeMutation.mutate({
                              id: sub.id,
                              data: { status: sub.status === 'erledigt' ? 'offen' : 'erledigt' }
                            })}
                            className="flex-shrink-0"
                          >
                            {sub.status === 'erledigt' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-blue-400 hover:text-blue-500" />
                            )}
                          </button>
                          
                          {inlineEditId === sub.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={inlineEditValue}
                                onChange={(e) => setInlineEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineEditSave(sub);
                                  if (e.key === 'Escape') handleInlineEditCancel();
                                }}
                                autoFocus
                                className="h-7 text-sm"
                              />
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleInlineEditSave(sub)}>
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleInlineEditCancel}>
                                <X className="w-4 h-4 text-gray-400" />
                              </Button>
                            </div>
                          ) : (
                            <span className={`text-sm flex-1 ${sub.status === 'erledigt' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                              {sub.titel}
                            </span>
                          )}

                          {isManager && inlineEditId !== sub.id && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(sub)}
                                className="h-6 w-6 text-gray-400 hover:text-blue-500"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeleteConfirmId(sub.id);
                                  setDeleteConfirmType('unteraufgabe');
                                }}
                                className="h-6 w-6 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold mb-2">Keine Aufgaben</h3>
            <p className="text-gray-500 mb-4">Es gibt noch keine Aufgaben für dieses Event</p>
            {isManager && (
              <Button
                onClick={() => {
                  setEditingAufgabe(null);
                  setNeueAufgabe({ titel: '', beschreibung: '', prioritaet: 'normal', faellig_am: '', zugewiesen_an: '' });
                  setNeueUnteraufgaben([]);
                  setShowAufgabeDialog(true);
                }}
                className="text-white"
                style={{ backgroundColor: '#223a5e' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Erste Aufgabe erstellen
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Aufgabe Dialog */}
      <Dialog open={showAufgabeDialog} onOpenChange={setShowAufgabeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAufgabe ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}</DialogTitle>
            <DialogDescription>
              {editingAufgabe ? 'Bearbeite die Aufgabe für dieses Event' : 'Erstelle eine neue Aufgabe für dieses Event'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Event-Badge */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Event: <span className="font-semibold">{event?.titel}</span>
              </span>
              <Link 
                to={createPageUrl('EventDetail') + `?id=${eventId}`}
                className="ml-auto text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aufgabe-titel">Titel *</Label>
              <Input
                id="aufgabe-titel"
                value={neueAufgabe.titel}
                onChange={(e) => setNeueAufgabe({...neueAufgabe, titel: e.target.value})}
                placeholder="z.B. Equipment packen"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aufgabe-beschreibung">Beschreibung</Label>
              <Textarea
                id="aufgabe-beschreibung"
                value={neueAufgabe.beschreibung}
                onChange={(e) => setNeueAufgabe({...neueAufgabe, beschreibung: e.target.value})}
                placeholder="Weitere Details..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priorität</Label>
                <Select value={neueAufgabe.prioritaet} onValueChange={(v) => setNeueAufgabe({...neueAufgabe, prioritaet: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="niedrig">Niedrig</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="hoch">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fälligkeitsdatum</Label>
                <Input
                  type="date"
                  value={neueAufgabe.faellig_am}
                  onChange={(e) => setNeueAufgabe({...neueAufgabe, faellig_am: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Zugewiesen an</Label>
              <Select value={neueAufgabe.zugewiesen_an || ""} onValueChange={(v) => setNeueAufgabe({...neueAufgabe, zugewiesen_an: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Niemand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nicht zugewiesen</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unteraufgaben */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between items-center">
                <Label>Unteraufgaben</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNeueUnteraufgaben([...neueUnteraufgaben, { titel: '', prioritaet: 'normal' }])}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Hinzufügen
                </Button>
              </div>

              {/* Existierende Unteraufgaben (beim Bearbeiten) */}
              {editingAufgabe && existingUnteraufgaben.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Bestehende Unteraufgaben:</p>
                  {existingUnteraufgaben.map((sub) => (
                    <div key={sub.id} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                      <span className={`text-sm flex-1 ${sub.status === 'erledigt' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {sub.titel}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteConfirmId(sub.id);
                          setDeleteConfirmType('dialog-unteraufgabe');
                        }}
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Neue Unteraufgaben */}
              {neueUnteraufgaben.length > 0 && (
                <div className="space-y-2">
                  {editingAufgabe && <p className="text-xs text-gray-500">Neue Unteraufgaben:</p>}
                  {neueUnteraufgaben.map((sub, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        value={sub.titel}
                        onChange={(e) => {
                          const updated = [...neueUnteraufgaben];
                          updated[idx].titel = e.target.value;
                          setNeueUnteraufgaben(updated);
                        }}
                        placeholder={`Unteraufgabe ${idx + 1}`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setNeueUnteraufgaben(neueUnteraufgaben.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {existingUnteraufgaben.length === 0 && neueUnteraufgaben.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">Keine Unteraufgaben</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAufgabeDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={async () => {
                if (!neueAufgabe.titel.trim()) {
                  alert('Bitte gib einen Titel ein');
                  return;
                }
                
                if (editingAufgabe) {
                  // Update existing
                  await updateAufgabeMutation.mutateAsync({
                    id: editingAufgabe.id,
                    data: {
                      titel: neueAufgabe.titel,
                      beschreibung: neueAufgabe.beschreibung,
                      prioritaet: neueAufgabe.prioritaet,
                      faellig_am: neueAufgabe.faellig_am || null,
                      zugewiesen_an: neueAufgabe.zugewiesen_an || null
                    }
                  });
                  
                  // Create new subtasks for existing task
                  for (const sub of neueUnteraufgaben) {
                    if (sub.titel.trim()) {
                      await base44.entities.Aufgabe.create({
                        org_id: event.org_id,
                        bezug_typ: 'event',
                        bezug_id: eventId,
                        parent_task_id: editingAufgabe.id,
                        titel: sub.titel,
                        prioritaet: sub.prioritaet,
                        status: 'offen'
                      });
                    }
                  }
                } else {
                  // Create new
                  const hauptaufgabe = await createAufgabeMutation.mutateAsync({
                    titel: neueAufgabe.titel,
                    beschreibung: neueAufgabe.beschreibung,
                    prioritaet: neueAufgabe.prioritaet,
                    faellig_am: neueAufgabe.faellig_am || null,
                    zugewiesen_an: neueAufgabe.zugewiesen_an || null,
                    status: 'offen'
                  });
                  
                  // Create subtasks
                  for (const sub of neueUnteraufgaben) {
                    if (sub.titel.trim()) {
                      await base44.entities.Aufgabe.create({
                        org_id: event.org_id,
                        bezug_typ: 'event',
                        bezug_id: eventId,
                        parent_task_id: hauptaufgabe.id,
                        titel: sub.titel,
                        prioritaet: sub.prioritaet,
                        status: 'offen'
                      });
                    }
                  }
                }
                
                queryClient.invalidateQueries({ queryKey: ['aufgaben', eventId] });
                setShowAufgabeDialog(false);
              }}
              disabled={createAufgabeMutation.isPending || updateAufgabeMutation.isPending}
              className="text-white"
              style={{ backgroundColor: '#223a5e' }}
            >
              {editingAufgabe ? 'Speichern' : 'Aufgabe erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirmType === 'aufgabe' ? 'Aufgabe löschen?' : 'Unteraufgabe löschen?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmType === 'aufgabe' 
                ? 'Möchtest du diese Aufgabe wirklich löschen? Alle zugehörigen Unteraufgaben werden ebenfalls gelöscht.'
                : 'Möchtest du diese Unteraufgabe wirklich löschen?'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmType === 'dialog-unteraufgabe') {
                  deleteAufgabeMutation.mutate(deleteConfirmId);
                  setExistingUnteraufgaben(existingUnteraufgaben.filter(s => s.id !== deleteConfirmId));
                } else {
                  deleteAufgabeMutation.mutate(deleteConfirmId);
                }
                setDeleteConfirmId(null);
                setDeleteConfirmType(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}