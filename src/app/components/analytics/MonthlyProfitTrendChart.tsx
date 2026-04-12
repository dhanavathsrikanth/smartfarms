"use client";

import { useMemo } from "react";
import { formatINR } from "@/lib/utils";
import {
  ComposedChart,
  Line,
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
import { TrendingUp } from "lucide-react";

interface MonthlyProfitTrendChartProps {
  data: { month: number; year: number; expenses: number; revenue: number; profit: number }[];
  title?: string;
  description?: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthlyProfitTrendChart({ 
  data, 
  title = "Monthly Profit Trend", 
  description = "Cash flow comparison across the year" 
}: MonthlyProfitTrendChartProps) {
  
  const chartData = useMemo(() => {
    return data.map(d => ({
      name: `${MONTH_NAMES[d.month - 1]}`,
      Expenses: d.expenses,
      Revenue: d.revenue,
      Profit: d.profit
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border shadow-lg rounded-xl p-3 space-y-2">
          <p className="font-bold text-sm mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground font-medium">{entry.name}</span>
              </div>
              <span className="font-bold font-mono">
                {formatINR(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-80 w-full pt-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
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
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: '500' }} />
              
              <ReferenceLine y={0} yAxisId="left" stroke="hsl(var(--border))" strokeDasharray="3 3" />
              
              <Bar yAxisId="left" dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar yAxisId="left" dataKey="Revenue" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
              
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="Profit" 
                stroke="#1C4E35" 
                strokeWidth={3} 
                dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} 
                activeDot={{ r: 6, fill: "#1C4E35" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground text-sm font-medium">
            No financial data available for this period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
