import ClientLayout from "@/components/ClientLayout";
import Agenda from "@/components/pages/Agenda";

export default function AgendaPage() {
  return (
    <ClientLayout currentPage="agenda">
      <Agenda />
    </ClientLayout>
  );
}