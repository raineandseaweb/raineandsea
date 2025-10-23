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
    <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6 mb-6 sm:mb-8">
      {/* Mobile-First Search Bar */}
      <div className="relative mb-4 sm:mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search crystal jewelry..."
            onChange={handleSearchInputChange}
            className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 text-sm sm:text-base border border-border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-muted focus:bg-card transition-all duration-200"
          />
          {isSearching && (
            <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-primary border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-Optimized Controls */}
      <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-6">
        {/* Sort Control */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <label className="text-sm font-semibold text-foreground whitespace-nowrap">
            Sort by:
          </label>
          <div className="relative inline-block sm:flex-none">
            <select
              ref={sortSelectRef}
              onChange={handleSortChange}
              disabled={isChangingSort}
              className="w-auto appearance-none px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-muted focus:bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 pr-8 sm:pr-12"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
            {/* Custom dropdown arrow with controlled right padding */}
            <span className="pointer-events-none absolute inset-y-0 right-2 sm:right-3 flex items-center">
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </span>
            {isChangingSort && (
              <div className="absolute right-7 sm:right-9 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-primary border-t-transparent"></div>
              </div>
            )}
          </div>
        </div>

        {/* Stock Filter */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <label
            htmlFor="inStockOnly"
            className="text-sm font-semibold text-foreground whitespace-nowrap sm:hidden"
          >
            Filters:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="inStockOnly"
              checked={inStockOnly}
              onChange={handleStockFilterChange}
              className="h-4 w-4 sm:h-5 sm:w-5 text-primary focus:ring-primary border-border rounded"
            />
            <label
              htmlFor="inStockOnly"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              In stock only
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
