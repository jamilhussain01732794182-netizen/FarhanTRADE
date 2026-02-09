
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  rsi?: number;
  ema200?: number;
}

export interface Signal {
  id: string;
  timestamp: string;
  symbol: string;
  direction: 'CALL' | 'PUT';
  price: number;
  logic: string;
  rsi: number;
  trend: 'Bull' | 'Bear';
  entryTime: string;
}

export interface MarketState {
  symbol: string;
  candles: Candle[];
  lastSignal?: Signal;
}

export enum KillzoneStatus {
  ACTIVE = 'Monitoring',
  INACTIVE = 'Market Closed (Weekend)'
}
