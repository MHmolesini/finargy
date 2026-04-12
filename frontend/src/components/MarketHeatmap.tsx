'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { BaseNote } from './MarketDashboard';

interface MarketHeatmapProps {
  notes: BaseNote[];
}

const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ notes }) => {
  const chartOptions = useMemo(() => {
    if (!notes || notes.length === 0) return {};

    // 1. Agrupar por tipo de activo y filtrar vacíos de volumen
    const groups: Record<string, BaseNote[]> = {};
    
    notes.forEach(n => {
      // Si el volumen es 0 o nulo, no ocupa lugar geométrico en el mapa real
      if (!n.v || n.v <= 0) return;
      
      const tipo = (n.tipo_activo || 'OTROS').toUpperCase();
      if (!groups[tipo]) groups[tipo] = [];
      groups[tipo].push(n);
    });

    // 2. Construir Data Tree (TreeMap)
    const treeData = Object.keys(groups).map(tipo => {
      const list = groups[tipo];
      let totalVolume = 0;
      let weightedChangeSum = 0;
      
      const children = list.map(n => {
        const vol = n.v;
        const change = n.pct_change || 0;
        
        totalVolume += vol;
        weightedChangeSum += vol * change;
        
        return {
          name: n.symbol,
          // La dimensión 0 = Área, dimensión 1 = Color (Variación %)
          value: [vol, change],
          itemStyle: {
            borderColor: '#0f0f0f',
            borderWidth: 1.5,
            gapWidth: 1
          }
        };
      });

      // Cambio ponderado por volumen del sector
      const avgChange = totalVolume > 0 ? weightedChangeSum / totalVolume : 0;

      return {
        name: tipo,
        // Al nodo padre también le damos la dimensión de color
        value: [totalVolume, avgChange],
        children: children,
        itemStyle: {
          borderColor: '#111',
          borderWidth: 3,
          gapWidth: 2
        }
      };
    });

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Radar Térmico del Mercado',
        subtext: 'Volumen y Tendencia de Flujo de Capital (Todo el Mercado)',
        left: '20px',
        top: '15px',
        textStyle: {
          color: '#ffffff',
          fontSize: 18,
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700
        },
        subtextStyle: {
          color: '#888',
          fontSize: 12
        }
      },
      tooltip: {
        formatter: function (info: any) {
          const value = info.value;
          
          // Protección contra nodos abstractos (ej. root) que no tienen array de valores completo
          if (!value || !Array.isArray(value)) return '';
          
          const vol = value[0] || 0;
          const pctChange = value[1] !== undefined && value[1] !== null ? value[1] : 0;
          
          const formatMoney = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(vol);
          const change = pctChange.toFixed(2);
          const colorText = pctChange > 0 ? '#10b981' : (pctChange < 0 ? '#ef4444' : '#a0a0a0');
          const prefix = pctChange > 0 ? '+' : '';
          
          return `
            <div style="background: rgba(15,15,15,0.95); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="font-weight: 700; color: #fff; font-size: 15px; margin-bottom: 4px;">${info.name || 'Desconocido'}</div>
              <div style="color: #bbb; font-size: 13px;">Volumen: <span style="color:#fff; font-weight:500;">${formatMoney}</span></div>
              <div style="color: #bbb; font-size: 13px;">Variación: <span style="color:${colorText}; font-weight:bold;">${prefix}${change}%</span></div>
            </div>
          `;
        },
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0
      },
      visualMap: {
        type: 'continuous',
        dimension: 1, // Mapear colores basados en el índice 1 del array `value`
        min: -3, // Saturacion en -3%
        max: 3, // Saturacion en +3%
        inRange: {
          // Escala de Rojo vivo -> Gris Oscuro Neutral -> Verde Brillante
          color: ['#dc2626', '#374151', '#10b981']
        },
        calculable: true,
        text: ['+3%', '-3%'],
        textStyle: {
          color: '#a0a0a0'
        },
        right: '2%',
        top: 'center',
        itemHeight: 120
      },
      series: [
        {
          name: 'Mercado',
          type: 'treemap',
          width: '90%',
          height: '75%',
          bottom: '5%',
          left: 'center',
          roam: true, // Permitir arrastrar/navegar con scroll
          nodeClick: 'zoomToNode',
          data: treeData,
          // leafDepth eliminado para expandir todos los nodos (símbolos) por defecto
          breadcrumb: {
            show: true,
            bottom: '10px',
            itemStyle: {
              color: '#333',
              textStyle: { color: '#ccc' }
            }
          },
          label: {
            show: true,
            formatter: '{b}',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowBlur: 4
          },
          upperLabel: {
            show: true,
            height: 30,
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            backgroundColor: '#222',
            borderColor: '#555',
            borderWidth: 1
          },
          itemStyle: {
            borderColor: '#0f0f0f',
            borderRadius: 2
          },
          levels: [
            {
              itemStyle: {
                borderWidth: 3,
                borderColor: '#111',
                gapWidth: 3
              }
            },
            {
              itemStyle: {
                borderWidth: 1,
                borderColor: '#222',
                gapWidth: 1
              }
            }
          ]
        }
      ]
    };
  }, [notes]);

  if (!notes || notes.length === 0) return null;

  return (
    <div className="glass rounded-xl border border-[#222] shadow-[0_4px_30px_rgba(0,0,0,0.5)] overflow-hidden" style={{ width: '100%', height: '500px', marginTop: '2rem' }}>
      <ReactECharts 
        option={chartOptions} 
        style={{ height: '100%', width: '100%' }}
        theme="dark"
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default MarketHeatmap;
