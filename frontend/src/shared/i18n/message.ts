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
