import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Stock } from './StocksTable';

const getSectorHexColor = (sector: string) => {
  switch (sector) {
    case 'Servicios Financieros':
    case 'Finanzas': return '#34d399'; // Emerald
    case 'Energia':
    case 'Minerales energéticos': return '#fbbf24'; // Amber
    case 'Materiales':
    case 'Minerales no energéticos': return '#818cf8'; // Indigo
    case 'Servicios Publicos':
    case 'Servicios públicos': return '#22d3ee'; // Cyan
    case 'Consumo Basico':
    case 'Consumo no cíclico':
    case 'Consumibles perecederos': return '#f472b6'; // Pink
    case 'Consumo Discrecional':
    case 'Servicios al consumidor':
    case 'Bienes de consumo duraderos':
    case 'Comercio minorista': return '#c084fc'; // Purple
    case 'Industriales':
    case 'Servicios industriales':
    case 'Fabricación de productos': return '#94a3b8'; // Slate
    case 'Comunicaciones': return '#60a5fa'; // Blue
    case 'Bienes Raices': return '#2dd4bf'; // Teal
    case 'Tecnologia':
    case 'Servicios tecnológicos': return '#f87171'; // Red
    case 'Salud':
    case 'Tecnologías sanitarias':
    case 'Tecnología de la salud': return '#a3e635'; // Lime
    case 'Transporte': return '#facc15'; // Yellow
    case 'Servicios de distribución': return '#fb923c'; // Orange
    case 'Industrias de proceso': return '#a1a1aa'; // Zinc
    default: return '#cbd5e1'; // Default Gray
  }
};

interface ScatterProps {
  stocks: Stock[];
  volumeMode?: 'nominal' | 'monto';
}

const StocksScatter: React.FC<ScatterProps> = ({ stocks, volumeMode = 'nominal' }) => {
  const chartOptions = useMemo(() => {

    // Solo operamos con ARS y evitamos outliers nulos
    const validStocks = stocks.filter(s => s.moneda === 'ARS' && s.q_op !== undefined && s.pct_change !== undefined);

    // Buscamos el volumen nominal/monto máximo para normalizar el radio (Z-axis) de las burbujas
    let maxVol = 1;
    validStocks.forEach(s => {
      const vol = volumeMode === 'monto' ? ((s.v || 0) * (s.c || 0)) : (s.v || 0);
      if (vol > maxVol) maxVol = vol;
    });

    // ECharts necesita Series agrupadas si queremos tener Leyenda interactiva por Sector.
    const seriesBySector: Record<string, any[]> = {};

    validStocks.forEach(stock => {
      const sector = stock.sector || 'General';
      if (!seriesBySector[sector]) {
        seriesBySector[sector] = [];
      }

      // Estructura Data: [0: X(Change), 1: Y(Ops), 2: Z(Volumen), 3: Label(Ticker), 4: Sector]
      seriesBySector[sector].push([
        stock.pct_change || 0,
        stock.q_op || 0,
        volumeMode === 'monto' ? ((stock.v || 0) * (stock.c || 0)) : (stock.v || 0),
        stock.symbol,
        sector
      ]);
    });

    const seriesData = Object.keys(seriesBySector).map(sectorName => {
      const color = getSectorHexColor(sectorName);

      return {
        name: sectorName,
        type: 'scatter',
        data: seriesBySector[sectorName],
        itemStyle: {
          color: color,
          opacity: 0.75, // Transparencia para ver superposiciones
          borderColor: 'rgba(255,255,255,0.2)', // Borde glassmorphism suave
          borderWidth: 1
        },
        symbolSize: function (dataItem: any[]) {
          // Escalamiento No Lineal (Raíz Cuadrada) para suavizar diferencias masivas de volumen
          // Min size: 5px, Max size teórico: ~70px
          const vol = dataItem[2];
          return Math.max(Math.sqrt(vol / maxVol) * 70, 5);
        },
        label: {
          show: false, // Quitamos estáticas por lo saturado que puede ser
          formatter: function (param: any) {
            return param.data[3];
          },
          position: 'top',
          color: '#cbd5e1',
          fontSize: 10
        },
        emphasis: {
          focus: 'series',
          label: {
            show: true,
            fontWeight: 'bold',
            color: '#fff'
          },
          itemStyle: {
            opacity: 1, // Full color opaco al focus
            borderColor: '#fff',
            borderWidth: 2
          }
        }
      };
    });

    return {
      title: { show: false }, // Manejado en HTML 
      grid: {
        top: '10%',
        left: '5%',
        right: '25%', // Ampliado para darle lugar a la leyenda vertical lateral
        bottom: '8%',
        containLabel: true
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 0,
        top: 'middle',
        textStyle: { color: '#cbd5e1', fontSize: 11 },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        padding: 12,
        textStyle: { color: '#e2e8f0' },
        formatter: function (obj: any) {
          const value = obj.value;
          // value = [pct_change, q_op, vol, symbol, sector]
          const change = value[0] > 0 ? `+${value[0]}%` : `${value[0]}%`;
          const changeColor = value[0] > 0 ? '#10b981' : (value[0] < 0 ? '#ef4444' : '#a0a0a0');
          const ops = value[1].toLocaleString('es-AR');
          const vol = value[2].toLocaleString('es-AR', { minimumFractionDigits: volumeMode === 'monto' ? 2 : 0, maximumFractionDigits: volumeMode === 'monto' ? 2 : 0 });
          const symbolType = value[3];
          const sector = value[4];

          return `
            <div style="font-family: monospace; font-size: 13px; line-height: 1.5;">
              <div style="border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 6px; padding-bottom: 6px;">
                <span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${obj.color};"></span>
                <strong style="color:#fff; font-size:15px">${symbolType}</strong> <span style="color:#94a3b8">(${sector})</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 20px;">
                <span>Variación:</span>
                <strong style="color: ${changeColor}">${change}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 20px;">
                <span>Operaciones (X):</span>
                <strong style="color: #fff">${ops}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 20px;">
                <span>Volumen ${volumeMode === 'monto' ? '$' : ' Nom.'} (Z):</span>
                <strong style="color: #fff">${volumeMode === 'monto' ? '$ ' : ''}${vol}</strong>
              </div>
            </div>
          `;
        }
      },
      xAxis: {
        name: 'Variación Porcentual (%)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        type: 'value',
        splitLine: {
          show: true,
          lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' }
        },
        axisLabel: {
          color: '#cbd5e1',
          formatter: '{value}%'
        },
        // Línea central fuerte del Cero (Ecuador vertical)
        axisLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.2)' } }
      },
      yAxis: {
        name: 'Cantidad de Operaciones (Liquidez Transaccional)',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        type: 'value',
        splitLine: {
          show: true,
          lineStyle: { color: 'rgba(255,255,255,0.05)' }
        },
        axisLabel: { color: '#cbd5e1' },
      },
      dataZoom: [
        {
          type: 'inside', // Habilita zoom scroll interior
          xAxisIndex: 0,
          filterMode: 'filter'
        },
        {
          type: 'inside',
          yAxisIndex: 0,
          filterMode: 'empty'
        }
      ],
      series: seriesData
    };
  }, [stocks]);

  return (
    <div className="premium-glass panel-glow animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-block', width: '4px', height: '16px', backgroundColor: '#8b5cf6', borderRadius: '2px' }}></span>
          Dispersión Analítica: Riesgo vs Liquidez (ARS)
        </h3>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Eje Y (Operaciones), Eje X (Var. %), Radio (Vol. {volumeMode === 'monto' ? 'Monto $' : 'Nominal'})
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div style={{ height: '850px', width: '1000px', maxWidth: '100%', aspectRatio: '1/1' }}>
          <ReactECharts
            notMerge={true}
            option={chartOptions}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      </div>
    </div>
  );
};

export default StocksScatter;
