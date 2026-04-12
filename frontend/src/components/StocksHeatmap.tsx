import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Stock } from './StocksTable';

interface HeatmapProps {
  stocks: Stock[];
  volumeMode?: 'nominal' | 'monto';
}

const StocksHeatmap: React.FC<HeatmapProps> = ({ stocks, volumeMode = 'nominal' }) => {
  const chartOptions = useMemo(() => {
    
    // Interpolación básica de rojos y verdes térmicos tipo TradingView
    const getColorForChange = (change: number): string => {
      if (change === undefined) return '#334155';
      
      if (change === 0) return '#64748b'; // Neutro/Gris
      if (change > 3) return '#059669'; // Verde muy fuerte
      if (change > 1) return '#10b981'; // Verde medio
      if (change > 0) return '#34d399'; // Verde suave
      
      if (change < -3) return '#dc2626'; // Rojo muy fuerte
      if (change < -1) return '#ef4444'; // Rojo medio
      if (change < 0) return '#f87171'; // Rojo suave
      
      return '#64748b';
    };

    // 1. Agrupamiento Jerárquico Directo: Sector -> Simbolo (Ignoramos Industria para el Treemap, estilo TradingView)
    const sectorMap: Record<string, any[]> = {};

    stocks.forEach(stock => {
      // Filtrar únicamente los pesos
      if (!stock.v || stock.v <= 0 || stock.moneda !== 'ARS') return;

      const sector = stock.sector || 'General';
      const symbol = stock.symbol;
      const volume = volumeMode === 'monto' ? ((stock.v || 0) * (stock.c || 0)) : (stock.v || 0);

      if (!sectorMap[sector]) sectorMap[sector] = [];
      
      // Métrica de cambio para ese símbolo inyectada en el nodo
      sectorMap[sector].push({
        name: symbol,
        value: volume,
        itemStyle: {
          color: getColorForChange(stock.pct_change)
        },
        change: stock.pct_change
      });
    });

    const dataTree = Object.keys(sectorMap).map(sectorName => {
      return {
        name: sectorName,
        children: sectorMap[sectorName]
      };
    });

    return {
      tooltip: {
        formatter: (info: any) => {
          const NodeData = info.data;
          
          if (NodeData && NodeData.change !== undefined) {
             const changeTxt = NodeData.change > 0 ? `+${NodeData.change}%` : `${NodeData.change}%`;
             const color = NodeData.change > 0 ? '#10b981' : (NodeData.change < 0 ? '#ef4444' : '#a0a0a0');
             const valueStr = NodeData.value?.toLocaleString('es-AR') || '0';
             
             return `
              <div style="font-family: monospace; font-size: 13px;">
                <strong style="color: var(--accent-color); font-size: 14px;">${NodeData.name}</strong><br/>
                Volumen: ${volumeMode === 'monto' ? '$' : ''}${valueStr}<br/>
                Variación: <span style="color: ${color}; font-weight: bold;">${changeTxt}</span>
              </div>`;
          }
          
          // Tooltip para sectores e industrias
          return `<div style="font-family: monospace; font-size: 13px;">
              <strong style="color: var(--accent-color); font-size: 14px;">${info.name}</strong>
          </div>`;
        },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#e2e8f0' },
      },
      series: [
        {
          name: 'Mercado',
          type: 'treemap',
          roam: false, // Desactiva el molesto arrastre libre
          nodeClick: 'zoomToNode', // Drill-down clásico
          width: '100%',
          height: '100%',
          breadcrumb: { 
            show: true,
            left: 'left',
            top: 0,
            itemStyle: {
              textStyle: { color: '#cbd5e1', fontSize: 13 },
              color: 'transparent'
            }
          },
          data: dataTree,
          itemStyle: {
            borderColor: '#0f172a',
            borderWidth: 2,
            gapWidth: 2
          },
          levels: [
            {
              // Level 0: Root 
              itemStyle: { borderWidth: 4, borderColor: '#0f172a', gapWidth: 4 }
            },
            {
              // Level 1: Sector
              itemStyle: { borderWidth: 3, borderColor: '#0f172a', gapWidth: 3 },
              upperLabel: {
                show: true,
                height: 24, // Barra negra estilo TradingView
                color: '#fff',
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: 'transparent'
              }
            },
            {
              // Level 2: Simbolo (Leaf)
              itemStyle: {
                borderWidth: 1,
                borderColor: '#1e293b'
              },
              label: {
                show: true,
                position: 'inside', // Centrado en el rectángulo
                formatter: function (info: any) {
                  const data = info.data;
                  if (data && data.change !== undefined) {
                     const sign = data.change > 0 ? '+' : '';
                     // Return Array para aplicar ricos estilos si se desea, o texto directo
                     return `{name|${data.name}}\n{change|${sign}${data.change}%}`;
                  }
                  return `{name|${info.name}}`;
                },
                rich: {
                  name: {
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fff',
                    align: 'center',
                    lineHeight: 20
                  },
                  change: {
                    fontSize: 11,
                    color: '#f8fafc',
                    align: 'center',
                    opacity: 0.9
                  }
                }
              }
            }
          ]
        }
      ]
    };
  }, [stocks]);

  return (
    <div className="premium-glass panel-glow animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <h3 style={{ margin: 0, marginBottom: '1.5rem', color: '#f8fafc', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ display: 'inline-block', width: '4px', height: '16px', backgroundColor: '#ef4444', borderRadius: '2px' }}></span>
        Heatmap Ecosistema: Variación %
      </h3>
      
      <div style={{ height: '600px', width: '100%' }}>
        <ReactECharts
          option={chartOptions}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};

export default StocksHeatmap;
