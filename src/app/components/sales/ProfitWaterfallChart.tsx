import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, Cell } from "recharts";
import { format } from "date-fns";

export function ProfitWaterfallChart({ timelineEvents = [] }: { timelineEvents?: any[] }) {
  if (!timelineEvents || timelineEvents.length === 0) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">No financial events recorded yet.</div>;
  }

  const data = timelineEvents.map(event => ({
    ...event,
    shortDate: format(new Date(event.date), "MMM d"),
    displayAmount: event.type === "expense" ? -event.amount : event.amount,
  }));

  const formatCurrency = (val: number) => `₹${Math.abs(val / 1000).toFixed(1)}k`;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
          <XAxis dataKey="shortDate" axisLine={false} tickLine={false} fontSize={12} tickMargin={8} />
          <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={formatCurrency} width={50} />
          <Tooltip 
            formatter={(value: any, name: any) => [`₹${Math.abs(Number(value)).toLocaleString()}`, name === "displayAmount" ? "Amount" : "Running Balance"]}
            labelFormatter={(label, payload) => {
              if (!payload || !payload.length) return label;
              const event = payload[0].payload;
              return `${format(new Date(event.date), "MMM d, yyyy")} - ${event.type === 'expense' ? event.category : event.buyerName}`;
            }}
          />
          <Bar dataKey="displayAmount" name="Amount" maxBarSize={30}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.type === 'expense' ? '#ef4444' : '#10b981'} />
            ))}
          </Bar>
          <Line type="stepAfter" dataKey="runningBalance" name="Running Balance" stroke="#6366f1" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
