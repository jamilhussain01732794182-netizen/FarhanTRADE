
import React from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Bar, Cell, Line } from 'recharts';
import { Candle } from '../types';

interface MarketChartProps {
  data: Candle[];
}

const MarketChart: React.FC<MarketChartProps> = ({ data }) => {
  const chartData = data.slice(-40).map(c => ({
    ...c,
    timeStr: new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    color: c.close >= c.open ? '#22c55e' : '#ef4444',
    // High-fidelity candlestick construction
    wickRange: [c.low, c.high],
    bodyRange: [Math.min(c.open, c.close), Math.max(c.open, c.close)]
  }));

  return (
    <div className="h-48 w-full bg-slate-900/20 rounded-xl overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="timeStr" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
            itemStyle={{ color: '#94a3b8' }}
            labelStyle={{ display: 'none' }}
          />
          {/* Candle Wicks (Low to High) */}
          <Bar dataKey="wickRange" barSize={1} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={`wick-${index}`} fill={entry.color} />
            ))}
          </Bar>
          {/* Candle Body (Open to Close) */}
          <Bar dataKey="bodyRange" barSize={8} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={`body-${index}`} fill={entry.color} stroke={entry.color} />
            ))}
          </Bar>
          {/* EMA 200 Indicator */}
          <Line dataKey="ema200" stroke="#6366f1" strokeWidth={1} dot={false} isAnimationActive={false} opacity={0.6} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MarketChart;
