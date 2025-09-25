import ClientLayout from "@/components/ClientLayout";
import Cameras from "@/components/pages/Cameras";

export default function Page() {
  return (
    <ClientLayout currentPage="cameras">
      <Cameras />
    </ClientLayout>
  );
}