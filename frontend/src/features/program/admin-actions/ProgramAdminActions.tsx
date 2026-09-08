import { useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteProgram } from "../../../entities/program/api";
import { useApiErrorText } from "../../../shared/i18n/useApiErrorText";
import type { Program } from "../../../shared/types/program";

type ProgramAdminActionsProps = {
  program: Program;
  onEdit: (program: Program) => void;
  onDeleted: (program: Program) => void;
};

export function ProgramAdminActions({ program, onEdit, onDeleted }: ProgramAdminActionsProps) {
  const { t } = useTranslation();
  const toErrorText = useApiErrorText();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setError("");
    setIsDeleting(true);

    try {
      await deleteProgram(program.id);
      onDeleted(program);
    } catch (deleteError) {
      setError(toErrorText(deleteError, t("admin.deleteError")));
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="program-admin-actions">
      {isConfirmingDelete ? (
        // Подтверждение прямо в карточке, а не window.confirm: удаление
        // необратимо, и на демо диалог браузера смотрелся бы чужеродно.
        <div className="action-strip">
          <span className="program-admin-actions__question">
            {t("admin.confirmDelete", { title: program.title })}
          </span>
          <button
            className="secondary-button secondary-button--danger"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
            type="button"
          >
            {isDeleting ? t("admin.deleting") : t("admin.confirmDeleteYes")}
          </button>
          <button
            className="secondary-button"
            disabled={isDeleting}
            onClick={() => setIsConfirmingDelete(false)}
            type="button"
          >
            {t("admin.confirmDeleteNo")}
          </button>
        </div>
      ) : (
        <div className="action-strip">
          <button className="secondary-button" onClick={() => onEdit(program)} type="button">
            {t("admin.edit")}
          </button>
          <button
            className="secondary-button secondary-button--danger"
            onClick={() => setIsConfirmingDelete(true)}
            type="button"
          >
            {t("admin.delete")}
          </button>
        </div>
      )}

      <div aria-live="polite">
        {error ? <p className="form-field__error">{error}</p> : null}
      </div>
    </div>
  );
}
