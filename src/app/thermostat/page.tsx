import ClientLayout from "@/components/ClientLayout";
import Thermostat from "@/components/pages/Thermostat";

export default function Page() {
  return (
    <ClientLayout currentPage="thermostat">
      <Thermostat />
    </ClientLayout>
  );
}