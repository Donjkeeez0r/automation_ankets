// Регистронезависимый поиск по подстроке на клиенте.
// Букву «ё» приводим к «е», чтобы «Королёв» находился по запросу «королев».
export function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е').trim();
}

// true, если хотя бы одно из полей содержит запрос как подстроку.
// Пустой запрос совпадает со всем.
export function matchesQuery(
  query: string,
  fields: (string | null | undefined)[],
): boolean {
  const q = normalize(query);
  if (!q) return true;
  return fields.some((f) => f && normalize(f).includes(q));
}
