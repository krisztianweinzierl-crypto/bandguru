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
  FileSignature
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

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  // WICHTIG: Vertragsansicht benötigt KEIN Layout und KEINE Auth
  // Diese Seite muss öffentlich zugänglich sein (Magic-Links)
  const isPublicPage = currentPageName === 'VertragKundenansicht';
  
  // Wenn es eine öffentliche Seite ist, rendere nur den Content ohne Layout
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Ab hier: Nur für geschützte Seiten (mit Auth)
  const [user, setUser] = useState(null);
  const [mitgliedschaften, setMitgliedschaften] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [organisations, setOrganisations] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

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
        console.log("⚠️ Auth check failed - redirecting to login");
        // Nicht eingeloggt - Base44 zeigt automatisch Login-Screen
        setIsAuthenticated(false);
        setInitialLoadComplete(true);
        return;
      }
      
      if (!userData || !userData.id) {
        console.log("ℹ️ No user data found - redirecting to login");
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
          localStorage.setItem('currentOrgId', org.id);
          setCurrentOrg(org);
        }
        setInitialLoadComplete(true);
      } else {
        setInitialLoadComplete(true);
        window.location.href = createPageUrl('Onboarding');
      }
    } catch (error) {
      console.error("❌ Unexpected error during auth check:", error);
      setIsAuthenticated(false);
      setInitialLoadComplete(true);
    }
  };

  const handleOrgChange = (orgId) => {
    const org = organisations.find(o => o.id === orgId);
    setCurrentOrg(org);
    localStorage.setItem('currentOrgId', orgId);
    setShowOrgSwitcher(false);
    window.location.reload();
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

  // Während Auth-Check läuft: Loading Screen
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

  // Nicht eingeloggt: Base44 zeigt automatisch Login-Screen
  // Wir zeigen nur einen kurzen Loading Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
            alt="Bandguru Logo"
            className="w-24 h-24 mx-auto mb-4 animate-pulse"
          />
          <h2 className="text-2xl font-bold mb-2">Bandguru</h2>
          <p className="text-gray-600">Authentifizierung läuft...</p>
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

  // User ist authentifiziert und Organisation ist geladen - zeige App
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
              onClick={() => base44.auth.logout()}
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