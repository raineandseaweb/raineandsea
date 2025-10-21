"use client";

import { useEffect, useRef, useState } from "react";

// Search controls component - completely isolated to prevent re-renders
export const SearchControls = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [isChangingSort, setIsChangingSort] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortSelectRef = useRef<HTMLSelectElement>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const savedQuery = localStorage.getItem("searchQuery") || "";
    const savedSort = localStorage.getItem("sortBy") || "relevance";
    const savedInStockOnly = localStorage.getItem("inStockOnly") === "true";

    if (searchInputRef.current) {
      searchInputRef.current.value = savedQuery;
    }
    if (sortSelectRef.current) {
      sortSelectRef.current.value = savedSort;
    }
    setInStockOnly(savedInStockOnly);
  }, []);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIsSearching(true);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Save to localStorage
      localStorage.setItem("searchQuery", value);

      // Update URL parameters to trigger search
      const url = new URL(window.location.href);
      if (value) {
        url.searchParams.set("q", value);
      } else {
        url.searchParams.delete("q");
      }

      const sortValue = sortSelectRef.current?.value || "relevance";
      url.searchParams.set("sort", sortValue);
      url.searchParams.set("page", "1");

      if (inStockOnly) {
        url.searchParams.set("in_stock_only", "true");
      } else {
        url.searchParams.delete("in_stock_only");
      }

      // Update URL without triggering a full page reload
      window.history.pushState({}, "", url.toString());

      // Trigger a custom event that the parent can listen to
      window.dispatchEvent(
        new CustomEvent("searchUpdate", {
          detail: { searchQuery: value, sortBy: sortValue, inStockOnly },
        })
      );

      setIsSearching(false);
    }, 300);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setIsChangingSort(true);

    // Save to localStorage
    localStorage.setItem("sortBy", value);

    // Update URL parameters to trigger search
    const url = new URL(window.location.href);
    const searchValue = searchInputRef.current?.value || "";
    if (searchValue) {
      url.searchParams.set("q", searchValue);
    } else {
      url.searchParams.delete("q");
    }
    url.searchParams.set("sort", value);
    url.searchParams.set("page", "1");

    if (inStockOnly) {
      url.searchParams.set("in_stock_only", "true");
    } else {
      url.searchParams.delete("in_stock_only");
    }

    // Update URL without triggering a full page reload
    window.history.pushState({}, "", url.toString());

    // Trigger a custom event that the parent can listen to
    window.dispatchEvent(
      new CustomEvent("searchUpdate", {
        detail: { searchQuery: searchValue, sortBy: value, inStockOnly },
      })
    );

    setIsChangingSort(false);
  };

  const handleStockFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setInStockOnly(checked);

    // Save to localStorage
    localStorage.setItem("inStockOnly", checked.toString());

    // Update URL parameters to trigger search
    const url = new URL(window.location.href);
    const searchValue = searchInputRef.current?.value || "";
    if (searchValue) {
      url.searchParams.set("q", searchValue);
    } else {
      url.searchParams.delete("q");
    }

    const sortValue = sortSelectRef.current?.value || "relevance";
    url.searchParams.set("sort", sortValue);
    url.searchParams.set("page", "1");

    if (checked) {
      url.searchParams.set("in_stock_only", "true");
    } else {
      url.searchParams.delete("in_stock_only");
    }

    // Update URL without triggering a full page reload
    window.history.pushState({}, "", url.toString());

    // Trigger a custom event that the parent can listen to
    window.dispatchEvent(
      new CustomEvent("searchUpdate", {
        detail: {
          searchQuery: searchValue,
          sortBy: sortValue,
          inStockOnly: checked,
        },
      })
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search products..."
            onChange={handleSearchInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <div className="relative">
            <select
              ref={sortSelectRef}
              onChange={handleSortChange}
              disabled={isChangingSort}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
            {isChangingSort && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="inStockOnly"
            checked={inStockOnly}
            onChange={handleStockFilterChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="inStockOnly"
            className="text-sm font-medium text-gray-700"
          >
            In stock only
          </label>
        </div>
        <div className="text-sm text-gray-600">Search products</div>
      </div>
    </div>
  );
};
