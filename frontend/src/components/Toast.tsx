"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const toastConfig: Record<ToastType, { icon: string; bg: string; border: string; color: string }> = {
  success: {
    icon: "✓",
    bg: "rgba(16, 185, 129, 0.15)",
    border: "rgba(16, 185, 129, 0.5)",
    color: "#10b981",
  },
  error: {
    icon: "✕",
    bg: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.5)",
    color: "#ef4444",
  },
  info: {
    icon: "ℹ",
    bg: "rgba(56, 189, 248, 0.15)",
    border: "rgba(56, 189, 248, 0.5)",
    color: "#38bdf8",
  },
  warning: {
    icon: "⚠",
    bg: "rgba(251, 191, 36, 0.15)",
    border: "rgba(251, 191, 36, 0.5)",
    color: "#fbbf24",
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const config = toastConfig[toast.type];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "16px 20px",
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: "12px",
        backdropFilter: "blur(10px)",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
        animation: "slideIn 0.3s ease-out",
        maxWidth: "400px",
        width: "100%",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: config.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: "700",
          fontSize: "0.875rem",
          flexShrink: 0,
        }}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            color: "white",
            fontWeight: "600",
            fontSize: "0.95rem",
            margin: 0,
            marginBottom: toast.message ? "4px" : 0,
          }}
        >
          {toast.title}
        </p>
        {toast.message && (
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.85rem",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {toast.message}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: "none",
          border: "none",
          color: "#64748b",
          cursor: "pointer",
          padding: "4px",
          fontSize: "1rem",
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 5000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const toast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => showToast("success", title, message),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string) => showToast("error", title, message, 8000),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string) => showToast("info", title, message),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => showToast("warning", title, message, 6000),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: "fixed",
          top: "80px",
          right: "20px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "auto" }}>
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
