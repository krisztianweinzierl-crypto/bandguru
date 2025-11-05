import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Edit, Mail, Phone, Calendar, Euro, User, Plus, Settings } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function KanbanView({ 
  leads, 
  stages, 
  onLeadClick, 
  onLeadUpdate, 
  onLeadEdit, 
  onStageSettings,
  showDropdownId,
  setShowDropdownId 
}) {
  
  const getLeadsForStage = (stage) => {
    return leads.filter(lead => lead.status === stage.status_mapping);
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const lead = leads.find(l => l.id === draggableId);
    const targetStage = stages.find(s => s.id === destination.droppableId);
    
    if (lead && targetStage) {
      onLeadUpdate(lead.id, { status: targetStage.status_mapping });
    }
  };

  return (
    <div className="space-y-4">
      {/* Stage Settings Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onStageSettings}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Stages verwalten
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages
            .sort((a, b) => a.reihenfolge - b.reihenfolge)
            .map((stage) => {
              const stageLeads = getLeadsForStage(stage);
              
              return (
                <div key={stage.id} className="flex-shrink-0 w-80">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    {/* Stage Header */}
                    <div 
                      className="p-4 border-b"
                      style={{ 
                        backgroundColor: stage.farbe + '15',
                        borderTopColor: stage.farbe,
                        borderTopWidth: '3px'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {stageLeads.length}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Droppable Area */}
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-3 space-y-3 min-h-[200px] transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-50'
                          }`}
                          style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}
                        >
                          {stageLeads.map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <Card
                                    className={`cursor-pointer hover:shadow-md transition-all ${
                                      snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''
                                    }`}
                                    onClick={() => onLeadClick(lead.id)}
                                  >
                                    <CardHeader className="p-3 pb-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-sm text-gray-900 truncate mb-1">
                                            {lead.titel}
                                          </h4>
                                          {lead.firmenname && (
                                            <p className="text-xs text-gray-600 truncate">
                                              {lead.firmenname}
                                            </p>
                                          )}
                                        </div>
                                        <div className="relative flex-shrink-0">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowDropdownId(showDropdownId === lead.id ? null : lead.id);
                                            }}
                                          >
                                            <MoreVertical className="w-3 h-3" />
                                          </Button>

                                          {showDropdownId === lead.id && (
                                            <>
                                              <div
                                                className="fixed inset-0 z-40"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setShowDropdownId(null);
                                                }}
                                              />
                                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48 overflow-hidden">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onLeadEdit(lead);
                                                  }}
                                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left text-sm"
                                                >
                                                  <Edit className="w-3 h-3 text-gray-600" />
                                                  <span>Bearbeiten</span>
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0 space-y-2">
                                      {lead.kontaktperson && (
                                        <div className="flex items-center gap-1 text-xs text-gray-600">
                                          <User className="w-3 h-3" />
                                          <span className="truncate">{lead.kontaktperson}</span>
                                        </div>
                                      )}
                                      {lead.event_datum && (
                                        <div className="flex items-center gap-1 text-xs text-gray-600">
                                          <Calendar className="w-3 h-3" />
                                          <span>{format(new Date(lead.event_datum), 'dd. MMM yyyy', { locale: de })}</span>
                                        </div>
                                      )}
                                      {lead.erwarteter_umsatz && (
                                        <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                                          <Euro className="w-3 h-3" />
                                          <span>
                                            {lead.erwarteter_umsatz.toLocaleString('de-DE', {
                                              style: 'currency',
                                              currency: 'EUR'
                                            })}
                                          </span>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              );
            })}
        </div>
      </DragDropContext>
    </div>
  );
}