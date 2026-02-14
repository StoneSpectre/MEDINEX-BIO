import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";

interface FrankStarlingChartProps {
  data: { preload: number; strokeVolume: number }[];
  currentPreload: number;
  currentSV: number;
}

export function FrankStarlingChart({
  data,
  currentPreload,
  currentSV,
}: FrankStarlingChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
          <defs>
            <linearGradient id="svGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="hsl(var(--chart-1))"
                stopOpacity={0.2}
              />
              <stop
                offset="95%"
                stopColor="hsl(var(--chart-1))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.5}
          />
          <XAxis
            dataKey="preload"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Preload (mmHg)",
              position: "bottom",
              offset: 0,
              style: {
                fill: "hsl(var(--muted-foreground))",
                fontSize: 12,
              },
            }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[0, 140]}
            label={{
              value: "Stroke Volume (mL)",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: {
                fill: "hsl(var(--muted-foreground))",
                fontSize: 12,
                textAnchor: "middle",
              },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelFormatter={(value) => `Preload: ${value} mmHg`}
            formatter={(value: number) => [`${Math.round(value)} mL`, "SV"]}
          />
          <Area
            type="monotone"
            dataKey="strokeVolume"
            stroke="none"
            fill="url(#svGradient)"
          />
          <Line
            type="monotone"
            dataKey="strokeVolume"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: "hsl(var(--chart-1))",
            }}
          />
          {/* Current operating point */}
          <ReferenceDot
            x={currentPreload}
            y={currentSV}
            r={8}
            fill="hsl(var(--cardio))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
          />
          {/* Reference lines for current position */}
          <ReferenceLine
            x={currentPreload}
            stroke="hsl(var(--cardio))"
            strokeDasharray="4 4"
            opacity={0.5}
          />
          <ReferenceLine
            y={currentSV}
            stroke="hsl(var(--cardio))"
            strokeDasharray="4 4"
            opacity={0.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
