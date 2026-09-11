// Applies a discount rule to a base amount.
// Checks minimum order eligibility if specified on the rule.
// type "flat" subtracts a fixed value. type "percent" subtracts a percentage,
// capped at maxValue when provided (mirrors real-world e-commerce offer caps).
function applyDiscount(baseAmount, rule) {
  if (!rule || !baseAmount || baseAmount <= 0) return 0;
  if (rule.minOrderValue && baseAmount < rule.minOrderValue) return 0;

  if (rule.type === "flat") {
    return Math.min(Number(rule.value) || 0, baseAmount);
  }
  if (rule.type === "percent") {
    const raw = (baseAmount * (Number(rule.value) || 0)) / 100;
    const capped = rule.maxValue ? Math.min(raw, Number(rule.maxValue)) : raw;
    return Math.min(capped, baseAmount);
  }
  return 0;
}

// Given a product's base price and available offers:
// 1. Applies eligible Instant Coupon discounts.
// 2. Enforces payment mutual exclusivity: e-commerce checkout allows only ONE payment method (Bank Card OR UPI).
//    Picks whichever payment mode yields the maximum instant discount.
// 3. Computes the true Instant Payable Price at checkout: Base Price - Coupon - Selected Payment Offer.
// 4. Separates Post-Purchase Cashback (credited after delivery) and calculates Effective Final Cost.
// 5. Annotates each offer with its eligibility status and clear reason.
function calculateBestPrice(basePrice, offers) {
  const numBasePrice = Math.max(Number(basePrice) || 0, 0);
  offers = offers || {};

  const pickBestEligible = (list) => {
    if (!list || !Array.isArray(list) || list.length === 0) return null;
    let best = null;
    let bestValue = -1;
    for (const rule of list) {
      const value = applyDiscount(numBasePrice, rule);
      if (value > bestValue && value > 0) {
        bestValue = value;
        best = { ...rule, appliedDiscount: Math.round(value) };
      }
    }
    return best;
  };

  // 1. Instant Coupon Discount
  const rawCoupon = pickBestEligible(offers.coupons);
  const bestCoupon = rawCoupon
    ? {
        ...rawCoupon,
        applicable: true,
        applied: true,
        reason: "Instant coupon applied at checkout"
      }
    : null;
  const couponDiscount = bestCoupon ? bestCoupon.appliedDiscount : 0;

  // 2. Instant Payment Offers (Bank Card vs UPI - mutually exclusive at checkout)
  const candidateBank = pickBestEligible(offers.bankOffers);
  const candidateUpi = pickBestEligible(offers.upiOffers);

  const bankVal = candidateBank ? candidateBank.appliedDiscount : 0;
  const upiVal = candidateUpi ? candidateUpi.appliedDiscount : 0;

  let bestBankOffer = null;
  let bestUpiOffer = null;
  let paymentDiscount = 0;
  let selectedPaymentMethod = null;

  if (bankVal > 0 && bankVal >= upiVal) {
    bestBankOffer = {
      ...candidateBank,
      applicable: true,
      applied: true,
      reason: "Best payment offer applied (Bank Card)"
    };
    if (candidateUpi) {
      bestUpiOffer = {
        ...candidateUpi,
        applicable: false,
        applied: false,
        reason: "Not applied (mutually exclusive with Bank Card; Bank Card provides higher discount)"
      };
    }
    paymentDiscount = bankVal;
    selectedPaymentMethod = {
      label: candidateBank.bank || "Bank Card",
      type: "bank",
      discount: bankVal
    };
  } else if (upiVal > 0 && upiVal > bankVal) {
    bestUpiOffer = {
      ...candidateUpi,
      applicable: true,
      applied: true,
      reason: "Best payment offer applied (UPI)"
    };
    if (candidateBank) {
      bestBankOffer = {
        ...candidateBank,
        applicable: false,
        applied: false,
        reason: "Not applied (mutually exclusive with UPI; UPI provides higher discount)"
      };
    }
    paymentDiscount = upiVal;
    selectedPaymentMethod = {
      label: candidateUpi.app || "UPI App",
      type: "upi",
      discount: upiVal
    };
  } else {
    // Neither applied or 0 discount
    if (candidateBank) {
      bestBankOffer = { ...candidateBank, applicable: false, applied: false, reason: "No instant bank discount applicable" };
    }
    if (candidateUpi) {
      bestUpiOffer = { ...candidateUpi, applicable: false, applied: false, reason: "No instant UPI discount applicable" };
    }
    paymentDiscount = 0;
  }

  // 3. Instant Payable Price at Checkout Gateway
  const instantDiscount = Math.round(couponDiscount + paymentDiscount);
  const payablePrice = Math.max(Math.round(numBasePrice - instantDiscount), 0);

  // 4. Post-Purchase Cashback (received post-purchase, does not reduce checkout gateway total)
  const candidateCashback = pickBestEligible(offers.cashback);
  const bestCashback = candidateCashback
    ? {
        ...candidateCashback,
        applicable: true,
        applied: true,
        reason: "Post-purchase cashback (credited to wallet/account after delivery)"
      }
    : null;
  const cashbackAmount = bestCashback ? bestCashback.appliedDiscount : 0;

  // 5. Effective Final Cost
  const effectiveCost = Math.max(Math.round(payablePrice - cashbackAmount), 0);
  const totalDiscount = Math.round(instantDiscount + cashbackAmount);
  const savingsPercent = numBasePrice > 0 ? Math.round((totalDiscount / numBasePrice) * 100) : 0;
  const instantSavingsPercent = numBasePrice > 0 ? Math.round((instantDiscount / numBasePrice) * 100) : 0;

  // 6. Summary of Applied Offers
  const appliedPerks = [];
  if (bestCoupon && bestCoupon.applied) appliedPerks.push(`Coupon: -₹${bestCoupon.appliedDiscount} (${bestCoupon.code})`);
  if (bestBankOffer && bestBankOffer.applied) appliedPerks.push(`Bank Card: -₹${bestBankOffer.appliedDiscount} (${bestBankOffer.bank})`);
  if (bestUpiOffer && bestUpiOffer.applied) appliedPerks.push(`UPI: -₹${bestUpiOffer.appliedDiscount} (${bestUpiOffer.app})`);
  if (bestCashback && bestCashback.applied) appliedPerks.push(`Cashback: ₹${bestCashback.appliedDiscount} (${bestCashback.provider})`);

  return {
    basePrice: numBasePrice,
    bestCoupon,
    bestBankOffer,
    bestUpiOffer,
    bestCashback,
    // Instant checkout payable pricing
    instantDiscount,
    payablePrice,
    finalPrice: payablePrice, // Alias for full backward compatibility
    // Post-purchase savings & effective cost
    cashbackAmount,
    effectiveCost,
    effectivePrice: effectiveCost, // Alias
    totalDiscount,
    savingsPercent,
    instantSavingsPercent,
    bestPaymentMethod: selectedPaymentMethod,
    appliedPerks
  };
}

module.exports = { calculateBestPrice, applyDiscount };
