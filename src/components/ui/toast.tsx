import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

export interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl ${
          type === "success"
            ? "bg-emerald-950/90 text-emerald-400 border-emerald-500/30"
            : "bg-red-950/90 text-red-400 border-red-500/30"
        }`}
      >
        {type === "success" ? (
          <CheckCircle2 className="w-5 h-5 shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 shrink-0" />
        )}
        <span className="text-xs font-semibold">{message}</span>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white/70 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
