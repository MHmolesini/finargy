'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import StocksTable, { Stock } from './StocksTable';
import StocksSunburst from './StocksSunburst';
import StocksHeatmap from './StocksHeatmap';
import StocksScatter from './StocksScatter';
import { RefreshCw, Filter, ChevronDown, Check } from 'lucide-react';

const StocksDashboard = () => {
  const [data, setData] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados del Menú Sticky Multiselect
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al tocar fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStocks = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('http://localhost:3001/api/stocks');
      if (!response.ok) {
        throw new Error('Error al cargar datos de rentabilidad variable.');
      }
      const jsonData = await response.json();
      setData(jsonData);
      setError(null);
    } catch (err: any) {
      // Ignorar advertencias silenciosas de polling sin tirar abajo la app web
      if (data.length === 0) setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initialFetch = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/stocks');
        if (!response.ok) throw new Error('Error al cargar datos.');
        const jsonData = await response.json();
        if (isMounted) {
          setData(jsonData);
          setError(null);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Error de conexión');
          setLoading(false);
        }
      }
    }
    initialFetch();

    const interval = setInterval(fetchStocks, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Algoritmo Analítico 1: Sumatoria de Especies para el Desplegable
  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(stock => {
      if (!stock.v || stock.v <= 0) return; // Priorizar activos con volumen nominal operado real
      const s = stock.sector || 'General';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).sort((a,b) => b[1] - a[1]); // Ordenados por caudal de acciones
  }, [data]);

  // Algoritmo Analítico 2: Filtrado Global Dinámico
  const filteredData = useMemo(() => {
    if (selectedSectors.length === 0) return data;
    return data.filter(stock => selectedSectors.includes(stock.sector || 'General'));
  }, [data, selectedSectors]);

  const toggleSector = (sector: string) => {
    setSelectedSectors(prev => 
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-6 rounded-xl border border-red-500/30 text-center">
        <h3 className="text-red-400 font-bold mb-2">Error de Sincronización</h3>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', fontFamily: 'Outfit, sans-serif' }}>
          Monitor de Renta Variable
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '-1rem' }}>
          Cotizaciones en vivo del Panel Líder y General (BYMA).
        </p>
      </div>

      {/* STICKY FILTER COMMMAND CENTER */}
      <div className="sticky-col" style={{ 
        position: 'sticky', top: 0, zIndex: 50, padding: '12px', borderRadius: '12px', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', 
        backgroundColor: 'rgba(10,10,10,0.85)', marginBottom: '1rem' 
      }}>
         <div style={{ position: 'relative' }} ref={filterRef}>
           <button 
             onClick={() => setIsFilterOpen(!isFilterOpen)} 
             style={{
               display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
               backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '8px',
               color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500,
               border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s'
             }}
             onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
             onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
           >
             <Filter size={16} color="#34d399" />
             Filtro Sectorial 
             {selectedSectors.length > 0 && <span style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>{selectedSectors.length}</span>}
             <ChevronDown size={16} color="#94a3b8" style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
           </button>
           
           {isFilterOpen && (
             <div style={{
               position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '340px',
               backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
               borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
               padding: '8px 0', zIndex: 100, maxHeight: '50vh', overflowY: 'auto'
             }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '-8px', backgroundColor: '#0f172a', zIndex: 10 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Limitar por Sector</span>
                  {selectedSectors.length > 0 && (
                    <button style={{ fontSize: '0.75rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }} onClick={() => setSelectedSectors([])}>Limpiar Filtros</button>
                  )}
                </div>
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {sectorCounts.map(([sector, count]) => (
                    <button 
                      key={sector}
                      onClick={() => toggleSector(sector)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: selectedSectors.includes(sector) ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '6px',
                        border: 'none', cursor: 'pointer', transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => { if (!selectedSectors.includes(sector)) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                      onMouseOut={(e) => { if (!selectedSectors.includes(sector)) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <span style={{ color: selectedSectors.includes(sector) ? '#fff' : '#cbd5e1', fontWeight: selectedSectors.includes(sector) ? 600 : 400, fontSize: '0.85rem' }}>
                        {sector}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', backgroundColor: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>{count}</span>
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: selectedSectors.includes(sector) ? '#10b981' : 'transparent',
                          border: selectedSectors.includes(sector) ? 'none' : '1px solid rgba(255,255,255,0.3)',
                          boxShadow: selectedSectors.includes(sector) ? '0 0 10px rgba(16,185,129,0.4)' : 'none'
                        }}>
                          {selectedSectors.includes(sector) && <Check size={12} color="#fff" strokeWidth={3} />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
             </div>
           )}
         </div>
         
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <button
                onClick={() => { if (!isSyncing) fetchStocks() }}
                disabled={loading}
                title="Sincronizar Panel"
                style={{
                  padding: '8px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                  borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)' }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
              >
                <RefreshCw size={18} className={isSyncing && data.length > 0 ? 'animate-spin' : ''} />
              </button>
         </div>
      </div>

      {/* RENTA VARIABLE VISUALIZATIONS */}
      <div className="dashboard-content grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Gráfico Sunburst Analítico de Ecosistemas */}
        <StocksSunburst stocks={filteredData} />

        {/* Gráfico Treemap Térmico */}
        <StocksHeatmap stocks={filteredData} />
      </div>

      <div className="dashboard-content w-full">
        {/* Gráfico Dispersión */}
        <StocksScatter stocks={filteredData} />
      </div>

      <div className="dashboard-content">
        {/* Tabla de Instrumentos Base */}
        <StocksTable stocks={filteredData} />
      </div>
    </div>
  );
};

export default StocksDashboard;
