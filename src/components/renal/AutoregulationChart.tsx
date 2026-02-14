import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend
} from 'recharts';

interface AutoregulationChartProps {
  data: { map: number; rbf: number; gfr: number }[];
  currentMAP: number;
  currentRBF: number;
  currentGFR: number;
}

const AutoregulationChart: React.FC<AutoregulationChartProps> = ({
  data,
  currentMAP,
  currentRBF,
  currentGFR
}) => {
  return (
    <div className="w-full h-80 bg-card rounded-lg p-4 border border-border">
      <h3 className="text-sm font-medium text-foreground mb-2">Renal Autoregulation Curve</h3>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
        >
          <defs>
            <linearGradient id="autoregGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          
          {/* Autoregulation range highlight */}
          <ReferenceArea
            x1={80}
            x2={180}
            fill="hsl(var(--status-normal))"
            fillOpacity={0.1}
            label={{ value: 'Autoregulation Range', position: 'insideTop', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          
          <XAxis
            dataKey="map"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            label={{ value: 'Mean Arterial Pressure (mmHg)', position: 'bottom', offset: 0, fontSize: 11 }}
          />
          
          <YAxis
            yAxisId="rbf"
            orientation="left"
            stroke="hsl(var(--primary))"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            domain={[0, 1600]}
            label={{ value: 'RBF (mL/min)', angle: -90, position: 'insideLeft', fontSize: 11 }}
          />
          
          <YAxis
            yAxisId="gfr"
            orientation="right"
            stroke="hsl(var(--renal))"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            domain={[0, 200]}
            label={{ value: 'GFR (mL/min)', angle: 90, position: 'insideRight', fontSize: 11 }}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelFormatter={(value) => `MAP: ${value} mmHg`}
          />
          
          <Legend verticalAlign="top" height={30} />
          
          <Area
            yAxisId="rbf"
            type="monotone"
            dataKey="rbf"
            stroke="none"
            fill="url(#autoregGradient)"
          />
          
          <Line
            yAxisId="rbf"
            type="monotone"
            dataKey="rbf"
            name="Renal Blood Flow"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
          
          <Line
            yAxisId="gfr"
            type="monotone"
            dataKey="gfr"
            name="GFR"
            stroke="hsl(var(--renal))"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
          />
          
          {/* Current operating point */}
          <ReferenceLine
            yAxisId="rbf"
            x={currentMAP}
            stroke="hsl(var(--status-warning))"
            strokeDasharray="3 3"
            label={{ value: 'Current', position: 'top', fontSize: 10, fill: 'hsl(var(--status-warning))' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AutoregulationChart;
