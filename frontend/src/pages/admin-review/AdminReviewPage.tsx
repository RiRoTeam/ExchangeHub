import { SubmissionReviewActions } from "../../features/submission/review/SubmissionReviewActions";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";

export function AdminReviewPage() {
  return (
    <AppShell
      title="Admin / review programs"
      description="Pending submissions and moderation actions will live here."
      navigation={<AdminTabs currentRoute="adminReview" />}
    >
      <SubmissionReviewActions />
    </AppShell>
  );
}
