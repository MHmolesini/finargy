'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import StocksTechnicalSummary from './StocksTechnicalSummary';
import StocksReturnsHeatmap from './StocksReturnsHeatmap';
import { X, Calendar, TrendingUp, TrendingDown, Maximize2, BarChart3 } from 'lucide-react';

interface HistoricalData {
  date: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface StocksHistoricalChartProps {
  symbol: string;
  onClose: () => void;
}

const StocksHistoricalChart: React.FC<StocksHistoricalChartProps> = ({ symbol, onClose }) => {
  const [data, setData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://data912.com/historical/cedears/${symbol}`);
        if (!response.ok) throw new Error('No se encontraron datos para este símbolo.');
        const jsonData = await response.json();
        if (!jsonData || jsonData.length === 0) throw new Error('No hay datos históricos disponibles.');
        setData(jsonData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  const chartOptions = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return {};

    const dates = data.map(item => item.date);
    const values = data.map(item => [item.o, item.c, item.l, item.h]);
    const volumes = data.map((item, index) => [
      index,
      item.v,
      item.c > item.o ? 1 : -1 
    ]);

    return {
      backgroundColor: 'transparent',
      animation: true,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#e2e8f0' },
        formatter: (params: any) => {
          const p = params[0];
          const item = data[p.dataIndex];
          if (!item) return '';
          return `
            <div style="font-family: Inter, sans-serif; padding: 4px;">
              <div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                ${item.date}
              </div>
              <div style="display: grid; grid-template-columns: auto auto; gap: 8px; font-size: 11px;">
                <span style="color: #94a3b8">Cierre:</span><span style="color: #fff; text-align: right">$${item.c.toLocaleString()}</span>
                <span style="color: #94a3b8">Var:</span><span style="color: ${item.c > item.o ? '#10b981' : '#ef4444'}; text-align: right">${(((item.c - item.o)/item.o)*100).toFixed(2)}%</span>
              </div>
            </div>
          `;
        }
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: { backgroundColor: '#1e293b' }
      },
      grid: [
        { left: isMobile ? '35px' : '50px', right: isMobile ? '10px' : '40px', top: '30px', height: '65%' },
        { left: isMobile ? '35px' : '50px', right: isMobile ? '10px' : '40px', top: '78%', height: '12%' }
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisLabel: { color: '#64748b', fontSize: 10 },
          splitLine: { show: false }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisLabel: { show: false },
          splitLine: { show: false }
        }
      ],
      yAxis: [
        {
          scale: true,
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisLabel: { color: '#64748b', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
        },
        {
          scale: true,
          gridIndex: 1,
          axisLine: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 70,
          end: 100
        },
        {
          show: !isMobile,
          xAxisIndex: [0, 1],
          type: 'slider',
          top: '92%',
          start: 70,
          end: 100,
          backgroundColor: 'rgba(255,255,255,0.02)',
          fillerColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(255,255,255,0.1)',
          handleStyle: { color: '#3b82f6' },
          textStyle: { color: '#64748b' }
        }
      ],
      series: [
        {
          name: symbol,
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: '#10b981', 
            color0: '#ef4444', 
            borderColor: '#10b981',
            borderColor0: '#ef4444'
          }
        },
        {
          name: 'Volumen',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes.map(v => v[1]),
          itemStyle: {
            color: (params: any) => {
              return data[params.dataIndex].c > data[params.dataIndex].o ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
            }
          }
        }
      ]
    };
  }, [data, symbol, isMobile]);

  const setTimeRange = (range: string) => {
    if (!data.length || !chartRef.current) return;
    
    const echartsInstance = chartRef.current.getEchartsInstance();
    const total = data.length;
    let start = 0;

    switch (range) {
      case '1M': start = Math.max(0, total - 22); break;
      case '3M': start = Math.max(0, total - 66); break;
      case '6M': start = Math.max(0, total - 132); break;
      case '1Y': start = Math.max(0, total - 252); break;
      case 'ALL': start = 0; break;
      default: start = 70;
    }

    const startPercent = (start / total) * 100;
    echartsInstance.dispatchAction({
      type: 'dataZoom',
      start: startPercent,
      end: 100
    });
  };

  if (loading) {
    return (
      <div className="premium-glass panel-glow animate-fade-in" style={{ padding: '2rem', height: isMobile ? '400px' : '650px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        <span className="text-dim">Cargando historial de {symbol}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="premium-glass border-red-500/30 animate-fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={onClose} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors">Volver al Panel</button>
      </div>
    );
  }

  const periodFilters = (
    <div style={{ 
      display: 'flex', 
      gap: '4px', 
      backgroundColor: 'rgba(0,0,0,0.2)', 
      padding: '4px', 
      borderRadius: '10px', 
      border: '1px solid rgba(255,255,255,0.05)',
      width: isMobile ? '100%' : 'fit-content',
      justifyContent: isMobile ? 'space-around' : 'flex-start'
    }}>
      {['1M', '3M', '6M', '1Y', 'ALL'].map(r => (
        <button 
          key={r}
          onClick={() => setTimeRange(r)}
          style={{
            padding: isMobile ? '8px 12px' : '4px 8px', 
            fontSize: isMobile ? '0.8rem' : '0.7rem', 
            fontWeight: 600, border: 'none', borderRadius: '6px',
            backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s',
            flex: isMobile ? 1 : 'none'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
          onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
        >
          {r}
        </button>
      ))}
    </div>
  );

  return (
    <div className="premium-glass panel-glow animate-bounce-in" style={{ 
      padding: isMobile ? '1rem' : '1.5rem', 
      marginBottom: '2rem', 
      position: 'relative',
      width: isMobile ? '95%' : '100%',
      margin: isMobile ? '0 auto 2rem auto' : '0 0 2rem 0'
    }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        marginBottom: '1.5rem',
        gap: isMobile ? '1rem' : '0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
          <div style={{ padding: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px' }}>
            <BarChart3 size={20} color="#3b82f6" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, color: 'white', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 600 }}>
              Análisis Histórico: <span style={{ color: '#3b82f6' }}>{symbol}</span>
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.75rem' }}>Velas Japonesas y Volumen Diario</p>
          </div>
          {isMobile && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} color="#94a3b8" />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
          {!isMobile && periodFilters}
          {!isMobile && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Cerrar análisis"
            >
              <X size={20} color="#94a3b8" />
            </button>
          )}
        </div>
      </div>
      
      <div style={{ height: isMobile ? '350px' : '550px', width: '100%', marginBottom: isMobile ? '1rem' : '2rem' }}>
        <ReactECharts
          ref={chartRef}
          option={chartOptions}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>

      {isMobile && <div style={{ marginBottom: '1.5rem' }}>{periodFilters}</div>}

      <div className={isMobile ? 'flex flex-col gap-4' : ''} style={isMobile ? { alignItems: 'center' } : {}}>
        <StocksTechnicalSummary symbol={symbol} historicalData={data} />
        <StocksReturnsHeatmap historicalData={data} />
      </div>
    </div>
  );
};

export default StocksHistoricalChart;
