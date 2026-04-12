/**
 * Calcula el RSI (Relative Strength Index) usando el método de suavizado de Wilder.
 * @param prices Array de precios de cierre.
 * @param period Período del RSI (típicamente 14).
 * @returns Array de valores RSI (null para los primeros periodos).
 */
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  if (prices.length <= period) return new Array(prices.length).fill(null);

  const rsi: (number | null)[] = new Array(prices.length).fill(null);
  
  let gains = 0;
  let losses = 0;

  // Primer promedio (Simple)
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  rsi[period] = 100 - (100 / (1 + (avgGain / (avgLoss || 0.00001))));

  // Siguientes promedios (Suavizado de Wilder)
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = 100 - (100 / (1 + (avgGain / (avgLoss || 0.00001))));
  }

  return rsi;
}

/**
 * Determina la acción recomendada basada en el valor del RSI.
 */
export function getRSIAction(val: number): { action: 'Compra' | 'Venta' | 'Neutral', color: string } {
  if (val < 30) return { action: 'Compra', color: '#10b981' };
  if (val > 70) return { action: 'Venta', color: '#ef4444' };
  return { action: 'Neutral', color: '#94a3b8' };
}

/**
 * Calcula el Oscilador Estocástico (%K y %D).
 * @param highs Array de precios máximos.
 * @param lows Array de precios mínimos.
 * @param closes Array de precios de cierre.
 * @param period Período del estocástico (típicamente 14).
 * @param kSmoothing Suavizado para %K (típicamente 3).
 * @param dSmoothing Período para %D (típicamente 3).
 */
export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14,
  kSmoothing: number = 3,
  dSmoothing: number = 3
): { k: (number | null)[], d: (number | null)[] } {
  const n = highs.length;
  const fastK: (number | null)[] = new Array(n).fill(null);
  const slowK: (number | null)[] = new Array(n).fill(null);
  const slowD: (number | null)[] = new Array(n).fill(null);

  if (n < period) return { k: slowK, d: slowD };

  // 1. Calcular Fast %K
  for (let i = period - 1; i < n; i++) {
    const periodHighs = highs.slice(i - period + 1, i + 1);
    const periodLows = lows.slice(i - period + 1, i + 1);
    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);
    
    if (highestHigh === lowestLow) {
      fastK[i] = 100;
    } else {
      fastK[i] = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
    }
  }

  // 2. Calcular Slow %K (SMA de Fast %K)
  for (let i = period + kSmoothing - 2; i < n; i++) {
    const kSlice = fastK.slice(i - kSmoothing + 1, i + 1);
    if (kSlice.every(v => v !== null)) {
      slowK[i] = kSlice.reduce((a, b) => a! + b!, 0) / kSmoothing;
    }
  }

  // 3. Calcular Slow %D (SMA de Slow %K)
  for (let i = period + kSmoothing + dSmoothing - 3; i < n; i++) {
    const dSlice = slowK.slice(i - dSmoothing + 1, i + 1);
    if (dSlice.every(v => v !== null)) {
      slowD[i] = dSlice.reduce((a, b) => a! + b!, 0) / dSmoothing;
    }
  }

  return { k: slowK, d: slowD };
}

/**
 * Determina la acción recomendada basada en el valor del Estocástico.
 */
export function getStochasticAction(k: number): { action: 'Compra' | 'Venta' | 'Neutral', color: string } {
  if (k < 20) return { action: 'Compra', color: '#10b981' };
  if (k > 80) return { action: 'Venta', color: '#ef4444' };
  return { action: 'Neutral', color: '#94a3b8' };
}
