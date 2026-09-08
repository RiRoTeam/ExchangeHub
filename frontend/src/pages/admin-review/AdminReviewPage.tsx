import { useEffect, useState } from "react";
import {
  listPendingSubmissions,
  reviewSubmission
} from "../../entities/submission/api";
import type { Submission } from "../../shared/types/submission";
import { toFriendlyApiError } from "../../shared/api/problem";
import { SubmissionReviewActions } from "../../features/submission/review/SubmissionReviewActions";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { SubmissionList } from "../../widgets/submission-list/SubmissionList";

export function AdminReviewPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    listPendingSubmissions(controller.signal)
      .then(setSubmissions)
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(toFriendlyApiError(loadError, "We couldn’t load the moderation queue."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [reloadToken]);

  async function handleReview(
    submission: Submission,
    status: "APPROVED" | "REJECTED",
    comment?: string
  ) {
    setPendingId(submission.id);
    setError("");
    try {
      await reviewSubmission(submission.id, status, comment);
      setSubmissions((current) => current.filter((item) => item.id !== submission.id));
    } catch (reviewError) {
      setError(toFriendlyApiError(reviewError, "We couldn’t save this review decision."));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <AppShell
      title="Admin / review programs"
      description="Review pending community submissions and publish suitable programs."
      navigation={<AdminTabs currentRoute="adminReview" />}
    >
      <section className="programs-page__header">
        <div>
          <h2>Moderation queue</h2>
          <p>{isLoading ? "Loading submissions..." : `${submissions.length} pending`}</p>
        </div>
      </section>

      {error ? (
        <div className="error-banner">
          <p>{error}</p>
          <button className="secondary-button" onClick={() => setReloadToken((value) => value + 1)} type="button">
            Reload queue
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="placeholder-card">Loading submissions...</div>
      ) : (
        <SubmissionList
          emptyMessage="The moderation queue is clear."
          renderActions={(submission) => (
            <SubmissionReviewActions
              disabled={pendingId !== null}
              onReview={(status, comment) => handleReview(submission, status, comment)}
            />
          )}
          showAuthor
          submissions={submissions}
        />
      )}
    </AppShell>
  );
}
