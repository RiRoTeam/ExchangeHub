import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { listAdminUsers } from "../../entities/user/api";
import { toFriendlyApiError } from "../../shared/api/problem";
import type { AdminUser } from "../../shared/types/user";
import { ChangeRoleControl } from "../../features/admin/change-role/ChangeRoleControl";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";

function formatDate(value: string) {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function matchesQuery(user: AdminUser, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    user.name.toLowerCase().includes(normalized) ||
    user.email.toLowerCase().includes(normalized)
  );
}

export function AdminManageAdminsPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();
    let isActive = true;

    async function loadUsers() {
      setIsLoading(true);
      setLoadError("");

      try {
        const nextUsers = await listAdminUsers(abortController.signal);

        if (isActive) {
          setUsers(nextUsers);
        }
      } catch (error) {
        if (abortController.signal.aborted || !isActive) {
          return;
        }

        setUsers([]);
        setLoadError(toFriendlyApiError(error, "We couldn’t load the user list."));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [reloadToken]);

  const handleChanged = useCallback((updated: AdminUser) => {
    setUsers((current) =>
      current.map((user) => (user.id === updated.id ? updated : user))
    );
    setNotice(
      updated.role === "ADMIN"
        ? `${updated.name} is now an administrator.`
        : `${updated.name} no longer has admin access and was signed out.`
    );
  }, []);

  const visibleUsers = useMemo(
    () => users.filter((user) => matchesQuery(user, query)),
    [query, users]
  );

  const adminCount = users.filter((user) => user.role === "ADMIN").length;

  return (
    <AppShell
      title="Admin / manage admins"
      description="Who can moderate submissions and edit the catalog."
      navigation={<AdminTabs currentRoute="adminManageAdmins" />}
    >
      <section className="programs-page__header">
        <div>
          <h2>People</h2>
          <p>
            {loadError
              ? "The user list is temporarily unavailable."
              : isLoading
              ? "Loading people..."
              : `${users.length} ${users.length === 1 ? "account" : "accounts"}, ${adminCount} with admin access`}
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={isLoading}
          onClick={() => setReloadToken((current) => current + 1)}
          type="button"
        >
          Refresh
        </button>
      </section>

      <div aria-live="polite">
        {notice ? <p className="form-feedback__success review-page__decision">{notice}</p> : null}
      </div>

      {loadError ? (
        <div className="error-banner">
          <p>{loadError}</p>
          <button
            className="secondary-button"
            onClick={() => setReloadToken((current) => current + 1)}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="placeholder-card">Loading people...</div>
      ) : (
        <>
          <label className="auth-form-fields__label user-table__search">
            <span>Find a person</span>
            <input
              className="text-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
              type="search"
              value={query}
            />
          </label>

          {visibleUsers.length === 0 ? (
            <div className="placeholder-card">No accounts match this search.</div>
          ) : (
            <ul className="user-list">
              {visibleUsers.map((user) => {
                const isSelf = user.id === session?.user.id;

                return (
                  <li className="user-list__row" key={user.id}>
                    <div className="user-list__identity">
                      <p className="user-list__name">
                        {user.name}
                        {isSelf ? <span className="user-list__you">you</span> : null}
                      </p>
                      <p className="user-list__email">{user.email}</p>
                      <p className="user-list__joined">Joined {formatDate(user.createdAt)}</p>
                    </div>

                    <span
                      className={`status-pill ${
                        user.role === "ADMIN" ? "status-pill--approved" : "status-pill--pending"
                      }`}
                    >
                      {user.role === "ADMIN" ? "Admin" : "User"}
                    </span>

                    <ChangeRoleControl isSelf={isSelf} onChanged={handleChanged} user={user} />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </AppShell>
  );
}
