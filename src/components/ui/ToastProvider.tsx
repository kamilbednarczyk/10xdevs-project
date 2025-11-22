import { useCallback, useEffect, useRef, useState } from "react";

import { ToastViewport } from "./Toast";
import { TOAST_DISMISS_EVENT, TOAST_SHOW_EVENT, type ToastMessage } from "@/lib/hooks/useToast";

const DEFAULT_DURATION = 4500;

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Record<string, number>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));

    const timerId = timers.current[id];
    if (timerId) {
      window.clearTimeout(timerId);
      delete timers.current[id];
    }
  }, []);

  useEffect(() => {
    const handleShow = (event: Event) => {
      const detail = (event as CustomEvent<ToastMessage>).detail;

      if (!detail) {
        return;
      }

      setToasts((prev) => [...prev, detail]);

      const timeoutId = window.setTimeout(() => dismissToast(detail.id), detail.duration ?? DEFAULT_DURATION);
      timers.current[detail.id] = timeoutId;
    };

    const handleDismiss = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (!detail) {
        return;
      }
      dismissToast(detail.id);
    };

    window.addEventListener(TOAST_SHOW_EVENT, handleShow);
    window.addEventListener(TOAST_DISMISS_EVENT, handleDismiss);

    return () => {
      window.removeEventListener(TOAST_SHOW_EVENT, handleShow);
      window.removeEventListener(TOAST_DISMISS_EVENT, handleDismiss);

      Object.values(timers.current).forEach((timerId) => window.clearTimeout(timerId));
      timers.current = {};
    };
  }, [dismissToast]);

  return <ToastViewport toasts={toasts} onDismiss={dismissToast} />;
}
