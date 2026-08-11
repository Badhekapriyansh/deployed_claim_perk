export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="text-sm px-3 py-1.5 border border-line rounded-lg text-muted hover:text-ink disabled:opacity-40 disabled:hover:text-muted"
      >
        Previous
      </button>
      <span className="text-sm text-muted font-mono px-2">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="text-sm px-3 py-1.5 border border-line rounded-lg text-muted hover:text-ink disabled:opacity-40 disabled:hover:text-muted"
      >
        Next
      </button>
    </div>
  );
}
