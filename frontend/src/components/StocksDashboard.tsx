'use client';

import React, { useEffect, useState } from 'react';
import StocksTable, { Stock } from './StocksTable';
import StocksSunburst from './StocksSunburst';

const StocksDashboard = () => {
  const [data, setData] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchStocks = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/stocks');
        if (!response.ok) {
          throw new Error('Error al cargar datos de rentabilidad variable.');
        }
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
    };

    fetchStocks();
    // Fast polling loop para simular time-real
    const interval = setInterval(fetchStocks, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', fontFamily: 'Outfit, sans-serif' }}>
          Monitor de Renta Variable
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '-1rem' }}>
          Cotizaciones en vivo del Panel Líder y General (BYMA).
        </p>
      </div>

      {/* RENTA VARIABLE VISUALIZATIONS */}
      <div className="dashboard-content flex flex-col gap-6">
        {/* Gráfico Sunburst Analítico de Ecosistemas */}
        <StocksSunburst stocks={data} />

        {/* Tabla de Instrumentos Base */}
        <StocksTable stocks={data} />
      </div>
    </div>
  );
};

export default StocksDashboard;
