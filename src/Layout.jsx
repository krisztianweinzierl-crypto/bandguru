
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCircle,
  FileText,
  Music,
  CheckSquare,
  MessageSquare,
  DollarSign,
  Target,
  Building2,
  ChevronDown,
  Menu,
  LogOut,
  Settings,
  Check,
  CalendarDays,
  ChevronRight,
  FileSignature,
  Plus,
  ArrowRight,
  Sparkles,
  Guitar,
  Zap,
  Shield
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  // Nur Vertragsansicht benötigt kein Layout
  const isPublicPage = currentPageName === 'VertragKundenansicht';
  
  if (isPublicPage) {
    return <>{children}</>;
  }

  const [user, setUser] = useState(null);
  const [mitgliedschaften, setMitgliedschaften] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [organisations, setOrganisations] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [orgData, setOrgData] = useState({
    name: "",
    adresse: "",
    steuernummer: "",
    waehrung: "EUR",
    zeitzone: "Europe/Berlin",
    primary_color: "#3B82F6"
  });

  // Prüfe ob wir im iframe (Preview-Modus) sind
  const isInIframe = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      console.log("🔍 Checking authentication...");
      
      let userData = null;
      
      try {
        userData = await base44.auth.me();
      } catch (authError) {
        console.log("⚠️ Auth check failed - user not logged in");
        setIsAuthenticated(false);
        setInitialLoadComplete(true);
        return;
      }
      
      if (!userData || !userData.id) {
        console.log("ℹ️ No user data found");
        setIsAuthenticated(false);
        setInitialLoadComplete(true);
        return;
      }

      console.log("✅ User authenticated:", userData.email);
      
      setUser(userData);
      setIsAuthenticated(true);

      const mitglieder = await base44.entities.Mitglied.filter({ 
        user_id: userData.id,
        status: "aktiv" 
      });
      
      console.log(`📋 ${mitglieder.length} Mitgliedschaften gefunden`);
      setMitgliedschaften(mitglieder);

      if (mitglieder.length > 0) {
        const orgIds = [...new Set(mitglieder.map(m => m.org_id))];
        const orgs = await Promise.all(
          orgIds.map(id => base44.entities.Organisation.filter({ id }))
        );
        const orgList = orgs.flat();
        setOrganisations(orgList);

        const savedOrgId = localStorage.getItem('currentOrgId');
        const org = orgList.find(o => o.id === savedOrgId) || orgList[0];
        
        if (org) {
          console.log("✅ Organisation geladen:", org.name);
          localStorage.setItem('currentOrgId', org.id);
          setCurrentOrg(org);
        }
        setInitialLoadComplete(true);
      } else {
        console.log("ℹ️ Keine Organisation gefunden - zeige Onboarding");
        setShowOnboarding(true);
        setInitialLoadComplete(true);
      }
    } catch (error) {
      console.error("❌ Error during auth check:", error);
      setIsAuthenticated(false);
      setInitialLoadComplete(true);
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    
    if (!orgData.name.trim()) {
      alert("Bitte gib einen Namen für deine Organisation ein");
      return;
    }

    try {
      console.log("🚀 Erstelle Organisation...");
      
      const org = await base44.entities.Organisation.create(orgData);
      console.log("✅ Organisation erstellt:", org.id);
      
      await base44.entities.Mitglied.create({
        org_id: org.id,
        user_id: user.id,
        rolle: "Band Manager",
        status: "aktiv"
      });
      console.log("✅ Mitgliedschaft erstellt");
      
      localStorage.setItem('currentOrgId', org.id);
      window.location.reload();
    } catch (error) {
      console.error("❌ Fehler:", error);
      alert("Fehler beim Erstellen der Organisation: " + error.message);
    }
  };

  const handleOrgChange = (orgId) => {
    const org = organisations.find(o => o.id === orgId);
    setCurrentOrg(org);
    localStorage.setItem('currentOrgId', orgId);
    setShowOrgSwitcher(false);
    window.location.reload();
  };

  const handleLogout = () => {
    if (isInIframe()) {
      // Im Preview-Modus: Einfach zur Login-Seite redirecten
      console.log("🔄 Preview-Modus: Redirect zu Login");
      localStorage.clear();
      window.location.href = '/login';
    } else {
      // Normaler Browser: Standard Logout
      console.log("🔄 Normaler Logout");
      base44.auth.logout();
    }
  };

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const currentMitglied = mitgliedschaften.find(m => m.org_id === currentOrg?.id);
  const isManager = currentMitglied?.rolle === "Band Manager";

  const managerNavItems = [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { 
      title: "Events", 
      icon: Calendar,
      submenu: [
        { title: "Kalender", url: createPageUrl("Kalender"), icon: CalendarDays },
        { title: "Event-Liste", url: createPageUrl("Events"), icon: Calendar }
      ]
    },
    { title: "Musiker", url: createPageUrl("Musiker"), icon: Users },
    { title: "Kunden", url: createPageUrl("Kunden"), icon: UserCircle },
    { title: "Verträge", url: createPageUrl("Vertraege"), icon: FileSignature },
    { title: "Finanzen", url: createPageUrl("Finanzen"), icon: DollarSign },
    { title: "Leads", url: createPageUrl("Leads"), icon: Target },
    { title: "Repertoire", url: createPageUrl("Repertoire"), icon: Music },
    { title: "Aufgaben", url: createPageUrl("Aufgaben"), icon: CheckSquare },
    { title: "Nachrichten", url: createPageUrl("Nachrichten"), icon: MessageSquare },
  ];

  const musikerNavItems = [
    { 
      title: "Events", 
      icon: Calendar,
      submenu: [
        { title: "Kalender", url: createPageUrl("Kalender"), icon: CalendarDays },
        { title: "Meine Events", url: createPageUrl("MeineEvents"), icon: Calendar }
      ]
    },
    { title: "Repertoire", url: createPageUrl("Repertoire"), icon: Music },
    { title: "Meine Aufgaben", url: createPageUrl("MeineAufgaben"), icon: CheckSquare },
    { title: "Nachrichten", url: createPageUrl("Nachrichten"), icon: MessageSquare },
  ];

  const navigationItems = isManager ? managerNavItems : musikerNavItems;

  useEffect(() => {
    navigationItems.forEach((item, index) => {
      if (item.submenu) {
        const isActive = item.submenu.some(sub => location.pathname === sub.url);
        if (isActive && !expandedMenus[index]) {
          setExpandedMenus(prev => ({ ...prev, [index]: true }));
        }
      }
    });
  }, [location.pathname]);

  // Loading
  if (!initialLoadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
            alt="Bandguru Logo"
            className="w-24 h-24 mx-auto mb-4 animate-pulse"
          />
          <h2 className="text-2xl font-bold mb-2">Bandguru</h2>
          <p className="text-gray-600">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // Landing Page für nicht eingeloggte User
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
                alt="Bandguru Logo"
                className="w-12 h-12 object-contain"
              />
              <h1 className="text-2xl font-bold text-gray-900">Bandguru</h1>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => base44.auth.redirectToLogin()}
                className="hidden sm:flex"
              >
                Anmelden
              </Button>
              <Button 
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                Kostenlos starten
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Das ultimative Band-Management Tool
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Verwalte deine Band
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                professionell & einfach
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
              Events organisieren, Musiker koordinieren, Kunden verwalten, Finanzen im Blick behalten – 
              alles an einem Ort. Für Bands, die mehr wollen.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-lg h-14 px-8"
              >
                Jetzt kostenlos starten
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => base44.auth.redirectToLogin()}
                className="text-lg h-14 px-8"
              >
                Anmelden
              </Button>
            </div>
          </div>

          {/* Screenshot/Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent rounded-3xl blur-3xl" />
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/87a1fd4b2_Bildschirmfoto2025-11-02um073357.png"
              alt="Bandguru Dashboard Preview"
              className="relative rounded-2xl shadow-2xl border border-gray-200 w-full"
            />
          </div>
        </section>

        {/* Features */}
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Alles, was deine Band braucht
              </h3>
              <p className="text-xl text-gray-600">
                Von Event-Management bis zur Rechnungsstellung
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle>Event-Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Plane und verwalte alle deine Auftritte an einem Ort. Mit Kalender, Checklisten und automatischen Erinnerungen.
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
                    Verwalte dein Musiker-Netzwerk mit Verfügbarkeiten, Instrumenten und Gagen. Perfekt für flexible Besetzungen.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle>Finanzen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Erstelle Rechnungen, verfolge Zahlungen und behalte Ausgaben im Blick. Alles für eine saubere Buchhaltung.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-orange-600" />
                  </div>
                  <CardTitle>Lead-Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Verfolge Anfragen von der ersten Kontaktaufnahme bis zum gebuchten Event. Nie wieder eine Opportunity verpassen.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                    <Music className="w-6 h-6 text-pink-600" />
                  </div>
                  <CardTitle>Repertoire</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Verwalte Songs, Setlisten und Arrangements. Perfekt für die Planung eurer Shows.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <FileSignature className="w-6 h-6 text-indigo-600" />
                  </div>
                  <CardTitle>Verträge</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Erstelle professionelle Verträge mit digitaler Unterschrift. Rechtssicher und unkompliziert.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-blue-500 to-indigo-600 py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Bereit loszulegen?
            </h3>
            <p className="text-xl text-blue-100 mb-10">
              Erstelle dein kostenloses Konto und manage deine Band professionell
            </p>
            <Button 
              size="lg"
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg h-14 px-8"
            >
              Jetzt kostenlos starten
              <Zap className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
                alt="Bandguru Logo"
                className="w-8 h-8 object-contain opacity-80"
              />
              <span className="text-lg font-semibold text-white">Bandguru</span>
            </div>
            <p className="text-sm">
              © 2025 Bandguru. Professionelles Band-Management für Musiker.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Onboarding anzeigen (KEINE Organisation)
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
                alt="Bandguru Logo"
                className="w-16 h-16 object-contain"
              />
              <h1 className="text-4xl font-bold text-gray-900">Bandguru</h1>
            </div>
            <p className="text-xl text-gray-600">Willkommen {user?.full_name || user?.email}! Lass uns deine Band einrichten.</p>
          </div>

          <Card className="border-none shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <CardTitle className="text-xl">Deine Organisation erstellen</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleCreateOrg} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-semibold">
                    Name deiner Band / Organisation *
                  </Label>
                  <Input
                    id="name"
                    value={orgData.name}
                    onChange={(e) => setOrgData({...orgData, name: e.target.value})}
                    placeholder="z.B. Die Fantastischen Vier"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse (optional)</Label>
                  <Input
                    id="adresse"
                    value={orgData.adresse}
                    onChange={(e) => setOrgData({...orgData, adresse: e.target.value})}
                    placeholder="z.B. Musterstraße 123, 12345 Berlin"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="waehrung">Währung</Label>
                    <select
                      id="waehrung"
                      value={orgData.waehrung}
                      onChange={(e) => setOrgData({...orgData, waehrung: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="CHF">CHF (Fr.)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Primärfarbe</Label>
                    <Input
                      id="color"
                      type="color"
                      value={orgData.primary_color}
                      onChange={(e) => setOrgData({...orgData, primary_color: e.target.value})}
                      className="h-10 cursor-pointer"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  Organisation erstellen
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Warte auf Organisation
  if (!currentOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
            alt="Bandguru Logo"
            className="w-24 h-24 mx-auto mb-4 animate-pulse"
          />
          <h2 className="text-2xl font-bold mb-2">Bandguru</h2>
          <p className="text-gray-600">Lade Organisation...</p>
        </div>
      </div>
    );
  }

  // Normale App mit Sidebar
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
                  alt="Bandguru Logo"
                  className="w-12 h-12 object-contain"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900 truncate">Bandguru</h2>
                  <p className="text-xs text-gray-500 truncate">{currentMitglied?.rolle}</p>
                </div>
              </div>

              <div className="relative">
                <Button 
                  variant="outline" 
                  onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                  className="w-full justify-between h-auto py-3 px-3 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div 
                      className="w-5 h-5 rounded flex-shrink-0"
                      style={{ backgroundColor: currentOrg.primary_color }}
                    />
                    <span className="truncate font-medium text-sm">{currentOrg.name}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
                </Button>

                {showOrgSwitcher && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowOrgSwitcher(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="p-2 text-xs text-gray-500 font-medium border-b">
                        Organisation wechseln
                      </div>
                      {organisations.map((org) => {
                        const mitglied = mitgliedschaften.find(m => m.org_id === org.id);
                        return (
                          <button
                            key={org.id}
                            onClick={() => handleOrgChange(org.id)}
                            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div 
                              className="w-6 h-6 rounded flex-shrink-0"
                              style={{ backgroundColor: org.primary_color }}
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="font-medium text-sm truncate">{org.name}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {mitglied?.rolle}
                              </p>
                            </div>
                            {org.id === currentOrg.id && (
                              <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item, index) => (
                    <SidebarMenuItem key={item.title}>
                      {item.submenu ? (
                        <>
                          <button
                            onClick={() => toggleMenu(index)}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg mb-1 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 ${
                              item.submenu.some(sub => location.pathname === sub.url) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-4 h-4" />
                              <span className="font-medium">{item.title}</span>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedMenus[index] ? 'rotate-90' : ''}`} />
                          </button>
                          
                          {expandedMenus[index] && (
                            <div className="ml-4 mb-1 space-y-1">
                              {item.submenu.map((subItem) => (
                                <SidebarMenuButton
                                  key={subItem.title}
                                  asChild
                                  className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg ${
                                    location.pathname === subItem.url ? 'bg-blue-50 text-blue-700' : ''
                                  }`}
                                >
                                  <Link to={subItem.url} className="flex items-center gap-3 px-3 py-2">
                                    <subItem.icon className="w-4 h-4" />
                                    <span className="font-medium">{subItem.title}</span>
                                  </Link>
                                </SidebarMenuButton>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                            <item.icon className="w-4 h-4" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isManager && (
              <SidebarGroup className="mt-4">
                <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                  Verwaltung
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg ${
                          location.pathname === createPageUrl("OrganisationSettings") ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        <Link to={createPageUrl("OrganisationSettings")} className="flex items-center gap-3 px-3 py-2">
                          <Settings className="w-4 h-4" />
                          <span className="font-medium">Einstellungen</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-9 h-9">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {user?.full_name || user?.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{currentOrg.name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Abmelden
            </button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
                alt="Bandguru Logo"
                className="w-8 h-8 object-contain"
              />
              <h1 className="text-xl font-semibold">Bandguru</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
