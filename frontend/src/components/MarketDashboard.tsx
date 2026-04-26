'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import NotesTable from './NotesTable';
import YieldCurveChart from './YieldCurveChart';
import MarketHeatmap from './MarketHeatmap';
import BreakevenMonitor from './BreakevenMonitor';
import DashboardSkeleton from './DashboardSkeleton';
import { fetchMarketData } from '@/utils/supabase';

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
  daystovto?: number | null;
  tasa_directa?: number | null;
  tem?: number | null;
  tea?: number | null;
  vol_monto?: number | null;
  tir?: number | null;
  paridad?: number | null;
  residual_value?: number | null;
  intereses_corridos?: number | null;
  currency?: string | null;
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

interface MarketDashboardProps {
  externalNotes?: BaseNote[];
  externalBonds?: BaseNote[];
}

const CHART_GROUPS = [
  { id: 'CAP', label: '$ CAP', types: ['LECAP', 'BONCAP'] },
  { id: 'CER', label: 'CER', types: ['LECER', 'BONCER'] },
  { id: 'LINKED', label: 'LINKED', types: ['LELINK', 'BONLINK', 'BONO LINKED'] },
  { id: 'DOLARES', label: 'DÓLARES', types: ['BONO DOLARES', 'BONO DÓLARES', 'DOLARES', 'DÓLARES', 'BOPREAL', 'BONO USD', 'SOBERANO USD'] },
  { id: 'OTROS', label: 'OTROS', types: [] }
];

const MarketDashboard: React.FC<MarketDashboardProps> = ({ externalNotes = [], externalBonds = [] }) => {
  const [activeMarket, setActiveMarket] = useState<'letras' | 'bonos'>('letras');
  const [activeChartGroup, setActiveChartGroup] = useState<string>('CAP');
  const [activeMetric, setActiveMetric] = useState<'tem' | 'tea'>('tem');


  // Lógica de procesamiento de datos
  const processData = (data: BaseNote[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return data.map(note => {      // Normalizamos la categoría a MAYÚSCULAS para la UI, pero el origen puede ser cualquier case
      const categoriaRaw = (note.tipo_activo || 'OTROS').trim().toLowerCase();
      const categoria = categoriaRaw.toUpperCase();
      
      let montoVto = note.precio_final_estimado;

      let daysToVto = note.daystovto ?? null;
      if (daysToVto === null && note.fecha_vencimiento) {
        const vto = new Date(note.fecha_vencimiento);
        vto.setHours(0, 0, 0, 0);
        const diffTime = vto.getTime() - today.getTime();
        daysToVto = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      let tasaDirecta = note.tasa_directa ?? null;
      let tem = note.tem ?? null;
      let tea = note.tea ?? null;
      let tir = note.tir ?? null;

      let precioAnterior = null;
      let diasAnterior = null;
      let temAnterior = null;
      let teaAnterior = null;

      // PRIORIDAD 1: TIR del Backend (Especial para Bonos Soberanos)
      if (tir !== null) {
        // La TIR suele venir como decimal (0.25 para 25%), la pasamos a porcentaje
        tea = tir * 100;
        tem = (Math.pow(1 + tir, 1 / 12) - 1) * 100;
      }
      // PRIORIDAD 2: Cálculo Nominal Simple como Fallback
      else if ((tasaDirecta === null || tem === null) && montoVto && note.c > 0 && daysToVto !== null && daysToVto > 0) {
        const factor = montoVto / note.c;
        if (factor > 0) {
          if (tasaDirecta === null) tasaDirecta = (factor - 1) * 100;
          if (tem === null) tem = (Math.pow(factor, 30 / daysToVto) - 1) * 100;
          if (tea === null) tea = (Math.pow(factor, 365 / daysToVto) - 1) * 100;
        }
      }

      // Si el resultado es exactamente 0 pero hay precio y plazo, probablemente sea un error de cálculo/placeholder
      // Solo limpiamos si el cambio es 0 (indica que no hay movimiento/data)
      if (tem === 0 && (daysToVto || 0) > 0 && note.c > 0 && note.pct_change === 0) tem = null;
      if (tea === 0 && (daysToVto || 0) > 0 && note.c > 0 && note.pct_change === 0) tea = null;

      // Cálculo histórico y variaciones
      if (montoVto && note.c > 0 && (daysToVto || 0) > 0) {
        let pct = note.pct_change || 0;
        precioAnterior = note.c / (1 + (pct / 100));
        diasAnterior = (daysToVto || 0) + 1; 

        const factorAyer = montoVto / precioAnterior;
        if (factorAyer > 0 && diasAnterior > 0) {
          temAnterior = (Math.pow(factorAyer, 30 / diasAnterior) - 1) * 100;
          teaAnterior = (Math.pow(factorAyer, 365 / diasAnterior) - 1) * 100;
        }
      }

      return {
        ...note,
        categoria,
        precio_final_estimado: montoVto,
        spread: (note.px_bid > 0 && note.px_ask > 0) ? ((note.px_ask - note.px_bid) / note.px_bid) * 100 : 0,
        avgTicket: (note.q_op > 0) ? (note.v / note.q_op) : 0,
        daysToVto,
        tasaDirecta,
        tem,
        tea,
        vol_monto: note.vol_monto ?? (note.v && note.c ? (note.v / 100) * note.c : 0),
        precioAnterior,
        diasAnterior,
        temAnterior,
        teaAnterior
      };
    });
  };

  // 1. Datos procesados totales por mercado
  const processedNotes = useMemo(() => processData(externalNotes), [externalNotes]);
  const processedBonds = useMemo(() => processData(externalBonds), [externalBonds]);

  // 1b. Todos los datos combinados para el gráfico (DEDUP por Símbolo)
  const allProcessedNotes = useMemo(() => {
    const combined = [...processedNotes, ...processedBonds];
    const uniqueMap = new Map<string, ProcessedNote>();
    
    combined.forEach(n => {
      const existing = uniqueMap.get(n.symbol);
      // Priorizamos la versión que tenga tasas calculadas
      if (!existing || ((existing.tem === null || existing.tem === 0) && n.tem !== null && n.tem !== 0)) {
        uniqueMap.set(n.symbol, n);
      }
    });
    
    return Array.from(uniqueMap.values());
  }, [processedNotes, processedBonds]);

  // 2. Tabla Fija por Mercado
  const activeTableNotes = useMemo(() => {
    return activeMarket === 'letras' ? processedNotes : processedBonds;
  }, [processedNotes, processedBonds, activeMarket]);

  // 3. Datos Filtrados para el Gráfico (Independiente del mercado de la tabla)
  const graphNotes = useMemo(() => {
    const group = CHART_GROUPS.find(g => g.id === activeChartGroup);
    if (!group) return [];
    
    if (group.id === 'OTROS') {
      const definedTypes = CHART_GROUPS.filter(g => g.id !== 'OTROS').flatMap(g => g.types);
      return allProcessedNotes.filter(n => !definedTypes.includes((n as any).categoria));
    }
    
    return allProcessedNotes.filter(n => {
      const note = n as any;
      const cat = (note.categoria || '').toUpperCase();
      const symbol = (note.symbol || '').toUpperCase();
      
      // Si el grupo es DOLARES, aceptamos por moneda, sufijos D/C o Tickers Soberanos
      if (group.id === 'DOLARES') {
        const sovereignPrefixes = ['AL', 'GD', 'AE', 'BP', 'AO'];
        if (sovereignPrefixes.some(p => symbol.startsWith(p))) return true;
        if (note.currency === 'dolar' || symbol.endsWith('D') || symbol.endsWith('C')) return true;
      }
      
      return group.types.some(t => t.toUpperCase() === cat);
    });
  }, [allProcessedNotes, activeChartGroup]);

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER AND TABS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', fontFamily: 'Outfit, sans-serif' }}>
          Monitor de {activeMarket === 'letras' ? 'Letras (TEM)' : 'Bonos Soberanos'}
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          {/* MARKET SELECTOR */}
          <div className="glass" style={{ display: 'inline-flex', padding: '0.3rem', borderRadius: '0.75rem', gap: '0.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => setActiveMarket('letras')}
              style={{
                padding: '0.4rem 1.25rem',
                borderRadius: '0.5rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                backgroundColor: activeMarket === 'letras' ? '#10b981' : 'transparent',
                color: activeMarket === 'letras' ? '#fff' : 'rgba(255,255,255,0.4)',
                boxShadow: activeMarket === 'letras' ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              Letras
            </button>
            <button
              onClick={() => setActiveMarket('bonos')}
              style={{
                padding: '0.4rem 1.25rem',
                borderRadius: '0.5rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                backgroundColor: activeMarket === 'bonos' ? '#3b82f6' : 'transparent',
                color: activeMarket === 'bonos' ? '#fff' : 'rgba(255,255,255,0.4)',
                boxShadow: activeMarket === 'bonos' ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              Bonos
            </button>
          </div>

          {/* CHART GROUP SELECTOR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gráfico:</span>
            <div className="glass" style={{ display: 'inline-flex', padding: '0.3rem', borderRadius: '0.75rem', gap: '0.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              {CHART_GROUPS.map(group => (
                <button
                  key={group.id}
                  onClick={() => setActiveChartGroup(group.id)}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    backgroundColor: activeChartGroup === group.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: activeChartGroup === group.id ? '#fff' : 'rgba(255,255,255,0.4)',
                    border: activeChartGroup === group.id ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          {/* METRIC SELECTOR */}
          <div className="glass" style={{ display: 'inline-flex', padding: '0.3rem', borderRadius: '0.75rem', gap: '0.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => setActiveMetric('tem')}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                backgroundColor: activeMetric === 'tem' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: activeMetric === 'tem' ? '#fff' : 'rgba(255,255,255,0.4)',
                border: activeMetric === 'tem' ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              TEM / TIREM
            </button>
            <button
              onClick={() => setActiveMetric('tea')}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                backgroundColor: activeMetric === 'tea' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: activeMetric === 'tea' ? '#fff' : 'rgba(255,255,255,0.4)',
                border: activeMetric === 'tea' ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              TEA / TIREA
            </button>
          </div>
        </div>
      </div>

      {/* RE-ESTRUCTURANDO EL DATA BINDING AUTOMÁTICO */}
      <div className="w-full bg-[#111]/50 backdrop-blur-md rounded-xl border border-[#222] p-4 shadow-xl">
        <YieldCurveChart notes={graphNotes} activeMarket={activeMarket} metric={activeMetric} />
      </div>

      <div className="flex-grow min-w-0">
        <NotesTable notes={activeTableNotes} />
      </div>

      {/* MAPA DE CALOR GLOBAL */}
      <MarketHeatmap notes={[...externalNotes, ...externalBonds]} />
    </div>
  );
};

export default MarketDashboard;
