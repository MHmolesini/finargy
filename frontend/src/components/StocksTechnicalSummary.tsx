'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  calculateRSI, getRSIAction, calculateStochastic, getStochasticAction, 
  calculateCCI, getCCIAction, calculateADX, getADXAction, 
  calculateAO, getAOAction, calculateMomentum, getMomentumAction, 
  calculateMACD, getMACDAction, calculateStochasticRSI, getStochRSIAction, 
  calculateWilliamsR, getWilliamsRAction, calculateBullBearPower, getBullBearPowerAction, 
  calculateUltimateOscillator, getUOAction, calculateSMA, calculateEMA, getMAAction, calculateIchimoku, calculateVWMA, calculateHMA 
} from '../utils/indicators';
import { ShieldCheck, Zap } from 'lucide-react';

interface HistoricalData {
  date: string;
  c: number;
  h: number;
  l: number;
  o: number;
  v: number;
}

interface StocksTechnicalSummaryProps {
  historicalData: HistoricalData[];
  symbol?: string;
}

const LevelBar = ({ value, type, isUp }: { value: number, type: 'rsi' | 'stoch' | 'cci' | 'adx' | 'ao' | 'mom' | 'macd' | 'stochRsi' | 'williamsR' | 'bullBear' | 'uo', isUp?: boolean }) => {
  let displayValue = value;
  let isOver = false;
  let isUnder = false;

  if (type === 'rsi' || type === 'stoch' || type === 'stochRsi' || type === 'uo') {
    displayValue = value;
    isOver = value > 70;
    isUnder = value < 30;
  } else if (type === 'williamsR') {
    displayValue = Math.max(0, Math.min(100, (value + 100))); 
    isOver = value > -20;
    isUnder = value < -80;
  } else if (type === 'cci') {
    displayValue = 50 + (value / 2);
    displayValue = Math.max(0, Math.min(100, displayValue));
    isOver = value > 100;
    isUnder = value < -100;
  } else if (type === 'adx') {
    displayValue = Math.max(0, Math.min(100, (value / 50) * 100));
    isOver = false; 
    isUnder = false;
  } else if (type === 'ao' || type === 'mom' || type === 'macd' || type === 'bullBear') {
    displayValue = 50 + (value * 2); 
    displayValue = Math.max(0, Math.min(100, displayValue));
    isOver = value > 0;
    isUnder = value < 0;
  }

  const color = type === 'adx' ? '#94a3b8' : (isUnder ? '#10b981' : (isOver ? '#ef4444' : '#64748b'));
  
  if (type === 'ao' || type === 'mom' || type === 'macd' || type === 'bullBear') {
     const barColor = (type === 'ao' || type === 'mom')
       ? (isUp ? '#10b981' : '#ef4444') 
       : (value >= 0 ? '#10b981' : '#ef4444');
    return (
      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${displayValue}%`, height: '100%', background: barColor, transition: 'all 0.3s ease' }} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
      <div style={{ width: `${displayValue}%`, height: '100%', background: color, transition: 'all 0.3s ease' }} />
    </div>
  );
};

const TechnicalGauge = ({ value, label, counts, title, size = '320px', fontSize = '26px' }: { value: number, label: string, counts: { buy: number, sell: number, neutral: number }, title: string, size?: string, fontSize?: string }) => {
  const getActiveColor = (l: string) => {
    if (l.includes('Compra')) return '#3b82f6';
    if (l.includes('Venta')) return '#ff4d4d';
    return '#94a3b8';
  };

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        radius: '100%',
        center: ['50%', '75%'],
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [0.2, '#ff4d4d'],
              [0.4, '#ff4d4d60'],
              [0.6, '#334155'],
              [0.8, '#3b82f660'],
              [1, '#3b82f6']
            ]
          }
        },
        pointer: {
          icon: 'path://M12 2 L13 2 L13 20 L11 20 L11 2 Z',
          length: '80%',
          width: 2,
          offsetCenter: [0, '5%'],
          itemStyle: { color: '#e2e8f0' }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: true,
          distance: -55,
          color: '#64748b',
          fontSize: 9,
          formatter: (v: number) => {
            if (v === 10) return 'VENTA';
            if (v === 50) return 'NEUTRO';
            if (v === 90) return 'COMPRA';
            return '';
          }
        },
        anchor: {
          show: true,
          showAbove: true,
          size: 8,
          itemStyle: { color: '#e2e8f0' }
        },
        title: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: fontSize,
          fontWeight: 'bold',
          offsetCenter: [0, '25%'],
          formatter: () => label,
          color: getActiveColor(label)
        },
        data: [{ value: value }]
      }
    ]
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      width: '100%',
      maxWidth: '300px',
      margin: '0 auto' 
    }}>
      <h4 style={{ 
        margin: '0 0 0.5rem 0', 
        fontSize: '0.8rem', 
        color: '#f8fafc', 
        fontWeight: 600, 
        textTransform: 'uppercase', 
        opacity: 0.8,
        textAlign: 'center'
      }}>
        {title}
      </h4>
      <div style={{ position: 'relative', height: size, width: '100%', margin: '0 auto' }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px', 
        marginTop: '-35px', 
        fontSize: '0.75rem',
        paddingBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '0.65rem' }}>VENTA</span>
            <b style={{ color: '#ff4d4d' }}>{counts.sell}</b>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '0.65rem' }}>NEUTRO</span>
            <b style={{ color: '#94a3b8' }}>{counts.neutral}</b>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '0.65rem' }}>COMPRA</span>
            <b style={{ color: '#3b82f6' }}>{counts.buy}</b>
        </div>
      </div>
    </div>
  );
};

const StocksTechnicalSummary = ({ historicalData }: StocksTechnicalSummaryProps) => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const technicalData = useMemo(() => {
    if (!Array.isArray(historicalData) || historicalData.length < 52) return null;

    const highs = historicalData.map(d => d.h);
    const lows = historicalData.map(d => d.l);
    const prices = historicalData.map(d => d.c);
    const volumes = historicalData.map(d => d.v || 0);
    const currentPrice = prices[prices.length - 1];

    const getScore = (info: { action: string }) => {
      if (info.action === 'Compra') return 80;
      if (info.action === 'Venta') return 20;
      return 50;
    };

    const getSummaryLabel = (c: { buy: number, sell: number, neutral: number }) => {
      if (c.buy > c.sell && c.buy > c.neutral) return 'Compra';
      if (c.sell > c.buy && c.sell > c.neutral) return 'Venta';
      return 'Neutral';
    };

    // INDICATORS CALC 
    const rsiVal = calculateRSI(prices, 14)[prices.length - 1]!;
    const rsiInfo = getRSIAction(rsiVal);
    const stochValues = calculateStochastic(highs, lows, prices, 14, 3, 3);
    const kVal = stochValues.k[stochValues.k.length - 1]!;
    const stochInfo = getStochasticAction(kVal);
    const cciVal = calculateCCI(highs, lows, prices, 20)[prices.length - 1]!;
    const cciInfo = getCCIAction(cciVal);
    const adxVal = calculateADX(highs, lows, prices, 14)[prices.length - 1]!;
    const adxInfo = getADXAction(adxVal);
    const aoValues = calculateAO(highs, lows);
    const aoVal = aoValues[aoValues.length - 1]!;
    const aoPrev = aoValues[aoValues.length - 2]!;
    const aoInfo = getAOAction(aoVal, aoPrev);
    const momValues = calculateMomentum(prices, 10);
    const momVal = momValues[momValues.length - 1]!;
    const momPrev = momValues[momValues.length - 2]!;
    const momInfo = getMomentumAction(momVal, momPrev);
    const macdData = calculateMACD(prices);
    const macdVal = macdData.macd[macdData.macd.length - 1]!;
    const signalVal = macdData.signal[macdData.signal.length - 1]!;
    const macdInfo = getMACDAction(macdVal, signalVal);
    const stochRsiK = calculateStochasticRSI(prices).k.slice(-1)[0]!;
    const stochRsiInfo = getStochRSIAction(stochRsiK);
    const wrVal = calculateWilliamsR(highs, lows, prices, 14).slice(-1)[0]!;
    const wrInfo = getWilliamsRAction(wrVal);
    const bbpVal = calculateBullBearPower(highs, lows, prices).slice(-1)[0]!;
    const bbpInfo = getBullBearPowerAction(bbpVal);
    const uoVal = calculateUltimateOscillator(highs, lows, prices).slice(-1)[0]!;
    const uoInfo = getUOAction(uoVal);

    const oscSignals = [rsiInfo, stochInfo, cciInfo, adxInfo, aoInfo, momInfo, macdInfo, stochRsiInfo, wrInfo, bbpInfo, uoInfo];
    const oscCounts = { buy: 0, sell: 0, neutral: 0 };
    oscSignals.forEach(s => {
      if (s.action === 'Compra') oscCounts.buy++;
      else if (s.action === 'Venta') oscCounts.sell++;
      else oscCounts.neutral++;
    });
    const oscScore = oscSignals.map(getScore).reduce((a, b) => a + b, 0) / oscSignals.length;

    const maCounts = { buy: 0, sell: 0, neutral: 0 };
    const periods = [10, 20, 30, 50, 100, 200];
    const maResults = periods.map(p => {
      const sVal = calculateSMA(prices, p).slice(-1)[0]!;
      const eVal = calculateEMA(prices, p).slice(-1)[0]!;
      const sInfo = getMAAction(currentPrice, sVal);
      const eInfo = getMAAction(currentPrice, eVal);
      [sInfo, eInfo].forEach(info => {
        if (info.action === 'Compra') maCounts.buy++;
        else if (info.action === 'Venta') maCounts.sell++;
        else maCounts.neutral++;
      });
      return { p, sVal, sInfo, eVal, eInfo };
    });

    const ichiVal = calculateIchimoku(highs, lows).slice(-1)[0]!;
    const ichiInfo = getMAAction(currentPrice, ichiVal);
    const vwmaVal = calculateVWMA(prices, volumes, 20).slice(-1)[0]!;
    const vwmaInfo = getMAAction(currentPrice, vwmaVal);
    const hmaVal = calculateHMA(prices, 9).slice(-1)[0]!;
    const hmaInfo = getMAAction(currentPrice, hmaVal);

    [ichiInfo, vwmaInfo, hmaInfo].forEach(info => {
      if (info.action === 'Compra') maCounts.buy++;
      else if (info.action === 'Venta') maCounts.sell++;
      else maCounts.neutral++;
    });

    const maSignals = [
      ...maResults.flatMap(r => [r.sInfo, r.eInfo]),
      ichiInfo, vwmaInfo, hmaInfo
    ];
    const maScore = maSignals.map(getScore).reduce((a, b) => a + b, 0) / maSignals.length;

    const combinedCounts = {
      buy: oscCounts.buy + maCounts.buy,
      sell: oscCounts.sell + maCounts.sell,
      neutral: oscCounts.neutral + maCounts.neutral
    };
    const combinedScore = (oscScore + maScore) / 2;

    return {
      osc: { score: oscScore, label: getSummaryLabel(oscCounts), counts: oscCounts, 
             details: { rsi: {v: rsiVal, i: rsiInfo}, stoch: {v: kVal, i: stochInfo}, cci: {v: cciVal, i: cciInfo}, 
                        adx: {v: adxVal, i: adxInfo}, ao: {v: aoVal, i: aoInfo, up: aoVal > aoPrev}, 
                        mom: {v: momVal, i: momInfo, up: momVal > momPrev}, macd: {v: macdVal, i: macdInfo},
                        stochRsi: {v: stochRsiK, i: stochRsiInfo}, williams: {v: wrVal, i: wrInfo},
                        bbp: {v: bbpVal, i: bbpInfo}, uo: {v: uoVal, i: uoInfo} } },
      ma: { score: maScore, label: getSummaryLabel(maCounts), counts: maCounts,
            details: { list: maResults, ichi: {v: ichiVal, i: ichiInfo}, vwma: {v: vwmaVal, i: vwmaInfo}, hma: {v: hmaVal, i: hmaInfo} } },
      combined: { score: combinedScore, label: getSummaryLabel(combinedCounts), counts: combinedCounts }
    };
  }, [historicalData]);

  if (!technicalData) return null;

  return (
    <div className="animate-fade-in" style={{ 
      marginTop: '1.5rem', 
      width: isMobile ? '100%' : '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem'
    }}>
      
      {/* SECCIÓN VELOCÍMETROS: Flex wrap robusto para apilado automático */}
      <div className="premium-glass panel-glow" style={{ 
        padding: isMobile ? '1.5rem 0.5rem' : '2rem', 
        width: isMobile ? '90%' : '100%',
        maxWidth: isMobile ? '450px' : 'none',
        display: 'flex', 
        flexWrap: 'wrap',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '1.5rem', 
        alignItems: 'center', 
        justifyContent: 'center',
        margin: '0 auto'
      }}>
        <div style={{ width: isMobile ? '100%' : 'auto', flex: isMobile ? 'none' : '1', order: isMobile ? 2 : 1 }}>
          <TechnicalGauge 
            value={technicalData.osc.score} 
            label={technicalData.osc.label} 
            counts={technicalData.osc.counts} 
            title="Osciladores"
            size={isMobile ? "220px" : "280px"}
            fontSize={isMobile ? "16px" : "18px"}
          />
        </div>
        
        <div style={{ width: isMobile ? '100%' : 'auto', flex: isMobile ? 'none' : '1.3', order: isMobile ? 1 : 2 }}>
          <TechnicalGauge 
            value={technicalData.combined.score} 
            label={technicalData.combined.label} 
            counts={technicalData.combined.counts} 
            title="Resumen General"
            size={isMobile ? "280px" : "340px"}
            fontSize={isMobile ? "22px" : "24px"}
          />
        </div>

        <div style={{ width: isMobile ? '100%' : 'auto', flex: isMobile ? 'none' : '1', order: isMobile ? 3 : 3 }}>
          <TechnicalGauge 
            value={technicalData.ma.score} 
            label={technicalData.ma.label} 
            counts={technicalData.ma.counts} 
            title="Medias Móviles"
            size={isMobile ? "220px" : "280px"}
            fontSize={isMobile ? "16px" : "18px"}
          />
        </div>
      </div>

      {/* DETALLES: Siempre apilados en móvil y centrados */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '1.5rem',
        alignItems: 'center',
        width: isMobile ? '90%' : '100%',
        maxWidth: isMobile ? '450px' : 'none',
        margin: '0 auto'
      }}>
        
        <div className="premium-glass panel-glow" style={{ padding: isMobile ? '1rem 0.75rem' : '1.5rem', width: '100%', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
            <Zap size={20} color="var(--accent-color)" />
            <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.1rem', color: '#f8fafc', fontWeight: 600 }}>Detalle de Osciladores</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>
            <thead>
              <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ paddingBottom: '10px' }}>Nombre</th>
                <th style={{ paddingBottom: '10px' }}>Valor</th>
                <th style={{ textAlign: 'right', paddingBottom: '10px' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(technicalData.osc.details).map(([key, d]: [string, any]) => (
                <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px 0' }}>
                    <div style={{ color: '#e2e8f0', marginBottom: '2px' }}>{key.toUpperCase()}</div>
                    <LevelBar value={d.v || 0} type={key as any} isUp={d.up} />
                  </td>
                  <td style={{ color: '#fff', fontWeight: 500 }}>{d.v !== null && d.v !== undefined ? d.v.toFixed(2) : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: d.i.color }}>{d.i.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="premium-glass panel-glow" style={{ padding: isMobile ? '1rem 0.75rem' : '1.5rem', width: '100%', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
            <ShieldCheck size={20} color="var(--accent-color)" />
            <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.1rem', color: '#f8fafc', fontWeight: 600 }}>Detalle de Tendencia</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>
            <thead>
              <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ paddingBottom: '10px' }}>Nombre</th>
                <th style={{ paddingBottom: '10px' }}>Valor</th>
                <th style={{ textAlign: 'right', paddingBottom: '10px' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {technicalData.ma.details.list.map((r, idx) => (
                <React.Fragment key={idx}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px 0', color: '#e2e8f0' }}>EMA ({r.p})</td>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{r.eVal !== null && r.eVal !== undefined ? r.eVal.toLocaleString() : '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: r.eInfo.color }}>{r.eInfo.action}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px 0', color: '#e2e8f0' }}>SMA ({r.p})</td>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{r.sVal !== null && r.sVal !== undefined ? r.sVal.toLocaleString() : '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: r.sInfo.color }}>{r.sInfo.action}</td>
                  </tr>
                </React.Fragment>
              ))}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '8px 0', color: '#e2e8f0' }}>Ichimoku</td>
                <td style={{ color: '#fff', fontWeight: 500 }}>{technicalData.ma.details.ichi.v !== null && technicalData.ma.details.ichi.v !== undefined ? technicalData.ma.details.ichi.v.toLocaleString() : '-'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: technicalData.ma.details.ichi.i.color }}>{technicalData.ma.details.ichi.i.action}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StocksTechnicalSummary;
