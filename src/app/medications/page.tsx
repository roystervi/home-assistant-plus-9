import ClientLayout from "@/components/ClientLayout";
import Medications from "@/components/pages/Medications";

export default function Page() {
  return (
    <ClientLayout currentPage="medications">
      <Medications />
    </ClientLayout>
  );
}