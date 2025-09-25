import ClientLayout from "@/components/ClientLayout";
import EnergyMonitor from "@/components/pages/EnergyMonitor";

export default function Page() {
  return (
    <ClientLayout currentPage="energy">
      <EnergyMonitor />
    </ClientLayout>
  );
}