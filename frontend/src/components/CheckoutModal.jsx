import { useState } from "react";
import { createOrder } from "../api/client.js";

export default function CheckoutModal({ product, defaultPaymentMethod, user, onClose, onOrderCompleted }) {
  const [step, setStep] = useState(1); // 1: Shipping & Payment, 2: Confirmation Invoice
  const [address, setAddress] = useState(user?.address || "123 Green Avenue, Sector 4, Mumbai - 400001");
  const [phone, setPhone] = useState("9876543210");
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod || "HDFC Bank Credit Card");
  const [cardOrUpi, setCardOrUpi] = useState("•••• •••• •••• 4242");
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const order = await createOrder(product.id, paymentMethod, `${address} (Ph: ${phone})`, cardOrUpi);
      setCompletedOrder(order);
      setStep(2);
      onOrderCompleted(order);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-line bg-paper/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-forest font-semibold">
              {step === 1 ? "Secure Checkout" : "Order Confirmation"}
            </span>
            <h2 className="font-display font-bold text-xl text-ink leading-tight">
              {step === 1 ? "Complete Your Order" : "Invoice & Receipt"}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl font-bold p-1">
            ✕
          </button>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="bg-paper p-3 rounded-xl flex items-center gap-3 border border-line">
                <span className="text-3xl">{product.image}</span>
                <div>
                  <h4 className="font-display font-semibold text-sm text-ink">{product.name}</h4>
                  <p className="text-xs text-muted">Platform: {product.platform}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">Delivery Address</label>
                <textarea
                  required
                  rows="2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
                  placeholder="Enter full shipping address"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">Contact Mobile Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">Payment Method / Bank</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
                >
                  <option value="HDFC Bank Credit Card">HDFC Bank Credit Card (Max Savings)</option>
                  <option value="ICICI Bank Debit Card">ICICI Bank Debit Card</option>
                  <option value="SBI Credit Card">SBI Credit Card</option>
                  <option value="Google Pay UPI">Google Pay UPI</option>
                  <option value="PhonePe UPI">PhonePe UPI</option>
                  <option value="Paytm Wallet">Paytm Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">Payment Details (Card / UPI ID)</label>
                <input
                  type="text"
                  required
                  value={cardOrUpi}
                  onChange={(e) => setCardOrUpi(e.target.value)}
                  className="w-full border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 font-mono text-xs"
                />
              </div>

              {error && <p className="text-xs text-coral">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-forest text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-forest-light transition-colors disabled:opacity-60"
              >
                {submitting ? "Processing Payment…" : "Confirm Payment & Order"}
              </button>
            </form>
          ) : (
            <div className="space-y-4 print:p-0">
              <div className="bg-forest/10 border border-forest/30 p-4 rounded-xl text-center">
                <span className="text-2xl block mb-1">🎉</span>
                <h3 className="font-display font-bold text-forest text-base">Payment Successful!</h3>
                <p className="text-xs text-muted font-mono mt-0.5">Invoice ID: {completedOrder.invoiceId}</p>
              </div>

              <div className="border border-line rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between font-mono py-1 border-b border-line">
                  <span className="text-muted">Item:</span>
                  <span className="font-semibold text-ink">{completedOrder.productName}</span>
                </div>
                <div className="flex justify-between font-mono py-1 border-b border-line">
                  <span className="text-muted">Base Price:</span>
                  <span>₹{completedOrder.basePrice.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-mono py-1 border-b border-line text-forest font-semibold">
                  <span>Total Savings Applied:</span>
                  <span>-₹{completedOrder.totalDiscount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-mono py-1.5 text-sm font-bold text-ink border-b border-line">
                  <span>Amount Paid:</span>
                  <span>₹{completedOrder.finalPrice.toLocaleString("en-IN")}</span>
                </div>
                <div className="py-1 text-muted">
                  <span className="block font-semibold text-ink">Paid via:</span> {completedOrder.paymentMethod}
                </div>
                <div className="py-1 text-muted">
                  <span className="block font-semibold text-ink">Shipped to:</span> {completedOrder.shippingAddress}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-paper border border-line text-ink py-2.5 text-xs font-semibold rounded-xl hover:bg-line/40 transition-colors"
                >
                  🖨️ Print / Save PDF
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-forest text-white py-2.5 text-xs font-semibold rounded-xl hover:bg-forest-light transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
