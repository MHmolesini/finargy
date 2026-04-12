import MarketDashboard from "@/components/MarketDashboard";

export default function Home() {
  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2rem' }}>
        <h2 className="font-outfit" style={{ fontSize: '2rem', fontWeight: 600, color: 'white' }}>
          Cotizaciones en Vivo
        </h2>
        <p style={{ color: 'var(--text-dim)', marginTop: '0.5rem' }}>
          Bonos Argentinos (SENEBI/PPC) - Actualizado cada 20 segundos
        </p>
      </header>
      
      <section>
        <MarketDashboard />
      </section>

      <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center' }}>
        <p>&copy; 2026 FinArg Dashboard. Datos provistos por Data912.</p>
      </footer>
    </div>
  );
}
