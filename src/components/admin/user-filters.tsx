interface UserFiltersProps {
  filters: {
    search: string;
    role: string;
    emailVerified: string;
  };
  onFilterChange: (filters: any) => void;
  onReset: () => void;
}

export function UserFilters({
  filters,
  onFilterChange,
  onReset,
}: UserFiltersProps) {
  const updateFilter = (key: string, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search || filters.role !== "all" || filters.emailVerified !== "all";

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

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Search
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="Search by ID, name, or email..."
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => updateFilter("role", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="root">Root</option>
            </select>
          </div>

          {/* Email Verified Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email Status
            </label>
            <select
              value={filters.emailVerified}
              onChange={(e) => updateFilter("emailVerified", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
