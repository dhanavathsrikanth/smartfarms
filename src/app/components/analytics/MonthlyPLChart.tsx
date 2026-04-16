"use client";

import React from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface MonthlyPLData {
  label: string;      // e.g., "Jan"
  expenses: number;
  revenue: number;
  profit: number;
}

interface MonthlyPLChartProps {
  data: MonthlyPLData[];
}

export function MonthlyPLChart({ data }: MonthlyPLChartProps) {
  return (
    <div className="w-full h-96 bg-white rounded-xl shadow-sm border border-[#e5dfd4] p-4 font-sans">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Profit & Loss</h3>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
          
          <XAxis 
             dataKey="label" 
             axisLine={false} 
             tickLine={false} 
             tick={{ fill: '#6b7280', fontSize: 13 }} 
             dy={10} 
          />
          
          <YAxis 
            yAxisId="left" 
            orientation="left" 
            tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
            axisLine={false} 
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}
          />
          
          <YAxis 
             yAxisId="right" 
             orientation="right" 
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
          
          <ReferenceLine y={0} yAxisId="right" stroke="#e5e7eb" strokeWidth={2} />
          
          <Bar yAxisId="left" dataKey="expenses" name="Expenses" fill="#E24B4A" barSize={20} radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#52A870" barSize={20} radius={[4, 4, 0, 0]} />
          <Line 
             yAxisId="right" 
             type="monotone" 
             dataKey="profit" 
             name="Profit" 
             stroke="#1C4E35" 
             strokeWidth={3} 
             dot={{ r: 4, fill: '#1C4E35', strokeWidth: 2, stroke: '#fff' }}
             activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
