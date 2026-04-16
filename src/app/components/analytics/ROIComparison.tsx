"use client";

import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine, 
  Cell,
  LabelList
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Landmark, PiggyBank } from "lucide-react";

interface ROIDataPoint {
  cropName: string;
  roi: number;
}

interface ROIComparisonProps {
  data: ROIDataPoint[];
}

export function ROIComparison({ data }: ROIComparisonProps) {
  // Sort by ROI descending
  const sortedData = [...data].sort((a, b) => b.roi - a.roi);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const roi = payload[0].value;
      return (
        <div className="bg-white p-3 border border-[#e5dfd4] rounded-lg shadow-md text-xs">
          <p className="font-bold text-[#1C4E35] mb-1">{label}</p>
          <p className="flex justify-between gap-4">
             <span className="text-gray-500 font-medium">ROI:</span>
             <span className={`font-mono font-bold ${roi >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
               {roi.toFixed(1)}%
             </span>
          </p>
          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
             <p className={`text-[10px] ${roi > 7 ? "text-emerald-500 font-bold" : "text-gray-400"}`}>
                {roi > 7 ? "✓ Above Bank FD (7%)" : "× Below Bank FD (7%)"}
             </p>
             <p className={`text-[10px] ${roi > 3.5 ? "text-emerald-500 font-bold" : "text-gray-400"}`}>
                {roi > 3.5 ? "✓ Above Savings (3.5%)" : "× Below Savings (3.5%)"}
             </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full border-[#e5dfd4] bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
           <div>
             <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#1C4E35]" />
                ROI Performance Index
             </CardTitle>
             <CardDescription className="text-xs">Contextualizing farm profit against alternative investments</CardDescription>
           </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              layout="vertical"
              data={sortedData}
              margin={{ top: 5, right: 80, left: 40, bottom: 5 }}
              barGap={0}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis 
                type="number" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' }}
                domain={[Math.min(0, ...sortedData.map(d => d.roi)) - 5, 'auto']}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis 
                dataKey="cropName" 
                type="category" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#374151', fontSize: 11, fontWeight: 600 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
              
              {/* Reference Lines for benchmarks */}
              <ReferenceLine x={0} stroke="#6b7280" strokeWidth={2} />
              
              <ReferenceLine 
                x={7} 
                stroke="#3b82f6" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ value: "FD (7%)", position: "top", fill: "#3b82f6", fontSize: 10, fontWeight: "bold" }}
              />
              
              <ReferenceLine 
                x={3.5} 
                stroke="#8b5cf6" 
                strokeDasharray="3 3" 
                strokeWidth={1}
                label={{ value: "Save (3.5%)", position: "top", fill: "#8b5cf6", fontSize: 10 }}
              />

              <Bar 
                dataKey="roi" 
                barSize={24} 
                radius={[0, 4, 4, 0]}
              >
                {sortedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.roi >= 7 ? "#1C4E35" : entry.roi >= 0 ? "#52A870" : "#E24B4A"} 
                  />
                ))}
                <LabelList 
                  dataKey="roi" 
                  position="right" 
                  formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                  style={{ fontSize: '11px', fontWeight: 700, fill: '#374151', fontFamily: 'monospace' }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Key */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#e5dfd4] pt-4">
           <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="mt-0.5 p-1 bg-emerald-600 rounded text-white">
                 <TrendingUp className="h-3 w-3" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-emerald-900 uppercase">Growth Engine</p>
                 <p className="text-xs text-emerald-700">Crops beating FD rates {'>'} 7%</p>
              </div>
           </div>
           <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="mt-0.5 p-1 bg-blue-600 rounded text-white">
                 <Landmark className="h-3 w-3" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-blue-900 uppercase">Safe Haven</p>
                 <p className="text-xs text-blue-700">Bank FD benchmark</p>
              </div>
           </div>
           <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="mt-0.5 p-1 bg-purple-600 rounded text-white">
                 <PiggyBank className="h-3 w-3" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-purple-900 uppercase">Liquid Reserve</p>
                 <p className="text-xs text-purple-700">Savings acc benchmark</p>
              </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
