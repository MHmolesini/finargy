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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="font-outfit" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
            Bonos Soberanos / Letras
          </h3>
          <div className="glass" style={{ padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Filtros: Todos los activos
          </div>
        </div>
        
        <MarketDashboard />
      </section>

      <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center' }}>
        <p>&copy; 2026 FinArg Dashboard. Datos provistos por Data912.</p>
      </footer>
    </div>
  );
}
