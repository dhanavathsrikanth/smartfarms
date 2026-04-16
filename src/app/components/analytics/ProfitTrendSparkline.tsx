"use client";

import React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface ProfitTrendSparklineProps {
  data: number[];
  width?: number | string;
  height?: number | string;
}

export function ProfitTrendSparkline({ data, width = 100, height = 40 }: ProfitTrendSparklineProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((val, i) => ({ value: val, index: i }));
  
  // Calculate trend direction
  const first = data[0];
  const last = data[data.length - 1];
  const isPositive = last >= first;
  
  const color = isPositive ? "#52A870" : "#E24B4A";

  const min = Math.min(...data);
  const max = Math.max(...data);
  // Add 10% padding to domains so line doesn't hit edges
  const padding = (max - min) * 0.1 || 10;

  return (
    <div style={{ width, height }} className="opacity-80 hover:opacity-100 transition-opacity">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={[min - padding, max + padding]} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          {/* Add a tiny dot at the very end */}
          <Line
             type="monotone"
             dataKey="value"
             stroke="none"
             dot={(props: any) => {
               if (props.index === data.length - 1) {
                 return <circle cx={props.cx} cy={props.cy} r={3} fill={color} />;
               }
               return null;
             }}
             isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
