import StocksDashboard from '@/components/StocksDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CEDEARs | Monitor en vivo',
  description: 'Cotizaciones y análisis en vivo de Certificados de Depósito Argentino (CEDEARS)',
};

export default function CedearsPage() {
  return (
    <main className="p-4 md:p-8">
      <StocksDashboard 
        apiEndpoint="cedears"
        title="Monitor de CEDEARs"
        subtitle="Certificados de Depósito Argentino. Cotizaciones en vivo (BYMA)."
      />
    </main>
  );
}
