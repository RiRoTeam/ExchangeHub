/**
 * Сообщение для показа пользователю: ключ перевода и подстановки.
 * Валидаторы — чистые функции без доступа к языку, поэтому они возвращают
 * такие объекты, а переводит их компонент.
 */
export type Message = {
  key: string;
  params?: Record<string, string | number>;
};

export function message(key: string, params?: Message["params"]): Message {
  return params ? { key, params } : { key };
}

/**
 * Ошибка, которую можно показать пользователю: несёт ключ перевода и
 * подстановки. message остаётся ключом, чтобы код, который читает Error.message
 * напрямую, продолжал работать.
 */
export class LocalizedError extends Error {
  readonly detail: Message;

  constructor(detail: Message) {
    super(detail.key);
    this.name = "LocalizedError";
    this.detail = detail;
  }
}

/** Достаёт сообщение из ошибки, подставляя общий текст, если это не наша. */
export function toLocalizedMessage(error: unknown, fallbackKey = "errors.generic"): Message {
  return error instanceof LocalizedError ? error.detail : message(fallbackKey);
}
