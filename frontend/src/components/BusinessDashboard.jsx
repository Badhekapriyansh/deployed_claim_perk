import { useEffect, useState } from "react";
import { fetchProducts, fetchMyCoupons, createCoupon, deleteCoupon, fetchBusinessAnalytics } from "../api/client.js";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-forest/10 text-forest border-forest/30",
  rejected: "bg-coral/10 text-coral border-coral/30"
};

export default function BusinessDashboard() {
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ productId: "", code: "", type: "flat", value: "", maxValue: "" });

  const load = () => {
    setLoading(true);
    Promise.all([fetchProducts("", "", 1, 200), fetchMyCoupons(), fetchBusinessAnalytics().catch(() => null)])
      .then(([prodResult, coups, stats]) => {
        setProducts(prodResult.products);
        setCoupons(coups);
        setAnalytics(stats);
        if (prodResult.products.length && !form.productId) setForm((f) => ({ ...f, productId: prodResult.products[0].id }));
      })
      .catch(() => setError("Couldn't load your business dashboard."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createCoupon({
        productId: form.productId,
        code: form.code,
        type: form.type,
        value: Number(form.value),
        maxValue: form.maxValue ? Number(form.maxValue) : undefined
      });
      setForm((f) => ({ ...f, code: "", value: "", maxValue: "" }));
      const coups = await fetchMyCoupons();
      setCoupons(coups);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't create that campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteCoupon(id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) return <p className="text-center text-muted text-sm py-16">Loading…</p>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="font-display font-semibold text-2xl mb-1">Business dashboard</h1>
        <p className="text-sm text-muted">Create coupon campaigns for your products. New campaigns need admin approval before shoppers see them.</p>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-line rounded-xl p-4 text-center shadow-sm">
            <span className="text-xs text-muted font-mono uppercase block mb-1">Impressions</span>
            <span className="font-mono text-xl font-bold text-ink">{analytics.totalImpressions.toLocaleString("en-IN")}</span>
          </div>
          <div className="bg-white border border-line rounded-xl p-4 text-center shadow-sm">
            <span className="text-xs text-muted font-mono uppercase block mb-1">Clicks & Claims</span>
            <span className="font-mono text-xl font-bold text-ink">{analytics.totalClicks.toLocaleString("en-IN")}</span>
          </div>
          <div className="bg-white border border-line rounded-xl p-4 text-center shadow-sm">
            <span className="text-xs text-muted font-mono uppercase block mb-1">Click-Through Rate</span>
            <span className="font-mono text-xl font-bold text-forest">{analytics.ctr}</span>
          </div>
          <div className="bg-white border border-line rounded-xl p-4 text-center shadow-sm">
            <span className="text-xs text-muted font-mono uppercase block mb-1">Discounts Claimed</span>
            <span className="font-mono text-xl font-bold text-coral">₹{analytics.totalDiscountsClaimed.toLocaleString("en-IN")}</span>
          </div>
        </section>
      )}

      <section className="bg-white border border-line rounded-xl p-6">
        <h2 className="font-display font-medium text-base mb-4">Create a campaign</h2>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block text-muted mb-1">Product</span>
            <select
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              className="w-full border border-line rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="block text-muted mb-1">Coupon code</span>
            <input
              type="text"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. SUMMER200"
              className="w-full border border-line rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
          </label>

          <label className="text-sm">
            <span className="block text-muted mb-1">Discount type</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-line rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            >
              <option value="flat">Flat amount (₹)</option>
              <option value="percent">Percentage (%)</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="block text-muted mb-1">{form.type === "flat" ? "Discount amount (₹)" : "Discount %"}</span>
            <input
              type="number"
              required
              min="1"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="w-full border border-line rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
          </label>

          {form.type === "percent" && (
            <label className="text-sm sm:col-span-2">
              <span className="block text-muted mb-1">Max discount cap (₹, optional)</span>
              <input
                type="number"
                min="0"
                value={form.maxValue}
                onChange={(e) => setForm({ ...form, maxValue: e.target.value })}
                className="w-full border border-line rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
              />
            </label>
          )}

          {error && <p className="text-xs text-coral sm:col-span-2">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 bg-forest text-paper rounded-lg py-2.5 text-sm font-medium hover:bg-forest-light transition-colors disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit for approval"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display font-medium text-base mb-4">Your campaigns</h2>
        {coupons.length === 0 ? (
          <p className="text-sm text-muted bg-white border border-dashed border-line rounded-xl p-6 text-center">
            No campaigns yet — create one above.
          </p>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white border border-line rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium font-mono">{c.code}</p>
                  <p className="text-xs text-muted">
                    {c.product?.name} · {c.type === "flat" ? `₹${c.value} off` : `${c.value}% off${c.maxValue ? ` (up to ₹${c.maxValue})` : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${STATUS_STYLES[c.status]}`}>
                    {c.status}
                  </span>
                  {c.status !== "approved" && (
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-muted hover:text-coral">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
