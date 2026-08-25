import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { FilterSidebar } from "../../widgets/filter-sidebar/FilterSidebar";
import { ProgramList } from "../../widgets/program-list/ProgramList";

export function AdminProgramsPage() {
  return (
    <AppShell
      title="Admin / all programs"
      description="Admin catalog view with the same browsing surface as the user side."
      navigation={<AdminTabs currentRoute="adminPrograms" />}
      aside={<FilterSidebar />}
    >
      <ProgramList programs={[]} />
    </AppShell>
  );
}
