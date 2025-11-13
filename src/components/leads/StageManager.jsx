import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Trash2, GripVertical, Edit2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";

export default function StageManager({ stages, onSave, onCancel }) {
  const [editingStages, setEditingStages] = useState([...stages]);
  const [newStageName, setNewStageName] = useState("");
  const [editingStageId, setEditingStageId] = useState(null);
  const { showConfirm, AlertDialog } = useAlertDialog();

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(editingStages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update reihenfolge
    const updatedItems = items.map((item, index) => ({
      ...item,
      reihenfolge: index
    }));

    setEditingStages(updatedItems);
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newStage = {
      id: `temp_${Date.now()}`,
      name: newStageName,
      farbe: randomColor,
      reihenfolge: editingStages.length,
      ist_standard: false,
      status_mapping: 'neu' // Default mapping
    };

    setEditingStages([...editingStages, newStage]);
    setNewStageName("");
  };

  const handleUpdateStage = (id, field, value) => {
    setEditingStages(editingStages.map(stage =>
      stage.id === id ? { ...stage, [field]: value } : stage
    ));
  };

  const handleDeleteStage = async (id) => {
    const stage = editingStages.find(s => s.id === id);
    
    // Bestätigungsdialog
    const confirmMessage = stage?.ist_standard 
      ? `Möchtest du die Standard-Stage "${stage.name}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`
      : `Möchtest du die Stage "${stage.name}" wirklich löschen?`;
    
    const confirmed = await showConfirm({
      title: 'Stage löschen',
      message: confirmMessage,
      type: 'warning',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen'
    });
    
    if (!confirmed) return;
    
    setEditingStages(editingStages.filter(s => s.id !== id));
  };

  const handleSave = () => {
    onSave(editingStages);
  };

  return (
    <>
      <AlertDialog />
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Stages verwalten</CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Erstelle und organisiere deine Lead-Pipeline-Stages. Ziehe Stages um sie neu anzuordnen.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Existing Stages */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Bestehende Stages</Label>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="stages">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {editingStages.map((stage, index) => (
                      <Draggable key={stage.id} draggableId={stage.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-4 border rounded-lg bg-white ${
                              snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-5 h-5 text-gray-400" />
                              </div>

                              {editingStageId === stage.id ? (
                                <Input
                                  value={stage.name}
                                  onChange={(e) => handleUpdateStage(stage.id, 'name', e.target.value)}
                                  onBlur={() => setEditingStageId(null)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') setEditingStageId(null);
                                  }}
                                  className="flex-1"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="flex-1 px-3 py-2 border border-transparent rounded-md hover:border-gray-300 cursor-pointer transition-colors"
                                  onClick={() => setEditingStageId(stage.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{stage.name}</span>
                                    <Edit2 className="w-3 h-3 text-gray-400" />
                                  </div>
                                </div>
                              )}

                              <Input
                                type="color"
                                value={stage.farbe}
                                onChange={(e) => handleUpdateStage(stage.id, 'farbe', e.target.value)}
                                className="w-20 h-10 cursor-pointer"
                              />

                              <select
                                value={stage.status_mapping}
                                onChange={(e) => handleUpdateStage(stage.id, 'status_mapping', e.target.value)}
                                className="flex h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm w-40"
                              >
                                <option value="neu">Neu</option>
                                <option value="kontaktiert">Kontaktiert</option>
                                <option value="qualifiziert">Qualifiziert</option>
                                <option value="angebot">Angebot</option>
                                <option value="verhandlung">Verhandlung</option>
                                <option value="gewonnen">Gewonnen</option>
                                <option value="verloren">Verloren</option>
                              </select>

                              {stage.ist_standard && (
                                <Badge variant="secondary" className="text-xs">
                                  Standard
                                </Badge>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteStage(stage.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* Add New Stage */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base font-semibold">Neue Stage hinzufügen</Label>
            <div className="flex gap-2">
              <Input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Stage-Name eingeben..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddStage()}
              />
              <Button onClick={handleAddStage} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Hinzufügen
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              style={{ backgroundColor: '#223a5e' }}
              className="hover:opacity-90"
            >
              <Save className="w-4 h-4 mr-2" />
              Stages speichern
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}