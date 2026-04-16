import React from "react";
import { formatCurrency } from "@/lib/formatters";

interface ExpenseVsRevenueBarProps {
  expenses: number;
  revenue: number;
}

export function ExpenseVsRevenueBar({ expenses, revenue }: ExpenseVsRevenueBarProps) {
  const profit = revenue - expenses;
  const isLoss = profit < 0;

  return (
    <div className="w-full flex flex-col gap-2 font-sans bg-[#F7F0E3] p-4 rounded-lg shadow-sm border border-[#e5dfd4]">
      
      <div className="flex w-full h-8 bg-white/50 rounded overflow-hidden relative border border-gray-200 shadow-inner">
        {isLoss ? (
          <>
             {/* If loss, total width is mapped relative to expenses. Revenue is just a piece of it. */}
            <div className="h-full bg-[#D4840A]" style={{ width: `${(revenue / expenses) * 100}%` }} title="Revenue Recovered" />
            <div className="h-full bg-[#E24B4A]" style={{ width: `${(Math.abs(profit) / expenses) * 100}%` }} title="Loss" />
          </>
        ) : (
          <>
             {/* If profit, total width is mapped relative to revenue. Expenses is just a piece of it. */}
            <div className="h-full bg-[#E24B4A]" style={{ width: `${(expenses / revenue) * 100}%` }} title="Expenses" />
            <div className="h-full bg-[#52A870]" style={{ width: `${(profit / revenue) * 100}%` }} title="Profit" />
          </>
        )}
      </div>

      <div className="flex justify-between items-center text-sm pt-1">
        <span className="font-mono text-[#E24B4A] font-medium">{formatCurrency(expenses)} Expenses</span>
        <span className="font-sans text-gray-400">|</span>
        <span className={`font-mono font-bold ${isLoss ? "text-[#E24B4A]" : "text-[#1C4E35]"}`}>
          {formatCurrency(Math.abs(profit))} {isLoss ? "Loss" : "Profit"}
        </span>
        <span className="font-sans text-gray-400">|</span>
        <span className="font-mono text-[#52A870] font-medium">{formatCurrency(revenue)} Total</span>
      </div>
    </div>
  );
}
