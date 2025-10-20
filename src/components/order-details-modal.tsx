import { StatusIndicator } from "@/components/ui/status-indicator";
import {
  formatTrackingNumber,
  generateTrackingUrl,
  getProviderDisplayName,
} from "@/lib/shipping-utils";
import Image from "next/image";
import Link from "next/link";

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">
            Order Details - {order.orderNumber}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Order Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Order Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Number:</span>
                    <span className="font-medium">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <StatusIndicator status={order.status} type="order" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Placed:</span>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span>{formatDate(order.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Shipping Address
                  </h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p className="font-medium">{order.shippingAddress.name}</p>
                    <p>{order.shippingAddress.line1}</p>
                    {order.shippingAddress.line2 && (
                      <p>{order.shippingAddress.line2}</p>
                    )}
                    <p>
                      {order.shippingAddress.city},{" "}
                      {order.shippingAddress.region}{" "}
                      {order.shippingAddress.postal_code}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>
              )}

              {/* Tracking Information */}
              {order.tracking_number && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">
                    Tracking Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-800">Tracking Number:</span>
                      <span className="font-mono text-blue-900">
                        {formatTrackingNumber(
                          order.tracking_number,
                          order.shipping_provider || "other"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800">Provider:</span>
                      <span className="font-medium text-blue-900">
                        {getProviderDisplayName(
                          order.shipping_provider || "other"
                        )}
                      </span>
                    </div>
                    {order.shipped_at && (
                      <div className="flex justify-between">
                        <span className="text-blue-800">Shipped:</span>
                        <span className="text-blue-900">
                          {new Date(order.shipped_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="pt-2">
                      <a
                        href={generateTrackingUrl(
                          order.tracking_number,
                          order.shipping_provider || "other"
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        Track Package →
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Information (Admin only) */}
              {showCustomer && order.customer && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Customer Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">
                        {order.customer.email}
                      </span>
                    </div>
                    {order.customer.name && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span>{order.customer.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Order Items */}
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">
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
                        className="flex items-start space-x-3 p-3 bg-white rounded border border-gray-200"
                      >
                        <Link
                          href={`/products/${productSlug}`}
                          className="flex-shrink-0"
                        >
                          {productImage ? (
                            <div className="relative w-16 h-16 bg-gray-50 rounded overflow-hidden">
                              <Image
                                src={productImage}
                                alt={productTitle}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-gray-400"
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
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 block"
                          >
                            {item.descriptive_title || productTitle}
                          </Link>
                          <p className="text-sm text-gray-600 mt-1">
                            Qty: {item.quantity} ×{" "}
                            {formatPrice(unitAmount, order.currency)}
                          </p>
                          {item.selected_options &&
                            Object.keys(item.selected_options).length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {Object.entries(item.selected_options)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(", ")}
                              </p>
                            )}
                          <p className="text-sm font-medium text-gray-900 mt-1">
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
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Order Totals
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>{formatPrice(subtotal, order.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span>{formatPrice(tax, order.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping:</span>
                    <span>
                      {shipping === 0
                        ? "Free"
                        : formatPrice(shipping, order.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="font-semibold text-gray-900">
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
