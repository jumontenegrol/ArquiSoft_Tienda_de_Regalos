"use client";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastData {
  id: number;
  mensaje: string;
  tipo: ToastType;
}

let addToastFn: ((mensaje: string, tipo: ToastType) => void) | null = null;

export function showToast(mensaje: string, tipo: ToastType = "info") {
  if (addToastFn) addToastFn(mensaje, tipo);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    addToastFn = (mensaje, tipo) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, mensaje, tipo }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };
    return () => { addToastFn = null; };
  }, []);

  const colores = {
    success: "bg-green-500",
    error: "bg-red-400",
    warning: "bg-yellow-400",
    info: "bg-gray-700",
  };

  const iconos = {
    success: "✅", error: "❌", warning: "⚠️", info: "ℹ️",
  };

  return (
    // Responsive placement: centered on small screens, right-aligned on sm+
    <div className="fixed top-6 left-1/2 sm:left-auto right-6 -translate-x-1/2 sm:translate-x-0 z-50 flex flex-col gap-2 items-center sm:items-end px-4">
      {toasts.map(t => (
        <div key={t.id}
          className={`${colores[t.tipo]} text-white px-5 py-4 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold max-w-sm w-full sm:w-auto animate-slide-in`}>
          <span className="text-xl">{iconos[t.tipo]}</span>
          <span>{t.mensaje}</span>
        </div>
      ))}
    </div>
  );
}