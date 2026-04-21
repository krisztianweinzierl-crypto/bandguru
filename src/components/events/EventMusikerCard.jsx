import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar, Euro, MessageSquare, FileText, MoreVertical,
  Edit, Send, Trash2, ChevronDown, ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function EventMusikerCard({
  em,
  musikerData,
  statusStyle,
  isCurrentUserMusiker,
  isManager,
  showDropdownId,
  setShowDropdownId,
  handleUpdateStatus,
  handleOpenEditMusikerDialog,
  handleOpenEinladungDialog,
  handleRemoveMusiker,
}) {
  const [expanded, setExpanded] = useState(false);
  const initials = musikerData?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  const hasDetails = isManager || isCurrentUserMusiker;

  return (
    <Card className={`border-l-4 ${statusStyle.border} ${isCurrentUserMusiker && !isManager ? 'ring-2 ring-blue-300' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Header row – always visible */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{musikerData?.name || 'Unbekannt'}</h3>
                {isCurrentUserMusiker && !isManager && (
                  <Badge variant="outline" className="text-xs">Du</Badge>
                )}
                {isManager && (
                  <Badge className={`${statusStyle.bg} ${statusStyle.text} text-xs`}>
                    {statusStyle.label}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {hasDetails && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setExpanded(prev => !prev)}
                  >
                    {expanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </Button>
                )}

                {isManager && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowDropdownId(showDropdownId === em.id ? null : em.id)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>

                    {showDropdownId === em.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowDropdownId(null)} />
                        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                          {em.status === 'angefragt' && (
                            <>
                              <button onClick={() => handleUpdateStatus(em.id, 'zugesagt')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left text-sm">Als zugesagt markieren</button>
                              <button onClick={() => handleUpdateStatus(em.id, 'optional')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left text-sm border-t">Als optional markieren</button>
                              <button onClick={() => handleUpdateStatus(em.id, 'abgelehnt')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left text-sm border-t">Als abgelehnt markieren</button>
                            </>
                          )}
                          <button onClick={() => handleOpenEditMusikerDialog(em)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left text-sm border-t">
                            <Edit className="w-4 h-4" /> Bearbeiten
                          </button>
                          {musikerData?.email && (
                            <button onClick={() => handleOpenEinladungDialog(em.id, em.musiker_id)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left text-sm border-t">
                              <Send className="w-4 h-4" /> Einladung senden
                            </button>
                          )}
                          <button onClick={() => handleRemoveMusiker(em.id)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-left text-sm text-red-600 border-t">
                            <Trash2 className="w-4 h-4" /> Entfernen
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-0.5">{em.rolle}</p>

            {/* Collapsible details */}
            {expanded && hasDetails && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                {isManager ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Eingeladen am</p>
                          <p className="font-medium">{format(new Date(em.created_date), 'dd.MM.yyyy', { locale: de })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Euro className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Gage (netto)</p>
                          <p className="font-medium">{(em.gage_netto || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Euro className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Fahrtkosten</p>
                          <p className="font-medium">
                            {((em.spesen || 0) + ((em.weitere_kosten || []).reduce((s, k) => s + (k.betrag || 0), 0))).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          </p>
                        </div>
                      </div>
                      {em.status === 'zugesagt' && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 flex-shrink-0 text-green-600" />
                          <div>
                            <p className="text-xs text-gray-500">Zugesagt am</p>
                            <p className="font-medium text-green-600">{format(new Date(em.updated_date), 'dd.MM.yyyy', { locale: de })}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {em.notizen && (
                      <div className="p-3 bg-gray-50 rounded-lg mb-2">
                        <div className="flex items-start gap-2 text-sm">
                          <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Notizen</p>
                            <p className="text-gray-700">{em.notizen}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {em.buchungsbedingungen && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <p className="font-medium text-blue-700">Buchungsbedingungen hinterlegt</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : isCurrentUserMusiker ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Euro className="w-4 h-4 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Deine Gage (netto)</p>
                        <p className="font-medium">{(em.gage_netto || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</p>
                      </div>
                    </div>
                    {em.spesen > 0 && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Euro className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Fahrtkosten</p>
                          <p className="font-medium">{(em.spesen || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}