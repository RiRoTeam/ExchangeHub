import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createProgram } from "../../entities/program/api";
import type { ProgramDraft } from "../../shared/types/submission";
import { SuggestProgramForm } from "../../features/submission/create/SuggestProgramForm";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";

export function AdminAddProgramPage() {
  const { t } = useTranslation();
  // У админа форма бьёт не в очередь модерации, а сразу в каталог.
  const handleSubmit = useCallback(async (draft: ProgramDraft) => {
    await createProgram(draft);
  }, []);

  return (
    <AppShell
      title={t("admin.addTitle")}
      description={t("admin.addDescription")}
      navigation={<AdminTabs currentRoute="adminAddProgram" />}
    >
      <SuggestProgramForm
        heading={t("admin.addHeading")}
        onSubmit={handleSubmit}
        submitLabel={t("admin.publish")}
        successMessage={t("admin.publishSuccess")}
      />
    </AppShell>
  );
}
