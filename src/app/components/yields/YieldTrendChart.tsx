"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { Activity } from "lucide-react";

interface Props {
  data: any; // Return from getYieldTrendByCropName
  benchmarkYieldKg?: number | null; 
}

export function YieldTrendChart({ data, benchmarkYieldKg }: Props) {
  const chartData = useMemo(() => {
    if (!data?.trend) return [];
    return data.trend.map((t: any) => ({
      name: `${t.season} ${t.year}`,
      yieldQuintal: parseFloat((t.yieldPerAcreKg / 100).toFixed(2)),
      profitPerKg: t.profitPerKg,
      ...t,
    }));
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <Activity className="h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm font-medium text-gray-500">No trend data available</p>
        <p className="text-xs text-gray-400 mt-1">Record yields across multiple seasons to see trends here.</p>
      </div>
    );
  }

  if (chartData.length === 1) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center bg-emerald-50/30 rounded-xl border border-emerald-100">
        <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
          <TrendingUpIcon className="h-5 w-5 text-emerald-600" />
        </div>
        <p className="text-sm font-bold text-gray-700">First harvest recorded!</p>
        <p className="text-xs text-gray-500 mt-1 max-w-[250px]">
          You yielded {chartData[0].yieldQuintal} quintal/acre in {chartData[0].name}. 
          Record more seasons to unlock historical trend analysis.
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur shadow-xl border border-gray-100 p-3 rounded-lg text-sm">
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="flex justify-between gap-4">
              <span className="text-gray-500">Yield:</span>
              <span className="font-mono font-bold text-[#1C4E35]">{p.yieldQuintal} q/ac</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-500">Profit:</span>
              <span className="font-mono text-emerald-600 font-bold">{formatCurrency((p.profitPerKg || 0) * (p.totalYieldKg || 0))}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const benchmarkQuintal = benchmarkYieldKg ? benchmarkYieldKg / 100 : null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: '#6B7280' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: '#6B7280' }} 
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6' }} />
          
          {benchmarkQuintal && (
            <ReferenceLine 
              y={benchmarkQuintal} 
              stroke="#D4840A" 
              strokeDasharray="4 4" 
              label={{ position: 'top', value: 'National Avg', fill: '#D4840A', fontSize: 10 }} 
            />
          )}

          <Line
            type="monotone"
            dataKey="yieldQuintal"
            stroke="#1C4E35"
            strokeWidth={3}
            dot={{ r: 4, fill: '#1C4E35', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#D4840A', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendingUpIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
