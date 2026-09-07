import { useState } from "react";
import { changeUserRole } from "../../../entities/user/api";
import { ApiError } from "../../../shared/api/http";
import { toFriendlyApiError } from "../../../shared/api/problem";
import type { AdminUser, UserRole } from "../../../shared/types/user";

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
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (isSelf) {
    // Бэк разрешает разжаловать себя, пока есть другой администратор, но при
    // этом отзывает наши же refresh-токены — панель закроется под руками.
    return <span className="role-control__self">You can’t change your own role</span>;
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
        setError("This is the last administrator — promote someone else first.");
      } else {
        setError(toFriendlyApiError(changeError, "We couldn’t change this role."));
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
              ? `Give ${user.name} full admin access? They will be able to publish, edit and delete any program.`
              : `Remove admin access from ${user.name}? They will be signed out of every device.`}
          </p>
          <div className="action-strip">
            <button
              className={isPromotion ? "primary-button" : "secondary-button secondary-button--danger"}
              disabled={isSubmitting}
              onClick={() => void apply()}
              type="button"
            >
              {isSubmitting ? "Applying..." : isPromotion ? "Make admin" : "Remove admin"}
            </button>
            <button
              className="secondary-button"
              disabled={isSubmitting}
              onClick={() => setIsConfirming(false)}
              type="button"
            >
              Cancel
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
          {isPromotion ? "Make admin" : "Remove admin"}
        </button>
      )}

      <div aria-live="polite">
        {error ? <p className="form-field__error">{error}</p> : null}
      </div>
    </div>
  );
}
