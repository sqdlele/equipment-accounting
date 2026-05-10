interface PaginationProps {
  page: number;
  count: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, count, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.ceil(count / pageSize);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
      <div className="text-sm text-gray-500">
        Показано {Math.min((page - 1) * pageSize + 1, count)}–{Math.min(page * pageSize, count)} из {count}
      </div>
      <div className="flex gap-1">
        <button
          className="btn-secondary px-2.5 py-1.5 text-xs"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          ←
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              p === page
                ? 'bg-brand-700 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          className="btn-secondary px-2.5 py-1.5 text-xs"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
        >
          →
        </button>
      </div>
    </div>
  );
}
