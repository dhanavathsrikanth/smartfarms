"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { formatINR } from "@/lib/utils";

interface MonthlyData {
  month: number;
  year: number;
  totalAmount: number;
}

interface ExpenseTrendChartProps {
  monthlyData: MonthlyData[];
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const BRAND_GREEN = "#1C4E35";

/** Build last-12-months scaffold with zero fill */
function buildLast12Months(data: MonthlyData[]) {
  const result: { label: string; totalAmount: number; key: string }[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const match = data.find((x) => x.year === y && x.month === m);
    result.push({
      label: MONTH_ABBR[m - 1],
      totalAmount: match?.totalAmount ?? 0,
      key,
    });
  }
  return result;
}

export function ExpenseTrendChart({ monthlyData }: ExpenseTrendChartProps) {
  const chartData = buildLast12Months(monthlyData);
  const maxVal = Math.max(...chartData.map((d) => d.totalAmount), 1);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    // Find the full key
    const item = chartData.find((d) => d.label === label);
    const dateLabel = item?.key
      ? MONTH_ABBR[parseInt(item.key.split("-")[1], 10) - 1] +
        " " +
        item.key.split("-")[0]
      : label ?? "";
    return (
      <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lg text-sm">
        <p className="font-semibold text-foreground">{dateLabel}</p>
        <p className="text-muted-foreground font-mono">
          {formatINR(payload[0].value)}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
        Monthly Expense Trend
      </p>
      <ResponsiveContainer width="100%" height={200} minWidth={0}>
        <BarChart
          data={chartData}
          barSize={28}
          margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) =>
              v === 0 ? "0" : formatINR(v).replace("₹", "")
            }
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(28,78,53,0.08)" }} />
          <Bar dataKey="totalAmount" radius={[5, 5, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={d.totalAmount === 0 ? "var(--border)" : BRAND_GREEN}
                opacity={d.totalAmount === 0 ? 0.4 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
