'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { calculateRSI, getRSIAction, calculateStochastic, getStochasticAction } from '../utils/indicators';
import { ShieldCheck, Zap, BarChart as BarChartIcon } from 'lucide-react';

interface HistoricalData {
  date: string;
  c: number;
  o: number;
  h: number;
  l: number;
  v: number;
}

interface StocksTechnicalSummaryProps {
  symbol: string;
  historicalData: HistoricalData[];
}

const StocksTechnicalSummary: React.FC<StocksTechnicalSummaryProps> = ({ symbol, historicalData }) => {
  
  const technicalData = useMemo(() => {
    if (historicalData.length < 20) return null;

    const prices = historicalData.map(d => d.c);
    const highs = historicalData.map(d => d.h);
    const lows = historicalData.map(d => d.l);

    // 1. RSI (14)
    const rsiValues = calculateRSI(prices, 14);
    const latestRSI = rsiValues[rsiValues.length - 1];
    if (latestRSI === null) return null;
    const rsiInfo = getRSIAction(latestRSI);

    // 2. Estocástico (14, 3, 3)
    const stochValues = calculateStochastic(highs, lows, prices, 14, 3, 3);
    const latestK = stochValues.k[stochValues.k.length - 1];
    if (latestK === null) return null;
    const stochInfo = getStochasticAction(latestK);

    // Lógica de Resumen (Velocímetro)
    // Mapeamos las acciones a un "score" numérico para el gauge (0-100)
    // 0: Venta Fuerte, 50: Neutral, 100: Compra Fuerte
    const getScore = (info: { action: string }) => {
      if (info.action === 'Compra') return 80;
      if (info.action === 'Venta') return 20;
      return 50;
    };

    const rsiScore = getScore(rsiInfo);
    const stochScore = getScore(stochInfo);
    const averageScore = (rsiScore + stochScore) / 2;

    // Resumen de conteos
    const counts = { sell: 0, neutral: 0, buy: 0 };
    [rsiInfo, stochInfo].forEach(info => {
      if (info.action === 'Venta') counts.sell++;
      else if (info.action === 'Compra') counts.buy++;
      else counts.neutral++;
    });

    let summaryLabel = 'Neutral';
    if (counts.buy > counts.sell && counts.buy > counts.neutral) summaryLabel = 'Compra';
    if (counts.sell > counts.buy && counts.sell > counts.neutral) summaryLabel = 'Venta';

    return {
      rsi: latestRSI.toFixed(2),
      rsiAction: rsiInfo.action,
      rsiColor: rsiInfo.color,
      
      stochK: latestK.toFixed(2),
      stochAction: stochInfo.action,
      stochColor: stochInfo.color,

      gaugeValue: averageScore,
      summaryLabel: summaryLabel,
      counts
    };
  }, [historicalData]);

  const gaugeOption = useMemo(() => {
    if (!technicalData) return {};

    return {
      series: [
        {
          type: 'gauge',
          startAngle: 210,
          endAngle: -30,
          min: 0,
          max: 100,
          splitNumber: 4,
          axisLine: {
            lineStyle: {
              width: 10,
              color: [
                [0.2, '#ef4444'], // Venta Fuerte
                [0.4, '#f87171'], // Venta
                [0.6, '#334155'], // Neutral
                [0.8, '#60a5fa'], // Compra
                [1, '#2563eb']    // Compra Fuerte
              ]
            }
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '12%',
            width: 20,
            offsetCenter: [0, '-60%'],
            itemStyle: { color: 'auto' }
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: {
            show: true,
            showAbove: true,
            size: 10,
            itemStyle: { borderWidth: 2, borderColor: '#fff' }
          },
          title: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: 24,
            fontWeight: 'bold',
            offsetCenter: [0, '30%'],
            formatter: () => technicalData.summaryLabel,
            color: 'auto'
          },
          data: [{ value: technicalData.gaugeValue }]
        }
      ]
    };
  }, [technicalData]);

  if (!technicalData) return null;

  return (
    <div className="premium-glass panel-glow animate-fade-in" style={{ padding: '2rem', marginTop: '1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#f8fafc', fontWeight: 600 }}>Resumen Técnico</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Basado en algoritmos de seguimiento de tendencia</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
        
        {/* Lado Izquierdo: Velocímetro */}
        <div style={{ position: 'relative', height: '300px' }}>
          <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>NEUTRAL</div>
          <div style={{ position: 'absolute', top: '50%', left: '10%', transform: 'translateY(-50%)', color: '#ef4444', fontSize: '0.7rem', fontWeight: 600 }}>VENTA</div>
          <div style={{ position: 'absolute', top: '50%', right: '10%', transform: 'translateY(-50%)', color: '#2563eb', fontSize: '0.7rem', fontWeight: 600 }}>COMPRA</div>
          
          <ReactECharts option={gaugeOption} style={{ height: '100%', width: '100%' }} />
          
          <div style={{ textAlign: 'center', marginTop: '-40px' }}>
             <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                <span>Venta <br/><b style={{color: '#ef4444'}}>{technicalData.counts.sell}</b></span>
                <span>Neutral <br/><b style={{color: '#94a3b8'}}>{technicalData.counts.neutral}</b></span>
                <span>Compra <br/><b style={{color: '#2563eb'}}>{technicalData.counts.buy}</b></span>
             </div>
          </div>
        </div>

        {/* Lado Derecho: Tabla de Indicadores */}
        <div>
          <h3 style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} color="var(--accent-color)" /> Osciladores
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '10px 0', color: '#64748b', fontWeight: 500 }}>Nombre</th>
                <th style={{ padding: '10px 0', color: '#64748b', fontWeight: 500 }}>Valor</th>
                <th style={{ padding: '10px 0', color: '#64748b', fontWeight: 500, textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px 0', color: '#e2e8f0' }}>Índice de fuerza relativa (14)</td>
                <td style={{ padding: '12px 0', color: '#fff', fontWeight: 600 }}>{technicalData.rsi}</td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600, color: technicalData.rsiColor }}>{technicalData.rsiAction}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px 0', color: '#e2e8f0' }}>Estocástico %K (14, 3, 3)</td>
                <td style={{ padding: '12px 0', color: '#fff', fontWeight: 600 }}>{technicalData.stochK}</td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600, color: technicalData.stochColor }}>{technicalData.stochAction}</td>
              </tr>
              <tr style={{ opacity: 0.3 }}>
                <td style={{ padding: '12px 0', color: '#94a3b8' }}>CCI (20)</td>
                <td style={{ padding: '12px 0', color: '#94a3b8' }}>--</td>
                <td style={{ padding: '12px 0', textAlign: 'right', color: '#94a3b8' }}>Neutral</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: '1rem', color: '#f8fafc', marginTop: '2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} color="var(--accent-color)" /> Medias Móviles
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>Próximamente: Promedios exponenciales y simples de 10 a 200 períodos.</p>
        </div>
      </div>
    </div>
  );
};

export default StocksTechnicalSummary;
