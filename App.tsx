
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SYMBOLS, PREDICTION_WINDOW } from './constants';
import { MarketState, Signal, KillzoneStatus } from './types';
import { generateInitialCandles, updateLastCandle } from './services/marketData';
import { calculateRSI, calculateEMA, detectLiquiditySweep, detectFVG } from './services/strategy';
import { sendTelegramMessage } from './services/telegram';
import SignalCard from './components/SignalCard';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  Clock, 
  Zap, 
  Activity, 
  Bell,
  CheckCircle2,
  TrendingUp,
  History
} from 'lucide-react';

declare const html2canvas: any;

const App: React.FC = () => {
  const [markets, setMarkets] = useState<MarketState[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [marketStatus, setMarketStatus] = useState<KillzoneStatus>(KillzoneStatus.ACTIVE);
  const lastProcessedMinute = useRef<number | null>(null);

  // Helper for UTC+6 (Asia/Dhaka) formatting
  const formatDhakaTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      timeZone: 'Asia/Dhaka', 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  useEffect(() => {
    const initialMarkets = SYMBOLS.map(symbol => ({
      symbol,
      candles: generateInitialCandles(symbol)
    }));
    setMarkets(initialMarkets);
  }, []);

  const checkMarketOpen = useCallback((now: Date) => {
    const dhakaParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      weekday: 'long'
    }).format(now);
    
    // Weekend detection for Forex
    const isWeekend = (dhakaParts === 'Saturday') || (dhakaParts === 'Sunday');
    const status = isWeekend ? KillzoneStatus.INACTIVE : KillzoneStatus.ACTIVE;
    setMarketStatus(status);
    return !isWeekend;
  }, []);

  const runStrategy = useCallback(async () => {
    const now = new Date();
    const dTimeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      minute: '2-digit',
      second: '2-digit'
    }).formatToParts(now);
    
    const currentMin = parseInt(dTimeParts.find(p => p.type === 'minute')?.value || '0');
    const currentSec = parseInt(dTimeParts.find(p => p.type === 'second')?.value || '0');

    // Trigger exactly at 45 seconds (15s before candle close)
    if (currentSec < PREDICTION_WINDOW.start || currentSec > PREDICTION_WINDOW.end) return;
    if (lastProcessedMinute.current === currentMin) return;
    lastProcessedMinute.current = currentMin;

    if (!checkMarketOpen(now)) return;

    // Time calculations for message
    const runningTimeStr = formatDhakaTime(now).split(':').slice(0, 2).join(':');
    const nextCandleDate = new Date(now.getTime() + (60 - currentSec) * 1000);
    const entryTimeStr = formatDhakaTime(nextCandleDate).split(':').slice(0, 2).join(':');

    const newSignals: Signal[] = [];

    setMarkets(prevMarkets => {
      const nextMarkets = prevMarkets.map(m => {
        const candles = [...m.candles];
        const last = candles[candles.length - 1];
        const closes = candles.map(c => c.close);
        
        last.rsi = calculateRSI(closes);
        last.ema200 = calculateEMA(closes);

        const trendUp = last.close > (last.ema200 || 0);
        const trendDown = last.close < (last.ema200 || 0);
        const sweep = detectLiquiditySweep(candles);
        const { bull: hasBullFVG, bear: hasBearFVG } = detectFVG(candles, 40);

        let direction: 'CALL' | 'PUT' | null = null;
        let logicText = "";

        if (trendUp && (last.rsi || 50) > 50) {
          if (sweep === "Buy-side Sweep" || hasBullFVG) {
            direction = "CALL";
            logicText = sweep === "Buy-side Sweep" ? "Liquidity Sweep" : "FVG";
          }
        } else if (trendDown && (last.rsi || 50) < 50) {
          if (sweep === "Sell-side Sweep" || hasBearFVG) {
            direction = "PUT";
            logicText = sweep === "Sell-side Sweep" ? "Liquidity Sweep" : "FVG";
          }
        }

        if (direction) {
          const signal: Signal = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: runningTimeStr,
            symbol: m.symbol,
            direction,
            price: last.close,
            logic: logicText,
            rsi: last.rsi || 0,
            trend: trendUp ? 'Bull' : 'Bear',
            entryTime: entryTimeStr
          };
          
          newSignals.push(signal);

          // Format requested by user
          const telegramMsg = 
            `📊 ${signal.symbol}\n` +
            `⏳ ${runningTimeStr}\n` +
            `⏳ M1 ${entryTimeStr} 🕓\n` +
            `${direction === 'CALL' ? '🟢 CALL' : '🔴 PUT'}\n` +
            `🎯 ${signal.price.toFixed(5)}\n\n` +
            `UTC [+6.00] BD / MTG1`;
          
          // Capture screenshot and send
          setTimeout(async () => {
            const element = document.getElementById(`signal-card-${m.symbol}`);
            if (element && typeof html2canvas !== 'undefined') {
              try {
                const canvas = await html2canvas(element, {
                  backgroundColor: '#0f172a',
                  scale: 2,
                });
                canvas.toBlob((blob: Blob) => {
                  sendTelegramMessage(telegramMsg, blob);
                }, 'image/png');
              } catch (e) {
                sendTelegramMessage(telegramMsg);
              }
            } else {
              sendTelegramMessage(telegramMsg);
            }
          }, 100);

          return { ...m, lastSignal: signal };
        }
        return m;
      });
      return nextMarkets;
    });

    if (newSignals.length > 0) {
      setSignals(prev => [...newSignals, ...prev].slice(0, 30));
    }
  }, [checkMarketOpen]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      runStrategy();

      setMarkets(prev => prev.map(m => {
        const lastCandleIdx = m.candles.length - 1;
        const updatedCandles = [...m.candles];
        updatedCandles[lastCandleIdx] = updateLastCandle(updatedCandles[lastCandleIdx]);
        return { ...m, candles: updatedCandles };
      }));

      if (now.getSeconds() === 0) {
        setMarkets(prev => prev.map(m => {
          const last = m.candles[m.candles.length - 1];
          return {
            ...m,
            candles: [...m.candles, {
              time: now.getTime(),
              open: last.close,
              high: last.close,
              low: last.close,
              close: last.close
            }].slice(-400)
          };
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [runStrategy]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 p-5 sticky top-0 z-50 flex items-center justify-between backdrop-blur-md bg-slate-900/90 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-600/30 animate-pulse">
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter">Farhan <span className="text-indigo-500">Trade</span></h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">Dhaka Precision Feed</p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="hidden md:flex flex-col items-end">
            <div className="flex items-center gap-2 text-indigo-400 font-mono font-black text-lg">
              <Clock className="w-5 h-5" />
              <span>{formatDhakaTime(currentTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${marketStatus === KillzoneStatus.ACTIVE ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{marketStatus}</span>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-2xl border transition-all duration-500 flex items-center gap-2 ${currentTime.getSeconds() >= 45 && currentTime.getSeconds() <= 55 ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-2xl shadow-amber-500/20' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
             <Zap className={`w-5 h-5 ${currentTime.getSeconds() >= 45 && currentTime.getSeconds() <= 55 ? 'animate-bounce text-amber-400' : ''}`} />
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase leading-none tracking-tighter">
                 {currentTime.getSeconds() >= 45 && currentTime.getSeconds() <= 55 ? '15s Early Mode' : 'Monitoring'}
               </span>
               <span className="text-[8px] font-bold opacity-70 uppercase tracking-widest">Next Candle Prediction</span>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black flex items-center gap-3 text-slate-100">
              <LayoutDashboard className="w-6 h-6 text-indigo-400" />
              Live Terminal
            </h2>
            <div className="text-[11px] font-black text-indigo-400 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20 uppercase tracking-widest">
              Real OHLC Candles
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {markets.map(market => (
              <SignalCard key={market.symbol} state={market} />
            ))}
          </div>

          <div className="mt-10 bg-slate-900/40 rounded-3xl p-8 border border-slate-800/50 backdrop-blur-md">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-indigo-500" />
              Engine Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase">Technical Scan</span>
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed font-medium">Monitoring for Liquidity Sweeps and FVG across 40 candles. EMA 200 trend confirmed.</p>
              </div>
              <div className="space-y-3 border-l border-slate-800/50 pl-8">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Sync Clock</span>
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed font-medium">Locked to Dhaka UTC+6. Signals fire 15s early for next candle.</p>
              </div>
              <div className="space-y-3 border-l border-slate-800/50 pl-8">
                <div className="flex items-center gap-2 text-indigo-400">
                  <CheckCircle2 className="text-green-500 w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Execution</span>
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed font-medium">Duration: 60 Seconds. MTG1 Friendly signals.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800/50 flex flex-col h-[calc(100vh-160px)] lg:sticky lg:top-24 shadow-3xl backdrop-blur-xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 rounded-t-3xl">
              <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                <History className="w-4 h-4 text-indigo-500" />
                Signal Log
              </h3>
              <span className="text-[10px] text-indigo-400 font-black uppercase">LIVE Feed</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {signals.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                   <Activity className="w-12 h-12 mb-4" />
                   <p className="text-[11px] font-black text-center uppercase tracking-widest leading-relaxed">Waiting for setup...</p>
                </div>
              ) : (
                signals.map((sig) => (
                  <div key={sig.id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden">
                    <div className={`absolute left-0 top-0 h-full w-1.5 ${sig.direction === 'CALL' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-sm font-black text-white block uppercase">{sig.symbol}</span>
                        <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest">{sig.timestamp}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest ${sig.direction === 'CALL' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                        {sig.direction}
                      </div>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/50">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 mb-2">
                          <span>Entry Time</span>
                          <span className="text-white font-mono">{sig.entryTime}</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                          <span>Price</span>
                          <span className="text-indigo-400 font-mono">{sig.price.toFixed(5)}</span>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
