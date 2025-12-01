import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  DollarSign,
  Music,
  Languages,
  Globe,
  FileText,
  Calendar,
  User,
  MapPin,
  AlertCircle,
  Send } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MusikerForm from "@/components/musiker/MusikerForm";

export default function MusikerDetailPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const musikerId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showEinladungDialog, setShowEinladungDialog] = useState(false);
  const [einladungText, setEinladungText] = useState('');

  const { data: musiker, isLoading } = useQuery({
    queryKey: ['musiker', musikerId],
    queryFn: async () => {
      const result = await base44.entities.Musiker.filter({ id: musikerId });
      return result[0];
    },
    enabled: !!musikerId
  });

  const { data: organisation } = useQuery({
    queryKey: ['organisation', musiker?.org_id],
    queryFn: async () => {
      const orgs = await base44.entities.Organisation.filter({ id: musiker.org_id });
      return orgs[0];
    },
    enabled: !!musiker?.org_id
  });

  const { data: eventMusiker = [] } = useQuery({
    queryKey: ['eventMusiker', musikerId],
    queryFn: () => base44.entities.EventMusiker.filter({ musiker_id: musikerId }),
    enabled: !!musikerId
  });

  const updateMusikerMutation = useMutation({
    mutationFn: (data) => base44.entities.Musiker.update(musikerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musiker', musikerId] });
      queryClient.invalidateQueries({ queryKey: ['musiker'] });
      setIsEditing(false);
    }
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async (customMessage) => {
      if (!musiker.email) {
        throw new Error("Musiker hat keine E-Mail-Adresse");
      }

      const orgName = organisation?.name || 'Das Team';
      const personalMessage = customMessage ? `\n💬 Persönliche Nachricht:\n"${customMessage}"\n` : '';

      const emailBody = `Hey ${musiker.name}! 👋

Du wurdest eingeladen, ${orgName} auf Bandguru als Musiker beizutreten! 🎵
${personalMessage}
Mit Bandguru kannst du:
✨ Events & Auftritte verwalten
💰 Gagen & Finanzen im Blick behalten
📋 Aufgaben & Deadlines managen
💬 Mit dem Team kommunizieren

👉 Hier geht's zur App: https://app.bandguru.de

Viele Grüße,
${orgName} Team`;

      await base44.functions.invoke('sendMailgunEmail', {
        to: musiker.email,
        subject: `🎵 Einladung zu ${orgName} auf Bandguru`,
        body: emailBody,
        from_name: orgName
      });
    },
    onSuccess: () => {
      setShowEinladungDialog(false);
      setEinladungText('');
      alert(`✅ Einladung wurde an ${musiker.email} versendet!`);
    },
    onError: (error) => {
      alert("❌ Fehler beim Versenden der Einladung: " + error.message);
    }
  });

  if (isLoading || !musiker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Musiker...</p>
      </div>);

  }

  const handleUpdateSubmit = (data) => {
    updateMusikerMutation.mutate(data);
  };

  const initials = musiker.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'M';
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
  const color = colors[Math.abs(musiker.name?.charCodeAt(0) || 0) % colors.length];

  // Wenn im Bearbeitungsmodus, zeige das Formular
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Musiker bearbeiten</h1>
            <p className="text-gray-600">{musiker.name}</p>
          </div>
          <MusikerForm
            musiker={musiker}
            onSubmit={handleUpdateSubmit}
            onCancel={() => setIsEditing(false)} />

        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          {/* Back Button */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl('Musiker'))}
              className="gap-2">

              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            {!musiker.aktiv &&
            <Badge variant="outline" className="bg-gray-100">
                Inaktiv
              </Badge>
            }
          </div>

          {/* Profile Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-6">
              <Avatar className={`w-24 h-24 ${color} text-white text-3xl font-bold`}>
                <AvatarFallback className="bg-[#223a5e] rounded-full flex h-full w-full items-center justify-center">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{musiker.name}</h1>
                {musiker.instrumente && musiker.instrumente.length > 0 &&
                <div className="flex flex-wrap gap-2 mb-3">
                    {musiker.instrumente.map((instrument, i) =>
                  <Badge key={i} variant="secondary" className="text-sm">
                        {instrument}
                      </Badge>
                  )}
                  </div>
                }
                {musiker.genre && musiker.genre.length > 0 &&
                <div className="flex items-center gap-2 text-gray-600">
                    <Music className="w-4 h-4" />
                    <span className="text-sm">{musiker.genre.join(', ')}</span>
                  </div>
                }
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditing(true)} className="bg-[#223a5e] text-primary-foreground px-3 text-xs font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 gap-2 hover:bg-purple-700">


                <Edit className="w-4 h-4" />
                Bearbeiten
              </Button>
              {musiker.email &&
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEinladungDialog(true)}
                className="gap-2">

                  <Send className="w-4 h-4" />
                  Einladung senden
                </Button>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Kontaktinformationen */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-xl font-bold">Kontaktinformationen</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {musiker.email &&
                <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">E-Mail</p>
                      <a href={`mailto:${musiker.email}`} className="font-medium text-blue-600 hover:underline">
                        {musiker.email}
                      </a>
                    </div>
                  </div>
                }

                {musiker.telefon &&
                <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Telefon</p>
                      <a href={`tel:${musiker.telefon}`} className="font-medium text-gray-900">
                        {musiker.telefon}
                      </a>
                    </div>
                  </div>
                }

                {musiker.notfallkontakt &&
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Notfallkontakt</p>
                      <p className="font-medium text-gray-900">{musiker.notfallkontakt}</p>
                    </div>
                  </div>
                }
              </CardContent>
            </Card>

            {/* Sprachen & Fähigkeiten */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-xl font-bold">Fähigkeiten & Sprachen</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {musiker.sprachen && musiker.sprachen.length > 0 &&
                <div className="flex items-start gap-3">
                    <Languages className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Sprachen</p>
                      <div className="flex flex-wrap gap-2">
                        {musiker.sprachen.map((sprache, i) =>
                      <Badge key={i} variant="outline" className="text-sm">
                            {sprache}
                          </Badge>
                      )}
                      </div>
                    </div>
                  </div>
                }

                {musiker.genre && musiker.genre.length > 0 &&
                <div className="flex items-start gap-3">
                    <Music className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {musiker.genre.map((g, i) =>
                      <Badge key={i} variant="outline" className="text-sm">
                            {g}
                          </Badge>
                      )}
                      </div>
                    </div>
                  </div>
                }
              </CardContent>
            </Card>

            {/* Buchungsbedingungen */}
            {musiker.buchungsbedingungen &&
            <Card className="border-none shadow-lg">
                <CardHeader className="border-b">
                  <CardTitle className="text-xl font-bold">Buchungsbedingungen</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-700 whitespace-pre-wrap">{musiker.buchungsbedingungen}</p>
                </CardContent>
              </Card>
            }

            {/* Notizen */}
            {musiker.notizen &&
            <Card className="border-none shadow-lg">
                <CardHeader className="border-b">
                  <CardTitle className="text-xl font-bold">Interne Notizen</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-700 whitespace-pre-wrap">{musiker.notizen}</p>
                </CardContent>
              </Card>
            }
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Finanzielle Details */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">Finanzielle Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {musiker.tagessatz_netto &&
                <div>
                    <p className="text-sm text-gray-500 mb-1">Gage</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {musiker.tagessatz_netto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>
                }

                {musiker.reisespesen_regeln &&
                <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-1">Reisespesen-Regeln</p>
                    <p className="text-sm text-gray-700">{musiker.reisespesen_regeln}</p>
                  </div>
                }
              </CardContent>
            </Card>

            {/* Statistiken */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">Statistiken</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Events gespielt</p>
                  <p className="text-2xl font-bold text-gray-900">{eventMusiker.length}</p>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <Badge className={musiker.aktiv ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {musiker.aktiv ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Einladung Dialog */}
      <Dialog open={showEinladungDialog} onOpenChange={setShowEinladungDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Einladung an {musiker?.name}</DialogTitle>
            <DialogDescription>
              Sende eine Einladung zu {organisation?.name} an {musiker?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg text-sm">
              <p><strong>Organisation:</strong> {organisation?.name}</p>
              <p><strong>Musiker:</strong> {musiker?.name}</p>
              <p><strong>E-Mail:</strong> {musiker?.email}</p>
            </div>
            
            <div>
              <Label htmlFor="einladung-text">Persönliche Nachricht (optional)</Label>
              <Textarea
                id="einladung-text"
                value={einladungText}
                onChange={(e) => setEinladungText(e.target.value)}
                placeholder="z.B. Freue mich auf die Zusammenarbeit mit dir!"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Diese Nachricht wird in der E-Mail angezeigt
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEinladungDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => sendInvitationMutation.mutate(einladungText)}
              disabled={sendInvitationMutation.isPending}
              className="text-white"
              style={{ backgroundColor: '#223a5e' }}
            >
              <Send className="w-4 h-4 mr-2" />
              {sendInvitationMutation.isPending ? 'Wird gesendet...' : 'Einladung senden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}