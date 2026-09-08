import { useState } from "react";
import { useTranslation } from "react-i18next";
import { changeUserRole, type AdminUser } from "../../../entities/user/adminApi";
import { ApiError } from "../../../shared/api/http";
import { useApiErrorText } from "../../../shared/i18n/useApiErrorText";
import type { UserRole } from "../../../shared/types/user";

type ChangeRoleControlProps = {
  user: AdminUser;
  /** Текущий администратор: себе роль менять нельзя. */
  isSelf: boolean;
  onChanged: (user: AdminUser) => void;
};

const nextRole: Record<UserRole, UserRole> = {
  USER: "ADMIN",
  ADMIN: "USER"
};

export function ChangeRoleControl({ user, isSelf, onChanged }: ChangeRoleControlProps) {
  const { t } = useTranslation();
  const toErrorText = useApiErrorText();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (isSelf) {
    // Бэк разрешает разжаловать себя, пока есть другой администратор, но при
    // этом отзывает наши же refresh-токены — панель закроется под руками.
    return <span className="role-control__self">{t("admin.cannotChangeOwnRole")}</span>;
  }

  const target = nextRole[user.role];
  const isPromotion = target === "ADMIN";

  async function apply() {
    setError("");
    setIsSubmitting(true);

    try {
      const updated = await changeUserRole(user.id, target);
      setIsConfirming(false);
      onChanged(updated);
    } catch (changeError) {
      if (changeError instanceof ApiError && changeError.status === 409) {
        setError(t("admin.lastAdmin"));
      } else {
        setError(toErrorText(changeError, t("admin.roleChangeError")));
      }

      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="role-control">
      {isConfirming ? (
        <div className="role-control__confirm">
          <p className="role-control__question">
            {isPromotion
              ? t("admin.confirmPromote", { name: user.name })
              : t("admin.confirmDemote", { name: user.name })}
          </p>
          <div className="action-strip">
            <button
              className={isPromotion ? "primary-button" : "secondary-button secondary-button--danger"}
              disabled={isSubmitting}
              onClick={() => void apply()}
              type="button"
            >
              {isSubmitting ? t("admin.applying") : isPromotion ? t("admin.makeAdmin") : t("admin.removeAdmin")}
            </button>
            <button
              className="secondary-button"
              disabled={isSubmitting}
              onClick={() => setIsConfirming(false)}
              type="button"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="secondary-button"
          onClick={() => {
            setError("");
            setIsConfirming(true);
          }}
          type="button"
        >
          {isPromotion ? t("admin.makeAdmin") : t("admin.removeAdmin")}
        </button>
      )}

      <div aria-live="polite">
        {error ? <p className="form-field__error">{error}</p> : null}
      </div>
    </div>
  );
}
