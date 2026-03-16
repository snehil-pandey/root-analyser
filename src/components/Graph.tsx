import React, { useMemo, useState, useEffect } from 'react';
import * as math from 'mathjs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { Info, AlertTriangle } from 'lucide-react';

interface GraphProps {
  equation: string;
  range: [number, number];
  points?: { x: number; y: number; label?: string; color?: string }[];
  interval?: [number, number];
  intervalLabels?: [string, string];
  xDomain?: [number, number];
  yDomain?: [number, number];
  tangent?: { x: number; y: number; slope: number } | null;
  secant?: { x1: number; y1: number; x2: number; y2: number } | null;
  finalRoot?: number | null;
  calculatedRoot?: number | null;
  precision?: number;
  minimal?: boolean;
}

export const Graph: React.FC<GraphProps> = ({ 
  equation, 
  range, 
  points = [], 
  interval,
  intervalLabels,
  xDomain,
  yDomain,
  tangent,
  secant,
  finalRoot,
  calculatedRoot,
  precision = 5,
  minimal = false
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { data, error: plotError } = useMemo(() => {
    try {
      if (!math || !equation) return { data: [], error: null };
      
      let expr;
      try {
        expr = math.compile(equation);
      } catch (e) {
        return { data: [], error: e instanceof Error ? e.message : 'Invalid equation' };
      }

      const [min, max] = xDomain || range;
      const pointsCount = 200;
      const plotData = [];

      // No padding in minimal mode to respect exact ranges
      const paddingFactor = minimal ? 0 : 0.15;
      const padding = (max - min) * paddingFactor;
      const start = min - padding;
      const end = max + padding;
      
      // Safety check for range
      if (isNaN(start) || isNaN(end) || !isFinite(start) || !isFinite(end) || start >= end) {
        return { data: [], error: 'Invalid range for plotting' };
      }

      const paddedStep = (end - start) / pointsCount;
      if (paddedStep <= 0) return { data: [], error: null };

      const startTime = Date.now();
      for (let x = start; x <= end; x += paddedStep) {
        // Prevent freezing the UI if plotting takes too long
        if (Date.now() - startTime > 100) { // 100ms limit for plotting
          return { data: plotData, error: 'Plotting timed out. The function might be too complex.' };
        }

        try {
          const y = expr.evaluate({ x });
          if (typeof y === 'number' && isFinite(y)) {
            const point: any = { x: Number(x.toFixed(8)), y: Number(y.toFixed(8)) };
            
            if (tangent) {
              point.tangentY = tangent.y + tangent.slope * (x - tangent.x);
            }
            
            if (secant) {
              const m = (secant.y2 - secant.y1) / (secant.x2 - secant.x1);
              point.secantY = secant.y1 + m * (x - secant.x1);
            }

            plotData.push(point);
          }
        } catch (e) {}
      }
      return { data: plotData, error: plotData.length === 0 ? 'No valid points to plot' : null };
    } catch (e) {
      return { data: [], error: e instanceof Error ? e.message : 'Plotting error' };
    }
  }, [equation, range, xDomain, tangent, secant, minimal]);

  return (
    <div className={`w-full h-full bg-zinc-900/50 rounded-2xl border border-zinc-800 relative ${minimal ? 'p-0' : 'pt-2 pr-2 pb-2 pl-0'}`}>
      {plotError && equation && !minimal && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 z-10 bg-zinc-900/40 backdrop-blur-[2px] p-6 text-center">
          <AlertTriangle className="w-8 h-8 mb-2 text-rose-500/50" />
          <p className="text-[10px] uppercase tracking-widest font-bold mb-1 text-zinc-400">Plotting Error</p>
          <p className="text-[9px] opacity-60 max-w-[200px]">{plotError}</p>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={minimal ? { top: 5, right: 5, bottom: 5, left: 5 } : { top: 10, right: 10, bottom: 10, left: 0 }}>
          {!minimal && <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />}
          <XAxis 
            dataKey="x" 
            type="number" 
            domain={xDomain || ['auto', 'auto']} 
            stroke="#666"
            fontSize={10}
            allowDataOverflow={true}
            hide={minimal}
          />
          <YAxis 
            type="number" 
            domain={yDomain || ['auto', 'auto']} 
            stroke="#666"
            fontSize={10}
            width={minimal ? 0 : 35}
            tickMargin={2}
            allowDataOverflow={true}
            hide={minimal}
          />
          {!minimal && !isMobile && (
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
          )}
          <ReferenceLine y={0} stroke="#555" strokeWidth={2} />
          <ReferenceLine x={0} stroke="#555" strokeWidth={2} />
          
          {interval && (
            <>
              <ReferenceLine 
                x={interval[0]} 
                stroke="#3b82f6" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                label={!minimal ? { value: intervalLabels?.[0] || 'a', position: 'insideTopLeft', fill: '#3b82f6' } : undefined} 
              />
              <ReferenceLine 
                x={interval[1]} 
                stroke="#3b82f6" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                label={!minimal ? { value: intervalLabels?.[1] || 'b', position: 'insideTopRight', fill: '#3b82f6' } : undefined} 
              />
            </>
          )}

          <Line 
            type="monotone" 
            dataKey="y" 
            stroke="#10b981" 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={false}
            animationDuration={0}
          />

          {tangent && (
            <Line 
              type="monotone" 
              dataKey="tangentY" 
              stroke="#f59e0b" 
              strokeWidth={1.5} 
              strokeDasharray="5 5"
              dot={false} 
              isAnimationActive={false}
              animationDuration={0}
            />
          )}

          {secant && (
            <Line 
              type="monotone" 
              dataKey="secantY" 
              stroke="#8b5cf6" 
              strokeWidth={1.5} 
              strokeDasharray="5 5"
              dot={false} 
              isAnimationActive={false}
              animationDuration={0}
            />
          )}
          
          {points.map((p, i) => (
            <ReferenceDot 
              key={i} 
              x={p.x} 
              y={p.y} 
              r={4} 
              fill={p.color || "#f43f5e"} 
              stroke="none" 
            />
          ))}

          {finalRoot !== null && finalRoot !== undefined && (
            minimal ? (
              <ReferenceDot 
                x={finalRoot} 
                y={0} 
                r={4} 
                fill="#a855f7" 
                stroke="none" 
              />
            ) : (
              <ReferenceLine 
                x={finalRoot} 
                stroke="#a855f7" 
                strokeWidth={2} 
                strokeDasharray="3 3"
                label={{ 
                  position: 'insideBottomLeft', 
                  value: 'Actual Root', 
                  fill: '#a855f7', 
                  fontSize: 10, 
                  fontWeight: 'bold' 
                }} 
              />
            )
          )}

          {calculatedRoot !== null && calculatedRoot !== undefined && (
            minimal ? (
              <ReferenceDot 
                x={calculatedRoot} 
                y={0} 
                r={3} 
                fill="#06b6d4" 
                stroke="none" 
              />
            ) : (
              <ReferenceLine 
                x={calculatedRoot} 
                stroke="#06b6d4" 
                strokeWidth={2} 
                label={{ 
                  position: 'insideBottomRight', 
                  value: 'Calculated Root', 
                  fill: '#06b6d4', 
                  fontSize: 10, 
                  fontWeight: 'bold' 
                }} 
              />
            )
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
