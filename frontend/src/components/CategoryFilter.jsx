export default function CategoryFilter({ categories, active, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
      <button
        onClick={() => onChange("")}
        className={`text-xs font-medium rounded-full px-3.5 py-1.5 border transition-colors ${
          active === "" ? "bg-forest text-paper border-forest" : "border-line text-muted hover:text-ink"
        }`}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.name}
          onClick={() => onChange(c.name)}
          className={`text-xs font-medium rounded-full px-3.5 py-1.5 border transition-colors ${
            active === c.name ? "bg-forest text-paper border-forest" : "border-line text-muted hover:text-ink"
          }`}
        >
          {c.name} <span className="opacity-60">({c.count})</span>
        </button>
      ))}
    </div>
  );
}
