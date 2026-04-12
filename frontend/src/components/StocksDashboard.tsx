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
  const [volumeMode, setVolumeMode] = useState<'nominal' | 'monto'>('monto');

  // Estados del Menú Sticky Multiselect
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedTrends, setSelectedTrends] = useState<('positive' | 'neutral' | 'negative')[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isIndustryFilterOpen, setIsIndustryFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al tocar fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
        setIsIndustryFilterOpen(false);
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

  // Algoritmo Analítico 1B: Sumatoria de Industrias en Cascada
  const industryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const baseData = selectedSectors.length > 0 ? data.filter(d => selectedSectors.includes(d.sector || 'General')) : data;
    baseData.forEach(stock => {
      if (!stock.v || stock.v <= 0) return;
      const ind = stock.industria || 'General';
      counts[ind] = (counts[ind] || 0) + 1;
    });
    return Object.entries(counts).sort((a,b) => b[1] - a[1]);
  }, [data, selectedSectors]);

  // Algoritmo Analítico 3: Conteo de Tendencias de Mercado (Semáforo)
  const trendCounts = useMemo(() => {
    let pos = 0, neu = 0, neg = 0;
    const baseData = data.filter(d => {
       if (selectedSectors.length > 0 && !selectedSectors.includes(d.sector || 'General')) return false;
       if (selectedIndustries.length > 0 && !selectedIndustries.includes(d.industria || 'General')) return false;
       return true;
    });

    baseData.forEach(stock => {
       const pct = stock.pct_change || 0;
       if (pct > 0) pos++;
       else if (pct < 0) neg++;
       else neu++;
    });
    return { positive: pos, neutral: neu, negative: neg };
  }, [data, selectedSectors, selectedIndustries]);

  // Algoritmo Analítico 2: Filtrado Global Dinámico Combinado
  const filteredData = useMemo(() => {
    let result = data;
    if (selectedSectors.length > 0) {
      result = result.filter(stock => selectedSectors.includes(stock.sector || 'General'));
    }
    if (selectedIndustries.length > 0) {
      result = result.filter(stock => selectedIndustries.includes(stock.industria || 'General'));
    }
    if (selectedTrends.length > 0) {
      result = result.filter(stock => {
        const pct = stock.pct_change || 0;
        if (pct > 0 && selectedTrends.includes('positive')) return true;
        if (pct < 0 && selectedTrends.includes('negative')) return true;
        if (pct === 0 && selectedTrends.includes('neutral')) return true;
        return false;
      });
    }
    return result;
  }, [data, selectedSectors, selectedIndustries, selectedTrends]);

  const toggleSector = (sector: string) => {
    setSelectedSectors(prev => 
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  };

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries(prev => 
      prev.includes(ind) ? prev.filter(s => s !== ind) : [...prev, ind]
    );
  };

  const toggleTrend = (trend: 'positive' | 'neutral' | 'negative') => {
    setSelectedTrends(prev => 
      prev.includes(trend) ? prev.filter(t => t !== trend) : [...prev, trend]
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
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none !important; }
      `}</style>
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
         <div style={{ display: 'flex', gap: '12px' }} ref={filterRef}>
           {/* BOTÓN SECTORES */}
           <div style={{ position: 'relative' }}>
             <button 
               onClick={() => { setIsFilterOpen(!isFilterOpen); setIsIndustryFilterOpen(false); }} 
               style={{
                 display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                 backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '8px',
                 color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500,
                 border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s'
               }}
               onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
               onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
             >
               <Filter size={16} color="#3b82f6" />
               Sector 
               {selectedSectors.length > 0 && <span style={{ backgroundColor: 'rgba(59,130,246,0.2)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>{selectedSectors.length}</span>}
               <ChevronDown size={16} color="#94a3b8" style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
             </button>
             
             {isFilterOpen && (
               <div className="hide-scroll" style={{
                 position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '340px',
                 backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                 borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.7)', padding: '8px 0', zIndex: 100, 
                 maxHeight: '380px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none'
               }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '-8px', backgroundColor: '#0f172a', zIndex: 10 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Limitar por Sector</span>
                    {selectedSectors.length > 0 && (
                      <button style={{ fontSize: '0.75rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }} onClick={() => setSelectedSectors([])}>Limpiar</button>
                    )}
                  </div>
                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {sectorCounts.map(([sector, count]) => (
                      <button 
                        key={sector}
                        onClick={() => toggleSector(sector)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          backgroundColor: selectedSectors.includes(sector) ? 'rgba(59,130,246,0.15)' : 'transparent', borderRadius: '6px',
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
                            backgroundColor: selectedSectors.includes(sector) ? '#3b82f6' : 'transparent',
                            border: selectedSectors.includes(sector) ? 'none' : '1px solid rgba(255,255,255,0.3)',
                            boxShadow: selectedSectors.includes(sector) ? '0 0 10px rgba(59,130,246,0.4)' : 'none'
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

           {/* BOTÓN INDUSTRIAS */}
           <div style={{ position: 'relative' }}>
             <button 
               onClick={() => { setIsIndustryFilterOpen(!isIndustryFilterOpen); setIsFilterOpen(false); }} 
               style={{
                 display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                 backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '8px',
                 color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500,
                 border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s'
               }}
               onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
               onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
             >
               <Filter size={16} color="#10b981" />
               Industria
               {selectedIndustries.length > 0 && <span style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>{selectedIndustries.length}</span>}
               <ChevronDown size={16} color="#94a3b8" style={{ transform: isIndustryFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
             </button>
             
             {isIndustryFilterOpen && (
               <div className="hide-scroll" style={{
                 position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '380px',
                 backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                 borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.7)', padding: '8px 0', zIndex: 100, 
                 maxHeight: '380px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none'
               }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '-8px', backgroundColor: '#0f172a', zIndex: 10 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Limitar por Industria</span>
                    {selectedIndustries.length > 0 && (
                      <button style={{ fontSize: '0.75rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }} onClick={() => setSelectedIndustries([])}>Limpiar</button>
                    )}
                  </div>
                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {industryCounts.map(([ind, count]) => (
                      <button 
                        key={ind}
                        onClick={() => toggleIndustry(ind)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          backgroundColor: selectedIndustries.includes(ind) ? 'rgba(16,185,129,0.15)' : 'transparent', borderRadius: '6px',
                          border: 'none', cursor: 'pointer', transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => { if (!selectedIndustries.includes(ind)) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                        onMouseOut={(e) => { if (!selectedIndustries.includes(ind)) e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        <span style={{ color: selectedIndustries.includes(ind) ? '#fff' : '#cbd5e1', fontWeight: selectedIndustries.includes(ind) ? 600 : 400, fontSize: '0.85rem' }}>
                          {ind}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', backgroundColor: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>{count}</span>
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: selectedIndustries.includes(ind) ? '#10b981' : 'transparent',
                            border: selectedIndustries.includes(ind) ? 'none' : '1px solid rgba(255,255,255,0.3)',
                            boxShadow: selectedIndustries.includes(ind) ? '0 0 10px rgba(16,185,129,0.4)' : 'none'
                          }}>
                            {selectedIndustries.includes(ind) && <Check size={12} color="#fff" strokeWidth={3} />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
               </div>
             )}
           </div>

           {/* BOTONES TENDENCIA (SEMÁFORO) */}
           <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
             <button 
               onClick={() => toggleTrend('positive')}
               style={{
                 display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                 backgroundColor: selectedTrends.includes('positive') ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)', 
                 borderRadius: '20px', color: selectedTrends.includes('positive') ? '#10b981' : '#cbd5e1', 
                 fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${selectedTrends.includes('positive') ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.2s', cursor: 'pointer'
               }}
             >
               <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: selectedTrends.includes('positive') ? '0 0 8px #10b981' : 'none' }}></div>
               Alzas <span style={{ opacity: 0.6 }}>{trendCounts.positive}</span>
             </button>

             <button 
               onClick={() => toggleTrend('neutral')}
               style={{
                 display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                 backgroundColor: selectedTrends.includes('neutral') ? 'rgba(148,163,184,0.15)' : 'rgba(255,255,255,0.03)', 
                 borderRadius: '20px', color: selectedTrends.includes('neutral') ? '#94a3b8' : '#cbd5e1', 
                 fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${selectedTrends.includes('neutral') ? 'rgba(148,163,184,0.3)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.2s', cursor: 'pointer'
               }}
             >
               <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94a3b8' }}></div>
               Neutras <span style={{ opacity: 0.6 }}>{trendCounts.neutral}</span>
             </button>

             <button 
               onClick={() => toggleTrend('negative')}
               style={{
                 display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                 backgroundColor: selectedTrends.includes('negative') ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)', 
                 borderRadius: '20px', color: selectedTrends.includes('negative') ? '#ef4444' : '#cbd5e1', 
                 fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${selectedTrends.includes('negative') ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.2s', cursor: 'pointer'
               }}
             >
               <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: selectedTrends.includes('negative') ? '0 0 8px #ef4444' : 'none' }}></div>
               Bajas <span style={{ opacity: 0.6 }}>{trendCounts.negative}</span>
             </button>
           </div>
         </div>
         
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             {/* VOLUME MODE TOGGLE */}
             <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <button 
                 onClick={() => setVolumeMode('nominal')}
                 style={{
                   padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                   backgroundColor: volumeMode === 'nominal' ? 'rgba(59,130,246,0.2)' : 'transparent',
                   color: volumeMode === 'nominal' ? '#60a5fa' : '#64748b'
                 }}
                 title="Ponderar Gráficos por Cantidad de Títulos"
               >
                 Nominal
               </button>
               <button 
                 onClick={() => setVolumeMode('monto')}
                 style={{
                   padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                   backgroundColor: volumeMode === 'monto' ? 'rgba(16,185,129,0.2)' : 'transparent',
                   color: volumeMode === 'monto' ? '#34d399' : '#64748b'
                 }}
                 title="Ponderar Gráficos por Monto Operado en $"
               >
                 Monto $
               </button>
             </div>

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
        <StocksSunburst stocks={filteredData} volumeMode={volumeMode} />

        {/* Gráfico Treemap Térmico */}
        <StocksHeatmap stocks={filteredData} volumeMode={volumeMode} />
      </div>

      <div className="dashboard-content w-full">
        {/* Gráfico Dispersión */}
        <StocksScatter stocks={filteredData} volumeMode={volumeMode} />
      </div>

      <div className="dashboard-content">
        {/* Tabla de Instrumentos Base */}
        <StocksTable stocks={filteredData} />
      </div>
    </div>
  );
};

export default StocksDashboard;
