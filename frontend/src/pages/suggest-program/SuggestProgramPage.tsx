import { SuggestProgramForm } from "../../features/submission/create/SuggestProgramForm";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";

export function SuggestProgramPage() {
  return (
    <AppShell
      title="Suggest program"
      description="Users can submit a program for admin review from this page."
      navigation={<MobileBottomNav currentRoute="suggestProgram" />}
    >
      <SuggestProgramForm />
    </AppShell>
  );
}
