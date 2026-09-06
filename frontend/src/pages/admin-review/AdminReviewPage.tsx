import { useCallback, useEffect, useState } from "react";
import { listPendingSubmissions } from "../../entities/submission/api";
import { toFriendlyApiError } from "../../shared/api/problem";
import type { Submission } from "../../shared/types/submission";
import { SubmissionReviewActions } from "../../features/submission/review/SubmissionReviewActions";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { SubmissionList } from "../../widgets/submission-list/SubmissionList";

export function AdminReviewPage() {
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
        setLoadError(toFriendlyApiError(error, "We couldn’t load the moderation queue."));
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
  }, [reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  const handleReviewed = useCallback((reviewed: Submission) => {
    // Убираем только после ответа сервера: при одобрении он ещё и создаёт
    // программу в каталоге, оптимистично такое скрывать нельзя.
    setSubmissions((current) => current.filter((item) => item.id !== reviewed.id));
    setLastDecision(
      reviewed.status === "APPROVED"
        ? `“${reviewed.title}” is published in the catalog.`
        : `“${reviewed.title}” was rejected. The author will see your comment.`
    );
  }, []);

  function describeQueue() {
    if (loadError) {
      return "The queue is temporarily unavailable.";
    }

    if (isLoading) {
      return "Loading the moderation queue...";
    }

    if (submissions.length === 0) {
      return "Nothing waiting for review";
    }

    return `${submissions.length} ${submissions.length === 1 ? "submission" : "submissions"} waiting`;
  }

  return (
    <AppShell
      title="Admin / review programs"
      description="Community submissions waiting for a decision. Approving publishes the program to the catalog."
      navigation={<AdminTabs currentRoute="adminReview" />}
    >
      <section className="programs-page__header">
        <div>
          <h2>Moderation queue</h2>
          <p>{describeQueue()}</p>
        </div>
        <button className="secondary-button" disabled={isLoading} onClick={reload} type="button">
          Refresh
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
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="placeholder-card">Loading the moderation queue...</div>
      ) : (
        <SubmissionList
          emptyMessage="The queue is empty. New community submissions will show up here."
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
