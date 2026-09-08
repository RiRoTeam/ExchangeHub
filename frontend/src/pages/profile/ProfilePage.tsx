import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/providers/AuthProvider";
import { useRouter } from "../../app/router/RouterProvider";
import { EditProfileForm } from "../../features/profile/edit-profile/EditProfileForm";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { useFormatters } from "../../shared/i18n/useFormatters";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";

export function ProfilePage() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const { session, signOut } = useAuth();
  const { navigate } = useRouter();

  if (!session) {
    return null;
  }

  function handleLogout() {
    // Уводим сразу: signOut чистит локальное состояние синхронно, а отзыв
    // refresh-токена на сервере дожидаться незачем.
    void signOut();
    navigate("/login", { replace: true });
  }

  return (
    <AppShell
      title={t("profile.title")}
      description={t("profile.description")}
      navigation={
        // Профиль открыт обеим ролям, поэтому и навигация своя для каждой:
        // с пользовательскими вкладками админа увело бы обратно.
        session.user.role === "ADMIN" ? (
          <AdminTabs currentRoute="profile" />
        ) : (
          <MobileBottomNav currentRoute="profile" />
        )
      }
    >
      <section className="profile-grid">
        <div className="profile-card">
          <h2>{t("profile.account")}</h2>

          <dl className="profile-list">
            <div className="profile-list__row">
              <dt>{t("profile.name")}</dt>
              <dd>{session.user.name}</dd>
            </div>
            <div className="profile-list__row">
              <dt>{t("profile.email")}</dt>
              <dd>{session.user.email}</dd>
            </div>
            <div className="profile-list__row">
              <dt>{t("profile.role")}</dt>
              <dd>{t(`roles.${session.user.role}`)}</dd>
            </div>
          </dl>
        </div>

        <div className="profile-card">
          <h2>{t("profile.session")}</h2>

          <dl className="profile-list">
            <div className="profile-list__row">
              <dt>{t("profile.signedInVia")}</dt>
              <dd>
                {session.mode === "admin-login"
                  ? t("profile.modeAdminLogin")
                  : session.mode === "user-register"
                  ? t("profile.modeUserRegister")
                  : t("profile.modeUserLogin")}
              </dd>
            </div>
            <div className="profile-list__row">
              <dt>{t("profile.startedAt")}</dt>
              <dd>{formatDateTime(session.createdAt, t("common.notSpecified"))}</dd>
            </div>
          </dl>

          <div className="profile-actions">
            <button className="secondary-button secondary-button--danger" onClick={handleLogout} type="button">
              {t("profile.logout")}
            </button>
          </div>
        </div>
      </section>

      <section className="page-section">
        <EditProfileForm />
      </section>
    </AppShell>
  );
}
