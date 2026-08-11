export default function SearchBar({
  value,
  onChange,
  platform,
  platforms = [],
  onPlatformChange,
  brand,
  brands = [],
  onBrandChange,
  sortBy,
  onSortChange
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search a product — try 'phone', 'shoes', 'macbook', or 'sony'"
          className="w-full border border-line bg-white rounded-xl py-3 pl-11 pr-10 text-sm
                     focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest
                     placeholder:text-muted shadow-sm"
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs font-bold p-1 bg-paper border border-line rounded-full w-5 h-5 flex items-center justify-center"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white border border-line rounded-xl p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Platform Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted font-medium uppercase font-mono text-[10px]">Store:</span>
            <select
              value={platform || "all"}
              onChange={(e) => onPlatformChange && onPlatformChange(e.target.value)}
              className="bg-paper border border-line rounded-lg px-2.5 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
            >
              <option value="all">All Stores</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Company / Brand Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted font-medium uppercase font-mono text-[10px]">Brand:</span>
            <select
              value={brand || "all"}
              onChange={(e) => onBrandChange && onBrandChange(e.target.value)}
              className="bg-paper border border-line rounded-lg px-2.5 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
            >
              <option value="all">All Brands</option>
              {brands.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} ({b.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted font-medium uppercase font-mono text-[10px]">Sort:</span>
          <select
            value={sortBy || "relevance"}
            onChange={(e) => onSortChange && onSortChange(e.target.value)}
            className="bg-paper border border-line rounded-lg px-2.5 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
          >
            <option value="relevance">Featured & Relevant</option>
            <option value="savings">🔥 Highest Savings %</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Product Name (A-Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
