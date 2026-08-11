import { useState } from "react";
import { updateProfile } from "../api/client.js";

export default function UserProfileModal({ user, onClose, onProfileUpdated }) {
  const [name, setName] = useState(user?.name || "");
  const [preferredBank, setPreferredBank] = useState(user?.preferredBank || "");
  const [preferredUpi, setPreferredUpi] = useState(user?.preferredUpi || "");
  const [address, setAddress] = useState(user?.address || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const updated = await updateProfile({ name, preferredBank, preferredUpi, address });
      setSuccess(true);
      onProfileUpdated(updated);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-line bg-paper/50 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-ink">Profile & Preferences</h2>
            <p className="text-xs text-muted">Customize your default banks to auto-calculate your max deal savings</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl font-bold p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">Email (Read Only)</label>
            <input
              type="email"
              disabled
              value={user?.email || ""}
              className="w-full border border-line rounded-lg p-2.5 text-sm bg-paper text-muted cursor-not-allowed font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">Preferred Bank (For Card Offers)</label>
            <select
              value={preferredBank}
              onChange={(e) => setPreferredBank(e.target.value)}
              className="w-full border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            >
              <option value="">No preference (Show best offer)</option>
              <option value="HDFC Bank">HDFC Bank</option>
              <option value="ICICI Bank">ICICI Bank</option>
              <option value="SBI">State Bank of India (SBI)</option>
              <option value="Axis Bank">Axis Bank</option>
              <option value="Kotak">Kotak Mahindra Bank</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">Preferred UPI App</label>
            <select
              value={preferredUpi}
              onChange={(e) => setPreferredUpi(e.target.value)}
              className="w-full border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            >
              <option value="">No preference (Show best offer)</option>
              <option value="Google Pay">Google Pay</option>
              <option value="PhonePe">PhonePe</option>
              <option value="Paytm">Paytm</option>
              <option value="Cred UPI">Cred UPI</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">Default Delivery Address</label>
            <textarea
              rows="2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House/Flat No., Street, City, Pincode"
              className="w-full border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
          </div>

          {error && <p className="text-xs text-coral">{error}</p>}
          {success && <p className="text-xs text-forest font-semibold">✓ Profile & preferences saved!</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-forest text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-forest-light transition-colors disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save Preferences"}
          </button>
        </form>
      </div>
    </div>
  );
}
