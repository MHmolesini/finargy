'use client';

import React, { useMemo, useState } from 'react';

export interface DolarRate {
  symbol: string;
  price_ars: number;
  price_ccl: number;
  price_mep: number;
  ccl: number;
  mep: number;
  updated_at: string;
  sector: string;
  industria: string;
  tipo_activo: string;
}

interface DolarTableProps {
  data: DolarRate[];
  selectedSymbol?: string | null;
  onSelectSymbol?: (symbol: string) => void;
}

const DolarTable: React.FC<DolarTableProps> = ({ data, selectedSymbol, onSelectSymbol }) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof DolarRate; direction: 'asc' | 'desc' }>({ key: 'symbol', direction: 'asc' });

  const sortedData = useMemo(() => {
    const sortableItems = [...data];
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
  }, [data, sortConfig]);

  const requestSort = (key: keyof DolarRate) => {
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
      case 'Finanzas': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Minerales energéticos': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'Servicios públicos': return { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' };
      case 'Tecnología electrónica': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      default: return { bg: 'rgba(255, 255, 255, 0.05)', text: '#cbd5e1', border: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  return (
    <div className="premium-table-container animate-fade-in">
      <div className="custom-scrollbar" style={{ overflowX: 'auto', maxHeight: '75vh' }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('symbol')} style={{ paddingLeft: '1.5rem', width: '120px' }}>Símbolo {getSortIcon('symbol')}</th>
              <th onClick={() => requestSort('sector')}>Sector {getSortIcon('sector')}</th>
              <th onClick={() => requestSort('price_ars')} style={{ textAlign: 'right' }}>Precio ARS {getSortIcon('price_ars')}</th>
              <th onClick={() => requestSort('price_ccl')} style={{ textAlign: 'right' }}>Prc. CCL (USD) {getSortIcon('price_ccl')}</th>
              <th onClick={() => requestSort('price_mep')} style={{ textAlign: 'right' }}>Prc. MEP (USD) {getSortIcon('price_mep')}</th>
              <th onClick={() => requestSort('ccl')} style={{ textAlign: 'right', color: '#60a5fa' }}>CCL Implícito {getSortIcon('ccl')}</th>
              <th onClick={() => requestSort('mep')} style={{ textAlign: 'right', color: '#34d399' }}>MEP Implícito {getSortIcon('mep')}</th>
              <th style={{ textAlign: 'right' }}>Brecha %</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => {
              const sectorColors = getSectorColor(item.sector);
              const gap = (item.ccl && item.mep) ? ((item.ccl / item.mep) - 1) * 100 : 0;

              return (
                <tr 
                  key={item.symbol}
                  onClick={() => onSelectSymbol?.(item.symbol)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedSymbol === item.symbol ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  }}
                >
                  <td style={{ paddingLeft: '1.5rem', fontWeight: 600, color: '#fff' }}>{item.symbol}</td>
                  <td>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      backgroundColor: sectorColors.bg,
                      color: sectorColors.text,
                      border: `1px solid ${sectorColors.border}`,
                    }}>
                      {item.sector || 'General'}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>$ {item.price_ars?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>{item.price_ccl ? `u$s ${item.price_ccl.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td style={{ textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>{item.price_mep ? `u$s ${item.price_mep.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#60a5fa' }}>{item.ccl ? `$ ${item.ccl.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#34d399' }}>{item.mep ? `$ ${item.mep.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td style={{ textAlign: 'right', color: gap > 0 ? '#fb923c' : '#94a3b8' }}>{gap !== 0 ? `${gap.toFixed(2)}%` : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DolarTable;
