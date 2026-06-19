import { AppShell } from "../../widgets/app-shell/AppShell";
import { FilterSidebar } from "../../widgets/filter-sidebar/FilterSidebar";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";
import { ProgramList } from "../../widgets/program-list/ProgramList";

export function FavoritesPage() {
  return (
    <AppShell
      title="Favorite programs"
      description="Saved programs will render here once favorites are backed by the API."
      aside={<FilterSidebar title="Favorites search and filters" />}
      navigation={<MobileBottomNav currentRoute="favorites" />}
    >
      <ProgramList programs={[]} emptyMessage="Favorite programs are not implemented yet." />
    </AppShell>
  );
}
