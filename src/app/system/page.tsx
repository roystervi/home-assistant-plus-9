import ClientLayout from "@/components/ClientLayout";
import System from "@/components/pages/System";

export default function Page() {
  return (
    <ClientLayout currentPage="system">
      <System />
    </ClientLayout>
  );
}