import ClientLayout from "@/components/ClientLayout";
import SprinklerPage from "@/components/pages/Sprinkler";

export default function Page() {
  return (
    <ClientLayout currentPage="sprinkler">
      <SprinklerPage />
    </ClientLayout>
  );
}