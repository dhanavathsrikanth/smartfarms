"use client";

import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface RadarDataPoint {
  subject: string;
  current: number;
  previous?: number;
  fullMark: number;
}

interface InputOutputRadarChartProps {
  data: RadarDataPoint[];
}

export function InputOutputRadarChart({ data }: InputOutputRadarChartProps) {
  return (
    <div className="w-full h-80 bg-white rounded-xl shadow-sm border border-[#e5dfd4] p-4 font-sans">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e5dfd4" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          
          {/* Current Season */}
          <Radar 
            name="This Season" 
            dataKey="current" 
            stroke="#1C4E35" 
            fill="#52A870" 
            fillOpacity={0.5} 
          />
          
          {/* Previous Season (Optional) */}
          {data[0]?.previous !== undefined && (
            <Radar 
              name="Last Season" 
              dataKey="previous" 
              stroke="#D4840A" 
              fill="#D4840A" 
              fillOpacity={0.1}
              strokeDasharray="4 4"
            />
          )}
          
          <Tooltip 
             contentStyle={{ borderRadius: '8px', border: '1px solid #e5dfd4', fontFamily: 'inherit' }}
             itemStyle={{ fontFamily: 'monospace' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontFamily: 'inherit', fontSize: '14px' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
