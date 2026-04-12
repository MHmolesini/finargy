'use client';

import React, { useEffect, useState, useMemo } from 'react';
import NotesTable from './NotesTable';
import YieldCurveChart from './YieldCurveChart';

export interface BaseNote {
  symbol: string;
  q_bid: number;
  px_bid: number;
  px_ask: number;
  q_ask: number;
  v: number;
  q_op: number;
  c: number;
  pct_change: number;
  tipo_activo?: string;
  fecha_vencimiento?: string | null;
  precio_final_estimado?: number | null;
}

export interface ProcessedNote extends BaseNote {
  spread: number;
  avgTicket: number;
  daysToVto: number | null;
  tasaDirecta: number | null;
  tem: number | null;
  tea: number | null;
  precioAnterior: number | null;
  diasAnterior: number | null;
  temAnterior: number | null;
  teaAnterior: number | null;
}

const MarketDashboard = () => {
  const [notesData, setNotesData] = useState<BaseNote[]>([]);
  const [bondsData, setBondsData] = useState<BaseNote[]>([]);
  const [activeMarket, setActiveMarket] = useState<'letras' | 'bonos'>('letras');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [notesRes, bondsRes] = await Promise.all([
        fetch('http://localhost:3001/api/notes'),
        fetch('http://localhost:3001/api/bonds')
      ]);
      if (!notesRes.ok || !bondsRes.ok) throw new Error('Error al conectar con el backend');
      const notesJson = await notesRes.json();
      const bondsJson = await bondsRes.json();
      setNotesData(notesJson);
      setBondsData(bondsJson);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información. Asegúrate de que el backend esté corriendo.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);

  // Lógica de cálculo unificada para Tabla y Gráfico
  const processedNotes: ProcessedNote[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeData = activeMarket === 'letras' ? notesData : bondsData;

    return activeData.map(note => {
      let daysToVto = null;
      if (note.fecha_vencimiento) {
        const vto = new Date(note.fecha_vencimiento);
        vto.setHours(0, 0, 0, 0);
        const diffTime = vto.getTime() - today.getTime();
        daysToVto = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      let tasaDirecta = null;
      let tem = null;
      let tea = null;

      let precioAnterior = null;
      let diasAnterior = null;
      let temAnterior = null;
      let teaAnterior = null;

      if (note.precio_final_estimado && note.c > 0 && daysToVto !== null && daysToVto > 0) {
        // --- CÁLCULO HOY ---
        const factor = note.precio_final_estimado / note.c;
        if (factor > 0) {
          tasaDirecta = (factor - 1) * 100;
          tem = (Math.pow(factor, 30 / daysToVto) - 1) * 100;
          tea = (Math.pow(factor, 365 / daysToVto) - 1) * 100;
        }

        // --- INGENIERÍA INVERSA (T-1) ---
        let pct = note.pct_change || 0;
        precioAnterior = note.c / (1 + (pct / 100));
        diasAnterior = daysToVto + 1; 

        const factorAyer = note.precio_final_estimado / precioAnterior;
        if (factorAyer > 0) {
          temAnterior = (Math.pow(factorAyer, 30 / diasAnterior) - 1) * 100;
          teaAnterior = (Math.pow(factorAyer, 365 / diasAnterior) - 1) * 100;
        }
      }

      return {
        ...note,
        spread: (note.px_bid > 0 && note.px_ask > 0) ? ((note.px_ask - note.px_bid) / note.px_bid) * 100 : 0,
        avgTicket: (note.q_op > 0) ? (note.v / note.q_op) : 0,
        daysToVto,
        tasaDirecta,
        tem,
        tea,
        precioAnterior,
        diasAnterior,
        temAnterior,
        teaAnterior
      };
    });
  }, [notesData, bondsData, activeMarket]);

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-dim)', textAlign: 'center' }}>Cargando cotizaciones...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>{error}</div>;

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER AND TABS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', fontFamily: 'Outfit, sans-serif' }}>
          Monitor de {activeMarket === 'letras' ? 'Letras (TEM)' : 'Bonos Soberanos'}
        </h2>
        
        {/* MARKET FILTER TOGGLE */}
        <div className="glass" style={{ display: 'inline-flex', width: 'fit-content', padding: '0.35rem', borderRadius: '0.75rem', gap: '0.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => setActiveMarket('letras')}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeMarket === 'letras' ? '#10B981' : 'transparent',
              color: activeMarket === 'letras' ? '#fff' : 'var(--text-dim)',
              boxShadow: activeMarket === 'letras' ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none'
            }}
            onMouseOver={(e) => { if(activeMarket !== 'letras') e.currentTarget.style.color = '#fff' }}
            onMouseOut={(e) => { if(activeMarket !== 'letras') e.currentTarget.style.color = 'var(--text-dim)' }}
          >
            Letras
          </button>
          <button
            onClick={() => setActiveMarket('bonos')}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeMarket === 'bonos' ? '#3B82F6' : 'transparent',
              color: activeMarket === 'bonos' ? '#fff' : 'var(--text-dim)',
              boxShadow: activeMarket === 'bonos' ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none'
            }}
            onMouseOver={(e) => { if(activeMarket !== 'bonos') e.currentTarget.style.color = '#fff' }}
            onMouseOut={(e) => { if(activeMarket !== 'bonos') e.currentTarget.style.color = 'var(--text-dim)' }}
          >
            Bonos
          </button>
        </div>
      </div>

      {/* RE-ESTRUCTURANDO EL DATA BINDING AUTOMÁTICO */}
      <div className="w-full bg-[#111]/50 backdrop-blur-md rounded-xl border border-[#222] p-4 shadow-xl">
        <YieldCurveChart notes={processedNotes} activeMarket={activeMarket} />
      </div>

      <div className="flex-grow min-w-0">
        <NotesTable notes={processedNotes} />
      </div>
    </div>
  );
};

export default MarketDashboard;
