import { useMemo, useState } from 'react';

// Сколько записей показывать на одной странице списка.
export const PAGE_SIZE = 20;

export interface Pagination<T> {
  // текущая страница, 1-based и всегда в пределах [1, totalPages]
  page: number;
  totalPages: number;
  pageItems: T[];
  setPage: (page: number) => void;
}

/**
 * Клиентская пагинация уже отфильтрованного списка.
 *
 * `resetKey` — строка из текущих поиска/фильтров: как только она меняется,
 * страница сбрасывается на первую, чтобы не остаться на несуществующей.
 */
export function usePagination<T>(items: T[], resetKey: string): Pagination<T> {
  const [page, setPage] = useState(1);
  const [prevKey, setPrevKey] = useState(resetKey);

  // Сброс делаем прямо во время рендера (штатный приём React для подстройки
  // состояния под изменившиеся входные данные), а не в эффекте: иначе кадр
  // между рендером и эффектом успел бы показать старую страницу.
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  // список мог сократиться (например, запись удалили) — подстраховываемся,
  // чтобы не показать пустую страницу за пределами диапазона
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [items, safePage],
  );

  return { page: safePage, totalPages, pageItems, setPage };
}
