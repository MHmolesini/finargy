import DolarDashboard from "@/components/DolarDashboard";

export default function DolarPage() {
  return (
    <div>
      <header className="header">
        <div>
          <h1 className="font-outfit" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Tipos de Cambio Implícitos
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>Dólar CCL y MEP calculado a través de cotizaciones cruzadas de Acciones y CEDEARs.</p>
        </div>
      </header>

      <section style={{ marginTop: '2rem' }}>
        <DolarDashboard />
      </section>
    </div>
  );
}
