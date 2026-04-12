'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ProcessedNote } from './MarketDashboard';

interface YieldCurveChartProps {
  notes: ProcessedNote[];
  activeMarket?: 'letras' | 'bonos';
}

const YieldCurveChart: React.FC<YieldCurveChartProps> = ({ notes, activeMarket }) => {
  const chartOptions = useMemo(() => {
    // Filtrar solo las notas con días y TEM válidos
    const validNotes = notes.filter(n => n.daysToVto !== null && n.daysToVto > 0 && n.tem !== null);

    // Determinar los colores de cada Categoría (Tipo de Activo)
    const baseColors: Record<string, string> = {
      'LECAP': '#10b981', // Verde
      'LECER': '#3b82f6', // Azul
      'LELINK': '#f59e0b', // Ambar
      'BONCAP': '#06b6d4', // Cyan brillante
      'BONO': '#a855f7', // Purpura
      'OTROS': '#a855f7'
    };

    const tipos = Array.from(new Set(validNotes.map(n => (n.tipo_activo || 'OTROS').toUpperCase())));

    // Mapear los datos agrupados por tipo (Hoy)
    const activeScatterSeries = tipos.map(tipo => {
      const tipoNotes = validNotes.filter(n => (n.tipo_activo || 'OTROS').toUpperCase() === tipo);
      const mainColor = baseColors[tipo] || baseColors['OTROS'];
      
      return {
        name: tipo,
        type: 'scatter',
        symbolSize: 12,
        data: tipoNotes.map(n => {
          // Si el tem es negativo, el color individual lo pintamos rojo de alerta, sino el color principal
          const c = (n.tem as number) < 0 ? '#ef4444' : mainColor;
          return {
            name: n.symbol,
            value: [n.daysToVto, n.tem],
            itemStyle: {
              color: c,
              shadowBlur: 10,
              shadowColor: (n.tem as number) < 0 ? 'rgba(239, 68, 68, 0.5)' : c
            },
            details: {
              tea: n.tea,
              tasaDirecta: n.tasaDirecta,
              temAnterior: n.temAnterior,
              variacionTEM: (n.tem as number) - (n.temAnterior as number)
            }
          };
        }),
        zlevel: 2,
        label: {
          show: false,
          formatter: '{b}',
          position: 'right',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 11,
          distance: 8
        },
        emphasis: {
          focus: 'series',
          scale: true,
          itemStyle: { shadowBlur: 20 },
          label: {
            show: true,
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 'bold'
          }
        }
      };
    });

    // Mapear los datos del Ayer (T-1) (Fantasma)
    const seriesAnteriorData = validNotes.map(n => {
      return {
        name: n.symbol + ' (Ayer)',
        value: [n.diasAnterior, n.temAnterior],
        itemStyle: {
          color: 'rgba(255, 255, 255, 0.4)', // Color fantasmal
          shadowBlur: 0
        },
        details: {
          tea: n.teaAnterior
        }
      };
    });

    // --- REGRESIÓN LOGARÍTMICA HOY: Y = a + b * ln(X) ---
    let aLine = 0;
    let bLine = 0;
    let regressionData: number[][] = [];
    
    // --- REGRESIÓN LOGARÍTMICA AYER: Y = a + b * ln(X) ---
    let aLineAyer = 0;
    let bLineAyer = 0;
    let regressionDataAyer: number[][] = [];
    
    if (validNotes.length > 2) {
      const nTotal = validNotes.length;
      let sumLnX = 0, sumY = 0, sumLnXY = 0, sumLnX2 = 0;
      let sumLnXAyer = 0, sumYAyer = 0, sumLnXYAyer = 0, sumLnX2Ayer = 0;
      
      validNotes.forEach(n => {
        // Data Hoy
        const lnX = Math.log(n.daysToVto as number);
        const y = n.tem as number;
        sumLnX += lnX;
        sumY += y;
        sumLnXY += lnX * y;
        sumLnX2 += lnX * lnX;
        
        // Data Ayer
        const lnXAyer = Math.log(n.diasAnterior as number);
        const yAyer = n.temAnterior as number;
        sumLnXAyer += lnXAyer;
        sumYAyer += yAyer;
        sumLnXYAyer += lnXAyer * yAyer;
        sumLnX2Ayer += lnXAyer * lnXAyer;
      });
      
      bLine = (nTotal * sumLnXY - sumLnX * sumY) / (nTotal * sumLnX2 - sumLnX * sumLnX);
      aLine = (sumY - bLine * sumLnX) / nTotal;
      
      bLineAyer = (nTotal * sumLnXYAyer - sumLnXAyer * sumYAyer) / (nTotal * sumLnX2Ayer - sumLnXAyer * sumLnXAyer);
      aLineAyer = (sumYAyer - bLineAyer * sumLnXAyer) / nTotal;
      
      const minDays = Math.min(...validNotes.map(n => n.daysToVto as number));
      const maxDays = Math.max(...validNotes.map(n => n.diasAnterior as number));
      
      // Dibujar 50 puntos para las curvas suavizadas
      const step = (maxDays - minDays) / 50;
      for (let x = minDays; x <= maxDays; x += step) {
        regressionData.push([x, aLine + bLine * Math.log(x)]);
        regressionDataAyer.push([x, aLineAyer + bLineAyer * Math.log(x)]);
      }
      regressionData.push([maxDays, aLine + bLine * Math.log(maxDays)]);
      regressionDataAyer.push([maxDays, aLineAyer + bLineAyer * Math.log(maxDays)]);
    }

    return {
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: 'Inter, sans-serif'
      },
      title: {
        text: 'Curva de Rendimientos (TEM)',
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
        top: '20px',
        right: '20px',
        textStyle: { color: '#f0f0f0' },
        icon: 'circle'
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 15, 15, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: {
          color: '#f0f0f0'
        },
        padding: [10, 15],
        formatter: function (params: any) {
          const data = params.data;
          const days = data.value[0];
          const tem = data.value[1].toFixed(2);
          
          if (!data.details.tasaDirecta) {
             // Es un punto Fantasma de Ayer
             const tea = data.details.tea?.toFixed(2) || '-';
             return `
              <div style="font-weight: 400; font-size: 14px; margin-bottom: 5px; color: #a0a0a0">
                ${data.name}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #666;">
                <div>Plazo T-1:</div> <div style="text-align: right; color: #999;">${days} días</div>
                <div>TEM T-1:</div> <div style="text-align: right; color: #999;">${tem}%</div>
                <div>TEA T-1:</div> <div style="text-align: right; color: #999;">${tea}%</div>
              </div>
            `;
          }

          // Punto Actual
          const tea = data.details.tea?.toFixed(2) || '-';
          const directa = data.details.tasaDirecta?.toFixed(2) || '-';
          const dif = data.details.variacionTEM;
          const difColor = dif > 0 ? '#10b981' : (dif < 0 ? '#ef4444' : '#a0a0a0');
          const difSign = dif > 0 ? '+' : '';

          return `
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 5px; color: ${data.itemStyle.color}">
              ${data.name}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #a0a0a0;">
              <div>Plazo:</div> <div style="text-align: right; color: #fff;">${days} días</div>
              <div>Directa:</div> <div style="text-align: right; color: #fff;">${directa}%</div>
              <div>TEM:</div> <div style="text-align: right; color: #fff;">${tem}%</div>
              <div>Variación (24hs):</div> <div style="text-align: right; color: ${difColor}; font-weight: bold;">${difSign}${dif.toFixed(2)}%</div>
              <div>TEA:</div> <div style="text-align: right; color: #fff;">${tea}%</div>
            </div>
          `;
        }
      },
      grid: {
        left: '5%',
        right: '8%',
        bottom: '10%',
        top: '25%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Días al Vencimiento',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: '#a0a0a0'
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.05)',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: '#a0a0a0'
        }
      },
      yAxis: {
        type: 'value',
        scale: true, // Esto hace que el eje se adapte al mínimo y máximo de los datos
        name: 'TEM (%)',
        nameTextStyle: {
          color: '#a0a0a0',
          padding: [0, 0, 0, 20]
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        },
        axisLabel: {
          color: '#a0a0a0',
          formatter: '{value}%'
        }
      },
      series: [
        ...activeScatterSeries,
        {
          name: 'Regresión Logarítmica',
          type: 'line',
          data: regressionData,
          smooth: true,
          zlevel: 1,
          showSymbol: false,
          lineStyle: {
            color: 'rgba(59, 130, 246, 0.6)', // Color accent-color o azul
            width: 2,
            type: 'dashed'
          },
          tooltip: {
            show: false // No mostramos tooltip sobre la línea teórica para no confundir
          }
        },
        {
          name: 'Instrumentos (Ayer)',
          type: 'scatter',
          symbolSize: 8,
          data: seriesAnteriorData,
          zlevel: 1,
          label: {
            show: false,
            formatter: '{b}',
            position: 'right',
            color: 'rgba(255, 255, 255, 0.2)',
            fontSize: 9,
            distance: 5
          },
          emphasis: {
            focus: 'self',
            scale: true,
            label: {
              color: 'rgba(255, 255, 255, 0.8)'
            }
          }
        },
        {
          name: 'Regresión Día Anterior',
          type: 'line',
          data: regressionDataAyer,
          smooth: true,
          zlevel: 0,
          showSymbol: false,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.2)', 
            width: 1,
            type: 'dashed'
          },
          tooltip: {
            show: false
          }
        }
      ]
    };
  }, [notes]);

  if (!notes || notes.length === 0) return null;

  const validCount = notes.filter(n => n.daysToVto !== null && n.daysToVto > 0 && n.tem !== null).length;
  
  if (validCount === 0) {
    return (
      <div className="premium-table-container glass animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', height: '400px', width: '100%', marginBottom: '1rem' }}>
        <svg fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '64px', height: '64px', color: '#444' }} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"></path>
        </svg>
        <p style={{ color: '#9ca3af', fontSize: '1.25rem', fontWeight: 500, margin: 0 }}>Curva de Rendimiento no computable para {activeMarket === 'bonos' ? 'Bonos' : 'este Activo'}.</p>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>Los instrumentos actuales no poseen TEM lineal para dibujar la curva.</p>
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
