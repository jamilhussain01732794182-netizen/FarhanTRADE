
import { Candle } from '../types';

const seedPrice: Record<string, number> = {
  "EURUSDm": 1.0850,
  "GBPUSDm": 1.2640,
  "AUDJPYm": 98.450,
  "CADCHFm": 0.6520
};

export const generateInitialCandles = (symbol: string, count: number = 300): Candle[] => {
  const candles: Candle[] = [];
  let currentPrice = seedPrice[symbol] || 1.0000;
  const now = Math.floor(Date.now() / 60000) * 60000;

  for (let i = count; i > 0; i--) {
    const time = now - i * 60000;
    const change = (Math.random() - 0.5) * 0.0005;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * 0.0002;
    const low = Math.min(open, close) - Math.random() * 0.0002;
    
    candles.push({ time, open, high, low, close });
    currentPrice = close;
  }
  return candles;
};

export const updateLastCandle = (candle: Candle): Candle => {
  const volatility = 0.0001;
  const change = (Math.random() - 0.5) * volatility;
  const newClose = candle.close + change;
  return {
    ...candle,
    close: newClose,
    high: Math.max(candle.high, newClose),
    low: Math.min(candle.low, newClose)
  };
};
