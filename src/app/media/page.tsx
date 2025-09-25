import ClientLayout from "@/components/ClientLayout";
import MediaPage from "@/components/pages/Media";

export default function Page() {
  return (
    <ClientLayout currentPage="media">
      <MediaPage />
    </ClientLayout>
  );
}