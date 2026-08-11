// Applies a discount rule to a base amount.
// type "flat" subtracts a fixed value. type "percent" subtracts a percentage,
// capped at maxValue when provided (mirrors how real bank/coupon offers cap themselves).
function applyDiscount(baseAmount, rule) {
  if (rule.type === "flat") return rule.value;
  if (rule.type === "percent") {
    const raw = (baseAmount * rule.value) / 100;
    return rule.maxValue ? Math.min(raw, rule.maxValue) : raw;
  }
  return 0;
}

// Given a product's base price and its available offers, finds the single best
// discount in each category, then combines the best coupon + best cashback +
// best bank offer + best UPI offer to compute the true final payable price.
// Returns a breakdown so the frontend can show exactly what was applied.
function calculateBestPrice(basePrice, offers) {
  const pick = (list, keyName) => {
    if (!list || list.length === 0) return null;
    let best = null;
    let bestValue = -1;
    for (const rule of list) {
      const value = applyDiscount(basePrice, rule);
      if (value > bestValue) {
        bestValue = value;
        best = { ...rule, appliedDiscount: Math.round(value) };
      }
    }
    return best;
  };

  const bestCoupon = pick(offers.coupons, "coupon");
  const bestCashback = pick(offers.cashback, "cashback");
  const bestBankOffer = pick(offers.bankOffers, "bank");
  const bestUpiOffer = pick(offers.upiOffers, "upi");

  const totalDiscount =
    (bestCoupon ? bestCoupon.appliedDiscount : 0) +
    (bestCashback ? bestCashback.appliedDiscount : 0) +
    (bestBankOffer ? bestBankOffer.appliedDiscount : 0) +
    (bestUpiOffer ? bestUpiOffer.appliedDiscount : 0);

  const finalPrice = Math.max(basePrice - totalDiscount, 0);

  // Recommend whichever single offer category saved the most — this stands in
  // for the "best payment method" suggestion in the full product.
  const candidates = [
    { label: bestBankOffer ? bestBankOffer.bank : null, amount: bestBankOffer?.appliedDiscount || 0 },
    { label: bestUpiOffer ? bestUpiOffer.app : null, amount: bestUpiOffer?.appliedDiscount || 0 },
    { label: bestCashback ? bestCashback.provider : null, amount: bestCashback?.appliedDiscount || 0 }
  ].filter((c) => c.label);
  candidates.sort((a, b) => b.amount - a.amount);
  const bestPaymentMethod = candidates[0] || null;

  return {
    basePrice,
    bestCoupon,
    bestCashback,
    bestBankOffer,
    bestUpiOffer,
    totalDiscount: Math.round(totalDiscount),
    finalPrice: Math.round(finalPrice),
    bestPaymentMethod
  };
}

module.exports = { calculateBestPrice, applyDiscount };
