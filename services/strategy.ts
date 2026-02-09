
import { Candle } from '../types';

export const calculateRSI = (closes: number[], period: number = 14): number => {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[closes.length - i] - closes[closes.length - i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const calculateEMA = (closes: number[], period: number = 200): number => {
  if (closes.length < period) return closes[closes.length - 1];
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
};

export const detectLiquiditySweep = (candles: Candle[], lookback: number = 25): string | null => {
  if (candles.length < lookback + 2) return null;
  // Recent high/low of the previous 'lookback' candles (excluding the last one)
  const recent = candles.slice(-(lookback + 1), -1);
  const recentHigh = Math.max(...recent.map(c => c.high));
  const recentLow = Math.min(...recent.map(c => c.low));
  
  const prev = candles[candles.length - 2];
  const last = candles[candles.length - 1];

  if (prev.low < recentLow && last.close > recentLow) return "Buy-side Sweep";
  if (prev.high > recentHigh && last.close < recentHigh) return "Sell-side Sweep";
  return null;
};

/**
 * Scans the provided window of candles for Fair Value Gaps
 */
export const detectFVG = (candles: Candle[], windowSize: number = 40): { bull: boolean; bear: boolean } => {
  if (candles.length < 3) return { bull: false, bear: false };
  
  const scanRange = candles.slice(-windowSize);
  let bull = false;
  let bear = false;

  // Python logic: if df['high'].iloc[i-2] < df['low'].iloc[i]
  for (let i = 2; i < scanRange.length; i++) {
    if (scanRange[i - 2].high < scanRange[i].low) {
      bull = true;
    }
    if (scanRange[i - 2].low > scanRange[i].high) {
      bear = true;
    }
  }

  return { bull, bear };
};
