import { StatusIndicator } from "@/components/ui/status-indicator";
import {
  formatTrackingNumber,
  generateTrackingUrl,
  getProviderDisplayName,
  ShippingProvider,
} from "@/lib/shipping-utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_amount: string | number;
  selected_options?: any;
  descriptive_title?: string;
  product_title?: string;
  product_slug: string;
  product_image?: string;
  product?: {
    id: string;
    title: string;
    slug: string;
    image?: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  currency?: string;
  subtotal: string | number;
  tax: string | number;
  shipping: string | number;
  total: string | number;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  tracking_number?: string;
  shipping_provider?: string;
  shipped_at?: string;
  shippingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
  customer?: {
    id: string;
    email: string;
    name?: string;
  };
  totals?: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
  };
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  showCustomer?: boolean;
}

export function OrderDetailsModal({
  isOpen,
  onClose,
  order,
  showCustomer = false,
}: OrderDetailsModalProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on the body
      document.body.style.overflow = "hidden";
      // Prevent scrolling on touch devices
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      // Restore scrolling
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const formatPrice = (price: string | number, currency: string = "USD") => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(numPrice);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const subtotal =
    order.totals?.subtotal ?? parseFloat(order.subtotal.toString());
  const tax = order.totals?.tax ?? parseFloat(order.tax.toString());
  const shipping =
    order.totals?.shipping ?? parseFloat(order.shipping.toString());
  const total = order.totals?.total ?? parseFloat(order.total.toString());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-card w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:max-w-4xl overflow-hidden flex flex-col mt-8 sm:mt-0">
        <div className="sticky top-0 bg-card border-b border-border px-4 sm:px-6 py-4 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg sm:text-xl font-semibold text-foreground truncate pr-4">
            Order Details - {order.orderNumber}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground transition-colors p-2 -mr-2"
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6 sm:grid sm:grid-cols-1 lg:grid-cols-2 sm:gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Order Information */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-3 text-sm sm:text-base">
                  Order Information
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      Order Number:
                    </span>
                    <span className="font-medium text-sm sm:text-base">
                      {order.orderNumber}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      Status:
                    </span>
                    <StatusIndicator
                      status={order.status}
                      type="order"
                      className="text-xs px-2 py-1 mt-1 sm:mt-0"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      Placed:
                    </span>
                    <span className="text-sm sm:text-base">
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      Last Updated:
                    </span>
                    <span className="text-sm sm:text-base">
                      {formatDate(order.updated_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-3 text-sm sm:text-base">
                    Shipping Address
                  </h4>
                  <div className="text-sm text-foreground space-y-1">
                    <p className="font-medium text-sm sm:text-base">
                      {order.shippingAddress.name}
                    </p>
                    <p className="text-xs sm:text-sm">
                      {order.shippingAddress.line1}
                    </p>
                    {order.shippingAddress.line2 && (
                      <p className="text-xs sm:text-sm">
                        {order.shippingAddress.line2}
                      </p>
                    )}
                    <p className="text-xs sm:text-sm">
                      {order.shippingAddress.city},{" "}
                      {order.shippingAddress.region}{" "}
                      {order.shippingAddress.postal_code}
                    </p>
                    <p className="text-xs sm:text-sm">
                      {order.shippingAddress.country}
                    </p>
                  </div>
                </div>
              )}

              {/* Tracking Information */}
              {order.tracking_number && (
                <div className="bg-accent border border-border p-4 rounded-lg">
                  <h4 className="font-semibold text-accent-foreground mb-3 text-sm sm:text-base">
                    Tracking Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                      <span className="text-accent-foreground text-xs sm:text-sm">
                        Tracking Number:
                      </span>
                      <span className="font-mono text-accent-foreground text-xs sm:text-sm break-all mt-1 sm:mt-0">
                        {formatTrackingNumber(
                          order.tracking_number,
                          (order.shipping_provider as ShippingProvider) ||
                            "other"
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                      <span className="text-accent-foreground text-xs sm:text-sm">
                        Provider:
                      </span>
                      <span className="font-medium text-accent-foreground text-sm sm:text-base mt-1 sm:mt-0">
                        {getProviderDisplayName(
                          (order.shipping_provider as ShippingProvider) ||
                            "other"
                        )}
                      </span>
                    </div>
                    {order.shipped_at && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <span className="text-accent-foreground text-xs sm:text-sm">
                          Shipped:
                        </span>
                        <span className="text-accent-foreground text-sm sm:text-base mt-1 sm:mt-0">
                          {new Date(order.shipped_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="pt-2">
                      <a
                        href={generateTrackingUrl(
                          order.tracking_number,
                          (order.shipping_provider as ShippingProvider) ||
                            "other"
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary transition-colors"
                      >
                        Track Package
                        <svg
                          className="w-4 h-4 ml-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Information (Admin only) */}
              {showCustomer && order.customer && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-3">
                    Customer Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">
                        {order.customer.email}
                      </span>
                    </div>
                    {order.customer.name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span>{order.customer.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Order Items */}
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-3 text-sm sm:text-base">
                  Order Items ({order.items.length})
                </h4>
                <div className="space-y-3">
                  {order.items.map((item) => {
                    const productTitle =
                      item.product?.title ||
                      item.product_title ||
                      "Unknown Product";
                    const productSlug =
                      item.product?.slug || item.product_slug || "#";
                    const productImage =
                      item.product?.image || item.product_image;
                    const unitAmount =
                      typeof item.unit_amount === "string"
                        ? parseFloat(item.unit_amount)
                        : item.unit_amount;

                    return (
                      <div
                        key={item.id}
                        className="flex items-start space-x-3 p-3 bg-card rounded border border-border"
                      >
                        <Link
                          href={`/products/${productSlug}`}
                          className="flex-shrink-0"
                        >
                          {productImage ? (
                            <div className="relative w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded overflow-hidden">
                              <Image
                                src={productImage}
                                alt={productTitle}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 48px, 64px"
                                loading="lazy"
                                placeholder="blur"
                                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded flex items-center justify-center">
                              <svg
                                className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${productSlug}`}
                            className="text-xs sm:text-sm font-medium text-foreground hover:text-primary block"
                          >
                            {item.descriptive_title || productTitle}
                          </Link>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            Qty: {item.quantity} ×{" "}
                            {formatPrice(unitAmount, order.currency)}
                          </p>
                          {item.selected_options &&
                            Object.keys(item.selected_options).length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {Object.entries(item.selected_options)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(", ")}
                              </p>
                            )}
                          <p className="text-xs sm:text-sm font-medium text-foreground mt-1">
                            {formatPrice(
                              unitAmount * item.quantity,
                              order.currency
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Totals */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-3 text-sm sm:text-base">
                  Order Totals
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      Subtotal:
                    </span>
                    <span className="text-sm sm:text-base">
                      {formatPrice(subtotal, order.currency)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      Tax:
                    </span>
                    <span className="text-sm sm:text-base">
                      {formatPrice(tax, order.currency)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      Shipping:
                    </span>
                    <span className="text-sm sm:text-base">
                      {shipping === 0
                        ? "Free"
                        : formatPrice(shipping, order.currency)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-3 border-t border-border">
                    <span className="font-semibold text-foreground text-sm sm:text-base">
                      Total:
                    </span>
                    <span className="font-semibold text-foreground text-base sm:text-lg">
                      {formatPrice(total, order.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
