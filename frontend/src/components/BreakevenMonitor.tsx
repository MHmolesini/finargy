'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface BreakevenMonitorProps {
  notes: any[];
}

const BreakevenMonitor: React.FC<BreakevenMonitorProps> = ({ notes }) => {
  const { cerPairs, linkedPairs } = useMemo(() => {
    if (!notes || notes.length === 0) return { cerPairs: [], linkedPairs: [] };

    // 1. Clasificar activos
    const nominals = notes.filter(n => {
      const cat = (n.categoria || n.tipo_activo || '').toUpperCase();
      return cat === 'LECAP' || cat === 'BONCAP';
    });
    
    const cers = notes.filter(n => {
      const cat = (n.categoria || n.tipo_activo || '').toUpperCase();
      return cat === 'LECER' || cat === 'BONCER' || cat === 'BONO CER';
    });

    const linkeds = notes.filter(n => {
      const cat = (n.categoria || n.tipo_activo || '').toUpperCase();
      return cat === 'LELINK' || cat === 'BONO LINKED' || cat === 'BONLINK';
    });

    // 2. Agrupar NOMINALES por daysToVto
    const nominalsByDays: Record<number, any> = {};
    nominals.forEach(n => {
      const days = n.daysToVto || n.daystovto;
      if (days !== undefined && days !== null) {
        if (!nominalsByDays[days] || (n.v || 0) > (nominalsByDays[days].v || 0)) {
          nominalsByDays[days] = n;
        }
      }
    });

    const calculatePairs = (targetList: any[], type: 'CER' | 'LINKED') => {
      const pairs: any[] = [];
      targetList.forEach(t => {
        const days = t.daysToVto || t.daystovto;
        if (days !== undefined && days !== null) {
          const nominal = nominalsByDays[days];
          if (nominal && nominal.tea > 0 && t.tea !== null) {
            const teaNom = nominal.tea / 100;
            const teaReal = t.tea / 100;
            const beTea = ((1 + teaNom) / (1 + teaReal) - 1) * 100;
            const beTem = (Math.pow(1 + beTea / 100, 1 / 12) - 1) * 100;
            
            const estimDate = new Date();
            estimDate.setDate(estimDate.getDate() + days + 1);

            pairs.push({
              fecha: estimDate.toISOString().split('T')[0],
              daysToVto: days,
              nominalSymbol: nominal.symbol,
              nominalYield: nominal.tea,
              targetSymbol: t.symbol,
              targetYield: t.tea,
              breakevenTea: beTea,
              breakevenTem: beTem,
              type
            });
          }
        }
      });
      return pairs.sort((a, b) => a.daysToVto - b.daysToVto);
    };

    return {
      cerPairs: calculatePairs(cers, 'CER'),
      linkedPairs: calculatePairs(linkeds, 'LINKED')
    };
  }, [notes]);

  const chartOptions = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Inter, sans-serif' },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 15, 15, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#f0f0f0' },
        formatter: (params: any) => {
          let html = `<div style="font-weight: 700; margin-bottom: 5px;">Breakeven de Mercado</div>`;
          params.forEach((p: any) => {
            const data = p.data;
            const date = new Date(data[2]);
            const formattedDate = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
            html += `
              <div style="font-size: 12px; margin-bottom: 4px;">
                <span style="color: ${p.color}; font-weight: bold;">● ${p.seriesName}:</span> 
                <span style="color: #fff; font-weight: bold;">${data[1].toFixed(2)}%</span> 
                <span style="color: #666; font-size: 10px;">(${formattedDate})</span>
              </div>
            `;
          });
          return html;
        }
      },
      legend: {
        show: true,
        top: 0,
        textStyle: { color: '#a0a0a0' },
        itemGap: 20
      },
      grid: { left: '5%', right: '5%', bottom: '15%', top: '20%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Días',
        nameLocation: 'middle',
        nameGap: 30,
        axisLabel: { color: '#a0a0a0', fontSize: 10 },
        splitLine: { show: true, lineStyle: { color: 'rgba(255, 255, 255, 0.05)', type: 'dashed' } }
      },
      yAxis: {
        type: 'value',
        name: 'TEM (%)',
        nameTextStyle: { color: '#a0a0a0' },
        axisLabel: { color: '#a0a0a0', formatter: '{value}%' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      series: [
        {
          name: 'Inflación (CER)',
          type: 'line',
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#fbbf24' },
          lineStyle: { width: 3, shadowBlur: 10, shadowColor: 'rgba(251, 191, 36, 0.5)' },
          data: cerPairs.map(d => [d.daysToVto, d.breakevenTem, d.fecha])
        },
        {
          name: 'Devaluación (Linked)',
          type: 'line',
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 3, shadowBlur: 10, shadowColor: 'rgba(16, 185, 129, 0.5)' },
          data: linkedPairs.map(d => [d.daysToVto, d.breakevenTem, d.fecha])
        }
      ]
    };
  }, [cerPairs, linkedPairs]);

  if (cerPairs.length === 0 && linkedPairs.length === 0) return null;

  return (
    <div className="flex flex-col gap-10 mt-0 mb-12 animate-fade-in">
      <div className="flex flex-col gap-3">
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
          Monitor de Arbitraje Breakeven
        </h2>
        <p className="text-dim" style={{ fontSize: '0.9rem', maxWidth: '600px', lineHeight: '1.5' }}>
          Esta herramienta te ayuda a decidir entre activos a Tasa Fija o Ajustables (CER/Linked) comparando las expectativas del mercado.
        </p>
      </div>

      {/* GUÍA DE INVERSIÓN RÁPIDA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-[2rem] border border-amber-400/20 bg-amber-400/[0.03]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-5 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.4)]"></div>
            <span className="text-xs font-black text-amber-400 uppercase tracking-[0.2em]">Estrategia de Inflación</span>
          </div>
          <p className="text-[0.8rem] text-gray-300 leading-[1.6]">
            Si proyectas que la <b>inflación mensual</b> será <span className="text-amber-400 font-bold">mayor</span> al valor BE TEM de la tabla, el activo <b>CER</b> te dará mayor retorno. Caso contrario, elige la <b>LECAP</b>.
          </p>
        </div>
        
        <div className="glass p-6 rounded-[2rem] border border-emerald-400/20 bg-emerald-400/[0.03]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-5 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
            <span className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">Estrategia de Dólar</span>
          </div>
          <p className="text-[0.8rem] text-gray-300 leading-[1.6]">
            Si proyectas que el <b>dólar oficial</b> subirá <span className="text-emerald-400 font-bold">más rápido</span> que el valor de la tabla, el activo <b>Linked</b> es tu mejor opción de cobertura.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-8 rounded-[2rem] border border-white/10 shadow-2xl" style={{ height: '420px' }}>
          <ReactECharts option={chartOptions} style={{ height: '360px', width: '100%' }} theme="dark" />
        </div>

        <div className="flex flex-col gap-4 overflow-hidden">
          {/* TABLA CER */}
          {cerPairs.length > 0 && (
            <div className="glass rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-4 py-4 px-6">
                <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-amber-400/20 to-transparent"></div>
                <span className="text-[0.65rem] font-bold text-amber-400/60 uppercase tracking-[0.3em]">Inflación (CER)</span>
                <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-amber-400/20 to-transparent"></div>
              </div>
              <table className="premium-table" style={{ fontSize: '0.75rem', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.8rem 1rem' }}>Vencimiento</th>
                    <th>Nominal</th>
                    <th>CER</th>
                    <th style={{ textAlign: 'center', color: '#fbbf24' }}>BE TEM</th>
                  </tr>
                </thead>
                <tbody>
                  {cerPairs.map((pair: any) => (
                    <tr key={pair.daysToVto}>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <span className="text-white">{new Date(pair.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
                      </td>
                      <td className="text-dim" style={{ padding: '0.8rem 1rem' }}>
                        <div style={{ display: 'block' }}>
                          <div className="font-bold text-white text-[0.85rem]">{pair.nominalSymbol}</div>
                          <div style={{ fontSize: '0.6rem', opacity: 0.35, fontWeight: 500, marginTop: '4px' }}>{pair.nominalYield.toFixed(1)}% TEA</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'block' }}>
                          <div className="font-bold text-indigo-400 text-[0.85rem]">{pair.targetSymbol}</div>
                          <div style={{ fontSize: '0.6rem', color: '#818cf8', opacity: 0.5, fontWeight: 500, marginTop: '4px' }}>{pair.targetYield.toFixed(1)}% TIR</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#fbbf24' }}>
                        {pair.breakevenTem.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLA LINKED */}
          {linkedPairs.length > 0 && (
            <div className="glass rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-4 py-4 px-6">
                <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent"></div>
                <span className="text-[0.65rem] font-bold text-emerald-400/60 uppercase tracking-[0.3em]">Devaluación (Linked)</span>
                <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent"></div>
              </div>
              <table className="premium-table" style={{ fontSize: '0.75rem', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.8rem 1rem' }}>Vencimiento</th>
                    <th>Nominal</th>
                    <th>Linked</th>
                    <th style={{ textAlign: 'center', color: '#10b981' }}>BE TEM</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedPairs.map((pair: any) => (
                    <tr key={pair.daysToVto}>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <span className="text-white">{new Date(pair.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
                      </td>
                      <td className="text-dim" style={{ padding: '0.8rem 1rem' }}>
                        <div style={{ display: 'block' }}>
                          <div className="font-bold text-white text-[0.85rem]">{pair.nominalSymbol}</div>
                          <div style={{ fontSize: '0.6rem', opacity: 0.35, fontWeight: 500, marginTop: '4px' }}>{pair.nominalYield.toFixed(1)}% TEA</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'block' }}>
                          <div className="font-bold text-emerald-400 text-[0.85rem]">{pair.targetSymbol}</div>
                          <div style={{ fontSize: '0.6rem', color: '#34d399', opacity: 0.5, fontWeight: 500, marginTop: '4px' }}>{pair.targetYield.toFixed(1)}% TIR</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#10b981' }}>
                        {pair.breakevenTem.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BreakevenMonitor;
