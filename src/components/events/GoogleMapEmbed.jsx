import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function GoogleMapEmbed({ address }) {
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const response = await base44.functions.invoke('getGoogleMapsKey');
        setApiKey(response.data.apiKey);
      } catch (error) {
        console.error("Fehler beim Laden des API-Keys:", error);
      } finally {
        setLoading(false);
      }
    };
    loadApiKey();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center border border-gray-200">
        <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
        <p className="text-gray-600 text-sm">Karte wird geladen...</p>
      </div>
    );
  }

  if (!apiKey || !address) {
    return null;
  }

  const encodedAddress = encodeURIComponent(address);

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}&zoom=15`}
      />
    </div>
  );
}