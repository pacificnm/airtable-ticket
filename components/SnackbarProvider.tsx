import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircleIcon, CloseIcon, WarningAmberIcon, InfoOutlinedIcon } from './Icons';

type Severity = 'success' | 'error' | 'warning' | 'info';

interface SnackbarContextValue {
  showSnackbar: (message: string, severity?: Severity) => void;
}

const SnackbarContext = createContext<SnackbarContextValue>({
  showSnackbar: () => {},
});

export const useSnackbar = () => useContext(SnackbarContext);

interface Toast {
  id: number;
  message: string;
  severity: Severity;
  exiting?: boolean;
}

const SEVERITY_ICON: Record<Severity, React.ReactElement> = {
  success: <CheckCircleIcon size={18} />,
  error: <WarningAmberIcon size={18} />,
  warning: <WarningAmberIcon size={18} />,
  info: <InfoOutlinedIcon size={18} />,
};

const SEVERITY_CLASSES: Record<Severity, string> = {
  success: 'bg-[#E6FCE8] border-l-[#006400] text-[#006400]',
  error: 'bg-[#FDECEF] border-l-[#9B1C31] text-[#9B1C31]',
  warning: 'bg-[#FFF8E6] border-l-[#8B6914] text-[#8B6914]',
  info: 'bg-[#E8F0FE] border-l-[#003F2D] text-[#003F2D]',
};

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showSnackbar = useCallback((message: string, severity: Severity = 'success') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 200);
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 200);
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-none border-l-[3px] shadow-lg min-w-[320px] max-w-[480px] ${SEVERITY_CLASSES[toast.severity]} ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
          >
            <span className="flex-shrink-0">{SEVERITY_ICON[toast.severity]}</span>
            <span className="flex-1 text-[0.8125rem] font-medium leading-snug">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity p-0.5"
              aria-label="Dismiss"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}
