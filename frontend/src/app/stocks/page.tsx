import StocksDashboard from "@/components/StocksDashboard";

export default function StocksPage() {
  return (
    <div style={{ padding: '0 1rem' }}>
      <header className="header">
        <div>
          <h1 className="font-outfit" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Renta Variable
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>Panel de Cotizaciones de Acciones Locales en Buenos Aires.</p>
        </div>
      </header>

      <section style={{ marginTop: '2rem' }}>
        <StocksDashboard />
      </section>
    </div>
  );
}
