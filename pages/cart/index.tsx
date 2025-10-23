import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/contexts/cart-context";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function CartPage() {
  const {
    cart,
    loading,
    error,
    updateQuantity,
    removeItem,
    getTotalItems,
    getTotalPrice,
    fetchCartProductData,
  } = useCart();
  const { addToast } = useToast();
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [outOfStockItems, setOutOfStockItems] = useState<
    Array<{
      product_title: string;
      requested: number;
      available: number;
    }>
  >([]);

  // Handle out of stock items from URL parameters
  useEffect(() => {
    if (router.query.outOfStock) {
      try {
        const outOfStockData = JSON.parse(
          decodeURIComponent(router.query.outOfStock as string)
        );
        setOutOfStockItems(outOfStockData);

        // Show notification about out of stock items
        addToast({
          title: "Items No Longer Available",
          description: `${outOfStockData.length} item(s) are no longer in stock. Please review your cart.`,
          type: "error",
          duration: 8000,
        });

        // Clean up URL parameters
        router.replace("/cart", undefined, { shallow: true });
      } catch (error) {
        console.error("Error parsing out of stock data:", error);
      }
    }
  }, [router.query.outOfStock]);

  // Fetch product data when cart page loads
  useEffect(() => {
    if (cart && cart.items.length > 0) {
      // Only fetch if we don't have product data for any items
      const needsProductData = cart.items.some((item) => !item.product);
      if (needsProductData) {
        fetchCartProductData();
      }
    }
  }, [cart?.items.length]); // Only run when cart items change

  const formatPrice = (price: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  // Check if an item is out of stock
  const isItemOutOfStock = (item: any) => {
    return outOfStockItems.some(
      (outOfStock) => outOfStock.product_title === item.product?.title
    );
  };

  // Get out of stock info for an item
  const getOutOfStockInfo = (item: any) => {
    return outOfStockItems.find(
      (outOfStock) => outOfStock.product_title === item.product?.title
    );
  };

  const handleRemoveItem = (itemId: string, itemTitle: string) => {
    setIsRemoving(itemId);
    removeItem(itemId);
    addToast({
      title: "Removed from cart",
      description: itemTitle,
      type: "info",
      duration: 2000,
    });
    setTimeout(() => setIsRemoving(null), 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading cart...</p>
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Shopping Cart
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              {getTotalItems()} {getTotalItems() === 1 ? "item" : "items"} in
              your cart
            </p>
          </div>

          {!cart || cart.items.length === 0 ? (
            <div className="text-center py-12 sm:py-24">
              <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-muted rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <svg
                  className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                  />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2 sm:mb-3">
                Your cart is empty
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto px-4">
                Looks like you haven&apos;t added any items to your cart yet.
                Start shopping to add some beautiful crystals to your
                collection.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center px-4 sm:px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium rounded-xl hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                Start Shopping
              </Link>
            </div>
          ) : (
            <>
              {/* Out of Stock Warning Banner */}
              {outOfStockItems.length > 0 && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-accent border border-border rounded-lg">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-destructive mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-accent-foreground mb-1 sm:mb-2 text-sm sm:text-base">
                        Some items are no longer available
                      </h3>
                      <p className="text-destructive text-xs sm:text-sm mb-2 sm:mb-3">
                        Please review the items below and remove any that are
                        out of stock before proceeding to checkout.
                      </p>
                      <div className="space-y-1">
                        {outOfStockItems.map((item, index) => (
                          <p
                            key={index}
                            className="text-xs sm:text-sm text-destructive"
                          >
                            • {item.product_title}: Requested {item.requested},
                            Available {item.available}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2">
                  <div className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border/50 overflow-hidden">
                    <div className="px-4 sm:px-6 py-3 sm:py-4 bg-muted/50 border-b border-border/50">
                      <h2 className="text-base sm:text-lg font-semibold text-foreground">
                        Cart Items
                      </h2>
                    </div>

                    <div className="divide-y divide-border/50">
                      {cart.items.map((item) => {
                        const isOutOfStock = isItemOutOfStock(item);
                        const outOfStockInfo = getOutOfStockInfo(item);

                        return (
                          <div
                            key={item.id}
                            className={`p-3 sm:p-6 transition-all duration-300 ${
                              isRemoving === item.id
                                ? "opacity-50 scale-95"
                                : isOutOfStock
                                ? "bg-accent border-l-4 border-destructive"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              {/* Product Image */}
                              <div className="flex-shrink-0">
                                {item.product ? (
                                  <Link href={`/products/${item.product.slug}`}>
                                    {item.product.image ? (
                                      <Image
                                        src={item.product.image}
                                        alt={item.product.title}
                                        width={100}
                                        height={100}
                                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
                                        loading="lazy"
                                        placeholder="blur"
                                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                                      />
                                    ) : (
                                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-muted to-muted/80 rounded-lg sm:rounded-xl flex items-center justify-center">
                                        <svg
                                          className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
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
                                  </Link>
                                ) : (
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-muted to-muted/80 rounded-lg sm:rounded-xl flex items-center justify-center">
                                    <svg
                                      className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
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
                              </div>

                              {/* Product Details */}
                              <div className="flex-1 min-w-0">
                                {item.product ? (
                                  <Link
                                    href={`/products/${item.product.slug}`}
                                    className="block group"
                                  >
                                    <h3 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2">
                                      {item.product.title}
                                    </h3>
                                  </Link>
                                ) : (
                                  <h3 className="text-sm sm:text-base font-semibold text-foreground line-clamp-2">
                                    Loading product...
                                  </h3>
                                )}

                                <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                  <span className="font-medium">
                                    {(() => {
                                      // Use descriptive title if available, otherwise generate from options
                                      if ((item as any).descriptive_title) {
                                        return (item as any)
                                          .descriptive_title as string;
                                      }

                                      // Generate descriptive title from selected options
                                      if (
                                        (item.selected_options ?? null) &&
                                        item.product?.options
                                      ) {
                                        const optionNames: string[] = [];
                                        item.product?.options?.forEach(
                                          (option: any) => {
                                            const selectedValueName = (
                                              item.selected_options as Record<
                                                string,
                                                string
                                              >
                                            )[option.name];
                                            if (selectedValueName) {
                                              optionNames.push(
                                                selectedValueName
                                              );
                                            }
                                          }
                                        );
                                        const baseTitle =
                                          item.product?.title || "Product";
                                        const optionSuffix =
                                          optionNames.length > 0
                                            ? ` - ${optionNames.join(", ")}`
                                            : "";
                                        return `${baseTitle}${optionSuffix}`;
                                      }
                                      return item.product?.title || "Product";
                                    })()}
                                  </span>
                                </div>

                                {/* Out of Stock Warning */}
                                {isOutOfStock && outOfStockInfo && (
                                  <div className="mt-2 p-2 sm:p-3 bg-accent border border-border rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <svg
                                        className="w-4 h-4 sm:w-5 sm:h-5 text-destructive mt-0.5 flex-shrink-0"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                        />
                                      </svg>
                                      <div className="text-xs sm:text-sm">
                                        <p className="font-medium text-accent-foreground">
                                          No longer available
                                        </p>
                                        <p className="text-destructive">
                                          You requested{" "}
                                          {outOfStockInfo.requested} but only{" "}
                                          {outOfStockInfo.available} are
                                          available.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  {/* Quantity Controls */}
                                  <div
                                    className={`flex items-center rounded-lg w-fit ${
                                      isOutOfStock ? "bg-muted" : "bg-muted"
                                    }`}
                                  >
                                    <button
                                      onClick={() =>
                                        updateQuantity(
                                          item.id,
                                          item.quantity - 1
                                        )
                                      }
                                      className={`p-1.5 sm:p-2 rounded-l-lg transition-colors duration-150 touch-manipulation ${
                                        isOutOfStock
                                          ? "text-muted-foreground cursor-not-allowed"
                                          : "text-primary hover:text-primary-foreground hover:bg-primary active:bg-primary/90"
                                      }`}
                                      disabled={
                                        item.quantity <= 1 || isOutOfStock
                                      }
                                    >
                                      <svg
                                        className="w-3 h-3 sm:w-4 sm:h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M20 12H4"
                                        />
                                      </svg>
                                    </button>
                                    <span
                                      className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium min-w-[2rem] sm:min-w-[3rem] text-center ${
                                        isOutOfStock
                                          ? "text-muted-foreground"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        updateQuantity(
                                          item.id,
                                          item.quantity + 1
                                        )
                                      }
                                      className={`p-1.5 sm:p-2 rounded-r-lg transition-colors duration-150 touch-manipulation ${
                                        isOutOfStock
                                          ? "text-muted-foreground cursor-not-allowed"
                                          : "text-primary hover:text-primary-foreground hover:bg-primary active:bg-primary/90"
                                      }`}
                                      disabled={isOutOfStock}
                                    >
                                      <svg
                                        className="w-3 h-3 sm:w-4 sm:h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                      </svg>
                                    </button>
                                  </div>

                                  {/* Price Section */}
                                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                                    <div className="text-left sm:text-right">
                                      {item.product ? (
                                        <>
                                          <p className="text-xs sm:text-sm text-muted-foreground">
                                            {(() => {
                                              const basePrice = parseFloat(
                                                String(
                                                  item.product.base_price ?? "0"
                                                )
                                              );
                                              let finalPrice = basePrice;

                                              // Add option price adjustments
                                              if (
                                                item.selected_options &&
                                                item.product.options
                                              ) {
                                                item.product?.options?.forEach(
                                                  (option: any) => {
                                                    const selectedValueName =
                                                      item.selected_options![
                                                        option.name
                                                      ];
                                                    if (selectedValueName) {
                                                      const selectedValue =
                                                        option.values?.find(
                                                          (v: any) =>
                                                            v.name ===
                                                            selectedValueName
                                                        );
                                                      if (selectedValue) {
                                                        finalPrice +=
                                                          parseFloat(
                                                            selectedValue.price_adjustment ||
                                                              "0"
                                                          );
                                                      }
                                                    }
                                                  }
                                                );
                                              }

                                              return formatPrice(
                                                finalPrice,
                                                item.product.currency || "USD"
                                              );
                                            })()}{" "}
                                            each
                                          </p>
                                          <p className="text-base sm:text-lg font-semibold text-foreground">
                                            {(() => {
                                              const basePrice = parseFloat(
                                                String(
                                                  item.product.base_price ?? "0"
                                                )
                                              );
                                              let finalPrice = basePrice;

                                              // Add option price adjustments
                                              if (
                                                item.selected_options &&
                                                item.product.options
                                              ) {
                                                item.product?.options?.forEach(
                                                  (option: any) => {
                                                    const selectedValueName =
                                                      item.selected_options![
                                                        option.name
                                                      ];
                                                    if (selectedValueName) {
                                                      const selectedValue =
                                                        option.values?.find(
                                                          (v: any) =>
                                                            v.name ===
                                                            selectedValueName
                                                        );
                                                      if (selectedValue) {
                                                        finalPrice +=
                                                          parseFloat(
                                                            selectedValue.price_adjustment ||
                                                              "0"
                                                          );
                                                      }
                                                    }
                                                  }
                                                );
                                              }

                                              return formatPrice(
                                                finalPrice * item.quantity,
                                                item.product.currency || "USD"
                                              );
                                            })()}
                                          </p>
                                        </>
                                      ) : (
                                        <>
                                          <p className="text-xs sm:text-sm text-muted-foreground">
                                            Loading...
                                          </p>
                                          <p className="text-base sm:text-lg font-semibold text-foreground">
                                            Loading...
                                          </p>
                                        </>
                                      )}
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                      onClick={() =>
                                        handleRemoveItem(
                                          item.id,
                                          item.product?.title || "item"
                                        )
                                      }
                                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-accent rounded-lg transition-all duration-200 touch-manipulation active:bg-accent"
                                      disabled={isRemoving === item.id}
                                    >
                                      <svg
                                        className="w-4 h-4 sm:w-5 sm:h-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <div className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border/50 p-4 sm:p-6 sticky top-4 sm:top-24">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-6">
                      Order Summary
                    </h2>

                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm sm:text-base text-muted-foreground">
                          Subtotal ({getTotalItems()} items)
                        </span>
                        <span className="font-semibold text-foreground text-sm sm:text-base">
                          {formatPrice(getTotalPrice())}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm sm:text-base text-muted-foreground">
                          Shipping
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          Calculated at checkout
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm sm:text-base text-muted-foreground">
                          Tax
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          Calculated at checkout
                        </span>
                      </div>

                      <div className="border-t border-border pt-3 sm:pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-base sm:text-lg font-semibold text-foreground">
                            Total
                          </span>
                          <span className="text-lg sm:text-xl font-bold text-foreground">
                            {formatPrice(getTotalPrice())}
                          </span>
                        </div>
                      </div>
                    </div>

                    {outOfStockItems.length > 0 ? (
                      <div className="w-full mt-4 sm:mt-6 bg-muted text-muted-foreground font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl text-center cursor-not-allowed text-sm sm:text-base">
                        Remove out-of-stock items to checkout
                      </div>
                    ) : (
                      <Link
                        href="/checkout"
                        className="w-full mt-4 sm:mt-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-lg hover:shadow-xl text-center block text-sm sm:text-base touch-manipulation active:from-primary/80 active:to-primary/60"
                      >
                        Proceed to Checkout
                      </Link>
                    )}

                    <div className="mt-3 sm:mt-4 text-center">
                      <Link
                        href="/products"
                        className="text-xs sm:text-sm text-primary hover:text-accent-foreground font-medium transition-colors duration-200"
                      >
                        Continue Shopping
                      </Link>
                    </div>
                    {/* Trust Signals */}
                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
                      <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                          <span className="text-xs">Secure Checkout</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                          <span className="text-xs">Free Shipping</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
