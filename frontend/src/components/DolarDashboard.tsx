'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DolarTable, { DolarRate } from './DolarTable';
import { RefreshCw, Search, Calculator } from 'lucide-react';
import { fetchMarketData } from '@/utils/supabase';
import DashboardSkeleton from './DashboardSkeleton';

const DolarDashboard: React.FC = () => {
  const [data, setData] = useState<DolarRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDolarData = async () => {
    try {
      setIsSyncing(true);
      const jsonData = await fetchMarketData('dolar');
      setData(jsonData);
      setError(null);
    } catch (err: any) {
      if (data.length === 0) setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchDolarData();
    const interval = setInterval(fetchDolarData, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(item => 
      item.symbol.toLowerCase().includes(lowerSearch) || 
      (item.sector && item.sector.toLowerCase().includes(lowerSearch))
    );
  }, [data, searchTerm]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    if (data.length === 0) return { avgCcl: 0, avgMep: 0, count: 0 };
    const validCcl = data.filter(d => d.ccl > 0).map(d => d.ccl);
    const validMep = data.filter(d => d.mep > 0).map(d => d.mep);
    return {
      avgCcl: validCcl.reduce((a, b) => a + b, 0) / validCcl.length,
      avgMep: validMep.reduce((a, b) => a + b, 0) / validMep.length,
      count: data.length
    };
  }, [data]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="glass p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Calculator size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>CCL Promedio (Implícito)</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>$ {stats.avgCcl.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</h3>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Calculator size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>MEP Promedio (Implícito)</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>$ {stats.avgMep.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</h3>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <RefreshCw size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>Activos con Conversión</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{stats.count}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND REFRESH */}
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <Search size={18} color="#64748b" />
          <input 
            type="text" 
            placeholder="Buscar por símbolo o sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              background: 'transparent', border: 'none', color: 'white', 
              fontSize: '0.9rem', outline: 'none', width: '100%' 
            }}
          />
        </div>
        <button
          onClick={fetchDolarData}
          disabled={isSyncing}
          style={{
            padding: '8px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8',
            borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
          }}
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
        </button>
      </div>

      {error ? (
        <div className="glass p-6 rounded-xl border border-red-500/30 text-center">
          <h3 className="text-red-400 font-bold mb-2">Error de Sincronización</h3>
          <p className="text-gray-400">{error}</p>
        </div>
      ) : (
        <div className="dashboard-content">
          <DolarTable data={filteredData} />
        </div>
      )}
    </div>
  );
};

export default DolarDashboard;
