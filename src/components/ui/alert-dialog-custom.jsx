import React from "react";
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AlertDialog({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = "info", // 'info', 'success', 'warning', 'error'
  confirmText = "OK",
  cancelText = "Abbrechen",
  onConfirm,
  showCancel = false
}) {
  if (!isOpen) return null;

  const icons = {
    info: <Info className="w-6 h-6 text-white" />,
    success: <CheckCircle className="w-6 h-6 text-white" />,
    warning: <AlertCircle className="w-6 h-6 text-white" />,
    error: <XCircle className="w-6 h-6 text-white" />
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={showCancel ? handleCancel : handleConfirm}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Header mit Farbe */}
        <div 
          className="px-6 py-4 rounded-t-xl flex items-center gap-3"
          style={{ backgroundColor: '#223a5e' }}
        >
          <div className="p-2 bg-white/20 rounded-lg">
            {icons[type]}
          </div>
          <h2 className="text-lg font-semibold text-white flex-1">
            {title || 'Hinweis'}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Footer mit Buttons */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          {showCancel && (
            <Button
              variant="outline"
              onClick={handleCancel}
              className="min-w-24"
            >
              {cancelText}
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            style={{ backgroundColor: '#223a5e' }}
            className="hover:opacity-90 min-w-24"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook für einfache Verwendung
export function useAlertDialog() {
  const [dialogState, setDialogState] = React.useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Abbrechen',
    onConfirm: null,
    showCancel: false
  });

  const showAlert = ({ title, message, type = 'info', confirmText = 'OK' }) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        showCancel: false,
        onConfirm: () => resolve(true)
      });
    });
  };

  const showConfirm = ({ 
    title, 
    message, 
    type = 'warning', 
    confirmText = 'OK', 
    cancelText = 'Abbrechen' 
  }) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        showCancel: true,
        onConfirm: () => resolve(true)
      });
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
    // Wenn Cancel geklickt wurde und es ein Confirm war, resolve mit false
    if (dialogState.showCancel && !dialogState.onConfirm) {
      return Promise.resolve(false);
    }
  };

  const AlertDialogComponent = () => (
    <AlertDialog
      {...dialogState}
      onClose={closeDialog}
    />
  );

  return {
    showAlert,
    showConfirm,
    AlertDialog: AlertDialogComponent
  };
}