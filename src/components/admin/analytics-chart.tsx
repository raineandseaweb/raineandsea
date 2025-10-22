import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DataPoint {
  date: string;
  value: number;
}

interface AnalyticsChartProps {
  title: string;
  data: DataPoint[];
  color: string;
  currentTotal: number;
  previousTotal: number;
  formatValue?: (value: number) => string;
}

export function AnalyticsChart({
  title,
  data,
  color,
  currentTotal,
  previousTotal,
  formatValue = (val) => val.toString(),
}: AnalyticsChartProps) {
  const change =
    previousTotal === 0
      ? currentTotal > 0
        ? 100
        : 0
      : ((currentTotal - previousTotal) / previousTotal) * 100;

  const isPositive = change >= 0;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Convert data to format expected by recharts
  const chartData = data.map((point) => ({
    date: formatDate(point.date),
    value: point.value,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
      <div className="mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          {title}
        </h3>
        <div className="mt-2 flex items-baseline gap-2 sm:gap-4">
          <span className="text-2xl sm:text-3xl font-bold text-gray-900">
            {formatValue(currentTotal)}
          </span>
          <span
            className={`text-xs sm:text-sm font-medium ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          vs previous period
        </p>
      </div>

      <div className="h-48 sm:h-56 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient
                id={`gradient-${color}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatValue(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                padding: "0.5rem",
              }}
              formatter={(value: number) => formatValue(value)}
              labelStyle={{ color: "#374151", fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${color})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
