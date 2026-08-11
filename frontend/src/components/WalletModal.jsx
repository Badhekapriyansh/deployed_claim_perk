import { useEffect, useState } from "react";
import { fetchWallet, withdrawWallet } from "../api/client.js";

export default function WalletModal({ user, onClose, onWalletUpdated }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState(user?.preferredUpi ? `${user.name.toLowerCase().replace(/\s+/g, "")}@upi` : "user@okaxis");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = () => {
    setLoading(true);
    fetchWallet()
      .then(setWallet)
      .catch(() => setError("Failed to load wallet balance."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const num = Number(amount);
    if (!num || num <= 0) {
      setError("Please enter a valid amount to withdraw.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await withdrawWallet(num, upiId);
      setWallet(res.wallet);
      setSuccess(`Successfully transferred ₹${num} to ${upiId}!`);
      setAmount("");
      if (onWalletUpdated) onWalletUpdated(res.wallet);
    } catch (err) {
      setError(err?.response?.data?.error || "Withdrawal failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const referralCode = `PERKS-${(user?.name || "SHOPPER").toUpperCase().replace(/\s+/g, "")}50`;

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-line bg-forest text-paper flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-paper/80 font-semibold">
              Perks Rewards Wallet
            </span>
            <h2 className="font-display font-bold text-xl text-paper">Cashback & Referral Rewards</h2>
          </div>
          <button onClick={onClose} className="text-paper/80 hover:text-paper text-xl font-bold p-1">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Balance Card */}
          <div className="bg-paper border border-line rounded-2xl p-5 text-center shadow-sm">
            <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Available Wallet Balance</p>
            <h3 className="font-mono text-4xl font-bold text-forest mb-2">
              ₹{wallet?.balance ? wallet.balance.toLocaleString("en-IN") : "0"}
            </h3>
            <p className="text-xs text-muted">Earn 5% cashback on every deal claimed + ₹200 per friend referral!</p>
          </div>

          {/* Referral Banner */}
          <div className="bg-coral/10 border border-coral/30 rounded-xl p-4">
            <h4 className="font-display font-semibold text-sm text-coral mb-1">Invite Friends, Earn ₹200 Cashback</h4>
            <p className="text-xs text-muted mb-2">Share your exclusive code. When your friend registers, you both get ₹200 credited.</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralCode}
                className="bg-white border border-line rounded-lg px-3 py-1.5 font-mono text-xs font-bold text-ink flex-1"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralCode);
                  alert("Referral code copied to clipboard!");
                }}
                className="bg-coral text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-coral/90 transition-colors"
              >
                Copy Code
              </button>
            </div>
          </div>

          {/* Instant UPI Withdrawal Form */}
          <form onSubmit={handleWithdraw} className="space-y-3 pt-2 border-t border-line">
            <h4 className="font-display font-semibold text-sm text-ink">Transfer to Bank / UPI</h4>
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Withdraw Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount (e.g. 250)"
                className="w-full border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Target UPI ID</label>
              <input
                type="text"
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="mobile@gpay or username@upi"
                className="w-full border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 font-mono text-xs"
              />
            </div>

            {error && <p className="text-xs text-coral">{error}</p>}
            {success && <p className="text-xs text-forest font-semibold">{success}</p>}

            <button
              type="submit"
              disabled={submitting || !wallet?.balance}
              className="w-full bg-forest text-white py-2.5 px-4 rounded-xl text-xs font-semibold hover:bg-forest-light transition-colors disabled:opacity-50"
            >
              {submitting ? "Transferring…" : "Withdraw to UPI Instant"}
            </button>
          </form>

          {/* Transactions List */}
          <div className="pt-2 border-t border-line space-y-2">
            <h4 className="font-display font-semibold text-xs text-muted uppercase font-mono">Recent Wallet Transactions</h4>
            {loading ? (
              <p className="text-center py-4 text-xs text-muted">Loading transactions…</p>
            ) : wallet?.transactions?.length === 0 ? (
              <p className="text-center py-4 text-xs text-muted">No wallet transactions yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {wallet?.transactions?.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-line/50">
                    <div>
                      <p className="font-medium text-ink">{t.title}</p>
                      <p className="text-[10px] text-muted font-mono">{new Date(t.date).toLocaleDateString("en-IN")}</p>
                    </div>
                    <span className={`font-mono font-bold ${t.type === "credit" ? "text-forest" : "text-coral"}`}>
                      {t.type === "credit" ? "+" : "-"}₹{t.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
