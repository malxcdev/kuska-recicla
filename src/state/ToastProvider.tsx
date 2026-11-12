import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { ToastContext } from "./contexts";

const TOAST_MS = 2800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const announce = useCallback((message: string) => {
    // Cada aviso reinicia el temporizador: uno nuevo nunca se corta por el anterior.
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={announce}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <Icon name="check" />
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
