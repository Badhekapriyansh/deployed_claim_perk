import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgStyles = type === "error" 
    ? "bg-coral text-white" 
    : type === "info"
    ? "bg-ink text-white"
    : "bg-forest text-white";

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce">
      <div className={`px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium ${bgStyles}`}>
        <span>{type === "error" ? "⚠️" : type === "info" ? "ℹ️" : "✓"}</span>
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 text-xs opacity-75 hover:opacity-100 font-bold">
          ✕
        </button>
      </div>
    </div>
  );
}
