export default function ProductCard({
  product,
  onSelect,
  isCompared,
  onToggleCompare,
  isFavorited,
  onToggleFavorite
}) {
  return (
    <div
      onClick={() => onSelect(product)}
      className="text-left bg-white border border-line rounded-xl p-4 hover:border-forest
                 hover:shadow-md transition-all group relative cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between mb-2">
          {product.image && (product.image.startsWith("http") || product.image.startsWith("data:")) ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-12 h-12 object-contain rounded-md border border-line/60 bg-paper p-1"
            />
          ) : (
            <span className="text-3xl">{product.image || "📦"}</span>
          )}
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(product.id)}
                title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                className={`p-1 rounded text-xs transition-colors ${
                  isFavorited ? "text-coral" : "text-muted hover:text-coral"
                }`}
              >
                {isFavorited ? "♥" : "♡"}
              </button>
            )}
            <span className="text-[10px] uppercase tracking-wide font-mono text-muted bg-paper border border-line rounded px-2 py-1">
              {product.platform}
            </span>
          </div>
        </div>

        <h3 className="font-display font-medium text-sm leading-snug mb-1 group-hover:text-forest">
          {product.name}
        </h3>
        <p className="text-xs text-muted mb-3">{product.category}</p>
      </div>

      <div>
        <p className="font-mono text-lg font-semibold text-ink">
          ₹{product.basePrice.toLocaleString("en-IN")}
        </p>

        <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between">
          <span className="text-xs text-forest font-semibold group-hover:underline">See perks →</span>

          {onToggleCompare && (
            <label
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] font-mono text-muted hover:text-ink cursor-pointer bg-paper border border-line rounded px-1.5 py-0.5"
            >
              <input
                type="checkbox"
                checked={!!isCompared}
                onChange={() => onToggleCompare(product)}
                className="rounded border-line text-forest focus:ring-forest/30 cursor-pointer"
              />
              Compare
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
