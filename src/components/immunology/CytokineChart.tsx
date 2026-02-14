import React from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea
} from 'recharts';

interface CytokineChartProps {
  data: { time: number; tnf: number; il1: number; il6: number; il10: number; ifn: number }[];
  currentTime: number;
}

const CytokineChart: React.FC<CytokineChartProps> = ({ data, currentTime }) => {
  return (
    <div className="w-full h-80 bg-card rounded-lg p-4 border border-border">
      <h3 className="text-sm font-medium text-foreground mb-2">Cytokine Cascade Timeline</h3>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          
          {/* Phase indicators */}
          <ReferenceArea
            x1={0}
            x2={24}
            fill="hsl(var(--status-critical))"
            fillOpacity={0.05}
            label={{ value: 'Innate', position: 'insideTopLeft', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          />
          <ReferenceArea
            x1={24}
            x2={72}
            fill="hsl(var(--primary))"
            fillOpacity={0.05}
            label={{ value: 'Transition → Adaptive', position: 'insideTopLeft', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          />
          
          <XAxis
            dataKey="time"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            label={{ value: 'Hours Post-Infection', position: 'bottom', offset: 0, fontSize: 11 }}
          />
          
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            label={{ value: 'Concentration (pg/mL)', angle: -90, position: 'insideLeft', fontSize: 11 }}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelFormatter={(value) => `Time: ${value}h`}
          />
          
          <Legend verticalAlign="top" height={36} />
          
          <Line
            type="monotone"
            dataKey="tnf"
            name="TNF-α"
            stroke="hsl(var(--status-critical))"
            strokeWidth={2}
            dot={false}
          />
          
          <Line
            type="monotone"
            dataKey="il1"
            name="IL-1"
            stroke="hsl(var(--status-warning))"
            strokeWidth={2}
            dot={false}
          />
          
          <Line
            type="monotone"
            dataKey="il6"
            name="IL-6"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
          
          <Line
            type="monotone"
            dataKey="il10"
            name="IL-10 (anti-inflam)"
            stroke="hsl(var(--status-normal))"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
          />
          
          <Line
            type="monotone"
            dataKey="ifn"
            name="IFN-γ"
            stroke="hsl(var(--immunology))"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CytokineChart;
