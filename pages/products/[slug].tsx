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
    price_adjustment: number;
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
        price: parseFloat(data.data.base_price || "0"),
        compare_at_price: undefined,
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
            optionsAdjustment += parseFloat(
              String(selectedValue.price_adjustment)
            );
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
          const adjustment = parseFloat(String(value.price_adjustment || "0"));
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
      <div className="min-h-screen bg-muted">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading product...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-muted">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-destructive mb-6">
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
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Product not found
            </h3>
            <p className="text-muted-foreground mb-6">
              The product you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-medium hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-sm hover:shadow-md"
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
    <div className="min-h-screen bg-muted">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-20 sm:pb-24">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 lg:mb-8 px-1">
            <Link
              href="/"
              className="hover:text-foreground transition-colors duration-200"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/products"
              className="hover:text-foreground transition-colors duration-200"
            >
              Products
            </Link>
            <span>/</span>
            <span className="text-foreground truncate">
              {cleanProductTitle(product.title)}
            </span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            {/* Product Images */}
            <ProductImageCarousel
              images={getCarouselImages()}
              productTitle={cleanProductTitle(product.title)}
              className="w-full"
            />

            {/* Product Details */}
            <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-24 self-start">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground pr-2">
                    {cleanProductTitle(product.title)}
                  </h1>
                  {(user?.role === "admin" || user?.role === "root") && (
                    <button
                      onClick={openEditModal}
                      className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-foreground/90 bg-secondary hover:bg-secondary/70 rounded-lg transition-colors duration-200 flex-shrink-0"
                    >
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5"
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
                      <span className="hidden sm:inline">Edit Product</span>
                      <span className="sm:hidden">Edit</span>
                    </button>
                  )}
                </div>
                {product.description &&
                  product.description !== product.title && (
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-3">
                      {product.description}
                    </p>
                  )}

                {/* Categories */}
                {product.categories && product.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3">
                    {product.categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/categories/${category.slug}`}
                        className="px-2 py-1 bg-muted text-foreground rounded-md text-xs hover:bg-muted transition-colors"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
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
                      .slice(0, 4)
                      .map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border"
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
                    }).length > 4 && (
                      <button
                        onClick={() => setShowAllTags(true)}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
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
                        }).length - 4}{" "}
                        more
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Unified purchase section */}
              {product && (
                <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-border/50 space-y-4 sm:space-y-5">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2 sm:gap-3">
                      <span className="text-2xl sm:text-3xl font-bold text-foreground">
                        {formatPrice(getTotalPrice(), "USD")}
                      </span>
                    </div>
                  </div>

                  {/* Options - Unified system for all product options */}
                  {product.options && product.options.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Options
                      </label>
                      <div className="space-y-3">
                        {/* Unified Product Options */}
                        {product.options.map((option) => {
                          const optionValues = option.values.map((value) => ({
                            id: value.id,
                            label: value.name,
                            priceAdjustment: value.price_adjustment,
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
                              currency="USD"
                              useDropdown={optionValues.length > 5}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity and Add to Cart */}
                  <div className="pt-2 border-t border-border space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Quantity
                      </label>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-10 h-10 sm:w-12 sm:h-12 border border-border rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground font-semibold text-lg"
                        >
                          −
                        </button>
                        <div className="w-16 h-10 sm:w-20 sm:h-12 border border-border rounded-lg flex items-center justify-center bg-muted">
                          <span className="text-sm sm:text-base font-bold text-foreground">
                            {quantity}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setQuantity(Math.min(999, quantity + 1))
                          }
                          className="w-10 h-10 sm:w-12 sm:h-12 border border-border rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground font-semibold text-lg"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={addToCart}
                      disabled={false}
                      className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-3 sm:py-4 px-4 rounded-lg font-semibold hover:from-primary/90 hover:to-primary/70 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md text-base sm:text-lg"
                    >
                      Add to Cart
                    </button>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">In stock</span>
                    </div>
                  </div>

                  {/* Stock Notification Signup */}
                  <StockNotificationSignup
                    productSlug={product.slug}
                    productTitle={product.title}
                    isOutOfStock={false}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                All Tags
              </h3>
              <button
                onClick={() => setShowAllTags(false)}
                className="text-muted-foreground hover:text-muted-foreground transition-colors duration-200 p-1"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
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
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 sm:px-3 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border"
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
        product={product as any}
        onProductUpdated={fetchProduct}
        availableTags={availableTags}
      />
    </div>
  );
}
