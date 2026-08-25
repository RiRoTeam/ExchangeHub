/**
 * Мост между AuthProvider (React-состояние сессии) и http-слоем.
 *
 * http.ts не может импортировать AuthProvider напрямую — получилась бы
 * циклическая зависимость. Поэтому провайдер при монтировании регистрирует
 * здесь три колбэка, а http-слой их просто вызывает.
 */
export type AuthBridge = {
  /** Текущий access-токен или null, если пользователь анонимен. */
  getAccessToken: () => string | null;
  /**
   * Обновить access-токен по refresh-токену.
   * Возвращает новый токен либо null, если обновить не удалось.
   * Реализация обязана дедуплицировать параллельные вызовы.
   */
  refreshAccessToken: () => Promise<string | null>;
  /** Сессия окончательно протухла — разлогинить пользователя. */
  onSessionExpired: () => void;
};

let bridge: AuthBridge | null = null;

export function registerAuthBridge(next: AuthBridge) {
  bridge = next;
}

export function unregisterAuthBridge(target: AuthBridge) {
  if (bridge === target) {
    bridge = null;
  }
}

export function getAuthBridge() {
  return bridge;
}
