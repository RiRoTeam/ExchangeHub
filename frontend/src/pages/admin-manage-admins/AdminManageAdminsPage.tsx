import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/providers/AuthProvider";
import { listAdminUsers, type AdminUser } from "../../entities/user/adminApi";
import { useApiErrorText } from "../../shared/i18n/useApiErrorText";
import { ChangeRoleControl } from "../../features/admin/change-role/ChangeRoleControl";
import { useFormatters } from "../../shared/i18n/useFormatters";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";

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
  const { t } = useTranslation();
  const toErrorText = useApiErrorText();
  const { formatDate } = useFormatters();
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
        setLoadError(toErrorText(error, t("admin.peopleLoadError")));
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
  }, [reloadToken, t, toErrorText]);

  const handleChanged = useCallback((updated: AdminUser) => {
    setUsers((current) =>
      current.map((user) => (user.id === updated.id ? updated : user))
    );
    setNotice(
      updated.role === "ADMIN"
        ? t("admin.promotedNotice", { name: updated.name })
        : t("admin.demotedNotice", { name: updated.name })
    );
  }, [t]);

  const visibleUsers = useMemo(
    () => users.filter((user) => matchesQuery(user, query)),
    [query, users]
  );

  const adminCount = users.filter((user) => user.role === "ADMIN").length;

  return (
    <AppShell
      title={t("admin.usersTitle")}
      description={t("admin.usersDescription")}
      navigation={<AdminTabs currentRoute="adminManageAdmins" />}
    >
      <section className="programs-page__header">
        <div>
          <h2>{t("admin.peopleHeading")}</h2>
          <p>
            {loadError
              ? t("admin.peopleUnavailable")
              : isLoading
              ? t("admin.peopleLoading")
              : `${t("admin.accounts", { count: users.length })}, ${t("admin.withAdminAccess", {
                  count: adminCount
                })}`}
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={isLoading}
          onClick={() => setReloadToken((current) => current + 1)}
          type="button"
        >
          {t("common.refresh")}
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
            {t("common.retry")}
          </button>
        </div>
      ) : isLoading ? (
        <div className="placeholder-card">{t("admin.peopleLoading")}</div>
      ) : (
        <>
          <label className="auth-form-fields__label user-table__search">
            <span>{t("admin.findPerson")}</span>
            <input
              className="text-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("admin.findPersonPlaceholder")}
              type="search"
              value={query}
            />
          </label>

          {visibleUsers.length === 0 ? (
            <div className="placeholder-card">{t("admin.noPeopleFound")}</div>
          ) : (
            <ul className="user-list">
              {visibleUsers.map((user) => {
                const isSelf = user.id === session?.user.id;

                return (
                  <li className="user-list__row" key={user.id}>
                    <div className="user-list__identity">
                      <p className="user-list__name">
                        {user.name}
                        {isSelf ? <span className="user-list__you">{t("admin.you")}</span> : null}
                      </p>
                      <p className="user-list__email">{user.email}</p>
                      <p className="user-list__joined">{t("admin.joined", { date: formatDate(user.createdAt) })}</p>
                    </div>

                    <span
                      className={`status-pill ${
                        user.role === "ADMIN" ? "status-pill--approved" : "status-pill--pending"
                      }`}
                    >
                      {t(`roles.${user.role}`)}
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
