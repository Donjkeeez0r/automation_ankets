interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  // одна страница — пагинатор не нужен
  if (totalPages <= 1) return null;

  const btn =
    'px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors';

  return (
    <nav
      aria-label="Постраничная навигация"
      className="mt-4 flex items-center justify-center gap-3"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={btn}
      >
        ‹ Назад
      </button>
      <span aria-live="polite" className="text-sm text-gray-500 whitespace-nowrap">
        Страница {page} из {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={btn}
      >
        Вперёд ›
      </button>
    </nav>
  );
}
