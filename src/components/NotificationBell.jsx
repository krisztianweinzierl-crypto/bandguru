import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  FileText, 
  Users, 
  Target,
  FileSignature,
  Music,
  AlertCircle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";

import { UserPlus } from "lucide-react";

const iconMap = {
  Calendar,
  CheckCircle,
  FileText,
  Users,
  Target,
  FileSignature,
  Music,
  AlertCircle,
  UserPlus
};

export default function NotificationBell({ user, currentOrgId }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: benachrichtigungen = [] } = useQuery({
    queryKey: ['benachrichtigungen', user?.id, currentOrgId],
    queryFn: () => base44.entities.Benachrichtigung.filter({ 
      user_id: user.id,
      org_id: currentOrgId
    }, '-created_date', 50),
    enabled: !!user?.id && !!currentOrgId,
    refetchInterval: 30000,
  });

  const ungeleseneCount = benachrichtigungen.filter(b => !b.gelesen).length;

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Benachrichtigung.update(id, { gelesen: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benachrichtigungen'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Benachrichtigung.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benachrichtigungen'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const ungelesen = benachrichtigungen.filter(b => !b.gelesen);
      await Promise.all(
        ungelesen.map(b => base44.entities.Benachrichtigung.update(b.id, { gelesen: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benachrichtigungen'] });
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.gelesen) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.link_url) {
      navigate(notification.link_url);
      setShowDropdown(false);
    }
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(id);
  };

  const getPriorityColor = (prioritaet) => {
    switch (prioritaet) {
      case 'hoch': return 'bg-red-500';
      case 'normal': return 'bg-blue-500';
      case 'niedrig': return 'bg-gray-400';
      default: return 'bg-blue-500';
    }
  };

  const getTypeColor = (typ) => {
    switch (typ) {
      case 'event_einladung': return 'text-blue-600 bg-blue-50';
      case 'event_update': return 'text-indigo-600 bg-indigo-50';
      case 'aufgabe_zugewiesen': return 'text-orange-600 bg-orange-50';
      case 'rechnung_bezahlt': return 'text-green-600 bg-green-50';
      case 'neuer_lead': return 'text-purple-600 bg-purple-50';
      case 'vertrag_unterschrieben': return 'text-emerald-600 bg-emerald-50';
      case 'musiker_zugesagt': return 'text-green-600 bg-green-50';
      case 'musiker_abgelehnt': return 'text-red-600 bg-red-50';
      case 'neuer_nutzer': return 'text-teal-600 bg-teal-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.notification-dropdown') && !event.target.closest('.notification-bell')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="notification-bell relative p-1.5 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {ungeleseneCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {ungeleseneCount > 9 ? '9+' : ungeleseneCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="notification-dropdown absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="bg-gradient-to-r from-[#223a5e] to-[#1a4a6e] px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Benachrichtigungen
              </h3>
              {ungeleseneCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-white hover:bg-white/20 text-xs h-7 px-2"
                >
                  Alle gelesen
                </Button>
              )}
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {benachrichtigungen.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {benachrichtigungen.map((notification) => {
                    const IconComponent = iconMap[notification.icon] || Bell;
                    const typeColor = getTypeColor(notification.typ);
                    
                    return (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer relative ${
                          !notification.gelesen ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        {!notification.gelesen && (
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(notification.prioritaet)}`} />
                        )}
                        
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm mb-1 ${!notification.gelesen ? 'font-semibold' : 'font-medium'}`}>
                              {notification.titel}
                            </p>
                            <p className="text-xs text-gray-600 mb-1.5 line-clamp-2">
                              {notification.nachricht}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(notification.created_date), 'dd. MMM yyyy, HH:mm', { locale: de })} Uhr
                            </p>
                          </div>

                          <button
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-12 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">Keine Benachrichtigungen</p>
                </div>
              )}
            </div>

            {benachrichtigungen.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-2.5 bg-gray-50 text-center">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Alle Benachrichtigungen anzeigen
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}