"use client";

import { useMemo } from "react";
import { formatINR } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface SeasonComparisonChartProps {
  cropName: string;
  data: {
    label: string;
    expenses: number;
    revenue: number;
    profit: number;
    yieldKg: number;
    rateAchieved: number;
  }[];
}

export function SeasonComparisonChart({ cropName, data }: SeasonComparisonChartProps) {
  
  const chartData = useMemo(() => {
    // Reverse data to show oldest to newest on X axis
    return [...data].reverse().map(d => ({
      name: d.label,
      Expenses: d.expenses,
      Revenue: d.revenue,
      Profit: d.profit,
      // Pass these along for custom tooltip or table rendering
      yieldKg: d.yieldKg,
      rateAchieved: d.rateAchieved
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border shadow-lg rounded-xl p-3 space-y-2 min-w-[200px]">
          <p className="font-bold border-b pb-1 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground font-medium">{entry.name}</span>
              </div>
              <span className="font-bold font-mono">
                {formatINR(entry.value)}
              </span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t text-[10px] text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Yield:</span>
              <span className="font-medium text-foreground">{payload[0].payload.yieldKg.toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Rate:</span>
              <span className="font-medium text-foreground">₹{payload[0].payload.rateAchieved.toFixed(1)}/kg</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-600" />
          {cropName} — Season by Season
        </CardTitle>
        <CardDescription>Historical financial performance comparing seasons</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="space-y-4">
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: '500' }} />
                  
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  
                  <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Embedded DataTable for deeper inspection */}
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Season</th>
                    <th className="px-4 py-3 font-semibold text-right">Yield</th>
                    <th className="px-4 py-3 font-semibold text-right">Avg Rate</th>
                    <th className="px-4 py-3 font-semibold text-right text-rose-600">Expenses</th>
                    <th className="px-4 py-3 font-semibold text-right text-emerald-600">Revenue</th>
                    <th className="px-4 py-3 font-semibold text-right text-blue-600">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{row.label}</td>
                      <td className="px-4 py-3 text-right">{row.yieldKg.toLocaleString()} kg</td>
                      <td className="px-4 py-3 text-right">₹{row.rateAchieved.toFixed(1)}/kg</td>
                      <td className="px-4 py-3 text-right text-rose-600 font-mono">{formatINR(row.expenses)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-mono">{formatINR(row.revenue)}</td>
                      <td className={`px-4 py-3 text-right font-bold font-mono ${row.profit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                        {formatINR(row.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="h-80 w-full flex items-center justify-center border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground text-sm font-medium">
            Not enough data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
