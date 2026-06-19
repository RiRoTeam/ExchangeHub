import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";

export function AdminManageAdminsPage() {
  return (
    <AppShell
      title="Admin / manage admins"
      description="User role management will live here once the backend exposes the required endpoints."
      navigation={<AdminTabs currentRoute="adminManageAdmins" />}
    >
      <p>Admin access controls are not connected yet.</p>
    </AppShell>
  );
}
