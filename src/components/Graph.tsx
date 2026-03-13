import React, { useMemo } from 'react';
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
  minimal = false
}) => {
  const data = useMemo(() => {
    try {
      const math = (window as any).math;
      if (!math || !equation) return [];
      
      const expr = math.compile(equation);
      const [min, max] = xDomain || range;
      const pointsCount = 200;
      const plotData = [];

      // Reduce padding for minimal mode to fill the space
      const paddingFactor = minimal ? 0.1 : 0.5;
      const padding = (max - min) * paddingFactor;
      const start = min - padding;
      const end = max + padding;
      const paddedStep = (end - start) / pointsCount;

      for (let x = start; x <= end; x += paddedStep) {
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
      return plotData;
    } catch (e) {
      return [];
    }
  }, [equation, range, xDomain, tangent, secant]);

  const rootPoint = useMemo(() => {
    if (finalRoot === null || finalRoot === undefined) return null;
    try {
      const math = (window as any).math;
      const expr = math.compile(equation);
      const y = expr.evaluate({ x: finalRoot });
      return { x: finalRoot, y: typeof y === 'number' ? y : 0 };
    } catch (e) {
      return { x: finalRoot, y: 0 };
    }
  }, [finalRoot, equation]);

  return (
    <div className={`w-full h-full bg-zinc-900/50 rounded-2xl border border-zinc-800 ${minimal ? 'p-0' : 'p-4'}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={minimal ? { top: 5, right: 5, bottom: 5, left: 5 } : { top: 20, right: 20, bottom: 20, left: 20 }}>
          {!minimal && <CartesianGrid strokeDasharray="3 3" stroke="#333" />}
          {!minimal && (
            <XAxis 
              dataKey="x" 
              type="number" 
              domain={xDomain || ['auto', 'auto']} 
              stroke="#666"
              fontSize={12}
              allowDataOverflow={true}
            />
          )}
          {!minimal && (
            <YAxis 
              type="number" 
              domain={yDomain || ['auto', 'auto']} 
              stroke="#666"
              fontSize={12}
              allowDataOverflow={true}
            />
          )}
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
            itemStyle={{ color: '#fff' }}
          />
          <ReferenceLine y={0} stroke="#666" strokeWidth={1} />
          <ReferenceLine x={0} stroke="#666" strokeWidth={1} />
          
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

          {rootPoint && (
            <ReferenceDot 
              x={rootPoint.x} 
              y={rootPoint.y} 
              r={6} 
              fill="#a855f7" 
              stroke="#ef4444"
              strokeWidth={2}
              label={{ position: 'top', value: 'Root', fill: '#a855f7', fontSize: 12, fontWeight: 'bold' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
