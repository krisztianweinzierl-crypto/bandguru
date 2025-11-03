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

const iconMap = {
  Calendar,
  CheckCircle,
  FileText,
  Users,
  Target,
  FileSignature,
  Music,
  AlertCircle
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
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="notification-bell relative p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
      >
        <Bell className={`w-6 h-6 transition-all duration-200 ${
          ungeleseneCount > 0 
            ? 'text-blue-600 group-hover:text-blue-700' 
            : 'text-gray-500 group-hover:text-gray-700'
        }`} />
        {ungeleseneCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
            {ungeleseneCount > 99 ? '99+' : ungeleseneCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="notification-dropdown absolute right-0 mt-3 w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">Benachrichtigungen</h3>
                  {ungeleseneCount > 0 && (
                    <p className="text-blue-100 text-xs">{ungeleseneCount} ungelesen</p>
                  )}
                </div>
              </div>
              {ungeleseneCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-white hover:bg-white/20 text-xs h-8 px-3 rounded-lg"
                >
                  Alle gelesen
                </Button>
              )}
            </div>

            {/* Content */}
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
                        className={`px-5 py-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer relative group ${
                          !notification.gelesen ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        {!notification.gelesen && (
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(notification.prioritaet)} rounded-r`} />
                        )}
                        
                        <div className="flex items-start gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColor} shadow-sm`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className={`text-sm leading-snug ${!notification.gelesen ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {notification.titel}
                              </p>
                              {!notification.gelesen && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2 leading-relaxed">
                              {notification.nachricht}
                            </p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <span>{format(new Date(notification.created_date), 'dd. MMM yyyy', { locale: de })}</span>
                              <span>•</span>
                              <span>{format(new Date(notification.created_date), 'HH:mm', { locale: de })} Uhr</span>
                            </p>
                          </div>

                          <button
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="flex-shrink-0 p-1.5 hover:bg-gray-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Keine Benachrichtigungen</h3>
                  <p className="text-sm text-gray-500">Du bist auf dem neuesten Stand!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {benachrichtigungen.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-3 bg-gray-50">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Alle Benachrichtigungen anzeigen →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}