import { ProductEditModal } from "@/components/admin/product-edit-modal";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { OptionSelector } from "@/components/option-selector";
import { ProductImageCarousel } from "@/components/product-image-carousel";
import { StockNotificationSignup } from "@/components/stock-notification-signup";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import { cleanProductTitle } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface Variant {
  id: string;
  sku: string;
  title: string;
  price: number;
  compare_at_price?: number;
  currency: string;
  quantity_available: number;
}

interface Crystal {
  id: string;
  name: string;
  price_adjustment: string;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
}

interface ProductOption {
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
}

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  image?: string;
  base_price?: string;
  status: "active" | "inactive" | "draft";
  created_at: string;
  updated_at: string;
  variants: Variant[];
  media?: Array<{
    id: string;
    url: string;
    alt: string;
    sort: number;
  }>;
  categories?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  crystals?: Crystal[];
  options?: ProductOption[];
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface ProductResponse {
  data: Product;
}

export default function ProductDetailPage() {
  const { addToCart: addToCartContext } = useCart();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [availableTags, setAvailableTags] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const router = useRouter();
  const { slug } = router.query;

  useEffect(() => {
    if (slug) {
      fetchProduct();
      fetchTags();
    }
  }, [slug]);

  // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${slug}`);
      const data: ProductResponse = await response.json();

      if (!response.ok) {
        throw new Error("Product not found");
      }

      setProduct(data.data);

      // Initialize selected options with default values
      if (data.data.options && data.data.options.length > 0) {
        const initialOptions: Record<string, string> = {};
        data.data.options.forEach((option) => {
          const defaultValue = option.values.find((v) => v.is_default);
          if (defaultValue) {
            initialOptions[option.id] = defaultValue.id;
          }
        });
        setSelectedOptions(initialOptions);
      }

      // Create a virtual variant from the product data
      const virtualVariant = {
        id: data.data.id,
        sku: data.data.slug,
        title: data.data.title,
        price: data.data.base_price,
        compare_at_price: null,
        currency: "USD",
        quantity_available: 10, // Default stock
      };
      setSelectedVariant(virtualVariant);
    } catch (err) {
      setError("Failed to load product");
      console.error("Error fetching product:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/admin/tags", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const openEditModal = () => {
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
  };

  const formatPrice = (price: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  const addToCart = async () => {
    if (!product) return;

    // Convert selectedOptions to the format expected by cart context (option name -> value name)
    const selectedOptionsForCart: Record<string, string> = {};
    if (product?.options) {
      product.options.forEach((option) => {
        const selectedValueId = selectedOptions[option.id];
        if (selectedValueId) {
          const selectedValue = option.values.find(
            (v) => v.id === selectedValueId
          );
          if (selectedValue) {
            selectedOptionsForCart[option.name] = selectedValue.name;
          }
        }
      });
    }

    addToCartContext(product.id, product, quantity, selectedOptionsForCart);

    // Show success toast
    addToast({
      title: "Added to cart",
      description: `${quantity} x ${product.title}`,
      type: "success",
      duration: 3000,
    });
  };

  const getTotalPrice = () => {
    if (!product) return 0;

    // Use product base price instead of variant price
    const basePrice = parseFloat(product.base_price || "0");

    // Add price adjustments from selected options
    let optionsAdjustment = 0;
    if (product?.options) {
      product.options.forEach((option) => {
        const selectedValueId = selectedOptions[option.id];
        if (selectedValueId) {
          const selectedValue = option.values.find(
            (v) => v.id === selectedValueId
          );
          if (selectedValue) {
            optionsAdjustment += parseFloat(selectedValue.price_adjustment);
          }
        }
      });
    }

    return basePrice + optionsAdjustment;
  };

  const getPriceRange = () => {
    if (!product) return { min: 0, max: 0, hasRange: false };

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

  // Prepare images for carousel
  const getCarouselImages = () => {
    if (!product) return [];

    // If we have media images, use those (they already include the primary image)
    if (product.media && product.media.length > 0) {
      return product.media;
    }

    // Fallback to primary image only if no media images exist
    if (product.image) {
      return [
        {
          id: "primary",
          url: product.image,
          alt: product.title,
          sort: 0,
        },
      ];
    }

    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading product...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
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
              Product not found
            </h3>
            <p className="text-gray-600 mb-6">
              The product you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Browse Products
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
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
              href="/products"
              className="hover:text-gray-900 transition-colors duration-200"
            >
              Products
            </Link>
            <span>/</span>
            <span className="text-gray-900">
              {cleanProductTitle(product.title)}
            </span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <ProductImageCarousel
              images={getCarouselImages()}
              productTitle={cleanProductTitle(product.title)}
              className="max-w-lg mx-auto lg:mx-0"
            />

            {/* Product Details */}
            <div className="space-y-6 lg:sticky lg:top-24 self-start">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {cleanProductTitle(product.title)}
                  </h1>
                  {(user?.role === "admin" || user?.role === "root") && (
                    <button
                      onClick={openEditModal}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                    >
                      <svg
                        className="w-4 h-4 mr-1.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit Product
                    </button>
                  )}
                </div>
                {product.description &&
                  product.description !== product.title && (
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                      {product.description}
                    </p>
                  )}

                {/* Categories */}
                {product.categories && product.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {product.categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/categories/${category.slug}`}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs hover:bg-gray-200 transition-colors"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags
                      .filter((tag) => {
                        // Don't show "Custom Made" or "Made to Order" for solid objects
                        const isSolidObject =
                          product.title.toLowerCase().includes("tower") ||
                          product.title.toLowerCase().includes("tumble") ||
                          product.title.toLowerCase().includes("sphere") ||
                          product.title.toLowerCase().includes("cube") ||
                          product.title.toLowerCase().includes("pyramid") ||
                          product.title.toLowerCase().includes("egg") ||
                          product.title.toLowerCase().includes("point") ||
                          product.title.toLowerCase().includes("cluster") ||
                          product.title.toLowerCase().includes("chunk") ||
                          product.title.toLowerCase().includes("raw") ||
                          product.title.toLowerCase().includes("specimen");

                        if (
                          isSolidObject &&
                          (tag.name === "Custom Made" ||
                            tag.name === "Made to Order")
                        ) {
                          return false;
                        }
                        return true;
                      })
                      .slice(0, 6)
                      .map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200"
                        >
                          {tag.name}
                        </span>
                      ))}
                    {product.tags.filter((tag) => {
                      const isSolidObject =
                        product.title.toLowerCase().includes("tower") ||
                        product.title.toLowerCase().includes("tumble") ||
                        product.title.toLowerCase().includes("sphere") ||
                        product.title.toLowerCase().includes("cube") ||
                        product.title.toLowerCase().includes("pyramid") ||
                        product.title.toLowerCase().includes("egg") ||
                        product.title.toLowerCase().includes("point") ||
                        product.title.toLowerCase().includes("cluster") ||
                        product.title.toLowerCase().includes("chunk") ||
                        product.title.toLowerCase().includes("raw") ||
                        product.title.toLowerCase().includes("specimen");

                      if (
                        isSolidObject &&
                        (tag.name === "Custom Made" ||
                          tag.name === "Made to Order")
                      ) {
                        return false;
                      }
                      return true;
                    }).length > 6 && (
                      <button
                        onClick={() => setShowAllTags(true)}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        +
                        {product.tags.filter((tag) => {
                          const isSolidObject =
                            product.title.toLowerCase().includes("tower") ||
                            product.title.toLowerCase().includes("tumble") ||
                            product.title.toLowerCase().includes("sphere") ||
                            product.title.toLowerCase().includes("cube") ||
                            product.title.toLowerCase().includes("pyramid") ||
                            product.title.toLowerCase().includes("egg") ||
                            product.title.toLowerCase().includes("point") ||
                            product.title.toLowerCase().includes("cluster") ||
                            product.title.toLowerCase().includes("chunk") ||
                            product.title.toLowerCase().includes("raw") ||
                            product.title.toLowerCase().includes("specimen");

                          if (
                            isSolidObject &&
                            (tag.name === "Custom Made" ||
                              tag.name === "Made to Order")
                          ) {
                            return false;
                          }
                          return true;
                        }).length - 6}{" "}
                        more
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Unified purchase section */}
              {product && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/50 space-y-5">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatPrice(
                          getTotalPrice(),
                          product.currency || "USD"
                        )}
                      </span>
                      {product.compare_at_price && (
                        <span className="text-lg text-gray-500 line-through">
                          {formatPrice(
                            parseFloat(product.compare_at_price.toString()),
                            product.currency || "USD"
                          )}
                        </span>
                      )}
                    </div>
                    {product.compare_at_price && (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                        Save{" "}
                        {formatPrice(
                          parseFloat(product.compare_at_price.toString()) -
                            getTotalPrice(),
                          product.currency || "USD"
                        )}
                      </span>
                    )}
                  </div>

                  {/* Options - Unified system for all product options */}
                  {product.options && product.options.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Options
                      </label>
                      <div className="space-y-3">
                        {/* Unified Product Options */}
                        {product.options.map((option) => {
                          const optionValues = option.values.map((value) => ({
                            id: value.id,
                            label: value.name,
                            priceAdjustment: parseFloat(value.price_adjustment),
                          }));

                          const selectedValue = optionValues.find(
                            (value) => value.id === selectedOptions[option.id]
                          );

                          return (
                            <OptionSelector
                              key={option.id}
                              label={option.display_name}
                              options={optionValues}
                              selectedOption={selectedValue || null}
                              onSelect={(value) => {
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [option.id]: value.id,
                                }));
                              }}
                              currency={product.currency || "USD"}
                              useDropdown={optionValues.length > 5}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity and Add to Cart */}
                  <div className="pt-2 border-t border-gray-100 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Quantity
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600 font-semibold"
                        >
                          −
                        </button>
                        <div className="w-16 h-10 border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                          <span className="text-sm font-bold text-gray-900">
                            {quantity}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setQuantity(
                              Math.min(
                                product.quantity_available || 999,
                                quantity + 1
                              )
                            )
                          }
                          className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600 font-semibold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={addToCart}
                      disabled={(product.quantity_available || 0) === 0}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {(product.quantity_available || 0) === 0
                        ? "Out of Stock"
                        : "Add to Cart"}
                    </button>
                    <div className="flex items-center gap-2 text-sm">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          selectedVariant.quantity_available > 10
                            ? "bg-green-500"
                            : selectedVariant.quantity_available > 0
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                      <span className="text-gray-600">
                        {selectedVariant.quantity_available > 10
                          ? "In stock"
                          : selectedVariant.quantity_available > 0
                          ? "Limited stock"
                          : "Out of stock"}
                      </span>
                    </div>
                  </div>

                  {/* Stock Notification Signup */}
                  <StockNotificationSignup
                    productSlug={product.slug}
                    productTitle={product.title}
                    isOutOfStock={(product.quantity_available || 0) === 0}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Removed duplicate meta row to avoid duplicate stock status */}
        </div>
      </main>
      <Footer />

      {/* All Tags Modal */}
      {showAllTags && product.tags && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">All Tags</h3>
              <button
                onClick={() => setShowAllTags(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      <ProductEditModal
        isOpen={showEditModal}
        onClose={closeEditModal}
        product={product}
        onProductUpdated={fetchProduct}
        availableTags={availableTags}
      />
    </div>
  );
}
