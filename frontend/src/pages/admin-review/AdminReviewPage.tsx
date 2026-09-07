import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listPendingSubmissions } from "../../entities/submission/api";
import { useApiErrorText } from "../../shared/i18n/useApiErrorText";
import type { Submission } from "../../shared/types/submission";
import { SubmissionReviewActions } from "../../features/submission/review/SubmissionReviewActions";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { SubmissionList } from "../../widgets/submission-list/SubmissionList";

export function AdminReviewPage() {
  const { t } = useTranslation();
  const toErrorText = useApiErrorText();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lastDecision, setLastDecision] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();
    let isActive = true;

    async function loadQueue() {
      setIsLoading(true);
      setLoadError("");

      try {
        const pending = await listPendingSubmissions(abortController.signal);

        if (isActive) {
          setSubmissions(pending);
        }
      } catch (error) {
        if (abortController.signal.aborted || !isActive) {
          return;
        }

        setSubmissions([]);
        setLoadError(toErrorText(error, t("admin.queueLoadError")));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadQueue();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [reloadToken, t, toErrorText]);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  const handleReviewed = useCallback((reviewed: Submission) => {
    // Убираем только после ответа сервера: при одобрении он ещё и создаёт
    // программу в каталоге, оптимистично такое скрывать нельзя.
    setSubmissions((current) => current.filter((item) => item.id !== reviewed.id));
    setLastDecision(
      reviewed.status === "APPROVED"
        ? t("admin.approvedNotice", { title: reviewed.title })
        : t("admin.rejectedNotice", { title: reviewed.title })
    );
  }, [t]);

  function describeQueue() {
    if (loadError) {
      return t("admin.queueUnavailable");
    }

    if (isLoading) {
      return t("admin.queueLoading");
    }

    if (submissions.length === 0) {
      return t("admin.nothingWaiting");
    }

    return t("admin.waiting", { count: submissions.length });
  }

  return (
    <AppShell
      title={t("admin.reviewTitle")}
      description={t("admin.reviewDescription")}
      navigation={<AdminTabs currentRoute="adminReview" />}
    >
      <section className="programs-page__header">
        <div>
          <h2>{t("admin.queueHeading")}</h2>
          <p>{describeQueue()}</p>
        </div>
        <button className="secondary-button" disabled={isLoading} onClick={reload} type="button">
          {t("common.refresh")}
        </button>
      </section>

      <div aria-live="polite">
        {lastDecision ? (
          <p className="form-feedback__success review-page__decision">{lastDecision}</p>
        ) : null}
      </div>

      {loadError ? (
        <div className="error-banner">
          <p>{loadError}</p>
          <button className="secondary-button" onClick={reload} type="button">
            {t("common.retry")}
          </button>
        </div>
      ) : isLoading ? (
        <div className="placeholder-card">{t("admin.queueLoading")}</div>
      ) : (
        <SubmissionList
          emptyMessage={t("admin.queueEmpty")}
          renderActions={(submission) => (
            <SubmissionReviewActions
              onReviewed={handleReviewed}
              onStale={reload}
              submission={submission}
            />
          )}
          showAuthor
          submissions={submissions}
        />
      )}
    </AppShell>
  );
}
