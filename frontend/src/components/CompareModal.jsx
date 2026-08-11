import { useEffect, useState } from "react";
import { compareProducts } from "../api/client.js";

export default function CompareModal({ productIds, onClose, onSelectForCheckout }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productIds || productIds.length === 0) return;
    setLoading(true);
    setError(null);
    compareProducts(productIds)
      .then(setData)
      .catch(() => setError("Failed to compare products."))
      .finally(() => setLoading(false));
  }, [productIds]);

  if (!productIds || productIds.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-line flex items-center justify-between bg-paper/50">
          <div>
            <h2 className="font-display font-bold text-xl text-ink">Compare Deal Perks</h2>
            <p className="text-xs text-muted">Side-by-side total savings and final payable price breakdown</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl font-bold p-1">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center py-12 text-muted text-sm">Calculating deal comparisons…</p>
          ) : error ? (
            <p className="text-center py-12 text-coral text-sm">{error}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-3 px-4 text-xs font-mono text-muted uppercase tracking-wider w-1/4">Perks Metric</th>
                    {data.map(({ product }) => (
                      <th key={product.id} className="py-3 px-4 text-center">
                        {product.image && (product.image.startsWith("http") || product.image.startsWith("data:")) ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-12 h-12 object-contain rounded-md border border-line/60 bg-white p-1 mx-auto mb-1"
                          />
                        ) : (
                          <span className="text-3xl block mb-1">{product.image || "📦"}</span>
                        )}
                        <span className="font-display font-semibold text-ink text-sm block leading-tight">{product.name}</span>
                        <span className="text-xs text-muted font-normal">{product.platform}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  <tr>
                    <td className="py-3 px-4 font-medium text-ink">List Price</td>
                    {data.map(({ product, priceBreakdown }) => (
                      <td key={product.id} className="py-3 px-4 text-center font-mono text-muted">
                        ₹{priceBreakdown.basePrice.toLocaleString("en-IN")}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-ink">Best Coupon</td>
                    {data.map(({ product, priceBreakdown }) => (
                      <td key={product.id} className="py-3 px-4 text-center text-xs text-forest font-mono">
                        {priceBreakdown.bestCoupon ? `-₹${priceBreakdown.bestCoupon.appliedDiscount} (${priceBreakdown.bestCoupon.code})` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-ink">Bank Offer</td>
                    {data.map(({ product, priceBreakdown }) => (
                      <td key={product.id} className="py-3 px-4 text-center text-xs text-forest font-mono">
                        {priceBreakdown.bestBankOffer ? `-₹${priceBreakdown.bestBankOffer.appliedDiscount} (${priceBreakdown.bestBankOffer.bank})` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-ink">UPI Offer</td>
                    {data.map(({ product, priceBreakdown }) => (
                      <td key={product.id} className="py-3 px-4 text-center text-xs text-forest font-mono">
                        {priceBreakdown.bestUpiOffer ? `-₹${priceBreakdown.bestUpiOffer.appliedDiscount} (${priceBreakdown.bestUpiOffer.app})` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-ink">Cashback</td>
                    {data.map(({ product, priceBreakdown }) => (
                      <td key={product.id} className="py-3 px-4 text-center text-xs text-forest font-mono">
                        {priceBreakdown.bestCashback ? `-₹${priceBreakdown.bestCashback.appliedDiscount} (${priceBreakdown.bestCashback.provider})` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-coral/5 font-semibold">
                    <td className="py-3 px-4 text-coral font-display">Total Savings</td>
                    {data.map(({ product, priceBreakdown }) => (
                      <td key={product.id} className="py-3 px-4 text-center font-mono text-coral text-base">
                        ₹{priceBreakdown.totalDiscount.toLocaleString("en-IN")}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-paper font-bold text-base">
                    <td className="py-4 px-4 font-display text-ink">Final Payable Price</td>
                    {data.map(({ product, priceBreakdown }) => (
                      <td key={product.id} className="py-4 px-4 text-center font-mono text-forest text-lg">
                        ₹{priceBreakdown.finalPrice.toLocaleString("en-IN")}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-ink">Best Payment Method</td>
                    {data.map(({ product, priceBreakdown }) => (
                      <td key={product.id} className="py-3 px-4 text-center text-xs font-mono text-muted">
                        {priceBreakdown.bestPaymentMethod ? priceBreakdown.bestPaymentMethod.label : "Any Card/UPI"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 px-4"></td>
                    {data.map(({ product, priceBreakdown }) => (
                      <td key={product.id} className="py-4 px-4 text-center">
                        <button
                          onClick={() => {
                            onClose();
                            onSelectForCheckout(product, {
                              platform: product.platform || "Amazon",
                              logo: "🛒",
                              basePrice: priceBreakdown.basePrice,
                              affiliateUrl: `https://www.amazon.in/dp/${product.id}?tag=claimperks-21`,
                              priceBreakdown
                            });
                          }}
                          className="w-full bg-forest text-white text-xs font-semibold py-2 px-3 rounded-lg hover:bg-forest-light transition-colors shadow-sm flex items-center justify-center gap-1"
                        >
                          <span>View Deal</span>
                          <span>→</span>
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
