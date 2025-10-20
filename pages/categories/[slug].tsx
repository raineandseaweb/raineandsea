import { InfiniteProductGrid } from "@/components/infinite-product-grid";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { useRouter } from "next/router";
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
    price: number;
    compare_at_price?: number;
    currency: string;
    quantity_available: number;
  }>;
  tags: Array<{
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
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

interface CategoryProductsResponse {
  data: {
    category: Category;
    products: Product[];
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function CategoryDetailPage() {
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isChangingSort, setIsChangingSort] = useState(false);
  const router = useRouter();
  const { slug } = router.query;

  // Handle sort change
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortBy(e.target.value);
      setIsChangingSort(true);
      setCurrentPage(1); // Reset to first page when sorting
      setProducts([]); // Reset products for new sort
      setHasMore(true);
    },
    []
  );

  useEffect(() => {
    if (slug) {
      fetchCategoryProducts(true);
    }
  }, [slug, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCategoryProducts = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
        sort: sortBy,
      });

      const response = await fetch(
        `/api/categories/${slug}/products?${params}`
      );
      const data: CategoryProductsResponse = await response.json();

      if (!response.ok) {
        throw new Error("Category not found");
      }

      if (isInitial) {
        setCategory(data.data.category);
        setProducts(data.data.products);
      } else {
        setProducts((prev) => [...prev, ...data.data.products]);
      }

      setTotalCount(data.pagination.totalCount);
      setHasMore(data.pagination.hasNext);
    } catch (err) {
      setError("Failed to load category");
      console.error("Error fetching category:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsChangingSort(false);
    }
  };

  // Load more products for infinite scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setCurrentPage((prev) => prev + 1);
      fetchCategoryProducts(false);
    }
  }, [loadingMore, hasMore]);

  const formatPrice = (price: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  const formatPriceRange = (variants: Product["variants"]) => {
    if (variants.length === 0) return "Price not available";

    const prices = variants.map((v) => v.price);
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const currency = variants[0]?.currency || "USD";

    if (lowest === highest) {
      return formatPrice(lowest, currency);
    }

    return `${formatPrice(lowest, currency)} - ${formatPrice(
      highest,
      currency
    )}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading category...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-red-400 mb-6">
              <svg
                className="w-20 h-20 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Category not found
            </h3>
            <p className="text-gray-600 mb-6">
              The category you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
            <Link
              href="/categories"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Browse Categories
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
            <Link
              href="/"
              className="hover:text-gray-900 transition-colors duration-200"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/categories"
              className="hover:text-gray-900 transition-colors duration-200"
            >
              Categories
            </Link>
            <span>/</span>
            <span className="text-gray-900">{category.name}</span>
          </nav>

          {/* Category Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-gray-600 text-lg leading-relaxed">
                {category.description}
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-900">
                  Sort by:
                </label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={handleSortChange}
                    disabled={isChangingSort}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                  </select>
                  {isChangingSort && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {totalCount} products found
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <InfiniteProductGrid
            products={products}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            showDescription={false}
          />

          {/* Related Categories */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Explore Other Categories
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* This would typically show other categories */}
              <Link
                href="/categories"
                className="text-center p-6 bg-white rounded-2xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200/50"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  All Categories
                </span>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
