import { useCallback, useEffect, useState } from "react";
import { createSubmission, listMySubmissions } from "../../entities/submission/api";
import { toFriendlyApiError } from "../../shared/api/problem";
import type { ProgramDraft, Submission } from "../../shared/types/submission";
import { SuggestProgramForm } from "../../features/submission/create/SuggestProgramForm";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";
import { SubmissionList } from "../../widgets/submission-list/SubmissionList";

export function SuggestProgramPage() {
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
        setLoadError(toFriendlyApiError(error, "We couldn’t load your submissions right now."));
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
  }, [reloadToken]);

  const handleSubmit = useCallback(async (draft: ProgramDraft) => {
    await createSubmission(draft);
    // Заявка ушла — перечитываем список, чтобы сразу показать её со статусом.
    setReloadToken((current) => current + 1);
  }, []);

  return (
    <AppShell
      title="Suggest program"
      description="Send a program to the moderation queue and track what happens to it."
      navigation={<MobileBottomNav currentRoute="suggestProgram" />}
    >
      <SuggestProgramForm onSubmit={handleSubmit} />

      <section className="page-section">
        <div className="programs-page__header">
          <h2>My submissions</h2>
          <p>
            {loadError
              ? "Submissions are temporarily unavailable."
              : isLoading
              ? "Loading your submissions..."
              : `${submissions.length} ${submissions.length === 1 ? "submission" : "submissions"}`}
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
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="placeholder-card">Loading your submissions...</div>
        ) : (
          <SubmissionList
            emptyMessage="You haven’t suggested any programs yet. The form above is the place to start."
            submissions={submissions}
          />
        )}
      </section>
    </AppShell>
  );
}
