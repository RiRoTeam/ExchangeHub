import { useState } from "react";
import { deleteProgram } from "../../../entities/program/api";
import { toFriendlyApiError } from "../../../shared/api/problem";
import type { Program } from "../../../shared/types/program";

type ProgramAdminActionsProps = {
  program: Program;
  onEdit: (program: Program) => void;
  onDeleted: (program: Program) => void;
};

export function ProgramAdminActions({ program, onEdit, onDeleted }: ProgramAdminActionsProps) {
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
      setError(toFriendlyApiError(deleteError, "We couldn’t delete this program."));
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
            Delete “{program.title}” permanently?
          </span>
          <button
            className="secondary-button secondary-button--danger"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
            type="button"
          >
            {isDeleting ? "Deleting..." : "Yes, delete"}
          </button>
          <button
            className="secondary-button"
            disabled={isDeleting}
            onClick={() => setIsConfirmingDelete(false)}
            type="button"
          >
            Keep it
          </button>
        </div>
      ) : (
        <div className="action-strip">
          <button className="secondary-button" onClick={() => onEdit(program)} type="button">
            Edit
          </button>
          <button
            className="secondary-button secondary-button--danger"
            onClick={() => setIsConfirmingDelete(true)}
            type="button"
          >
            Delete
          </button>
        </div>
      )}

      <div aria-live="polite">
        {error ? <p className="form-field__error">{error}</p> : null}
      </div>
    </div>
  );
}
