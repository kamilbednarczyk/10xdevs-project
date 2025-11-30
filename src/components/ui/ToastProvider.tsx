import { useCallback, useEffect, useRef, useState } from "react";

import { ToastViewport } from "./Toast";
import { TOAST_DISMISS_EVENT, TOAST_SHOW_EVENT, type ToastMessage } from "@/lib/hooks/useToast";

const DEFAULT_DURATION = 4500;

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));

    const timerId = timers.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timers.current.delete(id);
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
      timers.current.set(detail.id, timeoutId);
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
    const timersMap = timers.current;

    return () => {
      window.removeEventListener(TOAST_SHOW_EVENT, handleShow);
      window.removeEventListener(TOAST_DISMISS_EVENT, handleDismiss);

      timersMap.forEach((timerId) => window.clearTimeout(timerId));
      timersMap.clear();
    };
  }, [dismissToast]);

  return <ToastViewport toasts={toasts} onDismiss={dismissToast} />;
}
