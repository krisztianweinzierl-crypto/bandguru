import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Edit,
  Send,
  FileText,
  Calendar,
  MapPin,
  User,
  Clock,
  Download,
  PenTool,
  X,
  Check,
  Trash2,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import VertragsForm from "@/components/vertraege/VertragsForm";

export default function VertragDetailPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const vertragId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showUnterschriftModal, setShowUnterschriftModal] = useState(false);
  const [unterschriftTyp, setUnterschriftTyp] = useState(null); // 'kunde' oder 'organisation'
  const [unterschriftName, setUnterschriftName] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const { data: vertrag, isLoading } = useQuery({
    queryKey: ['vertrag', vertragId],
    queryFn: async () => {
      const vertraege = await base44.entities.Vertrag.filter({ id: vertragId });
      return vertraege[0];
    },
    enabled: !!vertragId
  });

  const { data: kunde } = useQuery({
    queryKey: ['kunde', vertrag?.kunde_id],
    queryFn: async () => {
      if (!vertrag?.kunde_id) return null;
      const kunden = await base44.entities.Kunde.filter({ id: vertrag.kunde_id });
      return kunden[0];
    },
    enabled: !!vertrag?.kunde_id
  });

  const { data: event } = useQuery({
    queryKey: ['event', vertrag?.event_id],
    queryFn: async () => {
      if (!vertrag?.event_id) return null;
      const events = await base44.entities.Event.filter({ id: vertrag.event_id });
      return events[0];
    },
    enabled: !!vertrag?.event_id
  });

  const { data: kunden = [] } = useQuery({
    queryKey: ['kunden', vertrag?.org_id],
    queryFn: () => base44.entities.Kunde.filter({ org_id: vertrag.org_id }),
    enabled: !!vertrag?.org_id
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', vertrag?.org_id],
    queryFn: () => base44.entities.Event.filter({ org_id: vertrag.org_id }),
    enabled: !!vertrag?.org_id
  });

  const updateVertragMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Vertrag.update(vertragId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertrag', vertragId] });
      queryClient.invalidateQueries({ queryKey: ['vertraege'] });
      setIsEditing(false);
    }
  });

  const sendVertragMutation = useMutation({
    mutationFn: async () => {
      if (!kunde?.email) {
        throw new Error("Kunde hat keine E-Mail-Adresse");
      }

      // Neuer Link zur Backend-Funktion (öffentlich zugänglich)
      const kundenLink = `https://app.bandguru.de/api/functions/vertragsKundenansicht?id=${vertragId}`;

      const emailBody = `Sehr geehrte Damen und Herren,

anbei erhalten Sie den Vertrag "${vertrag.titel}" zur Durchsicht und Unterschrift.

${vertrag.unterzeichnen_bis ? `Bitte unterzeichnen Sie den Vertrag bis zum ${format(new Date(vertrag.unterzeichnen_bis), 'dd.MM.yyyy', { locale: de })}.` : ''}

Sie können den Vertrag online einsehen und unterzeichnen unter:
${kundenLink}

Mit freundlichen Grüßen
Ihr Team`;

      await base44.integrations.Core.SendEmail({
        to: kunde.email,
        subject: `Vertrag: ${vertrag.titel}`,
        body: emailBody
      });

      await base44.entities.Vertrag.update(vertragId, {
        status: 'versendet',
        versendet_am: new Date().toISOString()
      });

      // Benachrichtigung für alle Band Manager erstellen
      try {
        const mitglieder = await base44.entities.Mitglied.filter({
          org_id: vertrag.org_id,
          rolle: "Band Manager",
          status: "aktiv"
        });

        const currentUser = await base44.auth.me();

        const notificationPromises = mitglieder
          .filter((m) => m.user_id !== currentUser.id) // Nicht an sich selbst
          .map((mitglied) =>
            base44.entities.Benachrichtigung.create({
              org_id: vertrag.org_id,
              user_id: mitglied.user_id,
              typ: 'vertrag_unterschrieben',
              titel: `Vertrag versendet: ${vertrag.titel}`,
              nachricht: `Der Vertrag "${vertrag.titel}" wurde an ${kunde.firmenname} versendet`,
              link_url: createPageUrl('VertragDetail') + '?id=' + vertragId,
              bezug_typ: 'vertrag',
              bezug_id: vertragId,
              icon: 'FileSignature',
              prioritaet: 'normal'
            })
          );

        await Promise.all(notificationPromises);
      } catch (error) {
        console.error("Fehler beim Erstellen der Benachrichtigung:", error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertrag', vertragId] });
      alert("✅ Vertrag wurde versendet!");
    },
    onError: (error) => {
      alert("❌ Fehler beim Versenden: " + error.message);
    }
  });

  const saveUnterschriftMutation = useMutation({
    mutationFn: async ({ unterschriftData, name, typ }) => {
      const updateData = {};

      if (typ === 'kunde') {
        updateData.unterschrift_kunde = unterschriftData;
        updateData.unterschrift_kunde_name = name;
        updateData.unterschrift_kunde_datum = new Date().toISOString();

        // Wenn beide Unterschriften vorhanden sind, Status auf unterzeichnet setzen
        if (vertrag.unterschrift_organisation) {
          updateData.status = 'unterzeichnet';
        }
      } else {
        updateData.unterschrift_organisation = unterschriftData;
        updateData.unterschrift_organisation_name = name;
        updateData.unterschrift_organisation_datum = new Date().toISOString();

        // Wenn beide Unterschriften vorhanden sind, Status auf unterzeichnet setzen
        if (vertrag.unterschrift_kunde) {
          updateData.status = 'unterzeichnet';
        }
      }

      await base44.entities.Vertrag.update(vertragId, updateData);

      // Benachrichtigung erstellen, wenn Vertrag vollständig unterzeichnet
      if (typ === 'kunde' && vertrag.unterschrift_organisation ||
      typ === 'organisation' && vertrag.unterschrift_kunde) {
        try {
          const mitglieder = await base44.entities.Mitglied.filter({
            org_id: vertrag.org_id,
            rolle: "Band Manager",
            status: "aktiv"
          });

          const notificationPromises = mitglieder.map((mitglied) =>
            base44.entities.Benachrichtigung.create({
              org_id: vertrag.org_id,
              user_id: mitglied.user_id,
              typ: 'vertrag_unterschrieben',
              titel: `Vertrag vollständig unterzeichnet!`,
              nachricht: `Der Vertrag "${vertrag.titel}" wurde von beiden Parteien unterzeichnet`,
              link_url: createPageUrl('VertragDetail') + '?id=' + vertragId,
              bezug_typ: 'vertrag',
              bezug_id: vertragId,
              icon: 'CheckCircle',
              prioritaet: 'hoch'
            })
          );

          await Promise.all(notificationPromises);
        } catch (error) {
          console.error("Fehler beim Erstellen der Benachrichtigung:", error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertrag', vertragId] });
      setShowUnterschriftModal(false);
      setUnterschriftName("");
      alert("✅ Unterschrift gespeichert!");
    }
  });

  // Canvas Setup
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
      alert("Bitte gib deinen Namen ein");
      return;
    }

    const canvas = canvasRef.current;
    const unterschriftData = canvas.toDataURL('image/png');

    saveUnterschriftMutation.mutate({
      unterschriftData,
      name: unterschriftName,
      typ: unterschriftTyp
    });
  };

  const openUnterschriftModal = (typ) => {
    setUnterschriftTyp(typ);
    setShowUnterschriftModal(true);
  };

  const handleUpdateSubmit = (data) => {
    updateVertragMutation.mutate(data);
  };

  const handleSendVertrag = () => {
    if (confirm("Möchtest du diesen Vertrag wirklich versenden?")) {
      sendVertragMutation.mutate();
    }
  };

  const handleDownloadPDF = () => {
    // PDF-Generierung vorbereiten
    const printWindow = window.open('', '_blank');
    const vertragHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${vertrag.titel}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto;
          }
          h1 { color: #333; margin-bottom: 10px; }
          .header { margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .content { margin-bottom: 40px; line-height: 1.6; }
          .signature-section { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 60px; 
            page-break-inside: avoid;
          }
          .signature-box { 
            width: 45%; 
            border: 2px solid #ddd; 
            padding: 20px; 
            border-radius: 8px;
          }
          .signature-box h3 { margin-top: 0; margin-bottom: 15px; }
          .signature-img { 
            width: 100%; 
            height: 100px; 
            object-fit: contain; 
            margin-bottom: 10px;
            background: #f9f9f9;
            padding: 10px;
            border-radius: 4px;
          }
          .signature-info { font-size: 14px; color: #666; }
          .event-info {
            background: #f0f7ff;
            padding: 20px;
            border-left: 4px solid #3b82f6;
            margin-bottom: 30px;
            border-radius: 4px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${vertrag.titel}</h1>
          ${vertrag.vertragsnummer ? `<p><strong>Vertragsnummer:</strong> ${vertrag.vertragsnummer}</p>` : ''}
          <p><strong>Status:</strong> ${statusColors[vertrag.status]?.label || 'Unbekannt'}</p>
        </div>

        ${vertrag.eventinformationen_anzeigen && event ? `
          <div class="event-info">
            <h3>Event-Details</h3>
            <p><strong>Datum:</strong> ${format(new Date(event.datum_von), 'dd. MMMM yyyy, HH:mm', { locale: de })} Uhr</p>
            ${event.ort_name ? `<p><strong>Ort:</strong> ${event.ort_name}</p>` : ''}
            ${event.ort_adresse ? `<p><strong>Adresse:</strong> ${event.ort_adresse}</p>` : ''}
          </div>
        ` : ''}

        <div class="content">
          ${vertrag.inhalt}
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <h3>Kunde</h3>
            ${vertrag.unterschrift_kunde ? `
              <img src="${vertrag.unterschrift_kunde}" alt="Unterschrift Kunde" class="signature-img" />
              <div class="signature-info">
                <p><strong>${vertrag.unterschrift_kunde_name}</strong></p>
                <p>${format(new Date(vertrag.unterschrift_kunde_datum), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr</p>
              </div>
            ` : '<p style="color: #999; font-style: italic;">Noch nicht unterzeichnet</p>'}
          </div>

          <div class="signature-box">
            <h3>Organisation</h3>
            ${vertrag.unterschrift_organisation ? `
              <img src="${vertrag.unterschrift_organisation}" alt="Unterschrift Organisation" class="signature-img" />
              <div class="signature-info">
                <p><strong>${vertrag.unterschrift_organisation_name}</strong></p>
                <p>${format(new Date(vertrag.unterschrift_organisation_datum), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr</p>
              </div>
            ` : '<p style="color: #999; font-style: italic;">Noch nicht unterzeichnet</p>'}
          </div>
        </div>

        <div class="no-print" style="margin-top: 40px; text-align: center;">
          <button onclick="window.print()" style="padding: 12px 24px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Als PDF drucken
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(vertragHTML);
    printWindow.document.close();
  };

  const copyKundenLink = () => {
    // Neuer Link zur Backend-Funktion
    const kundenLink = `https://app.bandguru.de/api/functions/vertragsKundenansicht?id=${vertragId}`;
    navigator.clipboard.writeText(kundenLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isLoading || !vertrag) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Vertrag...</p>
      </div>);

  }

  const statusColors = {
    entwurf: { bg: "bg-gray-100", text: "text-gray-800", label: "Entwurf" },
    versendet: { bg: "bg-blue-100", text: "text-blue-800", label: "Versendet" },
    unterzeichnet: { bg: "bg-green-100", text: "text-green-800", label: "Unterzeichnet" },
    storniert: { bg: "bg-red-100", text: "text-red-800", label: "Storniert" }
  };

  const statusInfo = statusColors[vertrag.status] || statusColors.entwurf;

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="gap-2 mb-4">

              <ArrowLeft className="w-4 h-4" />
              Zurück zur Übersicht
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Vertrag bearbeiten</h1>
            <p className="text-gray-600">{vertrag.titel}</p>
          </div>
          <VertragsForm
            vertrag={vertrag}
            onSubmit={handleUpdateSubmit}
            onCancel={() => setIsEditing(false)}
            kunden={kunden}
            events={events}
            vorlagen={[]} />

        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl('Vertraege'))}
              className="gap-2">

              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            <Badge className={`${statusInfo.bg} ${statusInfo.text} border-none px-3 py-1`}>
              {statusInfo.label}
            </Badge>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{vertrag.titel}</h1>
              {vertrag.vertragsnummer &&
              <p className="text-gray-600">{vertrag.vertragsnummer}</p>
              }
            </div>
            <div className="flex flex-wrap gap-2">
              {vertrag.status === 'entwurf' &&
              <>
                  <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2">

                    <Edit className="w-4 h-4" />
                    Bearbeiten
                  </Button>
                  <Button
                  variant="default"
                  size="sm"
                  onClick={handleSendVertrag}
                  disabled={sendVertragMutation.isPending}
                  className="bg-[#223a5e] hover:bg-blue-700 gap-2">

                    <Send className="w-4 h-4" />
                    {sendVertragMutation.isPending ? "Wird versendet..." : "Vertrag versenden"}
                  </Button>
                </>
              }
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                className="gap-2">

                <Download className="w-4 h-4" />
                PDF Download
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vertragsinhalt */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-xl font-bold">Vertragsinhalt</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Event-Informationen */}
                {vertrag.eventinformationen_anzeigen && event &&
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-lg mb-3">Event-Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>{format(new Date(event.datum_von), 'dd. MMMM yyyy, HH:mm', { locale: de })} Uhr</span>
                      </div>
                      {event.ort_name &&
                    <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span>{event.ort_name}</span>
                        </div>
                    }
                      {event.ort_adresse &&
                    <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span>{event.ort_adresse}</span>
                        </div>
                    }
                    </div>
                  </div>
                }

                {/* Vertragstext */}
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: vertrag.inhalt }} />

              </CardContent>
            </Card>

            {/* Unterschriften */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-xl font-bold">Unterschriften</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Kunde Unterschrift */}
                  <div className="space-y-3">
                    <h3 className="font-semibold">Kunde</h3>
                    {vertrag.unterschrift_kunde ?
                    <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                        <img
                        src={vertrag.unterschrift_kunde}
                        alt="Unterschrift Kunde"
                        className="w-full h-32 object-contain" />

                        <div className="mt-3 text-sm text-gray-600">
                          <p className="font-medium">{vertrag.unterschrift_kunde_name}</p>
                          <p>{format(new Date(vertrag.unterschrift_kunde_datum), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr</p>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-green-600">
                          <Check className="w-4 h-4" />
                          <span className="text-sm font-medium">Unterzeichnet</span>
                        </div>
                      </div> :

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <PenTool className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-gray-600 mb-4">Noch nicht unterzeichnet</p>
                        {vertrag.status !== 'storniert' &&
                      <Button
                        onClick={() => openUnterschriftModal('kunde')}
                        size="sm"
                        className="bg-gradient-to-r from-purple-500 to-pink-600">

                            <PenTool className="w-4 h-4 mr-2" />
                            Unterschreiben
                          </Button>
                      }
                      </div>
                    }
                  </div>

                  {/* Organisation Unterschrift */}
                  <div className="space-y-3">
                    <h3 className="font-semibold">Organisation</h3>
                    {vertrag.unterschrift_organisation ?
                    <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                        <img
                        src={vertrag.unterschrift_organisation}
                        alt="Unterschrift Organisation"
                        className="w-full h-32 object-contain" />

                        <div className="mt-3 text-sm text-gray-600">
                          <p className="font-medium">{vertrag.unterschrift_organisation_name}</p>
                          <p>{format(new Date(vertrag.unterschrift_organisation_datum), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr</p>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-green-600">
                          <Check className="w-4 h-4" />
                          <span className="text-sm font-medium">Unterzeichnet</span>
                        </div>
                      </div> :

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <PenTool className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-gray-600 mb-4">Noch nicht unterzeichnet</p>
                        {vertrag.status !== 'storniert' &&
                      <Button
                        onClick={() => openUnterschriftModal('organisation')}
                        size="sm"
                        className="bg-gradient-to-r from-purple-500 to-pink-600">

                            <PenTool className="w-4 h-4 mr-2" />
                            Unterschreiben
                          </Button>
                      }
                      </div>
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Kundenportal-Link */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">Kundenportal-Link</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-gray-600">
                  Teile diesen Link mit dem Kunden zum Unterschreiben:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={`https://app.bandguru.de/api/functions/vertragsKundenansicht?id=${vertragId}`}
                    readOnly
                    className="text-sm" />

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyKundenLink}>

                    {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => window.open(`https://app.bandguru.de/api/functions/vertragsKundenansicht?id=${vertragId}`, '_blank')}>

                  <ExternalLink className="w-4 h-4" />
                  Kundenansicht öffnen
                </Button>
              </CardContent>
            </Card>

            {/* Details */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {kunde &&
                <div>
                    <p className="text-sm text-gray-500 mb-1">Kunde</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{kunde.firmenname}</p>
                    </div>
                  </div>
                }

                {event &&
                <div>
                    <p className="text-sm text-gray-500 mb-1">Event</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{event.titel}</p>
                    </div>
                  </div>
                }

                {vertrag.unterzeichnen_bis &&
                <div>
                    <p className="text-sm text-gray-500 mb-1">Unterzeichnen bis</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">
                        {format(new Date(vertrag.unterzeichnen_bis), 'dd.MM.yyyy', { locale: de })}
                      </p>
                    </div>
                  </div>
                }

                {vertrag.versendet_am &&
                <div>
                    <p className="text-sm text-gray-500 mb-1">Versendet am</p>
                    <p className="font-medium">
                      {format(new Date(vertrag.versendet_am), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
                    </p>
                  </div>
                }

                <div>
                  <p className="text-sm text-gray-500 mb-1">Erstellt am</p>
                  <p className="font-medium">
                    {format(new Date(vertrag.created_date), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Optionen */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">Optionen</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {vertrag.eventinformationen_anzeigen ?
                  <Check className="w-4 h-4 text-green-600" /> :

                  <X className="w-4 h-4 text-gray-400" />
                  }
                  <span>Eventinformationen anzeigen</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {vertrag.im_kundenportal_sichtbar ?
                  <Check className="w-4 h-4 text-green-600" /> :

                  <X className="w-4 h-4 text-gray-400" />
                  }
                  <span>Im Kundenportal sichtbar</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Unterschrift Modal */}
      {showUnterschriftModal &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>
                  Unterschrift - {unterschriftTyp === 'kunde' ? 'Kunde' : 'Organisation'}
                </CardTitle>
                <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowUnterschriftModal(false);
                  setUnterschriftName("");
                }}>

                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Vollständiger Name *</Label>
                <Input
                value={unterschriftName}
                onChange={(e) => setUnterschriftName(e.target.value)}
                placeholder="z.B. Max Mustermann" />

              </div>

              <div className="space-y-2">
                <Label>Unterschrift zeichnen</Label>
                <div className="border-2 border-gray-300 rounded-lg bg-white">
                  <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing} />

                </div>
                <p className="text-xs text-gray-500">
                  Zeichne deine Unterschrift mit der Maus
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                variant="outline"
                onClick={clearCanvas}>

                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
                <div className="flex gap-2">
                  <Button
                  variant="outline"
                  onClick={() => {
                    setShowUnterschriftModal(false);
                    setUnterschriftName("");
                  }}>

                    Abbrechen
                  </Button>
                  <Button
                  onClick={saveUnterschrift}
                  disabled={saveUnterschriftMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-pink-600">

                    <Check className="w-4 h-4 mr-2" />
                    {saveUnterschriftMutation.isPending ? "Wird gespeichert..." : "Unterschrift speichern"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    </div>);
}