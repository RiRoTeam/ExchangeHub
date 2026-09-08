import { useEffect, useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useRouter } from "../../app/router/RouterProvider";
import {
  changeUserRole,
  listAdminUsers,
  type AdminUser
} from "../../entities/user/adminApi";
import { toFriendlyApiError } from "../../shared/api/problem";
import type { UserRole } from "../../shared/types/user";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";

export function AdminManageAdminsPage() {
  const { session, applyUpdatedUser, signOut } = useAuth();
  const { navigate } = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    listAdminUsers(controller.signal)
      .then(setUsers)
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(toFriendlyApiError(loadError, "We couldn’t load user roles."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [reloadToken]);

  async function handleRoleChange(user: AdminUser, role: UserRole) {
    if (role === user.role) {
      return;
    }
    if (user.id === session?.user.id && !window.confirm("Change your own role? You will need to sign in again.")) {
      return;
    }

    setPendingId(user.id);
    setError("");
    try {
      const updated = await changeUserRole(user.id, role);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));

      if (updated.id === session?.user.id) {
        applyUpdatedUser({ ...session.user, role: updated.role, name: updated.name });
        window.sessionStorage.setItem(
          "exchangehub-auth-notice",
          "Your role changed. Sign in again to continue with the updated access."
        );
        void signOut();
        navigate("/login", { replace: true });
      }
    } catch (changeError) {
      setError(toFriendlyApiError(changeError, "We couldn’t change this role."));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <AppShell
      title="Admin / manage roles"
      description="Promote users to administrators or return administrators to user access."
      navigation={<AdminTabs currentRoute="adminManageAdmins" />}
    >
      {error ? (
        <div className="error-banner">
          <p>{error}</p>
          <button className="secondary-button" onClick={() => setReloadToken((value) => value + 1)} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="placeholder-card">Loading users...</div>
      ) : (
        <section className="program-list" aria-label="Users and roles">
          {users.map((user) => (
            <article className="program-list__card" key={user.id}>
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <label className="form-field">
                <span>Role</span>
                <select
                  className="text-input"
                  disabled={pendingId !== null}
                  onChange={(event) => void handleRoleChange(user, event.target.value as UserRole)}
                  value={user.role}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </label>
            </article>
          ))}
        </section>
      )}
    </AppShell>
  );
}
