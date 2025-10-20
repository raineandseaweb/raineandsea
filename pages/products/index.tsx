import { InfiniteProductGrid } from "@/components/infinite-product-grid";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SearchControls } from "@/components/search-controls";
import { useCallback, useEffect, useState } from "react";

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  image?: string;
  status: string;
  created_at: string;
  updated_at: string;
  variants: Array<{
    sku: string;
    price: number | string;
    compare_at_price?: number | string | null;
    currency: string;
    quantity_available: number;
  }>;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface ProductsResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Products page component
function ProductsPageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // Initialize from URL parameters and localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get("q") || localStorage.getItem("searchQuery") || "";
    const sort =
      urlParams.get("sort") || localStorage.getItem("sortBy") || "relevance";
    const inStock =
      urlParams.get("in_stock_only") === "true" ||
      localStorage.getItem("inStockOnly") === "true";
    const page = parseInt(urlParams.get("page") || "1");

    setSearchQuery(q);
    setSortBy(sort);
    setInStockOnly(inStock);
    setCurrentPage(page);
  }, []);

  // Listen for search updates from SearchControls
  useEffect(() => {
    const handleSearchUpdate = (event: CustomEvent) => {
      const {
        searchQuery: newQuery,
        sortBy: newSort,
        inStockOnly: newInStockOnly,
      } = event.detail;
      setSearchQuery(newQuery);
      setSortBy(newSort);
      setInStockOnly(newInStockOnly);
      setCurrentPage(1);
      setProducts([]); // Reset products for new search
      setHasMore(true);
    };

    window.addEventListener(
      "searchUpdate",
      handleSearchUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "searchUpdate",
        handleSearchUpdate as EventListener
      );
    };
  }, []);

  // Initial load
  useEffect(() => {
    // On query/sort change, reset to page 1 and fetch
    setCurrentPage(1);
    fetchProducts(true, 1);
  }, [searchQuery, sortBy, inStockOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProducts = async (isInitial = false, pageParam?: number) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: (pageParam ?? currentPage).toString(),
        limit: "12",
        sort: sortBy,
      });

      if (searchQuery) {
        params.append("q", searchQuery);
      }

      if (inStockOnly) {
        params.append("in_stock_only", "true");
      }

      const response = await fetch(`/api/products?${params}`);
      const data: ProductsResponse = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      if (isInitial) {
        setProducts(data.data);
      } else {
        setProducts((prev) => [...prev, ...data.data]);
      }

      setTotalCount(data.pagination.totalCount);
      setHasMore(data.pagination.hasNext);
    } catch (err) {
      setError("Failed to load products");
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      if (initialLoad) setInitialLoad(false);
    }
  };

  // Load more products for infinite scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchProducts(false, nextPage);
    }
  }, [loadingMore, hasMore, currentPage]);

  const formatPrice = (price: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Product Catalog
            </h1>
            <p className="text-gray-600">
              Discover our collection of premium products
            </p>
          </div>

          {/* Search and Filters */}
          <SearchControls key="search-controls" />

          {/* Results count - separate from search controls to prevent re-renders */}
          <div className="text-sm text-gray-600 mb-6">
            {totalCount} products found
          </div>

          {/* Inline loading indicator for subsequent fetches */}
          {!initialLoad && loading && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
              Updating results...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Products Grid */}
          <InfiniteProductGrid
            products={products}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            showDescription={true}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Main export component
export default function ProductsPage() {
  return <ProductsPageContent />;
}
