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

interface SunburstProps {
  stocks: Stock[];
}

const StocksSunburst: React.FC<SunburstProps> = ({ stocks }) => {
  const chartOptions = useMemo(() => {
    // 1. Agrupamiento Jerárquico
    const sectorMap: Record<string, any> = {};

    stocks.forEach(stock => {
      // Ignoramos especies sin volumen para limpiar el gráfico y que no ocupen espacios invisibles
      // y filtramos únicamente los de Moneda Peso (ARS) para no cruzar dimensiones en el Sunburst
      if (!stock.v || stock.v <= 0 || stock.moneda !== 'ARS') return;

      const sector = stock.sector || 'General';
      const industria = stock.industria || 'General';
      const symbol = stock.symbol;

      if (!sectorMap[sector]) sectorMap[sector] = { industries: {} };
      if (!sectorMap[sector].industries[industria]) sectorMap[sector].industries[industria] = [];
      
      sectorMap[sector].industries[industria].push({
        name: symbol,
        value: stock.v,
      });
    });

    // Transformación al array de diccionarios Data Tree
    const dataTree = Object.keys(sectorMap).map(sectorName => {
      const children = Object.keys(sectorMap[sectorName].industries).map(indName => {
        return {
          name: indName,
          children: sectorMap[sectorName].industries[indName]
        };
      });

      return {
        name: sectorName,
        itemStyle: {
          color: getSectorHexColor(sectorName) // Asignamos el color maestro
        },
        children
      };
    });

    return {
      tooltip: {
        trigger: 'item',
        formatter: (info: any) => {
            const valFormated = info.value?.toLocaleString('es-AR') || '0';
            return `
            <div style="font-family: monospace; font-size: 13px;">
              <strong style="color: var(--accent-color); font-size: 14px;">${info.name}</strong><br/>
              Volumen Nominal: ${valFormated}
            </div>`;
        },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#e2e8f0' },
      },
      series: {
        type: 'sunburst',
        data: dataTree,
        radius: ['15%', '90%'], // El 'Drink Flavors' tiene centro hueco
        sort: 'desc',
        itemStyle: {
          borderRadius: 4,
          borderWidth: 2,
          borderColor: '#0f172a' // Unifica el borde con el fondo del panel para un look nítido
        },
        levels: [
          {}, // Raíz Vacía (Hollow)
          {
            // Nivel 1: Sector
            r0: '15%',
            r: '45%',
            itemStyle: {
              borderWidth: 2
            },
            label: { show: false }
          },
          {
            // Nivel 2: Industria
            r0: '45%',
            r: '75%',
            itemStyle: {},
            label: { show: false }
          },
          {
            // Nivel 3: Símbolo (Outer edge)
            r0: '75%',
            r: '90%',
            label: {
              position: 'outside',
              padding: 4,
              silent: false,
              fontSize: 10,
              fontWeight: 'bold',
              minAngle: 3
            },
            itemStyle: {
              borderWidth: 2,
            }
          }
        ]
      }
    };
  }, [stocks]);

  return (
    <div className="premium-glass panel-glow animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <h3 style={{ margin: 0, marginBottom: '1.5rem', color: '#f8fafc', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ display: 'inline-block', width: '4px', height: '16px', backgroundColor: 'var(--accent-color)', borderRadius: '2px' }}></span>
        Ecosistema por Volumen Operado
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

export default StocksSunburst;
