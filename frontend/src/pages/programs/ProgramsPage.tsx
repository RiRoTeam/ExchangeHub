import { AppShell } from "../../widgets/app-shell/AppShell";
import { FilterSidebar } from "../../widgets/filter-sidebar/FilterSidebar";
import { ProgramList } from "../../widgets/program-list/ProgramList";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";

export function ProgramsPage() {
  return (
    <AppShell
      title="All programs"
      description="Public catalog for users with filters, search, and program cards."
      aside={<FilterSidebar />}
      navigation={<MobileBottomNav currentRoute="programs" />}
    >
      <ProgramList programs={[]} />
    </AppShell>
  );
}
