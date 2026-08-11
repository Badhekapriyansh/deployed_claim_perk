import { logRedirect } from "../api/client.js";

export default function RedirectModal({ product, deal, onClose, user }) {
  if (!product || !deal) return null;

  const { platform, logo, basePrice, affiliateUrl, priceBreakdown } = deal;
  const { bestCoupon, bestBankOffer, bestUpiOffer, bestCashback, totalDiscount, finalPrice } = priceBreakdown;

  const handleContinue = async () => {
    if (user) {
      logRedirect({
        productId: product.id,
        platform,
        basePrice,
        finalPrice,
        totalDiscount,
        affiliateUrl
      }).catch(() => {});
    }
    window.open(affiliateUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-line bg-paper/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{logo || "🛒"}</span>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-forest font-semibold">
                Affiliate Store Handoff
              </span>
              <h2 className="font-display font-bold text-xl text-ink leading-tight">
                You're leaving Claim Perks
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl font-bold p-1">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-muted">
            You'll be redirected to <strong className="text-ink font-semibold">{platform}</strong> to securely complete your purchase.
          </p>

          {/* Product Snippet */}
          <div className="bg-paper p-3 rounded-xl flex items-center gap-3 border border-line">
            {product.image && (product.image.startsWith("http") || product.image.startsWith("data:")) ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-12 h-12 object-contain rounded-md border border-line/60 bg-white p-1"
              />
            ) : (
              <span className="text-3xl">{product.image || "📦"}</span>
            )}
            <div>
              <h4 className="font-display font-semibold text-sm text-ink">{product.name}</h4>
              <p className="text-xs text-muted font-mono">Store Platform: {platform}</p>
            </div>
          </div>

          {/* Savings Summary Card */}
          <div className="bg-white border border-line rounded-xl p-4 space-y-2 text-xs shadow-sm">
            <h4 className="font-display font-bold text-xs uppercase font-mono text-muted tracking-wider border-b border-line pb-1.5">
              Your Savings Summary
            </h4>

            <div className="flex justify-between font-mono py-1">
              <span className="text-muted">Original List Price:</span>
              <span className="text-ink">₹{basePrice.toLocaleString("en-IN")}</span>
            </div>

            {bestCoupon && (
              <div className="flex justify-between font-mono py-1 text-forest font-semibold">
                <span>Coupon ({bestCoupon.code}):</span>
                <span>-₹{bestCoupon.appliedDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}

            {bestBankOffer && (
              <div className="flex justify-between font-mono py-1 text-forest font-semibold">
                <span>Bank Offer ({bestBankOffer.bank}):</span>
                <span>-₹{bestBankOffer.appliedDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}

            {bestUpiOffer && (
              <div className="flex justify-between font-mono py-1 text-forest font-semibold">
                <span>UPI Offer ({bestUpiOffer.app}):</span>
                <span>-₹{bestUpiOffer.appliedDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}

            {bestCashback && (
              <div className="flex justify-between font-mono py-1 text-forest font-semibold">
                <span>Cashback Perks ({bestCashback.provider}):</span>
                <span>-₹{bestCashback.appliedDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}

            <div className="flex justify-between font-mono py-2 text-sm font-bold text-ink border-t border-line mt-1 bg-paper px-2 rounded">
              <span className="font-display text-forest">Final Payable Price:</span>
              <span className="text-forest text-base">₹{finalPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Disclaimer Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
            <span className="text-sm">🔒</span>
            <p>
              You will be redirected to the official <strong>{platform}</strong> website to securely complete your purchase. Payment, delivery, and customer support are handled directly by {platform}.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-paper border border-line text-ink py-3 text-xs font-semibold rounded-xl hover:bg-line/40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              className="flex-2 bg-forest text-white py-3 px-4 text-xs font-semibold rounded-xl hover:bg-forest-light transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Continue to {platform}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
