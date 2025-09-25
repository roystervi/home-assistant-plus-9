import ClientLayout from "@/components/ClientLayout";
import AlarmPanel from "@/components/pages/AlarmPanel";

export default function Page() {
  return (
    <ClientLayout currentPage="alarm">
      <AlarmPanel />
    </ClientLayout>
  );
}