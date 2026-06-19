import { SuggestProgramForm } from "../../features/submission/create/SuggestProgramForm";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";

export function AdminAddProgramPage() {
  return (
    <AppShell
      title="Admin / add program"
      description="Manual program publishing form for admins."
      navigation={<AdminTabs currentRoute="adminAddProgram" />}
    >
      <SuggestProgramForm submitLabel="Publish program" />
    </AppShell>
  );
}
