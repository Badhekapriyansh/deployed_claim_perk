import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [isBusiness, setIsBusiness] = useState(false);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password, isBusiness ? "business" : "user", businessName);
      }
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-30" onClick={onClose}>
      <div
        className="bg-white rounded-xl max-w-sm w-full shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-lg">
            {mode === "login" ? "Log in" : "Create an account"}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-lg leading-none">
            ✕
          </button>
        </div>

        {mode === "register" && (
          <div className="flex bg-paper border border-line rounded-lg p-1 mb-4 text-sm">
            <button
              type="button"
              onClick={() => setIsBusiness(false)}
              className={`flex-1 py-1.5 rounded-md transition-colors ${!isBusiness ? "bg-forest text-paper" : "text-muted"}`}
            >
              I'm shopping
            </button>
            <button
              type="button"
              onClick={() => setIsBusiness(true)}
              className={`flex-1 py-1.5 rounded-md transition-colors ${isBusiness ? "bg-forest text-paper" : "text-muted"}`}
            >
              I'm a business
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <input
              type="text"
              placeholder={isBusiness ? "Your name" : "Full name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-line rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            />
          )}
          {mode === "register" && isBusiness && (
            <input
              type="text"
              placeholder="Business / brand name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="w-full border border-line rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-line rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border border-line rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />

          {error && <p className="text-xs text-coral">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-forest text-paper rounded-lg py-2.5 text-sm font-medium hover:bg-forest-light transition-colors disabled:opacity-60"
          >
            {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-4">
          {mode === "login" ? "New to Claim Perks?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setError(null);
              setMode(mode === "login" ? "register" : "login");
            }}
            className="text-forest font-medium hover:underline"
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>

        {mode === "login" && (
          <p className="text-[11px] text-muted text-center mt-3 font-mono">
            Admin demo login: admin@claimperks.com / admin123
          </p>
        )}
      </div>
    </div>
  );
}
