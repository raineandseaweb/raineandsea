import { InfiniteProductGrid } from "@/components/infinite-product-grid";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SearchControls } from "@/components/search-controls";
import Link from "next/link";
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

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
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
  category?: Category;
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
  const [category, setCategory] = useState<Category | null>(null);

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
    const categorySlug = urlParams.get("category");

    setSearchQuery(q);
    setSortBy(sort);
    setInStockOnly(inStock);
    setCurrentPage(page);

    // Reset category when URL changes
    if (!categorySlug) {
      setCategory(null);
    }
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
      setTotalCount(0); // Reset total count for new search
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

      // Add category parameter if present in URL
      const urlParams = new URLSearchParams(window.location.search);
      const categorySlug = urlParams.get("category");
      if (categorySlug) {
        params.append("category", categorySlug);
      }

      const response = await fetch(`/api/products?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch products");
      }

      const data: ProductsResponse = await response.json();

      if (isInitial) {
        setProducts(data.data);
        if (data.category) {
          setCategory(data.category);
        }
        // Only update totalCount on initial load to prevent it from changing during infinite scroll
        setTotalCount(data.pagination.totalCount);
      } else {
        setProducts((prev) => [...prev, ...data.data]);
      }

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
    <div className="min-h-screen bg-muted">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
          {/* Breadcrumb for category view */}
          {category && (
            <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              <Link
                href="/"
                className="hover:text-foreground transition-colors duration-200"
              >
                Home
              </Link>
              <span>/</span>
              <Link
                href="/categories"
                className="hover:text-foreground transition-colors duration-200"
              >
                Categories
              </Link>
              <span>/</span>
              <span className="text-foreground truncate">{category.name}</span>
            </nav>
          )}

          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 sm:mb-4">
              {category ? category.name : "Product Catalog"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {category?.description ||
                "Discover our collection of premium crystal jewelry"}
            </p>
          </div>

          {/* Search and Filters */}
          <SearchControls key="search-controls" />

          {/* Results count - separate from search controls to prevent re-renders */}
          <div className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 px-1">
            {totalCount} products found
          </div>

          {/* Inline loading indicator for subsequent fetches */}
          {!initialLoad && loading && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 px-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
              Updating results...
            </div>
          )}

          {error && (
            <div className="bg-accent border border-border rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
              <p className="text-sm sm:text-base text-destructive">{error}</p>
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
