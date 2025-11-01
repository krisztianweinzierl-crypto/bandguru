import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function AuthWrapper({ children }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Versuche zu prüfen, ob User eingeloggt ist
      const authStatus = await base44.auth.isAuthenticated();
      
      if (!authStatus) {
        // Nicht eingeloggt - zur Login-Seite weiterleiten
        console.log("Not authenticated, redirecting to login...");
        base44.auth.redirectToLogin();
        return;
      }

      // User ist eingeloggt
      setIsAuthenticated(true);
      setIsChecking(false);
    } catch (error) {
      // Bei jedem Fehler zur Login-Seite
      console.log("Auth check failed, redirecting to login...", error);
      base44.auth.redirectToLogin();
    }
  };

  // Während der Prüfung: Zeige Loading
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
            alt="Bandguru Logo"
            className="w-24 h-24 mx-auto mb-4 animate-pulse"
          />
          <h2 className="text-2xl font-bold mb-2">Bandguru</h2>
          <p className="text-gray-600">Authentifizierung prüfen...</p>
        </div>
      </div>
    );
  }

  // Wenn authentifiziert: Zeige App
  if (isAuthenticated) {
    return children;
  }

  // Fallback (sollte nicht erreicht werden)
  return null;
}