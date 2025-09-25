import ClientLayout from "@/components/ClientLayout";
import Automations from "@/components/pages/Automations";

export default function Page() {
  return (
    <ClientLayout currentPage="automations">
      <Automations />
    </ClientLayout>
  );
}