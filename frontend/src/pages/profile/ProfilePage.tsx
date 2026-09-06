import { useAuth } from "../../app/providers/AuthProvider";
import { useRouter } from "../../app/router/RouterProvider";
import { EditProfileForm } from "../../features/profile/edit-profile/EditProfileForm";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

export function ProfilePage() {
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
      title="Profile"
      description="Your account details and current signed-in session."
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
          <h2>Account</h2>

          <dl className="profile-list">
            <div className="profile-list__row">
              <dt>Name</dt>
              <dd>{session.user.name}</dd>
            </div>
            <div className="profile-list__row">
              <dt>Email</dt>
              <dd>{session.user.email}</dd>
            </div>
            <div className="profile-list__row">
              <dt>Role</dt>
              <dd>{session.user.role}</dd>
            </div>
          </dl>
        </div>

        <div className="profile-card">
          <h2>Session</h2>

          <dl className="profile-list">
            <div className="profile-list__row">
              <dt>Signed in via</dt>
              <dd>{session.mode}</dd>
            </div>
            <div className="profile-list__row">
              <dt>Started at</dt>
              <dd>{formatDate(session.createdAt)}</dd>
            </div>
          </dl>

          <div className="profile-actions">
            <button className="secondary-button secondary-button--danger" onClick={handleLogout} type="button">
              Log out
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
