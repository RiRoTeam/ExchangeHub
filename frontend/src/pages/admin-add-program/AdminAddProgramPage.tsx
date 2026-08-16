import { useCallback } from "react";
import { createProgram } from "../../entities/program/api";
import type { ProgramDraft } from "../../shared/types/submission";
import { SuggestProgramForm } from "../../features/submission/create/SuggestProgramForm";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";

export function AdminAddProgramPage() {
  // У админа форма бьёт не в очередь модерации, а сразу в каталог.
  const handleSubmit = useCallback(async (draft: ProgramDraft) => {
    await createProgram(draft);
  }, []);

  return (
    <AppShell
      title="Admin / add program"
      description="Publish a program straight to the catalog, skipping the moderation queue."
      navigation={<AdminTabs currentRoute="adminAddProgram" />}
    >
      <SuggestProgramForm
        heading="New program"
        onSubmit={handleSubmit}
        submitLabel="Publish program"
        successMessage="Program published. It’s live in the catalog now."
      />
    </AppShell>
  );
}
