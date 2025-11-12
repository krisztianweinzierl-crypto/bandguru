import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Calendar,
  MapPin,
  PenTool,
  Check,
  X,
  Trash2,
  Building2,
  Mail,
  Lock
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
  
  // E-Mail-Verifizierung
  const [emailVerified, setEmailVerified] = useState(false);
  const [kundenEmail, setKundenEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  
  const [showUnterschriftModal, setShowUnterschriftModal] = useState(false);
  const [unterschriftName, setUnterschriftName] = useState("");
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Direkter Fetch-Aufruf an die Backend-Funktion (OHNE base44 SDK)
  const { data: vertragData, isLoading, error } = useQuery({
    queryKey: ['vertrag-kunde', vertragId, kundenEmail],
    queryFn: async () => {
      const response = await fetch(`${window.location.origin}/api/functions/vertragsKundenansicht`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vertragId,
          kundenEmail
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Laden des Vertrags');
      }
      
      return response.json();
    },
    enabled: !!vertragId && emailVerified && !!kundenEmail,
    retry: false
  });

  const vertrag = vertragData?.vertrag;
  const kunde = vertragData?.kunde;
  const event = vertragData?.event;
  const organisation = vertragData?.organisation;

  // E-Mail Verifizierung (direkter Fetch)
  const verifyEmailMutation = useMutation({
    mutationFn: async (email) => {
      const response = await fetch(`${window.location.origin}/api/functions/vertragsKundenansicht`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vertragId,
          kundenEmail: email
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'E-Mail-Adresse stimmt nicht überein');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setEmailVerified(true);
      setEmailError("");
    },
    onError: (error) => {
      setEmailError(error.message);
    }
  });

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!kundenEmail.trim()) {
      setEmailError("Bitte geben Sie Ihre E-Mail-Adresse ein");
      return;
    }
    verifyEmailMutation.mutate(kundenEmail);
  };

  // Unterschrift speichern (direkter Fetch)
  const saveUnterschriftMutation = useMutation({
    mutationFn: async ({ unterschriftData, name }) => {
      const response = await fetch(`${window.location.origin}/api/functions/vertragsKundenansicht`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vertragId,
          kundenEmail,
          unterschrift_kunde: unterschriftData,
          unterschrift_kunde_name: name,
          unterschrift_kunde_datum: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern der Unterschrift');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertrag-kunde', vertragId, kundenEmail] });
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

  // E-Mail-Verifizierungs-Screen
  if (!emailVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full border-none shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-purple-500 to-pink-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Vertrag anzeigen</CardTitle>
                <p className="text-purple-100 text-sm mt-1">Verifizierung erforderlich</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-medium">
                  Bitte geben Sie Ihre E-Mail-Adresse ein
                </Label>
                <p className="text-sm text-gray-600 mb-3">
                  Um den Vertrag anzuzeigen, bestätigen Sie bitte Ihre E-Mail-Adresse, die bei uns hinterlegt ist.
                </p>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={kundenEmail}
                    onChange={(e) => {
                      setKundenEmail(e.target.value);
                      setEmailError("");
                    }}
                    placeholder="ihre.email@beispiel.de"
                    className="pl-11 h-12"
                    required
                  />
                </div>
                {emailError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{emailError}</p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                disabled={verifyEmailMutation.isPending}
              >
                {verifyEmailMutation.isPending ? (
                  <>Überprüfe E-Mail...</>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Vertrag anzeigen
                  </>
                )}
              </Button>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500 text-center">
                  🔒 Ihre Daten sind sicher. Diese Verifizierung dient ausschließlich dazu, sicherzustellen, dass Sie berechtigt sind, diesen Vertrag einzusehen.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                      <>Bitte unterzeichnen Sie bis zum {format(new Date(vertrag.unterzeichnen_bis), 'dd.MM.yyyy', { locale: de })}</>
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