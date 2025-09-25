import ClientLayout from "@/components/ClientLayout";
import SettingsPage from "@/components/pages/Settings";

export default function Page() {
  return (
    <ClientLayout currentPage="settings">
      <SettingsPage />
    </ClientLayout>
  );
}