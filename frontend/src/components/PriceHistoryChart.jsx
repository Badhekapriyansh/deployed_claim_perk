export default function PriceHistoryChart({ priceHistory = [], currentPrice }) {
  if (!priceHistory || priceHistory.length === 0) return null;

  const maxPrice = Math.max(...priceHistory.map((p) => p.price));
  const minPrice = Math.min(...priceHistory.map((p) => p.price));
  const isLowest = currentPrice <= minPrice;

  return (
    <div className="bg-paper/50 border border-line rounded-xl p-3 my-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono font-semibold uppercase text-ink flex items-center gap-1">
          📊 90-Day Price Trend
        </span>
        {isLowest && (
          <span className="text-[10px] font-mono bg-forest text-white px-2 py-0.5 rounded font-bold">
            🔥 Lowest Price in 90 Days!
          </span>
        )}
      </div>

      <div className="h-24 flex items-end justify-between gap-2 pt-4 px-1 pb-1">
        {priceHistory.map((pt, idx) => {
          const heightPct = Math.max(Math.round(((pt.price - minPrice * 0.85) / (maxPrice - minPrice * 0.85)) * 100), 20);
          const isToday = idx === priceHistory.length - 1;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-6 bg-ink text-white text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                ₹{pt.price.toLocaleString("en-IN")}
              </div>
              <div
                style={{ height: `${heightPct}%` }}
                className={`w-full rounded-t transition-all ${
                  isToday ? "bg-forest shadow-sm" : "bg-forest/30 group-hover:bg-forest/60"
                }`}
              />
              <span className="text-[9px] font-mono text-muted">{pt.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
