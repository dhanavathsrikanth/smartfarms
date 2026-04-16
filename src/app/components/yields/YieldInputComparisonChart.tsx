"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface Props {
  data: any[]; // crops with yield and expense data (from getYieldEfficiencyMatrix)
}

export function YieldInputComparisonChart({ data }: Props) {
  const chartData = useMemo(() => {
    if (!data) return [];
    
    let maxArea = 0;
    const mapped = data.map((d: any) => {
      const area = d.area || 1; // Assuming we add area to efficiency payload, fallback to 1
      maxArea = Math.max(maxArea, area);
      return {
        ...d,
        x: d.expensesPerAcre,
        y: parseFloat((d.yieldPerAcre / 100).toFixed(2)), // quintal
        z: Math.max(area * 100, 200), // Size for ZAxis
        fill: d.profitPerAcre >= 0 ? '#1C4E35' : '#E24B4A',
        label: `${d.cropName} (${d.season})`,
      };
    });
    
    return mapped.filter((d: any) => d.x > 0 && d.y > 0);
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl">
        <p className="text-gray-500 font-medium">Not enough data</p>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">
          Record both expenses and yields for your crops to view the input vs. output scatter plot.
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur shadow-xl border border-gray-100 p-3 rounded-lg text-sm z-50">
          <p className="font-bold text-gray-800 mb-2">{p.label}</p>
          <div className="space-y-1 text-xs">
            <p className="flex justify-between gap-4">
              <span className="text-gray-500">Expenses/ac:</span>
              <span className="font-mono">{formatCurrency(p.x)}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-500">Yield/ac:</span>
              <span className="font-mono font-bold text-[#1C4E35]">{p.y} q</span>
            </p>
            <p className="flex justify-between gap-4 pt-1 mt-1 border-t border-gray-100">
              <span className="text-gray-500">Profit/ac:</span>
              <span className={`font-mono font-bold ${p.profitPerAcre >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(p.profitPerAcre)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      <div className="h-80 w-full mb-8">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Expenses/Acre" 
              unit=" ₹" 
              tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              label={{ value: "Input Costs (Expenses per Acre)", position: "bottom", offset: 0, fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Yield/Acre" 
              unit=" q" 
              tick={{ fontSize: 11, fill: '#6B7280' }}
              label={{ value: "Output (Quintal per Acre)", angle: -90, position: "left", fontSize: 12, fill: '#6B7280' }}
            />
            <ZAxis type="number" dataKey="z" range={[50, 400]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            
            <Scatter name="Crops" data={chartData} opacity={0.8}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="bg-emerald-50 rounded p-2 text-emerald-800">
          <p className="font-bold">Top Left: Ideal</p>
          <p className="opacity-80">High yield, low cost. Maximized ROI.</p>
        </div>
        <div className="bg-amber-50 rounded p-2 text-amber-800">
          <p className="font-bold">Top Right: Review Costs</p>
          <p className="opacity-80">High yield, but high inputs required.</p>
        </div>
        <div className="bg-blue-50 rounded p-2 text-blue-800">
          <p className="font-bold">Bottom Left: Increase Inputs?</p>
          <p className="opacity-80">Low cost, but low yield. Room to grow.</p>
        </div>
        <div className="bg-rose-50 rounded p-2 text-rose-800">
          <p className="font-bold">Bottom Right: Needs Attention</p>
          <p className="opacity-80">High costs delivering low yields.</p>
        </div>
      </div>
    </div>
  );
}
