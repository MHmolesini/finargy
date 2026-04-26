'use client';

import React, { useEffect, useState, useMemo } from 'react';
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

const MarketDashboard: React.FC<MarketDashboardProps> = ({ externalNotes = [], externalBonds = [] }) => {
  const [activeMarket, setActiveMarket] = useState<'letras' | 'bonos'>('letras');
  const [activeType, setActiveType] = useState<string | 'ALL'>('ALL');


  // Lógica de procesamiento de datos
  const processData = (data: BaseNote[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return data.map(note => {      // Normalizamos la categoría a MAYÚSCULAS para la UI, pero el origen puede ser cualquier case
      const categoriaRaw = (note.tipo_activo || 'OTROS').toLowerCase();
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

      let precioAnterior = null;
      let diasAnterior = null;
      let temAnterior = null;
      let teaAnterior = null;

      // Cálculo de tasas si el backend no las provee (Cálculo Nominal Simple como Fallback)
      if ((tasaDirecta === null || tem === null) && montoVto && note.c > 0 && daysToVto !== null && daysToVto > 0) {
        const factor = montoVto / note.c;
        if (factor > 0) {
          if (tasaDirecta === null) tasaDirecta = (factor - 1) * 100;
          if (tem === null) tem = (Math.pow(factor, 30 / daysToVto) - 1) * 100;
          if (tea === null) tea = (Math.pow(factor, 365 / daysToVto) - 1) * 100;
        }
      }

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

  // 2. Tabla Fija por Mercado
  const activeTableNotes = useMemo(() => {
    return activeMarket === 'letras' ? processedNotes : processedBonds;
  }, [processedNotes, processedBonds, activeMarket]);

  // 3. Tipos Dinámicos Disponibles para el Mercado Seleccionado
  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(activeTableNotes.map(n => (n as any).categoria)));
    return types.sort();
  }, [activeTableNotes]);

  // Reset de tipo activo al cambiar de mercado
  useEffect(() => {
    if (availableTypes.length > 0) {
      if (activeMarket === 'letras' && availableTypes.includes('LECAP')) {
        setActiveType('LECAP');
      } else {
        setActiveType(availableTypes[0]);
      }
    }
  }, [activeMarket, availableTypes]);

  // 4. Datos Filtrados para el Gráfico
  const graphNotes = useMemo(() => {
    if (activeType === 'ALL') return activeTableNotes;
    return activeTableNotes.filter(n => (n as any).categoria === activeType);
  }, [activeTableNotes, activeType]);

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

          {/* DYNAMIC TYPE SELECTOR FOR CHART */}
          {availableTypes.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gráfico:</span>
              <div className="glass" style={{ display: 'inline-flex', padding: '0.3rem', borderRadius: '0.75rem', gap: '0.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                {availableTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      backgroundColor: activeType === type ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: activeType === type ? '#fff' : 'rgba(255,255,255,0.4)',
                      border: activeType === type ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RE-ESTRUCTURANDO EL DATA BINDING AUTOMÁTICO */}
      <div className="w-full bg-[#111]/50 backdrop-blur-md rounded-xl border border-[#222] p-4 shadow-xl">
        <YieldCurveChart notes={graphNotes} activeMarket={activeMarket} />
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
