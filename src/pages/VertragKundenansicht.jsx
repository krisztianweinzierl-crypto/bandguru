import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Calendar,
  MapPin,
  PenTool,
  Check,
  X,
  Trash2,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function VertragKundenansichtPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const vertragId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [showUnterschriftModal, setShowUnterschriftModal] = useState(false);
  const [unterschriftName, setUnterschriftName] = useState("");
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Vertrag über Backend-Funktion laden
  const { data: vertragData, isLoading, error } = useQuery({
    queryKey: ['vertrag-kunde', vertragId],
    queryFn: async () => {
      const response = await base44.functions.invoke('vertragsKundenansicht', {
        vertragId
      });
      return response.data;
    },
    enabled: !!vertragId,
  });

  const vertrag = vertragData?.vertrag;
  const kunde = vertragData?.kunde;
  const event = vertragData?.event;
  const organisation = vertragData?.organisation;

  const saveUnterschriftMutation = useMutation({
    mutationFn: async ({ unterschriftData, name }) => {
      const response = await base44.functions.invoke('vertragsKundenansicht', {
        vertragId,
        unterschrift_kunde: unterschriftData,
        unterschrift_kunde_name: name,
        unterschrift_kunde_datum: new Date().toISOString()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertrag-kunde', vertragId] });
      setShowUnterschriftModal(false);
      setUnterschriftName("");
      alert("✅ Vielen Dank! Ihre Unterschrift wurde gespeichert.");
    },
    onError: (error) => {
      alert("❌ Fehler beim Speichern: " + error.message);
    }
  });

  useEffect(() => {
    if (showUnterschriftModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [showUnterschriftModal]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveUnterschrift = () => {
    if (!unterschriftName.trim()) {
      alert("Bitte geben Sie Ihren Namen ein");
      return;
    }

    const canvas = canvasRef.current;
    const unterschriftData = canvas.toDataURL('image/png');
    
    saveUnterschriftMutation.mutate({
      unterschriftData,
      name: unterschriftName
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-purple-600 animate-pulse" />
          <p className="text-gray-600">Lade Vertrag...</p>
        </div>
      </div>
    );
  }

  if (error || !vertrag) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-bold mb-2">Vertrag nicht gefunden</h2>
            <p className="text-gray-600 mb-4">Der angeforderte Vertrag konnte nicht gefunden werden.</p>
            {error?.message && (
              <p className="text-sm text-gray-500">Fehler: {error.message}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!vertrag.im_kundenportal_sichtbar) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-orange-400" />
            <h2 className="text-xl font-bold mb-2">Vertrag nicht verfügbar</h2>
            <p className="text-gray-600">Dieser Vertrag ist derzeit nicht im Kundenportal verfügbar.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors = {
    entwurf: { bg: "bg-gray-100", text: "text-gray-800", label: "Entwurf" },
    versendet: { bg: "bg-blue-100", text: "text-blue-800", label: "Versendet" },
    unterzeichnet: { bg: "bg-green-100", text: "text-green-800", label: "Unterzeichnet" },
    storniert: { bg: "bg-red-100", text: "text-red-800", label: "Storniert" }
  };

  const statusInfo = statusColors[vertrag.status] || statusColors.entwurf;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            {organisation && (
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: organisation.primary_color || '#223a5e' }}
              >
                {organisation.name?.[0]?.toUpperCase() || "B"}
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{organisation?.name || 'Vertragsansicht'}</h1>
              <p className="text-gray-600">Kundenportal</p>
            </div>
            <Badge className={`${statusInfo.bg} ${statusInfo.text} border-none px-3 py-1 ml-auto`}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="space-y-6">
          {/* Vertragstitel */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-purple-500 to-pink-600 text-white">
              <CardTitle className="text-2xl">{vertrag.titel}</CardTitle>
              {vertrag.vertragsnummer && (
                <p className="text-purple-100 mt-1">{vertrag.vertragsnummer}</p>
              )}
            </CardHeader>
          </Card>

          {/* Vertragsinhalt */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="text-xl font-bold">Vertragsinhalt</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Event-Informationen */}
              {vertrag.eventinformationen_anzeigen && event && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-lg mb-3">Event-Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>{format(new Date(event.datum_von), 'dd. MMMM yyyy, HH:mm', { locale: de })} Uhr</span>
                    </div>
                    {event.ort_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span>{event.ort_name}</span>
                      </div>
                    )}
                    {event.ort_adresse && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span>{event.ort_adresse}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vertragstext */}
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: vertrag.inhalt }}
              />
            </CardContent>
          </Card>

          {/* Unterschrift */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="text-xl font-bold">Ihre Unterschrift</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {vertrag.unterschrift_kunde ? (
                <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
                  <div className="flex items-start gap-4">
                    <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 mb-3">Vertrag wurde unterzeichnet</h3>
                      <img 
                        src={vertrag.unterschrift_kunde} 
                        alt="Ihre Unterschrift" 
                        className="w-full max-w-md h-32 object-contain mb-3 bg-white rounded p-2"
                      />
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">{vertrag.unterschrift_kunde_name}</p>
                        <p>{format(new Date(vertrag.unterschrift_kunde_datum), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <PenTool className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">Bitte unterschreiben Sie den Vertrag</h3>
                  <p className="text-gray-600 mb-6">
                    {vertrag.unterzeichnen_bis && (
                      <>Bitte unterschreiben Sie bis zum {format(new Date(vertrag.unterzeichnen_bis), 'dd.MM.yyyy', { locale: de })}</>
                    )}
                  </p>
                  <Button
                    onClick={() => setShowUnterschriftModal(true)}
                    size="lg"
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  >
                    <PenTool className="w-5 h-5 mr-2" />
                    Jetzt unterschreiben
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kontakt */}
          {organisation && (
            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="text-center text-sm text-gray-600">
                  <p>Bei Fragen wenden Sie sich bitte an:</p>
                  <p className="font-medium text-gray-900 mt-1">{organisation.name}</p>
                  {organisation.adresse && (
                    <p className="text-gray-600">{organisation.adresse}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Unterschrift Modal */}
      {showUnterschriftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Vertrag unterschreiben</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowUnterschriftModal(false);
                    setUnterschriftName("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Ihr vollständiger Name *</Label>
                <Input
                  value={unterschriftName}
                  onChange={(e) => setUnterschriftName(e.target.value)}
                  placeholder="z.B. Max Mustermann"
                />
              </div>

              <div className="space-y-2">
                <Label>Ihre Unterschrift</Label>
                <div className="border-2 border-gray-300 rounded-lg bg-white">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Zeichnen Sie Ihre Unterschrift mit der Maus oder dem Touchpad
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Mit Ihrer Unterschrift bestätigen Sie, dass Sie den Vertrag gelesen haben und mit den Bedingungen einverstanden sind.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={clearCanvas}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUnterschriftModal(false);
                      setUnterschriftName("");
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={saveUnterschrift}
                    disabled={saveUnterschriftMutation.isPending}
                    className="bg-gradient-to-r from-purple-500 to-pink-600"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {saveUnterschriftMutation.isPending ? "Wird gespeichert..." : "Unterschrift speichern"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}