import ClientLayout from "@/components/ClientLayout";
import CryptoPortfolio from "@/components/pages/CryptoPortfolio";

export default function Page() {
  return (
    <ClientLayout currentPage="crypto">
      <CryptoPortfolio />
    </ClientLayout>
  );
}