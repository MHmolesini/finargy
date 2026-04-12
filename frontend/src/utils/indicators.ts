/**
 * Calcula la Media Móvil Simple (SMA).
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const smas: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return smas;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  smas[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    sum = sum - data[i - period] + data[i];
    smas[i] = sum / period;
  }

  return smas;
}

/**
 * Determina la acción basada en la posición del precio respecto a la media.
 */
export function getMAAction(price: number, ma: number): { action: 'Compra' | 'Venta' | 'Neutral', color: string } {
  if (price > ma) return { action: 'Compra', color: '#10b981' };
  if (price < ma) return { action: 'Venta', color: '#ef4444' };
  return { action: 'Neutral', color: '#94a3b8' };
}

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

/**
 * Calcula el CCI (Commodity Channel Index).
 * @param highs Array de precios máximos.
 * @param lows Array de precios mínimos.
 * @param closes Array de precios de cierre.
 * @param period Período del CCI (típicamente 20).
 */
export function calculateCCI(highs: number[], lows: number[], closes: number[], period: number = 20): (number | null)[] {
  const n = highs.length;
  const cci: (number | null)[] = new Array(n).fill(null);
  if (n < period) return cci;

  const typicalPrices = highs.map((h, i) => (h + lows[i] + closes[i]) / 3);

  for (let i = period - 1; i < n; i++) {
    const periodTP = typicalPrices.slice(i - period + 1, i + 1);
    const sma = periodTP.reduce((a, b) => a + b, 0) / period;
    
    let meanDeviation = 0;
    for (const tp of periodTP) {
      meanDeviation += Math.abs(tp - sma);
    }
    meanDeviation /= period;

    if (meanDeviation === 0) {
      cci[i] = 0;
    } else {
      cci[i] = (typicalPrices[i] - sma) / (0.015 * meanDeviation);
    }
  }

  return cci;
}

/**
 * Determina la acción recomendada basada en el valor del CCI.
 */
export function getCCIAction(val: number): { action: 'Compra' | 'Venta' | 'Neutral', color: string } {
  if (val < -100) return { action: 'Compra', color: '#10b981' };
  if (val > 100) return { action: 'Venta', color: '#ef4444' };
  return { action: 'Neutral', color: '#94a3b8' };
}

/**
 * Calcula el ADX (Average Directional Index) de 14 períodos.
 */
export function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): (number | null)[] {
  const n = highs.length;
  const adx: (number | null)[] = new Array(n).fill(null);
  if (n < period * 2) return adx;

  const tr: number[] = new Array(n).fill(0);
  const plusDM: number[] = new Array(n).fill(0);
  const minusDM: number[] = new Array(n).fill(0);

  // 1. Calcular TR, +DM, -DM
  for (let i = 1; i < n; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    tr[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );

    plusDM[i] = (upMove > downMove && upMove > 0) ? upMove : 0;
    minusDM[i] = (downMove > upMove && downMove > 0) ? downMove : 0;
  }

  // 2. Wilder Smoothing para TR, +DM, -DM
  const smoothedTR: number[] = new Array(n).fill(0);
  const smoothedPlusDM: number[] = new Array(n).fill(0);
  const smoothedMinusDM: number[] = new Array(n).fill(0);

  let firstTRSum = 0;
  let firstPlusDMSum = 0;
  let firstMinusDMSum = 0;
  for (let i = 1; i <= period; i++) {
    firstTRSum += tr[i];
    firstPlusDMSum += plusDM[i];
    firstMinusDMSum += minusDM[i];
  }

  smoothedTR[period] = firstTRSum;
  smoothedPlusDM[period] = firstPlusDMSum;
  smoothedMinusDM[period] = firstMinusDMSum;

  for (let i = period + 1; i < n; i++) {
    smoothedTR[i] = smoothedTR[i - 1] - (smoothedTR[i - 1] / period) + tr[i];
    smoothedPlusDM[i] = smoothedPlusDM[i - 1] - (smoothedPlusDM[i - 1] / period) + plusDM[i];
    smoothedMinusDM[i] = smoothedMinusDM[i - 1] - (smoothedMinusDM[i - 1] / period) + minusDM[i];
  }

  // 3. Calcular +DI, -DI y DX
  const dx: (number | null)[] = new Array(n).fill(null);
  for (let i = period; i < n; i++) {
    const plusDI = 100 * (smoothedPlusDM[i] / smoothedTR[i]);
    const minusDI = 100 * (smoothedMinusDM[i] / smoothedTR[i]);
    dx[i] = 100 * (Math.abs(plusDI - minusDI) / (plusDI + minusDI));
  }

  // 4. Calcular ADX (Suavizado de DX)
  let dxSum = 0;
  for (let i = period; i < period * 2; i++) {
    dxSum += dx[i] || 0;
  }
  
  adx[period * 2 - 1] = dxSum / period;

  for (let i = period * 2; i < n; i++) {
    adx[i] = ((adx[i - 1]! * (period - 1)) + dx[i]!) / period;
  }

  return adx;
}

/**
 * Determina la acción recomendada basada en el valor del ADX.
 * Nota: ADX mide fuerza de tendencia, no dirección, por lo que suele ser Neutral.
 */
export function getADXAction(val: number): { action: 'Neutral', color: string } {
  return { action: 'Neutral', color: '#94a3b8' };
}

/**
 * Calcula el Oscilador Asombroso (Awesome Oscillator).
 */
export function calculateAO(highs: number[], lows: number[]): (number | null)[] {
  const n = highs.length;
  const ao: (number | null)[] = new Array(n).fill(null);
  if (n < 34) return ao;

  const medianPrices = highs.map((h, i) => (h + lows[i]) / 2);

  for (let i = 33; i < n; i++) {
    const sma5Slice = medianPrices.slice(i - 5 + 1, i + 1);
    const sma34Slice = medianPrices.slice(i - 34 + 1, i + 1);

    const sma5 = sma5Slice.reduce((a, b) => a + b, 0) / 5;
    const sma34 = sma34Slice.reduce((a, b) => a + b, 0) / 34;

    ao[i] = sma5 - sma34;
  }

  return ao;
}

/**
 * Determina la acción recomendada basada en el valor del AO.
 * Siguiendo el estándar de TradingView:
 * - Compra si AO > 0 y AO > AO[1]
 * - Venta si AO < 0 y AO < AO[1]
 */
export function getAOAction(val: number, prevVal: number): { action: 'Compra' | 'Venta' | 'Neutral', color: string } {
  if (val > 0 && val > prevVal) return { action: 'Compra', color: '#10b981' };
  if (val < 0 && val < prevVal) return { action: 'Venta', color: '#ef4444' };
  return { action: 'Neutral', color: '#94a3b8' };
}

/**
 * Calcula el Momentum (10).
 */
export function calculateMomentum(closes: number[], period: number = 10): (number | null)[] {
  const n = closes.length;
  const mom: (number | null)[] = new Array(n).fill(null);
  if (n <= period) return mom;

  for (let i = period; i < n; i++) {
    mom[i] = closes[i] - closes[i - period];
  }

  return mom;
}

/**
 * Determina la acción recomendada basada en el valor del Momentum.
 * Siguiendo el estándar de TradingView:
 * - Compra si Mom > 0 y Mom > Mom[1]
 * - Venta si Mom < 0 y Mom < Mom[1]
 */
export function getMomentumAction(val: number, prevVal: number): { action: 'Compra' | 'Venta' | 'Neutral', color: string } {
  if (val > 0 && val > prevVal) return { action: 'Compra', color: '#10b981' };
  if (val < 0 && val < prevVal) return { action: 'Venta', color: '#ef4444' };
  return { action: 'Neutral', color: '#94a3b8' };
}
/**
 * Calcula la Media Móvil Exponencial (EMA).
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const emas: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return emas;

  const k = 2 / (period + 1);
  
  // El primer punto de la EMA es el promedio simple del primer bloque
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  let prevEma = sum / period;
  emas[period - 1] = prevEma;

  for (let i = period; i < data.length; i++) {
    const currentEma = (data[i] - prevEma) * k + prevEma;
    emas[i] = currentEma;
    prevEma = currentEma;
  }

  return emas;
}

/**
 * Calcula el MACD (12, 26, 9).
 */
export function calculateMACD(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const fastEma = calculateEMA(data, fastPeriod);
  const slowEma = calculateEMA(data, slowPeriod);
  
  const macdLine: (number | null)[] = fastEma.map((f, i) => {
    const s = slowEma[i];
    return (f !== null && s !== null) ? f - s : null;
  });

  // La línea de señal es la EMA de la línea MACD
  // Necesitamos filtrar los nulls para calcular la EMA de la línea MACD, pero manteniendo el índice original
  const macdValidValues = macdLine.filter((v): v is number => v !== null);
  const signalValidValues = calculateEMA(macdValidValues, signalPeriod);
  
  const signalLine: (number | null)[] = new Array(data.length).fill(null);
  let validIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] !== null) {
      signalLine[i] = signalValidValues[validIdx];
      validIdx++;
    }
  }

  const histogram: (number | null)[] = macdLine.map((m, i) => {
    const s = signalLine[i];
    return (m !== null && s !== null) ? m - s : null;
  });

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Determina la acción recomendada basada en el cruce de MACD.
 */
export function getMACDAction(macd: number, signal: number): { action: 'Compra' | 'Venta' | 'Neutral', color: string } {
  if (macd > signal) return { action: 'Compra', color: '#10b981' };
  if (macd < signal) return { action: 'Venta', color: '#ef4444' };
  return { action: 'Neutral', color: '#94a3b8' };
}

/**
 * Calcula el Stochastic RSI (14, 14, 3, 3).
 */
export function calculateStochasticRSI(prices: number[], rsiPeriod: number = 14, stochPeriod: number = 14, kPeriod: number = 3, dPeriod: number = 3) {
  const rsiValues = calculateRSI(prices, rsiPeriod);
  
  // Filtrar nulls iniciales para el cálculo estocástico
  const stochRsiRaw: (number | null)[] = new Array(prices.length).fill(null);
  
  for (let i = rsiPeriod + stochPeriod; i < rsiValues.length; i++) {
    const window = rsiValues.slice(i - stochPeriod + 1, i + 1).filter((v): v is number => v !== null);
    if (window.length < stochPeriod) continue;
    
    const currentRsi = rsiValues[i] as number;
    const minRsi = Math.min(...window);
    const maxRsi = Math.max(...window);
    
    if (maxRsi !== minRsi) {
      stochRsiRaw[i] = ((currentRsi - minRsi) / (maxRsi - minRsi)) * 100;
    } else {
      stochRsiRaw[i] = 50;
    }
  }

  // Suavizado K (SMA de 3)
  const kLine: (number | null)[] = new Array(prices.length).fill(null);
  for (let i = 0; i < stochRsiRaw.length; i++) {
    if (i < kPeriod - 1) continue;
    const window = stochRsiRaw.slice(i - kPeriod + 1, i + 1).filter((v): v is number => v !== null);
    if (window.length === kPeriod) {
      kLine[i] = window.reduce((a, b) => a + b, 0) / kPeriod;
    }
  }

  // Suavizado D (SMA de 3 de K)
  const dLine: (number | null)[] = new Array(prices.length).fill(null);
  for (let i = 0; i < kLine.length; i++) {
    if (i < dPeriod - 1) continue;
    const window = kLine.slice(i - dPeriod + 1, i + 1).filter((v): v is number => v !== null);
    if (window.length === dPeriod) {
      dLine[i] = window.reduce((a, b) => a + b, 0) / dPeriod;
    }
  }

  return { k: kLine, d: dLine };
}

/**
 * Determina la acción recomendada para el Stochastic RSI.
 */
export function getStochRSIAction(k: number): { action: 'Compra' | 'Venta' | 'Neutral', color: string } {
  if (k < 20) return { action: 'Compra', color: '#10b981' };
  if (k > 80) return { action: 'Venta', color: '#ef4444' };
  return { action: 'Neutral', color: '#94a3b8' };
}

/**
 * Calcula el Williams %R (14).
 * Rango: 0 a -100.
 */
export function calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period) return result;

  for (let i = period - 1; i < closes.length; i++) {
    const windowHighs = highs.slice(i - period + 1, i + 1);
    const windowLows = lows.slice(i - period + 1, i + 1);
    
    const hh = Math.max(...windowHighs);
    const ll = Math.min(...windowLows);
    const currentClose = closes[i];

    if (hh !== ll) {
      result[i] = ((hh - currentClose) / (hh - ll)) * -100;
    } else {
      result[i] = -50;
    }
  }

  return result;
}

/**
 * Determina la acción recomendada para Williams %R.
 */
export function getWilliamsRAction(val: number): { action: 'Compra' | 'Venta' | 'Neutral', color: string } {
  if (val < -80) return { action: 'Compra', color: '#10b981' };
  if (val > -20) return { action: 'Venta', color: '#ef4444' };
  return { action: 'Neutral', color: '#94a3b8' };
}

/**
 * Calcula el Bull Bear Power (Elder-Ray Index).
 * Bull Power = High - EMA(13)
 * Bear Power = Low - EMA(13)
 * BBP = Bull Power + Bear Power
 */
export function calculateBullBearPower(highs: number[], lows: number[], closes: number[], period: number = 13) {
  const ema13 = calculateEMA(closes, period);
  
  const bbp: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = 0; i < closes.length; i++) {
    const emaValue = ema13[i];
    if (emaValue !== null) {
      const bullPower = highs[i] - emaValue;
      const bearPower = lows[i] - emaValue;
      bbp[i] = bullPower + bearPower;
    }
  }

  return bbp;
}

/**
 * Determina la acción recomendada para Bull Bear Power.
 */
export function getBullBearPowerAction(bbp: number): { action: 'Compra' | 'Venta' | 'Neutral', color: string } {
  if (bbp >= 0) return { action: 'Compra', color: '#10b981' };
  return { action: 'Venta', color: '#ef4444' };
}

/**
 * Calcula el Ultimate Oscillator (7, 14, 28).
 */
export function calculateUltimateOscillator(highs: number[], lows: number[], closes: number[], p1: number = 7, p2: number = 14, p3: number = 28): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < p3) return result;

  const bp: number[] = new Array(closes.length).fill(0);
  const tr: number[] = new Array(closes.length).fill(0);

  for (let i = 1; i < closes.length; i++) {
    const trueLow = Math.min(lows[i], closes[i - 1]);
    const trueHigh = Math.max(highs[i], closes[i - 1]);
    bp[i] = closes[i] - trueLow;
    tr[i] = trueHigh - trueLow;
  }

  const getSum = (arr: number[], endIdx: number, period: number) => {
    let sum = 0;
    for (let i = endIdx - period + 1; i <= endIdx; i++) {
      sum += arr[i];
    }
    return sum;
  };

  for (let i = p3; i < closes.length; i++) {
    const avg7 = getSum(bp, i, p1) / getSum(tr, i, p1);
    const avg14 = getSum(bp, i, p2) / getSum(tr, i, p2);
    const avg28 = getSum(bp, i, p3) / getSum(tr, i, p3);

    result[i] = 100 * ((4 * avg7 + 2 * avg14 + avg28) / 7);
  }

  return result;
}

/**
 * Determina la acción recomendada para el Ultimate Oscillator.
 */
export function getUOAction(val: number): { action: 'Compra' | 'Venta' | 'Neutral', color: string } {
  if (val < 30) return { action: 'Compra', color: '#10b981' };
  if (val > 70) return { action: 'Venta', color: '#ef4444' };
  return { action: 'Neutral', color: '#94a3b8' };
}

/**
 * Calcula el Ichimoku Cloud (Kijun-sen / Línea Base).
 * Base Line = (Highest High + Lowest Low) / 2 sobre 26 períodos.
 */
export function calculateIchimoku(highs: number[], lows: number[], conversionPeriod: number = 9, basePeriod: number = 26) {
  const result: (number | null)[] = new Array(highs.length).fill(null);
  if (highs.length < basePeriod) return result;

  for (let i = basePeriod - 1; i < highs.length; i++) {
    const windowHighs = highs.slice(i - basePeriod + 1, i + 1);
    const windowLows = lows.slice(i - basePeriod + 1, i + 1);
    
    const hh = Math.max(...windowHighs);
    const ll = Math.min(...windowLows);
    
    result[i] = (hh + ll) / 2;
  }

  return result;
}

/**
 * Calcula la Media Móvil Ponderada (WMA).
 */
export function calculateWMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;

  const weightSum = (period * (period + 1)) / 2;

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j] * (period - j);
    }
    result[i] = sum / weightSum;
  }

  return result;
}

/**
 * Calcula la Media Móvil Ponderada por Volumen (VWMA).
 */
export function calculateVWMA(prices: number[], volumes: number[], period: number = 20): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period) return result;

  for (let i = period - 1; i < prices.length; i++) {
    let pvSum = 0;
    let vSum = 0;
    for (let j = 0; j < period; j++) {
      pvSum += prices[i - j] * volumes[i - j];
      vSum += volumes[i - j];
    }
    result[i] = vSum !== 0 ? pvSum / vSum : null;
  }

  return result;
}

/**
 * Calcula la Media Móvil de Hull (HMA).
 */
export function calculateHMA(data: number[], period: number = 9): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;

  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));

  const wmaHalf = calculateWMA(data, halfPeriod);
  const wmaFull = calculateWMA(data, period);

  const diff: number[] = new Array(data.length).fill(0);
  const validDiffs: { val: number, idx: number }[] = [];

  for (let i = 0; i < data.length; i++) {
    if (wmaHalf[i] !== null && wmaFull[i] !== null) {
      diff[i] = 2 * (wmaHalf[i] as number) - (wmaFull[i] as number);
      validDiffs.push({ val: diff[i], idx: i });
    }
  }

  if (validDiffs.length < sqrtPeriod) return result;

  // Calculamos la WMA de la diferencia
  const diffValuesOnly = validDiffs.map(d => d.val);
  const hmaFinal = calculateWMA(diffValuesOnly, sqrtPeriod);

  hmaFinal.forEach((val, idx) => {
    if (val !== null) {
      const originalIdx = validDiffs[idx].idx;
      result[originalIdx] = val;
    }
  });

  return result;
}
