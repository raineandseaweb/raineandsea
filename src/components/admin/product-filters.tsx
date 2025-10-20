import { TagCombobox } from "@/components/ui/tag-combobox";
import { useState } from "react";

interface ProductFiltersProps {
  filters: {
    search: string;
    status: string;
    stockStatus: string;
    tags: string[];
    categories: string[];
  };
  onFilterChange: (filters: any) => void;
  availableTags: Array<{ id: string; name: string }>;
  availableCategories: Array<{ id: string; name: string }>;
  onReset: () => void;
}

export function ProductFilters({
  filters,
  onFilterChange,
  availableTags,
  availableCategories,
  onReset,
}: ProductFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: string, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.stockStatus !== "all" ||
    filters.tags.length > 0 ||
    filters.categories.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
      {/* Basic Filters */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Reset All
            </button>
          )}
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="Search by ID, title, slug, or description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Status
            </label>
            <select
              value={filters.stockStatus}
              onChange={(e) => updateFilter("stockStatus", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="in_stock">In Stock (&gt;10)</option>
              <option value="low_stock">Low Stock (1-10)</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          {showAdvanced ? "Hide" : "Show"} Advanced Filters
          <svg
            className={`w-4 h-4 ml-1 transition-transform ${
              showAdvanced ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 pt-4">
          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <TagCombobox
                availableTags={availableTags}
                selectedTags={filters.tags}
                onTagsChange={(tags) => updateFilter("tags", tags)}
                placeholder="Filter by tags..."
              />
            </div>
          )}

          {/* Categories Filter */}
          {availableCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <TagCombobox
                availableTags={availableCategories}
                selectedTags={filters.categories}
                onTagsChange={(cats) => updateFilter("categories", cats)}
                placeholder="Filter by categories..."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
