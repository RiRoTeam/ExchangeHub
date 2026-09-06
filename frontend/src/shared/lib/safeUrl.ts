/**
 * Внешние ссылки приходят из пользовательских заявок, а рендерятся в href.
 * Схема вроде javascript: выполнила бы код в origin приложения, где в
 * localStorage лежит сессия. Бэк валидирует ссылки через @URL, но это второй
 * слой: сидер и прямые вставки в БД его не проходят.
 */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function safeExternalUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) {
    return null;
  }

  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    return ALLOWED_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
  } catch {
    // Относительные и битые ссылки наружу не ведут — показывать их нечестно.
    return null;
  }
}
