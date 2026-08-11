import { useEffect, useState } from "react";
import {
  fetchFavorites,
  fetchHistory,
  fetchRedirects,
  toggleFavorite,
  clearHistory,
  deleteHistoryItem,
  clearRedirects,
  deleteRedirectItem
} from "../api/client.js";
import ProductCard from "./ProductCard.jsx";

export default function Dashboard({ onSelectProduct }) {
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [redirects, setRedirects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([fetchFavorites(), fetchHistory(), fetchRedirects().catch(() => [])])
      .then(([favs, hist, redirs]) => {
        setFavorites(favs);
        setHistory(hist);
        setRedirects(redirs);
      })
      .catch(() => setError("Couldn't load your dashboard right now."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUnfavorite = async (productId) => {
    await toggleFavorite(productId);
    setFavorites((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
  };

  const handleDeleteHistoryItem = async (e, productId) => {
    e.stopPropagation();
    await deleteHistoryItem(productId);
    setHistory((prev) => prev.filter((h) => h.productId !== productId));
  };

  const handleClearRedirects = async () => {
    await clearRedirects();
    setRedirects([]);
  };

  const handleDeleteRedirectItem = async (e, id) => {
    e.stopPropagation();
    await deleteRedirectItem(id);
    setRedirects((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) return <p className="text-center text-muted text-sm py-16">Loading your dashboard…</p>;
  if (error) return <p className="text-center text-coral text-sm py-16">{error}</p>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">
      {/* Explored Deals & Store Redirects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold text-xl text-ink">Explored Deals & Store Redirects</h2>
            <p className="text-sm text-muted">Products and store deals you've jumped to via Claim Perks affiliate links</p>
          </div>
          <div className="flex items-center gap-2">
            {redirects.length > 0 && (
              <button
                onClick={handleClearRedirects}
                className="text-xs font-mono text-coral hover:bg-coral/10 border border-coral/30 px-2.5 py-1 rounded-lg transition-colors font-semibold"
              >
                Clear All
              </button>
            )}
            <span className="text-xs font-mono bg-forest/10 text-forest border border-forest/30 px-2.5 py-1 rounded-full font-semibold">
              {redirects.length} Deal{redirects.length === 1 ? "" : "s"} Explored
            </span>
          </div>
        </div>

        {redirects.length === 0 ? (
          <p className="text-sm text-muted bg-white border border-dashed border-line rounded-xl p-6 text-center">
            No store deal redirects yet — click "View Deal" on any product comparison to jump to store partners.
          </p>
        ) : (
          <div className="space-y-3">
            {redirects.map((red) => (
              <div
                key={red.id}
                className="bg-white border border-line rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-forest transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{red.productImage || "📦"}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-semibold text-sm text-ink">{red.productName}</h4>
                      <span className="text-[10px] font-mono font-bold uppercase bg-paper border border-line px-1.5 py-0.5 rounded text-forest">
                        {red.platform}
                      </span>
                    </div>
                    <p className="text-xs text-muted font-mono mt-0.5">
                      Explored on {new Date(red.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · Earned +₹50 Perks Bonus
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-line pt-2 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-forest font-semibold font-mono">Saved ₹{red.totalDiscount.toLocaleString("en-IN")}</p>
                    <p className="font-mono text-base font-bold text-ink">₹{red.finalPrice.toLocaleString("en-IN")}</p>
                  </div>

                  <a
                    href={red.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-forest text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-forest-light transition-colors whitespace-nowrap"
                  >
                    Open Store ↗
                  </a>

                  <button
                    onClick={(e) => handleDeleteRedirectItem(e, red.id)}
                    className="text-muted hover:text-coral text-sm p-1 transition-colors"
                    title="Delete item"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Favorites */}
      <section>
        <h2 className="font-display font-semibold text-xl mb-1">Your favorites</h2>
        <p className="text-sm text-muted mb-5">Products you've saved to check offers on later.</p>
        {favorites.length === 0 ? (
          <p className="text-sm text-muted bg-white border border-dashed border-line rounded-xl p-6 text-center">
            No favorites yet — tap the heart on any product's offer view to save it here.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {favorites.map((p) => (
              <div key={p.id} className="relative">
                <ProductCard product={p} onSelect={onSelectProduct} isFavorited={true} onToggleFavorite={handleUnfavorite} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-display font-semibold text-xl text-ink">Recently viewed</h2>
            <p className="text-sm text-muted">The last products you checked offers on.</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs font-mono text-coral hover:bg-coral/10 border border-coral/30 px-2.5 py-1 rounded-lg transition-colors font-semibold"
            >
              Clear History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-muted bg-white border border-dashed border-line rounded-xl p-6 text-center">
            No shopping history yet — browse a few products to see them here.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.productId}
                onClick={() => onSelectProduct(entry.product)}
                className="w-full flex items-center justify-between bg-white border border-line rounded-lg px-4 py-3 hover:border-forest text-left cursor-pointer transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{entry.product.image}</span>
                  <div>
                    <p className="text-sm font-medium text-ink">{entry.product.name}</p>
                    <p className="text-xs text-muted">{entry.product.platform}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted font-mono">
                    {new Date(entry.viewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <button
                    onClick={(e) => handleDeleteHistoryItem(e, entry.productId)}
                    className="text-muted hover:text-coral text-sm p-1 transition-colors"
                    title="Delete item"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
