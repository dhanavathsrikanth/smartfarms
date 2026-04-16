"use client";

import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface YearDataPoint {
  month: string;
  currRevenue: number;
  prevRevenue: number;
  currExpenses: number;
  prevExpenses: number;
  currProfit: number;
  prevProfit: number;
}

interface YearComparisonChartProps {
  data: YearDataPoint[];
  currentYear: number;
  previousYear: number;
}

type Metric = "Revenue" | "Expenses" | "Profit";

export function YearComparisonChart({ data, currentYear, previousYear }: YearComparisonChartProps) {
  const [activeMetric, setActiveMetric] = useState<Metric>("Revenue");

  const getMetricKeys = () => {
    switch (activeMetric) {
      case "Revenue": return { curr: "currRevenue", prev: "prevRevenue", color: "#52A870", prevColor: "rgba(82, 168, 112, 0.4)" };
      case "Expenses": return { curr: "currExpenses", prev: "prevExpenses", color: "#E24B4A", prevColor: "rgba(226, 75, 74, 0.4)" };
      case "Profit": return { curr: "currProfit", prev: "prevProfit", color: "#1C4E35", prevColor: "rgba(28, 78, 53, 0.4)" };
    }
  };

  const keys = getMetricKeys();

  return (
    <div className="w-full h-96 bg-white rounded-xl shadow-sm border border-[#e5dfd4] p-5 font-sans flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Year-Over-Year Trends</h3>
        <div className="flex bg-[#F7F0E3] p-1 rounded-lg">
          {(["Revenue", "Expenses", "Profit"] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setActiveMetric(m)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeMetric === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} dy={10} />
            <YAxis 
               tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
               axisLine={false} 
               tickLine={false}
               tick={{ fill: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}
            />
            <Tooltip 
              formatter={(value: any) => [formatCurrency(Number(value)), undefined]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5dfd4', fontFamily: 'inherit' }}
              cursor={{ fill: '#f9fafb' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            <Bar dataKey={keys.prev} name={`${activeMetric} (${previousYear})`} fill={keys.prevColor} radius={[4, 4, 0, 0]} />
            <Bar dataKey={keys.curr} name={`${activeMetric} (${currentYear})`} fill={keys.color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
