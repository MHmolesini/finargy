'use client';

import React, { useEffect, useState, useMemo } from 'react';
import MarketDashboard, { BaseNote } from "@/components/MarketDashboard";
import BreakevenMonitor from "@/components/BreakevenMonitor";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { fetchMarketData } from '@/utils/supabase';

export default function Home() {
  const [notesData, setNotesData] = useState<BaseNote[]>([]);
  const [bondsData, setBondsData] = useState<BaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [notesJson, bondsJson] = await Promise.all([
        fetchMarketData('notes'),
        fetchMarketData('bonds')
      ]);
      setNotesData(notesJson);
      setBondsData(bondsJson);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Problema al conectar con la nube de datos.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);

  // Procesamiento compartido para el monitor
  const allNotesProcessed = useMemo(() => {
    // Aquí podrías añadir lógica de procesamiento si fuera necesaria, 
    // pero BreakevenMonitor ya procesa lo que necesita.
    return [...notesData, ...bondsData];
  }, [notesData, bondsData]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="animate-fade-in flex flex-col gap-12">
      <header style={{ marginBottom: '1rem' }}>
        <h2 className="font-outfit" style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.03em' }}>
          Cotizaciones <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">en Vivo</span>
        </h2>
        <p style={{ color: 'var(--text-dim)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
          Mercado de Capitales Argentino • Actualización en tiempo real (T+1)
        </p>
      </header>
      
      {/* SECCIÓN 1: DASHBOARD DE MERCADO (TABLAS Y GRÁFICO DE RENDIMIENTO) */}
      <section>
        <MarketDashboard externalNotes={notesData} externalBonds={bondsData} />
      </section>

      {/* SECCIÓN 2: ANÁLISIS ESTRATÉGICO BREAKEVEN */}
      <section className="border-t border-white/5 pt-16">
        <BreakevenMonitor notes={allNotesProcessed} />
      </section>

      <footer style={{ marginTop: '4rem', padding: '4rem 0', borderTop: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center' }}>
        <p className="opacity-50">&copy; 2026 FinArg Dashboard. Datos provistos por Data912.</p>
      </footer>
    </div>
  );
}
