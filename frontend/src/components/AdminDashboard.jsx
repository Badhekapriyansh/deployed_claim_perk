import { useEffect, useState } from "react";
import { fetchAdminStats, fetchAdminCoupons, approveCoupon, rejectCoupon, fetchAdminUsers } from "../api/client.js";

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <p className="text-2xl font-mono font-bold text-ink">{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([fetchAdminStats(), fetchAdminCoupons("pending"), fetchAdminUsers()])
      .then(([s, coups, u]) => {
        setStats(s);
        setPending(coups);
        setUsers(u);
      })
      .catch(() => setError("Couldn't load the admin dashboard."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleApprove = async (id) => {
    await approveCoupon(id);
    setPending((prev) => prev.filter((c) => c.id !== id));
    setStats((s) => (s ? { ...s, pendingCoupons: s.pendingCoupons - 1, approvedCoupons: s.approvedCoupons + 1 } : s));
  };

  const handleReject = async (id) => {
    await rejectCoupon(id);
    setPending((prev) => prev.filter((c) => c.id !== id));
    setStats((s) => (s ? { ...s, pendingCoupons: s.pendingCoupons - 1, rejectedCoupons: s.rejectedCoupons + 1 } : s));
  };

  if (loading) return <p className="text-center text-muted text-sm py-16">Loading…</p>;
  if (error) return <p className="text-center text-coral text-sm py-16">{error}</p>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="font-display font-semibold text-2xl mb-1">Admin dashboard</h1>
        <p className="text-sm text-muted">Approve business campaigns and keep an eye on the platform.</p>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Shoppers" value={stats.totalUsers} />
        <StatCard label="Businesses" value={stats.totalBusinesses} />
        <StatCard label="Total campaigns" value={stats.totalCoupons} />
        <StatCard label="Pending" value={stats.pendingCoupons} />
        <StatCard label="Approved" value={stats.approvedCoupons} />
        <StatCard label="Rejected" value={stats.rejectedCoupons} />
      </section>

      <section>
        <h2 className="font-display font-medium text-base mb-4">Campaigns awaiting approval</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted bg-white border border-dashed border-line rounded-xl p-6 text-center">
            Nothing waiting for review right now.
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white border border-line rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium font-mono">{c.code}</p>
                  <p className="text-xs text-muted">
                    {c.businessName} · {c.product?.name} ·{" "}
                    {c.type === "flat" ? `₹${c.value} off` : `${c.value}% off${c.maxValue ? ` (up to ₹${c.maxValue})` : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(c.id)}
                    className="text-xs font-medium bg-forest text-paper rounded-lg px-3 py-1.5 hover:bg-forest-light"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(c.id)}
                    className="text-xs font-medium border border-line text-muted rounded-lg px-3 py-1.5 hover:text-coral hover:border-coral/40"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display font-medium text-base mb-4">Users</h2>
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2 text-muted">{u.email}</td>
                  <td className="px-4 py-2">
                    <span className="text-xs bg-paper border border-line rounded-full px-2 py-0.5">{u.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
