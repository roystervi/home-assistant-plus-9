import ClientLayout from "@/components/ClientLayout";
import Assistant from "@/components/pages/Assistant";

export default function Page() {
  return (
    <ClientLayout currentPage="assistant">
      <Assistant />
    </ClientLayout>
  );
}