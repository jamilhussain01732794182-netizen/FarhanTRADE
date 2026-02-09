
import React from 'react';
import { MarketState } from '../types';
import MarketChart from './MarketChart';
import { Timer, ArrowRightLeft, Camera, Target, TrendingUp, TrendingDown } from 'lucide-react';

interface SignalCardProps {
  state: MarketState;
}

const SignalCard: React.FC<SignalCardProps> = ({ state }) => {
  const last = state.candles[state.candles.length - 1];
  const isBull = last.close > (last.ema200 || 0);

  return (
    <div 
      id={`signal-card-${state.symbol}`}
      className="bg-slate-800/40 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-700/50 hover:border-indigo-500/40 transition-all group relative overflow-hidden"
    >
      {/* Dynamic Signal Overlay on Chart Area */}
      {state.lastSignal && (
        <div className={`absolute top-20 right-10 z-10 px-4 py-2 rounded-2xl border-2 font-black text-xl flex items-center gap-2 animate-bounce shadow-xl ${
          state.lastSignal.direction === 'CALL' 
            ? 'bg-green-500/20 border-green-500 text-green-500' 
            : 'bg-red-500/20 border-red-500 text-red-500'
        }`}>
          {state.lastSignal.direction === 'CALL' ? <TrendingUp /> : <TrendingDown />}
          {state.lastSignal.direction}
        </div>
      )}

      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2 group-hover:text-indigo-400 transition-colors uppercase">
            {state.symbol}
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-0.5 rounded-full font-black tracking-widest">1M</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Farhan Trade Pro Feed</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono text-indigo-400 font-black tracking-tighter leading-none mb-1">{last.close.toFixed(5)}</p>
          <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${isBull ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            Trend: {isBull ? 'Bullish' : 'Bearish'}
          </div>
        </div>
      </div>

      <MarketChart data={state.candles} />

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50 flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">RSI momentum</span>
          <span className={`text-lg font-mono font-black ${last.rsi! > 50 ? 'text-green-400' : 'text-red-400'}`}>
            {last.rsi?.toFixed(1)}
          </span>
        </div>
        <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50 flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">EMA 200 Baseline</span>
          <span className="text-sm font-mono text-slate-400 font-bold">
            {last.ema200?.toFixed(5)}
          </span>
        </div>
      </div>

      {state.lastSignal ? (
        <div className="mt-6 bg-indigo-500/10 border border-indigo-500/40 rounded-3xl p-5 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="absolute top-0 right-0 p-3 opacity-5">
            <Camera className="w-12 h-12 text-indigo-400" />
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-indigo-500" />
            <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.25em]">Execution Snapshot</span>
          </div>

          <div className="flex items-center justify-between mb-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800/50 shadow-inner">
            <div className="text-center">
              <span className="text-[9px] text-slate-500 font-black uppercase block mb-1">Signal Time</span>
              <span className="text-[11px] text-slate-300 font-mono font-bold">{state.lastSignal.timestamp}</span>
            </div>
            <ArrowRightLeft className="w-5 h-5 text-indigo-500/40" />
            <div className="text-center">
              <span className="text-[9px] text-slate-500 font-black uppercase block mb-1">Entry Next (00s)</span>
              <span className="text-xs text-white font-mono font-black bg-indigo-600/20 px-2 py-1 rounded-lg">{state.lastSignal.entryTime}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
             <div className="flex flex-col">
               <span className={`text-sm font-black uppercase tracking-tight ${state.lastSignal.direction === 'CALL' ? 'text-green-400' : 'text-red-400'}`}>
                 {state.lastSignal.direction} - {state.symbol}
               </span>
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                 {state.lastSignal.logic}
               </span>
             </div>
             <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
               <Timer className="w-3.5 h-3.5 text-indigo-400" />
               <span className="text-[11px] text-indigo-200 font-black tracking-[0.1em]">1 MINUTE</span>
             </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center">
          <div className="flex gap-1 mb-4">
             {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }}></div>)}
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Engine Scanning...</span>
        </div>
      )}
    </div>
  );
};

export default SignalCard;
