import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/auth-context";
import {
  formatTrackingNumber,
  generateTrackingUrl,
  getProviderDisplayName,
} from "@/lib/shipping-utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_amount: string;
  selected_options: any;
  descriptive_title: string;
  product_title: string;
  product_slug: string;
  product_image: string;
}

interface Order {
  id: string;
  status: string;
  currency: string;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  orderNumber: string;
  is_guest_order: boolean;
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
}

export default function OrderLookupPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-populate email for logged-in users
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber.trim() || !email.trim()) {
      setError("Please enter both order number and email");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          email: email.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to lookup order");
      }

      setOrder(result.data);
      addToast({ title: "Order found successfully", type: "success" });
    } catch (error) {
      console.error("Order lookup error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to lookup order"
      );
      addToast({ title: "Failed to lookup order", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(parseFloat(price));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return "bg-muted text-foreground";
      case "paid":
        return "bg-accent text-accent-foreground";
      case "shipped":
        return "bg-accent text-accent-foreground";
      case "completed":
        return "bg-accent text-accent-foreground";
      case "cancelled":
        return "bg-accent text-accent-foreground";
      case "refunded":
        return "bg-accent text-accent-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Order Lookup
          </h1>
          <p className="text-muted-foreground">
            Enter your order number and email to view your order details
          </p>
        </div>

        {/* Lookup Form */}
        <div className="bg-card rounded-lg shadow-sm border p-6 mb-8">
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="orderNumber"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Order Number
                </label>
                <input
                  type="text"
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g., ORD-12345678-ABCD"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            {error && <div className="text-destructive text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Looking up..." : "Lookup Order"}
            </button>
          </form>
        </div>

        {/* Order Details */}
        {order && (
          <div className="bg-card rounded-lg shadow-sm border p-6">
            {/* Order Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {order.orderNumber}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Placed on {new Date(order.created_at).toLocaleDateString()}
                </p>
                {order.is_guest_order && (
                  <p className="text-xs text-primary mt-1">Guest Order</p>
                )}
              </div>
              <div className="mt-2 sm:mt-0">
                <StatusIndicator status={order.status} type="order" />
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-3 mb-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Link href={`/products/${item.product_slug}`}>
                      {item.product_image ? (
                        <div className="relative w-16 h-16 bg-muted rounded-lg overflow-hidden">
                          <Image
                            src={item.product_image}
                            alt={item.product_title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-muted-foreground"
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
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.product_slug}`}
                      className="text-sm font-medium text-foreground hover:text-primary"
                    >
                      {item.descriptive_title || item.product_title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity} ×{" "}
                      {formatPrice(item.unit_amount, order.currency)} ={" "}
                      {formatPrice(
                        (
                          parseFloat(item.unit_amount) * item.quantity
                        ).toString(),
                        order.currency
                      )}
                    </p>
                    {item.selected_options &&
                      Object.keys(item.selected_options).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Options:{" "}
                          {Object.entries(item.selected_options)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ")}
                        </p>
                      )}
                  </div>
                </div>
              ))}
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="border-t pt-4 mb-4">
                <div className="bg-muted border border-border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">
                    Shipping Address
                  </h4>
                  <div className="text-sm text-foreground">
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
              </div>
            )}

            {/* Shipping Information */}
            {order.status === "shipped" && order.tracking_number && (
              <div className="border-t pt-4 mb-4">
                <div className="bg-accent border border-border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-accent-foreground mb-2">
                    Tracking Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-accent-foreground">
                        <strong>Tracking Number:</strong>{" "}
                        {formatTrackingNumber(
                          order.tracking_number,
                          (order.shipping_provider as
                            | "usps"
                            | "ups"
                            | "fedex"
                            | "other") || "other"
                        )}
                      </span>
                      <a
                        href={generateTrackingUrl(
                          order.tracking_number,
                          (order.shipping_provider as
                            | "usps"
                            | "ups"
                            | "fedex"
                            | "other") || "other"
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-accent-foreground underline"
                      >
                        Track Package
                      </a>
                    </div>
                    <div className="text-sm text-accent-foreground">
                      <strong>Shipping Provider:</strong>{" "}
                      {getProviderDisplayName(
                        (order.shipping_provider as
                          | "usps"
                          | "ups"
                          | "fedex"
                          | "other") || "other"
                      )}
                    </div>
                    {order.shipped_at && (
                      <div className="text-sm text-accent-foreground">
                        <strong>Shipped:</strong>{" "}
                        {new Date(order.shipped_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Order Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">
                  Total: {formatPrice(order.total, order.currency)}
                </span>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Subtotal: {formatPrice(order.subtotal, order.currency)}</p>
                  <p>Tax: {formatPrice(order.tax, order.currency)}</p>
                  <p>
                    Shipping:{" "}
                    {parseFloat(order.shipping) === 0
                      ? "Free"
                      : formatPrice(order.shipping, order.currency)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Can't find your order?{" "}
            <Link href="/contact" className="text-primary hover:text-primary">
              Contact support
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
