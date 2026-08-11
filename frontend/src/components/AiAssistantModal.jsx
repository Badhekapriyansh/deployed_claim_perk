import { useState } from "react";
import { askAiAssistant } from "../api/client.js";

export default function AiAssistantModal({ onClose, onSelectProduct }) {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "👋 Hi! I'm Perks AI, your smart shopping assistant. Ask me anything like 'Best credit card for iPhone?', 'Top fashion coupons?', or 'How to get max cashback on laptops?'"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await askAiAssistant(userText);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: res.reply,
          recommendations: res.recommendations
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Sorry, I had trouble reaching the AI service right now. Please try again!" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-line bg-forest text-paper flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">🤖</div>
            <div>
              <h3 className="font-display font-bold text-base leading-tight">Perks AI Shopping Assistant</h3>
              <p className="text-[11px] text-paper/80 font-mono">Real-time Deal & Cashback Intelligence</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl font-bold p-1">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-paper/30">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm ${
                  msg.sender === "user"
                    ? "bg-forest text-white rounded-br-none"
                    : "bg-white border border-line text-ink rounded-bl-none shadow-sm"
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-line/60">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-forest font-bold">
                      💡 Recommended Deals
                    </p>
                    {msg.recommendations.map((rec) => (
                      <div
                        key={rec.product.id}
                        onClick={() => {
                          onClose();
                          onSelectProduct(rec.product);
                        }}
                        className="bg-paper border border-line rounded-lg p-2 flex items-center justify-between gap-2 hover:border-forest cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{rec.product.image}</span>
                          <div>
                            <p className="text-xs font-semibold text-ink leading-tight">{rec.product.name}</p>
                            <p className="text-[10px] text-muted">{rec.bestPaymentMethod}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-forest font-bold">Save {rec.savedPercent}%</p>
                          <p className="font-mono text-xs font-bold text-ink">
                            ₹{rec.finalPrice.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="bg-white border border-line rounded-2xl rounded-bl-none px-4 py-2.5 text-xs text-muted shadow-sm animate-pulse">
                Thinking & calculating best deal perks…
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-line bg-white flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Perks AI — e.g. 'Best card for laptop?'"
            className="flex-1 border border-line rounded-xl p-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-forest text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-forest-light transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
