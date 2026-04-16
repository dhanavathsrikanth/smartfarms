"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/formatters";

type RankingData = {
  cropId: string;
  cropName: string;
  farmName: string;
  season: string;
  year: number;
  profitPerAcre: number;
  totalProfit: number;
  margin: number;
  expenses: number;
  revenue: number;
  area: number;
  rank: number;
  medal?: "gold" | "silver" | "bronze";
  isLoss: boolean;
};

export function CropRankingTable({ ranking }: { ranking: RankingData[] }) {
  const [sortField, setSortField] = useState<keyof RankingData>("profitPerAcre");
  const [sortDesc, setSortDesc] = useState(true);

  const handleSort = (field: keyof RankingData) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const sortedData = [...ranking].sort((a, b) => {
    const valA = a[sortField] ?? "";
    const valB = b[sortField] ?? "";
    if (valA < valB) return sortDesc ? 1 : -1;
    if (valA > valB) return sortDesc ? -1 : 1;
    return 0;
  });

  const getMedalEmoji = (medal?: string) => {
    if (medal === "gold") return "🥇";
    if (medal === "silver") return "🥈";
    if (medal === "bronze") return "🥉";
    return "";
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#e5dfd4] shadow-sm bg-white font-sans">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-600 uppercase bg-[#F7F0E3] sticky top-0">
          <tr>
            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("rank")}>Rank</th>
            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("cropName")}>Crop</th>
            <th className="px-4 py-3">Farm</th>
            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("area")}>Area</th>
            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("expenses")}>Expenses</th>
            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("revenue")}>Revenue</th>
            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("totalProfit")}>Profit</th>
            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("profitPerAcre")}>Per Acre</th>
            <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("margin")}>Margin</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr 
              key={row.cropId} 
              className={`border-b border-[#e5dfd4] hover:bg-gray-50 
                ${row.isLoss ? 'bg-red-50/50 hover:bg-red-50/80' : ''} 
                ${row.medal ? 'bg-[#fffbf0]' : ''}`
              }
            >
              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                {row.rank} {getMedalEmoji(row.medal)}
              </td>
              <td className="px-4 py-3">
                <div className="font-semibold text-gray-900">{row.cropName}</div>
                <div className="text-xs text-gray-500 capitalize">{row.season} {row.year}</div>
                {row.isLoss && <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-medium bg-red-100 text-[#E24B4A]">Loss</span>}
              </td>
              <td className="px-4 py-3 text-gray-600">{row.farmName}</td>
              <td className="px-4 py-3 text-gray-600">{row.area.toFixed(2)} Ac</td>
              <td className="px-4 py-3 font-mono text-[#E24B4A]">{formatCurrency(row.expenses)}</td>
              <td className="px-4 py-3 font-mono text-[#52A870]">{formatCurrency(row.revenue)}</td>
              <td className={`px-4 py-3 font-mono font-bold ${row.isLoss ? "text-[#E24B4A]" : "text-[#1C4E35]"}`}>
                {formatCurrency(row.totalProfit)}
              </td>
              <td className="px-4 py-3 font-mono font-bold text-gray-800">
                {formatCurrency(row.profitPerAcre)}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-mono font-medium
                  ${row.margin < 0 ? 'bg-red-100 text-red-800' : 
                    row.margin < 20 ? 'bg-amber-100 text-amber-800' : 
                    row.margin < 60 ? 'bg-green-100 text-green-800' : 
                    'bg-[#1C4E35] text-white'}`}
                >
                  {row.margin.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
          {sortedData.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                No crops available to rank.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
