import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { format } from "date-fns";

export function SalesRevenueChart({ monthlyRevenue = [], monthlyExpenses = [] }: { monthlyRevenue?: any[], monthlyExpenses?: any[] }) {
  // Combine data by month
  const dataMap = new Map();
  
  monthlyRevenue.forEach(r => {
    const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
    dataMap.set(key, { ...r, key, expenses: 0, profit: r.totalAmount });
  });

  monthlyExpenses.forEach(e => {
    const key = `${e.year}-${String(e.month).padStart(2, "0")}`;
    if (!dataMap.has(key)) {
      dataMap.set(key, { year: e.year, month: e.month, key, totalAmount: 0, expenses: 0, profit: 0 });
    }
    const item = dataMap.get(key);
    item.expenses = e.totalAmount;
    item.profit = item.totalAmount - item.expenses;
  });

  const data = Array.from(dataMap.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map(d => ({
      ...d,
      monthName: format(new Date(d.year, d.month - 1), "MMM"),
    }));

  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">No revenue data available.</div>;
  }

  const formatCurrency = (val: number) => `₹${(val / 1000).toFixed(1)}k`;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <XAxis dataKey="monthName" axisLine={false} tickLine={false} fontSize={12} tickMargin={8} />
          <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={formatCurrency} width={50} />
          <Tooltip
            formatter={(value: any, name: any) => [
              `₹${Number(value).toLocaleString()}`, 
              name === "totalAmount" ? "Revenue" : name === "expenses" ? "Expenses" : "Profit"
            ]}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.year ? `${label} ${payload[0].payload.year}` : label}
          />
          <Bar dataKey="totalAmount" name="Revenue" fill="#1C4E35" radius={[4, 4, 0, 0]} maxBarSize={40} />
          {monthlyExpenses.length > 0 && (
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
