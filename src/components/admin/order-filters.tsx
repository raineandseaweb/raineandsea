interface OrderFiltersProps {
  filters: {
    search: string;
    status: string;
    orderType: string;
  };
  onFilterChange: (filters: any) => void;
  onReset: () => void;
}

export function OrderFilters({
  filters,
  onFilterChange,
  onReset,
}: OrderFiltersProps) {
  const updateFilter = (key: string, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search || filters.status !== "" || filters.orderType !== "";

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm mb-6">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Reset All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder="Search by email, order number, or order ID..."
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="in_progress">
                All In Progress (Received, Paid, Shipped)
              </option>
              <option value="completed_group">
                All Completed (Completed, Cancelled, Refunded)
              </option>
              <option value="received">Received</option>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Order Type Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Order Type
            </label>
            <select
              value={filters.orderType}
              onChange={(e) => updateFilter("orderType", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Orders</option>
              <option value="guest">Guest Orders</option>
              <option value="user">User Orders</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
