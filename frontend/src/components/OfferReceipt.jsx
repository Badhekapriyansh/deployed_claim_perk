import { useState } from "react";
import PriceHistoryChart from "./PriceHistoryChart.jsx";

export default function OfferReceipt({
  product,
  offers,
  priceBreakdown,
  platformDeals = [],
  bestDeal,
  priceHistory = [],
  onClose,
  user,
  isFavorited,
  onToggleFavorite,
  onSelectDeal,
  onSetAlert
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [alertSet, setAlertSet] = useState(false);

  const mainBestCoupon = priceBreakdown?.bestCoupon;

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAlert = () => {
    setAlertSet(true);
    if (onSetAlert && bestDeal) onSetAlert(product, Math.round(bestDeal.priceBreakdown.finalPrice * 0.95));
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-line bg-paper/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {product.image && (product.image.startsWith("http") || product.image.startsWith("data:")) ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-12 h-12 object-contain rounded-md border border-line/60 bg-white p-1"
              />
            ) : (
              <span className="text-4xl">{product.image || "📦"}</span>
            )}
            <div>
              <span className="text-[10px] uppercase tracking-widest text-forest font-mono font-semibold">
                Multi-Platform Deal Comparison
              </span>
              <h3 className="font-display font-bold text-lg text-ink leading-tight">{product.name}</h3>
              <p className="text-xs text-muted font-mono">{product.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={() => onToggleFavorite(product.id)}
                className="text-xl p-1 hover:scale-110 transition-transform"
                title={isFavorited ? "Remove from favorites" : "Save to favorites"}
              >
                {isFavorited ? "❤️" : "🤍"}
              </button>
            )}
            <button onClick={onClose} className="text-muted hover:text-ink text-xl font-bold p-1">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Best Overall Deal Banner */}
          {bestDeal && (
            <div className="bg-forest/10 border border-forest/30 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-forest bg-forest/20 px-2 py-0.5 rounded">
                  🏆 Lowest Guaranteed Deal
                </span>
                <h4 className="font-display font-bold text-base text-ink mt-1">
                  ₹{bestDeal.priceBreakdown.finalPrice.toLocaleString("en-IN")}{" "}
                  <span className="text-xs text-muted font-normal">on {bestDeal.platform}</span>
                </h4>
                <p className="text-xs text-forest font-semibold mt-0.5">
                  Save ₹{bestDeal.priceBreakdown.totalDiscount.toLocaleString("en-IN")} ({bestDeal.priceBreakdown.savingsPercent}% OFF)
                </p>
              </div>
              <button
                onClick={() => onSelectDeal(bestDeal)}
                className="bg-forest text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-forest-light transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span>View Deal</span>
                <span>→</span>
              </button>
            </div>
          )}

          {/* Coupon Code Banner */}
          {mainBestCoupon && (
            <div className="bg-paper border border-line rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-muted font-mono uppercase">Top Applied Code:</span>
                <p className="font-mono font-bold text-forest text-sm">{mainBestCoupon.code}</p>
              </div>
              <button
                onClick={() => handleCopyCode(mainBestCoupon.code)}
                className="bg-paper border border-line text-ink hover:bg-line/40 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                {copiedCode ? "✓ Copied!" : "📋 Copy Code"}
              </button>
            </div>
          )}

          {/* Platform Deals List */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-xs text-muted uppercase font-mono tracking-wider">
              Store Price Comparison ({platformDeals.length} Platforms)
            </h4>

            {platformDeals.map((deal) => (
              <div
                key={deal.platform}
                className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  deal.platform === bestDeal?.platform
                    ? "border-forest bg-forest/5 shadow-sm"
                    : "border-line bg-white hover:border-forest/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{deal.logo}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-sm text-ink">{deal.platform}</h4>
                      {deal.platform === bestDeal?.platform && (
                        <span className="text-[9px] font-mono font-bold uppercase bg-forest text-white px-1.5 py-0.5 rounded">
                          Best Price
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted font-mono mt-0.5">
                      List: ₹{deal.basePrice.toLocaleString("en-IN")} · Perks: -₹{deal.priceBreakdown.totalDiscount.toLocaleString("en-IN")}
                    </p>
                    {deal.priceBreakdown.bestPaymentMethod && (
                      <p className="text-[10px] text-forest font-semibold mt-1">
                        💳 Pay via {deal.priceBreakdown.bestPaymentMethod.label} for max savings
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-line pt-2 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-forest font-bold font-mono block">
                      Save {deal.priceBreakdown.savingsPercent}% OFF
                    </span>
                    <span className="font-mono text-lg font-bold text-forest">
                      ₹{deal.priceBreakdown.finalPrice.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectDeal(deal)}
                    className="bg-forest text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-forest-light transition-colors shadow-sm whitespace-nowrap"
                  >
                    View Deal →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Price History Trend Chart */}
          <PriceHistoryChart priceHistory={priceHistory} currentPrice={bestDeal?.priceBreakdown?.finalPrice || product.basePrice} />

          {/* Price Alert Trigger */}
          <div className="flex items-center justify-between pt-2 border-t border-line">
            <button
              onClick={handleAlert}
              disabled={alertSet}
              className="text-xs font-mono text-muted hover:text-ink flex items-center gap-1.5 bg-paper border border-line rounded-lg px-3 py-1.5"
            >
              <span>🔔</span>
              <span>{alertSet ? "Price Alert Subscribed!" : "Set Price Drop Alert"}</span>
            </button>
            <p className="text-[11px] text-muted font-mono">
              Redirects to official e-commerce partners
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
