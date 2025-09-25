import ClientLayout from "@/components/ClientLayout";
import Agenda from "@/components/pages/Agenda";

export default function Page() {
  return (
    <ClientLayout currentPage="agenda">
      <Agenda />
    </ClientLayout>
  );
}