'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface HistoricalData {
  date: string;
  c: number;
}

interface StocksReturnsHeatmapProps {
  historicalData: HistoricalData[];
}

const StocksReturnsHeatmap = ({ historicalData }: StocksReturnsHeatmapProps) => {
  const data = useMemo(() => {
    if (!Array.isArray(historicalData) || historicalData.length === 0) return null;

    const monthlyLastPrices: Record<string, Record<number, number>> = {};
    const yearsSet = new Set<string>();
    
    const lastDate = new Date(historicalData[historicalData.length - 1].date);
    const lastAvailableMonthIdx = lastDate.getMonth(); 
    const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const lastMonthName = monthsNames[lastAvailableMonthIdx];

    historicalData.forEach(d => {
      const date = new Date(d.date);
      const year = date.getFullYear().toString();
      const month = date.getMonth();
      yearsSet.add(year);
      if (!monthlyLastPrices[year]) monthlyLastPrices[year] = {};
      monthlyLastPrices[year][month] = d.c;
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
    
    const monthlyValues: any[] = [];
    const annualValues: any[] = [];
    const ytdValues: any[] = [];

    // Estructuras para calcular promedios
    const monthStats: Record<number, { sum: number, count: number }> = {};
    let annualSum = 0, annualCount = 0;
    let ytdSum = 0, ytdCount = 0;

    sortedYears.forEach((year, yIdx) => {
      const prevYear = (parseInt(year) - 1).toString();

      // 1. Mensuales
      monthsNames.forEach((_, mIdx) => {
        const currentClose = monthlyLastPrices[year]?.[mIdx];
        let prevClose: number | undefined;

        if (mIdx === 0) {
            prevClose = monthlyLastPrices[prevYear]?.[11];
        } else {
            prevClose = monthlyLastPrices[year]?.[mIdx - 1];
        }

        if (currentClose && prevClose) {
          const variation = parseFloat(((currentClose / prevClose - 1) * 100).toFixed(2));
          monthlyValues.push([mIdx, yIdx, variation]);
          
          if (!monthStats[mIdx]) monthStats[mIdx] = { sum: 0, count: 0 };
          monthStats[mIdx].sum += variation;
          monthStats[mIdx].count += 1;
        } else {
          monthlyValues.push([mIdx, yIdx, null]);
        }
      });

      // 2. Anual Total
      const prevDecClose = monthlyLastPrices[prevYear]?.[11];
      let annualReturn: number | null = null;
      const basePrice = prevDecClose;

      if (basePrice) {
        const availableParams = Object.keys(monthlyLastPrices[year]).map(Number).sort((a,b)=>a-b);
        if (availableParams.length > 0) {
            const lastMonthIdxOfThisYear = availableParams[availableParams.length - 1];
            const lastPriceThisYear = monthlyLastPrices[year][lastMonthIdxOfThisYear];
            annualReturn = parseFloat(((lastPriceThisYear / basePrice - 1) * 100).toFixed(2));
            
            annualSum += annualReturn;
            annualCount += 1;
        }
      } else {
        const available = Object.keys(monthlyLastPrices[year]).map(Number).sort((a,b)=>a-b);
        if (available.length > 1) {
            const firstP = monthlyLastPrices[year][available[0]];
            const lastP = monthlyLastPrices[year][available[available.length-1]];
            annualReturn = parseFloat(((lastP / firstP - 1) * 100).toFixed(2));
            
            annualSum += annualReturn;
            annualCount += 1;
        }
      }
      annualValues.push([12, yIdx, annualReturn]);

      // 3. YTD Acumulado (Comparativo)
      const targetMonthClose = monthlyLastPrices[year]?.[lastAvailableMonthIdx];
      let ytdReturn: number | null = null;
      if (targetMonthClose && prevDecClose) {
        ytdReturn = parseFloat(((targetMonthClose / prevDecClose - 1) * 100).toFixed(2));
        ytdSum += ytdReturn;
        ytdCount += 1;
      }
      ytdValues.push([13, yIdx, ytdReturn]);
    });

    // --- AGREGAR FILA DE PROMEDIO AL FINAL ---
    const avgIdx = sortedYears.length;
    const finalYears = [...sortedYears, 'PROMEDIO'];

    monthsNames.forEach((_, mIdx) => {
        if (monthStats[mIdx] && monthStats[mIdx].count > 0) {
            const avg = parseFloat((monthStats[mIdx].sum / monthStats[mIdx].count).toFixed(2));
            monthlyValues.push([mIdx, avgIdx, avg]);
        } else {
            monthlyValues.push([mIdx, avgIdx, null]);
        }
    });

    const avgAnnual = annualCount > 0 ? parseFloat((annualSum / annualCount).toFixed(2)) : null;
    annualValues.push([12, avgIdx, avgAnnual]);

    const avgYTD = ytdCount > 0 ? parseFloat((ytdSum / ytdCount).toFixed(2)) : null;
    ytdValues.push([13, avgIdx, avgYTD]);

    const valuesOnly = monthlyValues.map(v => v[2]).filter(v => v !== null);
    const minM = valuesOnly.length > 0 ? Math.min(...valuesOnly) : -10;
    const maxM = valuesOnly.length > 0 ? Math.max(...valuesOnly) : 10;
    const absMaxM = Math.max(Math.abs(minM), Math.abs(maxM));

    return { 
      monthlyValues, 
      annualValues, 
      ytdValues,
      years: finalYears, 
      months: [...monthsNames, 'Total Anual', `Acum. ${lastMonthName}`], 
      minM, 
      maxM,
      absMaxM
    };
  }, [historicalData]);

  if (!data) return null;

  const absMaxM = data.absMaxM;

  const option = {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        if (!params || !params.data) return '-';
        const val = params.data[2];
        if (val === null || val === undefined) return '-';
        const year = data.years[params.data[1]] || '';
        const month = data.months[params.data[0]] || '';
        return `${year} - ${month}: <b style="color:${val >= 0 ? '#4ade80' : '#fb7185'}">${val}%</b>`;
      },
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      textStyle: { color: '#fff', fontSize: 12 },
      extraCssText: 'backdrop-filter: blur(4px); border-radius: 8px;'
    },
    grid: {
      top: '10px',
      bottom: '60px',
      left: '90px',
      right: '10px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.months,
      axisLabel: { color: '#94a3b8', fontSize: 10, margin: 12, rotate: 30 },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'category',
      data: data.years,
      axisLabel: { 
        color: (val: string) => val === 'PROMEDIO' ? '#3b82f6' : '#f8fafc', 
        fontSize: (val: string) => val === 'PROMEDIO' ? 14 : 12, 
        fontWeight: (val: string) => val === 'PROMEDIO' ? 800 : 500, 
        margin: 15 
      },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    visualMap: [
      {
        min: -absMaxM,
        max: absMaxM,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0px',
        itemWidth: 15,
        itemHeight: 200,
        seriesIndex: [0], 
        text: [`${data.maxM}%`, `${data.minM}%`],
        textStyle: { color: '#94a3b8', fontSize: 10 },
        inRange: {
          color: ['#be123c', '#fb7185', '#334155', '#4ade80', '#15803d'] 
        }
      },
      {
        min: -100,
        max: 100,
        show: false,
        seriesIndex: [1, 2],
        inRange: {
          color: ['#4c0519', '#be123c', '#334155', '#15803d', '#064e3b'] 
        }
      }
    ],
    series: [
      {
        name: 'Mensual',
        type: 'heatmap',
        data: data.monthlyValues,
        label: {
          show: true,
          formatter: (p: any) => (p && p.data && p.data[2] !== null) ? `${p.data[2]}%` : '',
          color: '#fff',
          fontSize: 9,
          fontWeight: 600
        },
        itemStyle: {
            borderRadius: 2,
            borderWidth: 1,
            borderColor: 'rgba(15, 23, 42, 0.5)'
        },
        emphasis: {
            label: { show: true, fontSize: 11, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2, borderColor: '#fff' }
        }
      },
      {
        name: 'Anual',
        type: 'heatmap',
        data: data.annualValues,
        label: {
          show: true,
          formatter: (p: any) => (p && p.data && p.data[2] !== null) ? `${p.data[2]}%` : '',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700
        },
        itemStyle: {
            borderRadius: 2,
            borderWidth: 2,
            borderColor: 'rgba(15, 23, 42, 1)'
        },
        emphasis: {
            label: { show: true, fontSize: 11, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 15, shadowColor: 'rgba(0, 0, 0, 0.7)', borderWidth: 2, borderColor: '#fff' }
        }
      },
      {
        name: 'Acumulado YTD',
        type: 'heatmap',
        data: data.ytdValues,
        label: {
          show: true,
          formatter: (p: any) => (p && p.data && p.data[2] !== null) ? `${p.data[2]}%` : '',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700
        },
        itemStyle: {
            borderRadius: 2,
            borderWidth: 2,
            borderColor: 'rgba(59, 130, 246, 0.3)'
        },
        emphasis: {
            label: { show: true, fontSize: 11, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 15, shadowColor: 'rgba(59, 130, 246, 0.5)', borderWidth: 2, borderColor: '#fff' }
        }
      }
    ]
  };

  return (
    <div className="premium-glass panel-glow" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: '#f8fafc', fontWeight: 600, borderLeft: '4px solid #3b82f6', paddingLeft: '1rem' }}>
        Rendimientos Históricos (%)
      </h3>
      <div style={{ height: `${data.years.length * 52 + 100}px`, minHeight: '350px', width: '100%' }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};

export default StocksReturnsHeatmap;
