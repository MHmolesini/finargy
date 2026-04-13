'use client';

import React, { useMemo, useState } from 'react';
import { ProcessedNote } from './MarketDashboard';

type SortConfig = {
  key: keyof ProcessedNote | 'spread' | 'avgTicket' | 'daysToVto' | 'tasaDirecta' | 'tem' | 'tea';
  direction: 'asc' | 'desc';
} | null;

interface NotesTableProps {
  notes: ProcessedNote[];
}

const NotesTable: React.FC<NotesTableProps> = ({ notes }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'v', direction: 'desc' });

  // Lógica de ordenación
  const sortedNotes = useMemo(() => {
    const sortableItems = [...notes];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [notes, sortConfig]);

  // Agrupamiento por Tipo de Activo
  const groupedNotes = useMemo(() => {
    const groups: Record<string, typeof sortedNotes> = {};
    sortedNotes.forEach(note => {
      const category = note.tipo_activo?.toUpperCase() || 'OTROS';
      if (!groups[category]) groups[category] = [];
      groups[category].push(note);
    });
    return groups;
  }, [sortedNotes]);

  // Máximos para barras
  const { maxVolume, maxOps } = useMemo(() => {
    if (notes.length === 0) return { maxVolume: 1, maxOps: 1 };
    return {
      maxVolume: Math.max(...notes.map(n => n.v || 0), 1),
      maxOps: Math.max(...notes.map(n => n.q_op || 0), 1),
    };
  }, [notes]);

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

  return (
    <div className="premium-table-container animate-fade-in">
      <div className="custom-scrollbar" style={{ 
        overflowX: 'auto', 
        overflowY: 'auto', 
        maxHeight: '75vh', 
        position: 'relative'
      }}>
        <table className="premium-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 30 }}>
            <tr style={{ position: 'sticky', top: 0, zIndex: 31 }}>
              <th className="sticky-col" onClick={() => requestSort('symbol')} style={{ position: 'sticky', top: 0, left: 0, backgroundColor: '#0a0a0a', zIndex: 40 }}>Símbolo {getSortIcon('symbol')}</th>
              <th onClick={() => requestSort('c')} style={{ position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }}>Último {getSortIcon('c')}</th>
              <th onClick={() => requestSort('pct_change')} style={{ position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }}>Variación {getSortIcon('pct_change')}</th>
              <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', cursor: 'default', position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }}>Compra (Bid)</th>
              <th colSpan={2} style={{ textAlign: 'center', cursor: 'default', position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }}>Venta (Ask)</th>
              <th style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('spread')}>
                Spread % {getSortIcon('spread')}
              </th>
              <th style={{ position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('daysToVto')}>Días Vto. {getSortIcon('daysToVto')}</th>
              <th style={{ position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('precio_final_estimado')}>Monto Vto <br/>(T-1) {getSortIcon('precio_final_estimado')}</th>
              <th style={{ position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('tasaDirecta')}>Tasa<br/>Directa {getSortIcon('tasaDirecta')}</th>
              <th style={{ position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('tem')}>TEM % {getSortIcon('tem')}</th>
              <th style={{ position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('tea')}>TEA % {getSortIcon('tea')}</th>
              <th style={{ borderLeft: '1px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('v')}>
                Volumen {getSortIcon('v')}
              </th>
              <th style={{ position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('q_op')}>Ops {getSortIcon('q_op')}</th>
              <th style={{ textAlign: 'right', position: 'sticky', top: 0, backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('avgTicket')}>
                Ticket Prom. {getSortIcon('avgTicket')}
              </th>
            </tr>
            <tr style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.01)', cursor: 'default', position: 'sticky', top: '45px', zIndex: 31 }}>
              <th className="sticky-col" style={{ cursor: 'default', position: 'sticky', top: '45px', left: 0, backgroundColor: '#0a0a0a', zIndex: 40 }}></th>
              <th colSpan={2} style={{ cursor: 'default', position: 'sticky', top: '45px', backgroundColor: '#0a0a0a', zIndex: 32 }}></th>
              <th style={{ padding: '0.5rem 1.5rem', position: 'sticky', top: '45px', backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('q_bid')}>Cant. {getSortIcon('q_bid')}</th>
              <th style={{ padding: '0.5rem 1.5rem', borderRight: '1px solid var(--border-color)', position: 'sticky', top: '45px', backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('px_bid')}>Prc. {getSortIcon('px_bid')}</th>
              <th style={{ padding: '0.5rem 1.5rem', position: 'sticky', top: '45px', backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('px_ask')}>Prc. {getSortIcon('px_ask')}</th>
              <th style={{ padding: '0.5rem 1.5rem', position: 'sticky', top: '45px', backgroundColor: '#0a0a0a', zIndex: 32 }} onClick={() => requestSort('q_ask')}>Cant. {getSortIcon('q_ask')}</th>
              <th style={{ borderLeft: '1px solid var(--border-color)', cursor: 'default', position: 'sticky', top: '45px', backgroundColor: '#0a0a0a', zIndex: 32 }}></th>
              <th style={{ cursor: 'default', position: 'sticky', top: '45px', backgroundColor: '#0a0a0a', zIndex: 32 }}></th>
              <th style={{ cursor: 'default', position: 'sticky', top: '45px', backgroundColor: '#0a0a0a', zIndex: 32 }}></th>
              <th style={{ cursor: 'default', position: 'sticky', top: '45px', backgroundColor: '#0a0a0a', zIndex: 32 }}></th>
              <th colSpan={2} style={{ borderLeft: '1px solid var(--border-color)', cursor: 'default', position: 'sticky', top: '45px', backgroundColor: '#0a0a0a', zIndex: 32 }}></th>
              <th style={{ cursor: 'default', position: 'sticky', top: '45px', backgroundColor: '#0a0a0a', zIndex: 32 }}></th>
            </tr>
          </thead>
          
          {Object.entries(groupedNotes).map(([category, items]) => (
            <React.Fragment key={category}>
              <tbody>
                <tr style={{ background: 'rgba(255,255,255,0.03)', cursor: 'default' }}>
                  <td colSpan={16} style={{ 
                    padding: '0.5rem 1.5rem', 
                    fontSize: '0.7rem', 
                    fontWeight: 'bold', 
                    color: 'var(--accent-color)',
                    letterSpacing: '0.1em',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    {category}
                  </td>
                </tr>
                {items.map((note) => {
                  const volPercentage = ((note.v || 0) / maxVolume) * 100;
                  const opsPercentage = ((note.q_op || 0) / maxOps) * 100;

                  return (
                    <tr key={note.symbol}>
                      <td className="sticky-col" style={{ fontWeight: 600, color: '#fff' }}>{note.symbol}</td>
                      <td style={{ fontWeight: 500 }}>{note.c?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className={(note.pct_change || 0) >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 500 }}>
                        {note.pct_change > 0 ? '+' : ''}{note.pct_change?.toFixed(2)}%
                      </td>
                      
                      {/* Bid */}
                      <td className="text-dim" style={{ padding: '1rem 0.7rem' }}>{note.q_bid?.toLocaleString('es-AR')}</td>
                      <td style={{ borderRight: '1px solid var(--border-color)', padding: '1rem 0.7rem' }}>
                        {note.px_bid?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Ask */}
                      <td style={{ padding: '1rem 0.7rem' }}>{note.px_ask?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="text-dim" style={{ padding: '1rem 0.7rem' }}>{note.q_ask?.toLocaleString('es-AR')}</td>

                      {/* Spread % */}
                      <td style={{ textAlign: 'center', color: (note as any).spread > 2 ? 'var(--danger)' : 'var(--text-dim)', borderLeft: '1px solid var(--border-color)' }}>
                        {(note as any).spread > 0 ? `${(note as any).spread.toFixed(2)}%` : '-'}
                      </td>

                      {/* Días Vto */}
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: (note as any).daysToVto !== null && (note as any).daysToVto < 30 ? 'var(--accent-color)' : 'var(--text-dim)' }}>
                        {(note as any).daysToVto !== null ? (note as any).daysToVto : '-'}
                      </td>

                      {/* Monto Vto */}
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {note.precio_final_estimado ? note.precio_final_estimado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </td>

                      {/* Tasa Directa */}
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: (note as any).tasaDirecta > 0 ? 'var(--success)' : 'var(--text-dim)' }}>
                        {(note as any).tasaDirecta !== null ? `${(note as any).tasaDirecta.toFixed(2)}%` : '-'}
                      </td>

                      {/* TEM */}
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: (note as any).tem > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {(note as any).tem !== null ? `${(note as any).tem.toFixed(2)}%` : '-'}
                      </td>

                      {/* TEA */}
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: (note as any).tea > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {(note as any).tea !== null ? `${(note as any).tea.toFixed(2)}%` : '-'}
                      </td>

                      {/* Volumen */}
                      <td style={{ borderLeft: '1px solid var(--border-color)', minWidth: '150px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span className="font-mono text-[0.85rem] font-medium text-gray-300">
                            {(note.v && note.v > 0) ? (
                              note.v >= 1000000 
                                ? `${(note.v / 1000000).toFixed(2)}M` 
                                : note.v >= 1000 
                                  ? `${(note.v / 1000).toFixed(1)}K` 
                                  : note.v.toLocaleString('es-AR')
                            ) : '-'}
                          </span>
                        </div>
                        <div className="bar-container">
                          <div className="bar-fill" style={{ width: `${volPercentage}%` }}></div>
                        </div>
                      </td>

                      {/* Ops */}
                      <td style={{ minWidth: '100px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{note.q_op}</span>
                          <div className="bar-container">
                            <div className="bar-fill bar-fill-secondary" style={{ width: `${opsPercentage}%` }}></div>
                          </div>
                        </div>
                      </td>

                      {/* Ticket Promedio */}
                      <td className="font-mono text-dim" style={{ textAlign: 'right' }}>
                        {(note as any).avgTicket > 0 ? (note as any).avgTicket.toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </React.Fragment>
          ))}
        </table>
      </div>
      <div style={{ marginTop: '0.8rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        * Las cotizaciones mostradas, cálculos de Plazo de Vencimiento y Rendimiento tienen liquidación a 24hs (T+1).
      </div>
    </div>
  );
};

export default NotesTable;
