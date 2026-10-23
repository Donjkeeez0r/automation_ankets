// Анкета уже отправлена, если бэкенд вернул 403 с reason: 'ALREADY_SUBMITTED'
// (ссылка деактивирована после отправки) либо 400 из submitQuestionnaire при
// статусе не DRAFT/REVISION. Для подрядчика это не ошибка: анкета доставлена,
// значит нужно показать экран-подтверждение.
export function isAlreadySubmittedError(err: unknown): boolean {
  const data = (err as { response?: { data?: { message?: unknown; reason?: unknown } } })?.response
    ?.data;
  if (data?.reason === 'ALREADY_SUBMITTED') return true;
  return typeof data?.message === 'string' && data.message.includes('уже была отправлена');
}
