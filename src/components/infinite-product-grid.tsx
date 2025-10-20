import { ProductCard } from "@/components/product-card";
import { useEffect, useRef } from "react";

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  image?: string;
  base_price?: string;
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
  options?: Array<{
    id: string;
    name: string;
    display_name: string;
    sort_order: number;
    values: Array<{
      id: string;
      name: string;
      price_adjustment: string;
      is_default: boolean;
      is_sold_out: boolean;
      sort_order: number;
    }>;
  }>;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface InfiniteProductGridProps {
  products: Product[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  showDescription?: boolean;
}

export function InfiniteProductGrid({
  products,
  loading,
  hasMore,
  onLoadMore,
  showDescription = false,
}: InfiniteProductGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite loading
  useEffect(() => {
    if (!hasMore || loading || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  // Initial loading state
  if (loading && products.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6 animate-pulse"
          >
            <div className="aspect-square bg-gray-200 rounded-xl mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!loading && products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-400 mb-6">
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
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          No products found
        </h3>
        <p className="text-gray-600">
          Try adjusting your search or filter criteria
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            showDescription={showDescription}
          />
        ))}
      </div>

      {/* Loading sentinel for infinite scroll */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6 animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-xl mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      )}
    </div>
  );
}
