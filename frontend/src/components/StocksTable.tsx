'use client';

import React, { useMemo, useState } from 'react';

export interface Stock {
  symbol: string;
  q_bid: number;
  px_bid: number;
  px_ask: number;
  q_ask: number;
  v: number;
  q_op: number;
  c: number;
  pct_change: number;
  sector: string;
  industria: string;
  moneda: string;
}

export interface ProcessedStock extends Stock {
  spread: number;
  avgTicket: number;
}

type SortConfig = {
  key: keyof ProcessedStock;
  direction: 'asc' | 'desc';
} | null;

interface StocksTableProps {
  stocks: Stock[];
}

const StocksTable: React.FC<StocksTableProps> = ({ stocks }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'v', direction: 'desc' });

  // 1. Data Enrichment (Calculamos Spread y Ticket)
  const enrichedStocks: ProcessedStock[] = useMemo(() => {
    return stocks.map(stock => {
      const spread = (stock.px_ask && stock.px_bid && stock.px_ask > 0) ? ((stock.px_ask - stock.px_bid) / stock.px_ask) * 100 : 0;
      const avgTicket = (stock.v && stock.q_op && stock.q_op > 0) ? stock.v / stock.q_op : 0;
      return { ...stock, spread, avgTicket };
    });
  }, [stocks]);

  // 2. Lógica de ordenación
  const sortedStocks = useMemo(() => {
    const sortableItems = [...enrichedStocks];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        const aValue = a[sortConfig.key] || 0;
        const bValue = b[sortConfig.key] || 0;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [enrichedStocks, sortConfig]);

  // Máximos para barras
  const { maxVolume, maxOps } = useMemo(() => {
    if (stocks.length === 0) return { maxVolume: 1, maxOps: 1 };
    return {
      maxVolume: Math.max(...stocks.map(n => n.v || 0), 1),
      maxOps: Math.max(...stocks.map(n => n.q_op || 0), 1),
    };
  }, [stocks]);

  const requestSort = (key: any) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <span style={{ opacity: 0.2, marginLeft: '4px' }}>↕</span>;
    return sortConfig.direction === 'asc' ? <span style={{ color: 'var(--accent-color)', marginLeft: '4px' }}>▲</span> : <span style={{ color: 'var(--accent-color)', marginLeft: '4px' }}>▼</span>;
  };

  const getSectorColor = (sector: string) => {
    switch (sector) {
      case 'Servicios Financieros': 
      case 'Finanzas': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }; // Emerald
      
      case 'Energia': 
      case 'Minerales energéticos': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' }; // Amber
      
      case 'Materiales': 
      case 'Minerales no energéticos': return { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' }; // Indigo
      
      case 'Servicios Publicos': 
      case 'Servicios públicos': return { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' }; // Cyan
      
      case 'Consumo Basico': 
      case 'Consumo no cíclico': 
      case 'Consumibles perecederos': return { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' }; // Pink
      
      case 'Consumo Discrecional': 
      case 'Servicios al consumidor': 
      case 'Bienes de consumo duraderos': 
      case 'Comercio minorista': return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' }; // Purple
      
      case 'Industriales': 
      case 'Servicios industriales': 
      case 'Fabricación de productos': return { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' }; // Slate
      
      case 'Comunicaciones': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' }; // Blue
      case 'Bienes Raices': return { bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf', border: 'rgba(20, 184, 166, 0.3)' }; // Teal
      
      case 'Tecnologia': 
      case 'Servicios tecnológicos': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' }; // Red
      
      case 'Salud': 
      case 'Tecnologías sanitarias': 
      case 'Tecnología de la salud': return { bg: 'rgba(132, 204, 22, 0.15)', text: '#a3e635', border: 'rgba(132, 204, 22, 0.3)' }; // Lime

      case 'Transporte': return { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', border: 'rgba(234, 179, 8, 0.3)' }; // Yellow
      case 'Servicios de distribución': return { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' }; // Orange
      case 'Industrias de proceso': return { bg: 'rgba(161, 161, 170, 0.15)', text: '#a1a1aa', border: 'rgba(161, 161, 170, 0.3)' }; // Zinc
      
      default: return { bg: 'rgba(255, 255, 255, 0.05)', text: '#cbd5e1', border: 'rgba(255, 255, 255, 0.1)' }; // Default Gray
    }
  };

  return (
    <div className="premium-table-container animate-fade-in">
      <div style={{ overflowX: 'auto', position: 'relative' }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('sector')} style={{ paddingLeft: '1.5rem', width: '140px' }}>Sector {getSortIcon('sector')}</th>
              <th onClick={() => requestSort('industria')} style={{ width: '160px' }}>Industria {getSortIcon('industria')}</th>
              <th className="sticky-col" onClick={() => requestSort('symbol')}>Símbolo {getSortIcon('symbol')}</th>
              <th onClick={() => requestSort('c')}>Último {getSortIcon('c')}</th>
              <th onClick={() => requestSort('pct_change')}>Variación {getSortIcon('pct_change')}</th>
              <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', cursor: 'default' }}>Compra (Bid)</th>
              <th colSpan={2} style={{ textAlign: 'center', cursor: 'default' }}>Venta (Ask)</th>
              <th style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)' }} onClick={() => requestSort('spread')}>
                Spread % {getSortIcon('spread')}
              </th>
              <th style={{ borderLeft: '1px solid var(--border-color)' }} onClick={() => requestSort('v')}>
                Volumen {getSortIcon('v')}
              </th>
              <th onClick={() => requestSort('q_op')}>Ops {getSortIcon('q_op')}</th>
              <th style={{ textAlign: 'right' }} onClick={() => requestSort('avgTicket')}>
                Ticket Prom. {getSortIcon('avgTicket')}
              </th>
            </tr>
            <tr style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.01)', cursor: 'default' }}>
              <th style={{ cursor: 'default' }}></th>
              <th style={{ cursor: 'default' }}></th>
              <th className="sticky-col" style={{ cursor: 'default' }}></th>
              <th colSpan={2} style={{ cursor: 'default' }}></th>
              <th style={{ padding: '0.5rem 1.5rem' }} onClick={() => requestSort('q_bid')}>Cant. {getSortIcon('q_bid')}</th>
              <th style={{ padding: '0.5rem 1.5rem', borderRight: '1px solid var(--border-color)' }} onClick={() => requestSort('px_bid')}>Prc. {getSortIcon('px_bid')}</th>
              <th style={{ padding: '0.5rem 1.5rem' }} onClick={() => requestSort('px_ask')}>Prc. {getSortIcon('px_ask')}</th>
              <th style={{ padding: '0.5rem 1.5rem' }} onClick={() => requestSort('q_ask')}>Cant. {getSortIcon('q_ask')}</th>
              <th colSpan={4} style={{ borderLeft: '1px solid var(--border-color)', cursor: 'default' }}></th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: 'rgba(255,255,255,0.03)', cursor: 'default' }}>
              <td colSpan={11} style={{ 
                padding: '0.5rem 1.5rem', 
                fontSize: '0.8rem', 
                fontWeight: 'bold', 
                color: 'var(--accent-color)',
                letterSpacing: '0.1em',
                borderBottom: '1px solid var(--border-color)'
              }}>
                Mercado Local (BYMA)
              </td>
            </tr>
            {sortedStocks.map((stock) => {
              const volPercentage = ((stock.v || 0) / maxVolume) * 100;
              const opsPercentage = ((stock.q_op || 0) / maxOps) * 100;
              const sectorColors = getSectorColor(stock.sector);

              return (
                <tr key={stock.symbol}>
                  {/* Sector Badge */}
                  <td style={{ paddingLeft: '1.5rem' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      backgroundColor: sectorColors.bg,
                      color: sectorColors.text,
                      border: `1px solid ${sectorColors.border}`,
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap'
                    }}>
                      {stock.sector}
                    </div>
                  </td>

                  {/* Industria Badge */}
                  <td>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '4px', // Cuadrado redondeado para diferenciar
                      fontSize: '0.65rem',
                      fontWeight: 500,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap'
                    }}>
                      {stock.industria}
                    </div>
                  </td>

                  <td className="sticky-col" style={{ fontWeight: 600, color: '#fff' }}>{stock.symbol}</td>
                  
                  {/* Último Px y Moneda */}
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {stock.c?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        backgroundColor: stock.moneda === 'USD' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                        color: stock.moneda === 'USD' ? '#4ade80' : '#fb923c',
                        border: `1px solid ${stock.moneda === 'USD' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(249, 115, 22, 0.4)'}`
                      }}>
                        {stock.moneda === 'USD' ? 'D' : 'P'}
                      </span>
                    </div>
                  </td>

                  <td className={(stock.pct_change || 0) >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 500 }}>
                    {stock.pct_change > 0 ? '+' : ''}{stock.pct_change?.toFixed(2)}%
                  </td>
                  
                  {/* Bid */}
                  <td className="text-dim" style={{ padding: '1rem 0.7rem' }}>{stock.q_bid?.toLocaleString('es-AR')}</td>
                  <td style={{ borderRight: '1px solid var(--border-color)', padding: '1rem 0.7rem' }}>
                    {stock.px_bid?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Ask */}
                  <td style={{ padding: '1rem 0.7rem' }}>{stock.px_ask?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                  <td className="text-dim" style={{ padding: '1rem 0.7rem' }}>{stock.q_ask?.toLocaleString('es-AR')}</td>

                  {/* Spread % */}
                  <td style={{ textAlign: 'center', color: stock.spread > 2 ? 'var(--danger)' : 'var(--text-dim)', borderLeft: '1px solid var(--border-color)' }}>
                    {stock.spread > 0 ? `${stock.spread.toFixed(2)}%` : '-'}
                  </td>

                  {/* Volumen */}
                  <td style={{ borderLeft: '1px solid var(--border-color)', minWidth: '150px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="font-mono text-[0.85rem] font-medium text-gray-300">
                        {stock.v?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || 0}
                      </span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', height: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${volPercentage}%`, backgroundColor: 'var(--accent-color)', height: '100%', borderRadius: '2px', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </td>

                  {/* Ops */}
                  <td style={{ minWidth: '100px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="font-mono text-[0.85rem] text-gray-400">
                        {stock.q_op?.toLocaleString('es-AR') || 0}
                      </span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', height: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${opsPercentage}%`, backgroundColor: 'var(--success)', height: '100%', borderRadius: '2px', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </td>

                  {/* Ticket Promedio */}
                  <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-dim)' }}>
                    {stock.avgTicket > 0 ? stock.avgTicket.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StocksTable;
