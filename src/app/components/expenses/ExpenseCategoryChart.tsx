"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getCategoryColor } from "./ExpenseCategoryBadge";
import { formatINR } from "@/lib/utils";

interface SummaryData {
  totalAmount: number;
  byCategory: Record<string, { total: number; count: number }>;
  expenseCount: number;
}

interface ExpenseCategoryChartProps {
  summaryData: SummaryData;
}

export function ExpenseCategoryChart({ summaryData }: ExpenseCategoryChartProps) {
  const { totalAmount, byCategory } = summaryData;

  const data = Object.entries(byCategory)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([category, stats]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: stats.total,
      count: stats.count,
      category,
      fill: getCategoryColor(category),
      pct: totalAmount > 0 ? ((stats.total / totalAmount) * 100).toFixed(1) : "0",
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No data yet
      </div>
    );
  }

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: (typeof data)[0] }>;
  }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lg text-sm">
        <p className="font-semibold text-foreground">{d.name}</p>
        <p className="text-muted-foreground">
          {formatINR(d.value)} &middot; {d.pct}%
        </p>
      </div>
    );
  };

  const CustomLegend = () => (
    <div className="flex flex-col gap-1.5 mt-4 px-2">
      {data.map((d) => (
        <div key={d.category} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: d.fill }}
            />
            <span className="text-foreground font-medium">{d.name}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="font-mono font-semibold">{formatINR(d.value)}</span>
            <span className="w-10 text-right">{d.pct}%</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.category} fill={d.fill} />
            ))}
          </Pie>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground"
          >
            <tspan x="50%" dy="-8" fontSize={13} fontWeight={700}>
              {formatINR(totalAmount)}
            </tspan>
            <tspan x="50%" dy="20" fontSize={10} fill="gray">
              Total
            </tspan>
          </text>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
}
