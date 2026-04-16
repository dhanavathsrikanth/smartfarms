"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: any[]; // Return from getYieldEfficiencyMatrix
}

export function YieldEfficiencyMatrix({ data }: Props) {
  const [sortField, setSortField] = useState<string>("overallScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  if (!data || data.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl">
        <p className="text-gray-500 font-medium">No efficiency data available</p>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">
          Record yield for your crops to view how your yields and costs compare to national benchmarks.
        </p>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to desc for a new field
    }
  };

  const downloadCSV = () => {
    const headers = ["Crop", "Season", "Farm", "Yield/Acre (q)", "Expenses/Acre", "Yield Eff %", "Cost Eff %", "Overall Score"];
    const rows = sortedData.map(row => [
      row.cropName,
      `${row.season} ${row.year}`,
      row.farmName,
      (row.yieldPerAcre / 100).toFixed(2),
      row.expensesPerAcre.toFixed(0),
      row.yieldEfficiencyScore.toFixed(0),
      row.costEfficiencyScore.toFixed(0),
      row.overallScore.toFixed(0)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `efficiency_matrix_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScoreColor = (score: number) => {
    if (score >= 100) return "text-emerald-700 bg-emerald-100";
    if (score >= 80) return "text-amber-700 bg-amber-100";
    return "text-rose-700 bg-rose-100";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={downloadCSV} className="text-xs h-8">
          <Download className="h-3.5 w-3.5 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("cropName")}>
                <div className="flex items-center gap-1">Crop <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-4 py-3">Farm</th>
              <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort("yieldPerAcre")}>
                <div className="flex items-center justify-end gap-1">Actual Yield/ac <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort("yieldEfficiencyScore")}>
                <div className="flex items-center justify-end gap-1">Yield Eff <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-4 py-3 text-right hidden md:table-cell cursor-pointer hover:bg-gray-100" onClick={() => handleSort("expensesPerAcre")}>
                <div className="flex items-center justify-end gap-1">Cost/ac <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-4 py-3 text-right hidden md:table-cell cursor-pointer hover:bg-gray-100" onClick={() => handleSort("costEfficiencyScore")}>
                <div className="flex items-center justify-end gap-1">Cost Eff <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 bg-[#F7F0E3]/30" onClick={() => handleSort("overallScore")}>
                <div className="flex items-center justify-end gap-1 font-bold text-gray-700">Score <ArrowUpDown className="h-3 w-3" /></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 bg-white">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{row.cropName}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{row.season} {row.year}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{row.farmName}</td>
                <td className="px-4 py-3 text-right font-mono font-medium">
                  {row.yieldPerAcre > 0 ? (row.yieldPerAcre / 100).toFixed(2) + " q" : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge variant="outline" className={cn("border-none px-2 py-0.5", getScoreColor(row.yieldEfficiencyScore))}>
                    {row.yieldEfficiencyScore.toFixed(0)}%
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-600 hidden md:table-cell">
                  {formatCurrency(row.expensesPerAcre)}
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <Badge variant="outline" className={cn("border-none px-2 py-0.5", getScoreColor(row.costEfficiencyScore))}>
                    {row.costEfficiencyScore.toFixed(0)}%
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right bg-[#F7F0E3]/10">
                  <Badge className={cn("px-2.5 py-1 text-sm font-bold shadow-none",
                    row.overallScore >= 100 ? "bg-[#1C4E35] text-white hover:bg-[#1C4E35]" : 
                    row.overallScore >= 80 ? "bg-[#D4840A] text-white hover:bg-[#D4840A]" : 
                    "bg-rose-500 text-white hover:bg-rose-500"
                  )}>
                    {row.overallScore.toFixed(0)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
