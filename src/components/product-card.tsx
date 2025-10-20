import { PrefetchLink } from "@/components/ui/prefetch-link";
import { cleanProductTitle } from "@/lib/utils";
import Image from "next/image";

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    title: string;
    description?: string;
    image?: string;
    base_price?: string;
    quantity_available?: number;
    variants: Array<{
      price: number | string;
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
  };
  showDescription?: boolean;
}

export function ProductCard({
  product,
  showDescription = false,
}: ProductCardProps) {
  const formatPrice = (price: number | string, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(typeof price === "string" ? parseFloat(price) : price);
  };

  const getPriceRange = () => {
    const basePrice = parseFloat(product.base_price || "0");

    if (!product.options || product.options.length === 0) {
      return { min: basePrice, max: basePrice, hasRange: false };
    }

    // Calculate all possible price combinations
    const prices: number[] = [];

    // Generate all combinations of option values
    const generateCombinations = (
      optionIndex: number,
      currentAdjustment: number
    ) => {
      if (optionIndex >= (product.options?.length || 0)) {
        prices.push(basePrice + currentAdjustment);
        return;
      }

      const option = product.options?.[optionIndex];
      if (option) {
        option.values.forEach((value) => {
          const adjustment = parseFloat(value.price_adjustment || "0");
          generateCombinations(optionIndex + 1, currentAdjustment + adjustment);
        });
      }
    };

    generateCombinations(0, 0);

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const hasRange = min !== max;

    return { min, max, hasRange };
  };

  const priceRange = getPriceRange();
  const currency = "USD";

  const priceDisplay = () => {
    if (priceRange.min === 0 && priceRange.max === 0)
      return "Price not available";
    if (priceRange.hasRange) {
      return `From ${formatPrice(priceRange.min, currency)}`;
    }
    return formatPrice(priceRange.min, currency);
  };

  const isOutOfStock = (product.quantity_available || 0) === 0;

  return (
    <PrefetchLink href={`/products/${product.slug}`}>
      <div className="group bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200 overflow-hidden cursor-pointer">
        {/* Product Image */}
        <div className="relative w-full h-64 bg-gray-50 overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={cleanProductTitle(product.title)}
              fill
              className={`object-cover group-hover:scale-105 transition-transform duration-300 ${
                isOutOfStock ? "opacity-60" : ""
              }`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                Out of Stock
              </div>
            </div>
          )}

          {/* Overlay gradient for legibility */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none group-hover:scale-105 transition-transform duration-300" />

          {/* Price pill */}
          {priceRange.min > 0 && (
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold bg-white/90 text-gray-900 shadow-sm backdrop-blur">
                {priceDisplay()}
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          <h3
            className={`text-sm font-medium mb-1 group-hover:text-blue-600 transition-colors leading-snug ${
              isOutOfStock ? "text-gray-500" : "text-gray-900"
            }`}
          >
            {cleanProductTitle(product.title)}
          </h3>
          {isOutOfStock && (
            <p className="text-xs text-red-600 font-medium">
              Currently unavailable
            </p>
          )}
        </div>
      </div>
    </PrefetchLink>
  );
}
