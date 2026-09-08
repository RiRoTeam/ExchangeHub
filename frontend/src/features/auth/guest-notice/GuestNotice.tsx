import { useTranslation } from "react-i18next";
import { useAuth } from "../../../app/providers/AuthProvider";
import { useRouter } from "../../../app/router/RouterProvider";

/**
 * Приглашение войти для анонима. Каталог открыт всем, но избранное и заявки
 * требуют авторизации, поэтому объясняем, что даёт вход, вместо того чтобы
 * показывать кнопки, упирающиеся в 401.
 *
 * Для залогиненного не рендерится вовсе.
 */
export function GuestNotice() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const { navigate } = useRouter();

  if (status !== "anonymous") {
    return null;
  }

  return (
    <aside className="guest-notice">
      <div>
        <h3>{t("guest.title")}</h3>
        <p>{t("guest.description")}</p>
      </div>
      <button className="primary-button" onClick={() => navigate("/login")} type="button">
        {t("guest.signIn")}
      </button>
    </aside>
  );
}
