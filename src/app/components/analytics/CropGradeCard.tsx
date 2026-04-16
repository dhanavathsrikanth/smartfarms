import React from "react";
import { formatCurrency } from "@/lib/formatters";

interface CropGradeData {
  grade: "A" | "B" | "C" | "D";
  inputOutputRatio: number;
  expensesPerKgYield: number;
  revenuePerKgYield: number;
  netPerKg: number;
}

interface CropGradeCardProps {
  data: CropGradeData;
}

export function CropGradeCard({ data }: CropGradeCardProps) {
  const getGradeColors = () => {
    switch (data.grade) {
      case "A": return { bg: "bg-green-100", border: "border-green-200", text: "text-[#1C4E35]", desc: "Excellent efficiency. High returns on low spend." };
      case "B": return { bg: "bg-teal-100", border: "border-teal-200", text: "text-[#115e59]", desc: "Good performance. Healthy margin per unit." };
      case "C": return { bg: "bg-amber-100", border: "border-amber-200", text: "text-[#D4840A]", desc: "Average. Margins are tight, watch expenses." };
      case "D": return { bg: "bg-red-100", border: "border-red-200", text: "text-[#E24B4A]", desc: "Poor efficiency. Operating at a loss." };
    }
  };

  const style = getGradeColors();
  const marginPercent = ((data.revenuePerKgYield - data.expensesPerKgYield) / data.revenuePerKgYield) * 100;

  return (
    <div className={`flex flex-col items-center p-6 rounded-2xl border ${style.border} ${style.bg} bg-opacity-40 shadow-sm font-sans w-full max-w-sm mx-auto`}>
      <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-white shadow-md mb-4 border-4 ${style.border}`}>
        <span className={`text-5xl font-bold font-mono ${style.text}`}>{data.grade}</span>
      </div>
      
      <h3 className="text-gray-800 font-semibold text-lg mb-1">
        Input-Output Ratio: <span className="font-mono">{data.inputOutputRatio.toFixed(2)}</span>
      </h3>
      <p className="text-sm text-gray-600 text-center mb-6">{style.desc}</p>
      
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="bg-white/80 p-3 rounded-lg shadow-sm border border-white flex flex-col items-center">
          <span className="text-xs text-gray-500 mb-1">Spent per Kg</span>
          <span className="font-mono font-medium text-[#E24B4A]">{formatCurrency(data.expensesPerKgYield)}</span>
        </div>
        <div className="bg-white/80 p-3 rounded-lg shadow-sm border border-white flex flex-col items-center">
          <span className="text-xs text-gray-500 mb-1">Earned per Kg</span>
          <span className="font-mono font-medium text-[#52A870]">{formatCurrency(data.revenuePerKgYield)}</span>
        </div>
        <div className="bg-white/80 p-3 rounded-lg shadow-sm border border-white flex flex-col items-center">
          <span className="text-xs text-gray-500 mb-1">Net per Kg</span>
          <span className={`font-mono font-bold ${data.netPerKg >= 0 ? "text-[#1C4E35]" : "text-[#E24B4A]"}`}>
            {formatCurrency(data.netPerKg)}
          </span>
        </div>
        <div className="bg-white/80 p-3 rounded-lg shadow-sm border border-white flex flex-col items-center">
          <span className="text-xs text-gray-500 mb-1">Margin</span>
          <span className={`font-mono font-bold ${(marginPercent >= 0 || isNaN(marginPercent)) ? "text-[#52A870]" : "text-[#E24B4A]"}`}>
            {isNaN(marginPercent) ? "0%" : `${marginPercent.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
