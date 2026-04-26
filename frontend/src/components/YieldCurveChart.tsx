'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ProcessedNote } from './MarketDashboard';

interface YieldCurveChartProps {
  notes: ProcessedNote[];
  activeMarket?: 'letras' | 'bonos';
  metric?: 'tem' | 'tea';
}

const YieldCurveChart: React.FC<YieldCurveChartProps> = ({ notes, activeMarket, metric = 'tem' }) => {
  const chartOptions = useMemo(() => {
    const displayMetric = metric === 'tem' ? 'TEM / TIREM' : 'TEA / TIREA';

    // Filtrar solo las notas con días y métrica válida
    const validNotes = notes.filter(n => n.daysToVto !== null && n.daysToVto > 0 && (n[metric] !== null || (n as any).tir !== null));

    // --- CLASIFICACIÓN BASADA EN DASHBOARD ---
    const getCategory = (n: any) => n.categoria || 'OTROS';

    const categories = Array.from(new Set(validNotes.map(n => getCategory(n))));
    const baseColors: Record<string, string> = {
      'LECAP': '#10b981',   // Esmeralda / Verde
      'BONCAP': '#fbbf24',  // Ambar / Oro (Alto contraste con verde)
      'LECER': '#3b82f6',   // Azul
      'BONCER': '#f472b6',  // Rosa (Alto contraste con azul)
      'LELINK': '#8b5cf6',  // Violeta
      'BONLINK': '#06b6d4', // Cyan
      'DUALES': '#ec4899',  // Rosa
      'BONO DOLARES': '#3b82f6', // Royal Blue
      'OTROS': '#94a3b8'    // Gris
    };

    const symbolsMap: Record<string, string> = {
      'LECAP': 'circle',
      'LECER': 'circle',
      'LELINK': 'circle',
      'LETRAS': 'circle',
      'BONCAP': 'diamond',
      'BONCER': 'diamond',
      'BONLINK': 'diamond',
      'DUALES': 'diamond',
      'BONO DOLARES': 'diamond',
      'BONOS': 'diamond',
      'OTROS': 'pin'
    };

    // Mapear los datos agrupados
    const activeScatterSeries = categories.map(cat => {
      const catNotes = validNotes.filter(n => getCategory(n) === cat);
      if (catNotes.length === 0) return null;

      const mainColor = baseColors[cat] || baseColors['OTROS'];
      
      return {
        name: cat,
        type: 'scatter',
        itemStyle: { color: mainColor },
        symbol: symbolsMap[cat] || 'circle',
        symbolSize: 12,
        data: catNotes.map(n => {
          const isNegative = (n.tem as number) < 0;
          return {
            name: n.symbol,
            value: [n.daysToVto, n[metric]],
            itemStyle: {
              color: isNegative ? '#ef4444' : mainColor,
              shadowBlur: 10,
              shadowColor: isNegative ? 'rgba(239, 68, 68, 0.5)' : mainColor
            },
            details: {
              tea: n.tea,
              tasaDirecta: n.tasaDirecta,
              temAnterior: n.temAnterior,
              variacionMetric: (n[metric] as number) - ((metric === 'tem' ? n.temAnterior : n.teaAnterior) || 0),
              tipo: cat
            }
          };
        }),
        zlevel: 2,
        emphasis: {
          focus: 'series',
          scale: true,
          label: {
            show: true,
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 'bold',
            formatter: '{b}'
          }
        }
      };
    }).filter(s => s !== null);

    // --- REGRESIÓN DINÁMICA ---
    const calculateRegression = (dataItems: ProcessedNote[]) => {
      if (dataItems.length < 2) return [];
      const nTotal = dataItems.length;
      let sumLnX = 0, sumY = 0, sumLnXY = 0, sumLnX2 = 0;
      
      dataItems.forEach(n => {
        const lnX = Math.log(n.daysToVto as number);
        const y = n[metric] as number;
        sumLnX += lnX;
        sumY += y;
        sumLnXY += lnX * y;
        sumLnX2 += lnX * lnX;
      });
      
      const denominator = (nTotal * sumLnX2 - sumLnX * sumLnX);
      if (Math.abs(denominator) < 0.00001) return []; // Evitar división por cero

      const b = (nTotal * sumLnXY - sumLnX * sumY) / denominator;
      const a = (sumY - b * sumLnX) / nTotal;
      
      const points: number[][] = [];
      const minX = Math.min(...dataItems.map(n => n.daysToVto as number));
      const maxX = Math.max(...dataItems.map(n => n.daysToVto as number));
      const step = (maxX - minX) / 50;
      
      for (let x = minX; x <= maxX; x += step) {
        if (x <= 0) continue;
        points.push([x, a + b * Math.log(x)]);
      }
      points.push([maxX, a + b * Math.log(maxX)]);
      return points;
    };

    const notesNominal = validNotes.filter(n => getCategory(n).includes('CAP'));
    const notesReal = validNotes.filter(n => getCategory(n).includes('CER'));

    const regressionNominal = calculateRegression(notesNominal);
    const regressionReal = calculateRegression(notesReal);

    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Inter, sans-serif' },
      title: {
        text: `Curva de Rendimientos (${displayMetric})`,
        left: '20px',
        top: '20px',
        textStyle: {
          color: '#f0f0f0',
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'Outfit, sans-serif'
        }
      },
      legend: {
        type: 'scroll',
        bottom: '5px',
        left: 'center',
        textStyle: { color: '#f0f0f0', fontSize: 10 },
        icon: 'circle',
        itemGap: 15
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 15, 15, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#f0f0f0' },
        padding: [10, 15],
        formatter: function (params: any) {
          const data = params.data;
          const days = data.value[0];
          const metricValue = data.value[1].toFixed(2);
          
          if (!data.details) return null;

          const tea = data.details.tea?.toFixed(2) || '-';
          const directa = data.details.tasaDirecta?.toFixed(2) || '-';
          const dif = data.details.variacionMetric || 0;
          const difColor = dif > 0 ? '#10b981' : (dif < 0 ? '#ef4444' : '#a0a0a0');
          const difSign = dif > 0 ? '+' : '';

          return `
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 5px; color: ${data.itemStyle.color}">
              ${data.name} <span style="font-weight: 400; font-size: 11px; color: #666">(${data.details.tipo})</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #a0a0a0;">
              <div>Plazo:</div> <div style="text-align: right; color: #fff;">${days} días</div>
              <div>Directa:</div> <div style="text-align: right; color: #fff;">${directa}%</div>
              <div>${metric.toUpperCase()}:</div> <div style="text-align: right; color: #fff;">${metricValue}%</div>
              <div>Variación (24hs):</div> <div style="text-align: right; color: ${difColor}; font-weight: bold;">${difSign}${dif.toFixed(2)}%</div>
              <div>TEA:</div> <div style="text-align: right; color: #fff;">${tea}%</div>
            </div>
          `;
        }
      },
      grid: {
        left: '5%',
        right: '8%',
        bottom: '80px',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Días al Vencimiento',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#a0a0a0' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255, 255, 255, 0.05)', type: 'dashed' } },
        axisLabel: { color: '#a0a0a0' }
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: `${displayMetric} (%)`,
        nameTextStyle: { color: '#a0a0a0', padding: [0, 0, 0, 20] },
        splitLine: { show: true, lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#a0a0a0', formatter: '{value}%' }
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: 100,
          bottom: '15px',
          height: 20,
          borderColor: 'rgba(255,255,255,0.05)',
          fillerColor: 'rgba(255,255,255,0.1)',
          handleIcon: 'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
          handleSize: '80%',
          handleStyle: {
            color: '#fff',
            shadowBlur: 3,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
          },
          textStyle: { color: '#666' },
          moveHandleStyle: { color: '#333' },
          brushSelect: false
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          start: 0,
          end: 100
        }
      ],
      series: [
        ...activeScatterSeries,
        {
          type: 'line',
          data: regressionNominal,
          smooth: true,
          zlevel: 1,
          showSymbol: false,
          lineStyle: { color: '#10b981', width: 2, type: 'dashed', opacity: 0.6 },
          tooltip: { show: false }
        },
        {
          type: 'line',
          data: regressionReal,
          smooth: true,
          zlevel: 1,
          showSymbol: false,
          lineStyle: { color: '#3b82f6', width: 2, type: 'dashed', opacity: 0.6 },
          tooltip: { show: false }
        }
      ]
    };
  }, [notes, metric]);

  if (!notes || notes.length === 0) return null;

  const validCount = notes.filter(n => n.daysToVto !== null && n.daysToVto > 0 && n[metric] !== null).length;
  
  if (validCount === 0) {
    return (
      <div className="premium-table-container glass animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', height: '400px', width: '100%', marginBottom: '1rem' }}>
        <svg fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '64px', height: '64px', color: '#444' }} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"></path>
        </svg>
        <p style={{ color: '#9ca3af', fontSize: '1.25rem', fontWeight: 500, margin: 0 }}>Curva de Rendimiento no computable para esta categoría.</p>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>Los instrumentos actuales no poseen {metric.toUpperCase()} válida para dibujar la curva.</p>
      </div>
    );
  }

  return (
    <div className="premium-table-container glass animate-fade-in" style={{ height: '400px', width: '100%', marginBottom: '1rem', position: 'relative' }}>
      <ReactECharts 
        option={chartOptions} 
        style={{ height: '100%', width: '100%' }} 
        theme="dark"
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default YieldCurveChart;
