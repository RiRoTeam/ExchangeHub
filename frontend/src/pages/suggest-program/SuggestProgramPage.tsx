import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createSubmission, listMySubmissions } from "../../entities/submission/api";
import { useApiErrorText } from "../../shared/i18n/useApiErrorText";
import type { ProgramDraft, Submission } from "../../shared/types/submission";
import { SuggestProgramForm } from "../../features/submission/create/SuggestProgramForm";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";
import { SubmissionList } from "../../widgets/submission-list/SubmissionList";

export function SuggestProgramPage() {
  const { t } = useTranslation();
  const toErrorText = useApiErrorText();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();
    let isActive = true;

    async function loadSubmissions() {
      setIsLoading(true);
      setLoadError("");

      try {
        const nextSubmissions = await listMySubmissions(abortController.signal);

        if (isActive) {
          setSubmissions(nextSubmissions);
        }
      } catch (error) {
        if (abortController.signal.aborted || !isActive) {
          return;
        }

        setSubmissions([]);
        setLoadError(toErrorText(error, t("submissions.myLoadError")));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadSubmissions();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [reloadToken, t]);

  const handleSubmit = useCallback(async (draft: ProgramDraft) => {
    await createSubmission(draft);
    // Заявка ушла — перечитываем список, чтобы сразу показать её со статусом.
    setReloadToken((current) => current + 1);
  }, []);

  return (
    <AppShell
      title={t("submissions.suggestTitle")}
      description={t("submissions.suggestDescription")}
      navigation={<MobileBottomNav currentRoute="suggestProgram" />}
    >
      <SuggestProgramForm onSubmit={handleSubmit} />

      <section className="page-section">
        <div className="programs-page__header">
          <h2>{t("submissions.myHeading")}</h2>
          <p>
            {loadError
              ? t("submissions.myUnavailable")
              : isLoading
              ? t("submissions.myLoading")
              : t("submissions.mySubmissions", { count: submissions.length })}
          </p>
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
          <div className="placeholder-card">{t("submissions.myLoading")}</div>
        ) : (
          <SubmissionList
            emptyMessage={t("submissions.myEmpty")}
            submissions={submissions}
          />
        )}
      </section>
    </AppShell>
  );
}
