import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Music, 
  CheckSquare, 
  MessageSquare,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function LandingPage() {
  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
              alt="Bandguru Logo"
              className="w-32 h-32 object-contain animate-pulse"
            />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Willkommen bei <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">Bandguru</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Die All-in-One Lösung für professionelles Band-Management. 
            Events planen, Musiker verwalten, Finanzen im Blick behalten.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-lg px-8 py-6"
            >
              Jetzt anmelden
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Event-Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Verwalte alle deine Auftritte an einem Ort. Von der Anfrage bis zur Abrechnung.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Musiker-Pool</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Verwalte dein Musiker-Netzwerk mit allen wichtigen Infos zu Instrumenten und Gagen.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>Finanz-Übersicht</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Behalte Einnahmen und Ausgaben im Blick. Rechnungen erstellen und Zahlungen tracken.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Music className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle>Repertoire-Verwaltung</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Verwalte dein Song-Repertoire und erstelle Setlisten für jeden Auftritt.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <CheckSquare className="w-6 h-6 text-pink-600" />
              </div>
              <CardTitle>Aufgaben-Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Organisiere Aufgaben und Deadlines. Nichts geht mehr unter.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-cyan-600" />
              </div>
              <CardTitle>Team-Kommunikation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Kommuniziere mit deinem Team und halte alle auf dem Laufenden.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="border-none shadow-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white max-w-3xl mx-auto">
            <CardContent className="p-12">
              <Sparkles className="w-16 h-16 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">
                Bereit durchzustarten?
              </h2>
              <p className="text-lg mb-8 text-blue-50">
                Melde dich jetzt an und bringe dein Band-Management auf das nächste Level.
              </p>
              <Button 
                onClick={handleLogin}
                size="lg"
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6"
              >
                Jetzt anmelden
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}