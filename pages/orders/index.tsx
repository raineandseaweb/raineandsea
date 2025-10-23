import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { OrderDetailsModal } from "@/components/order-details-modal";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

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

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin?returnUrl=/orders");
      return;
    }

    if (user) {
      fetchOrders();
    }
  }, [user, loading, router]);

  const fetchOrders = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoadingOrders(true);
      }

      const response = await fetch("/api/orders", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const result = await response.json();
      setOrders(result.data);

      if (isRefresh) {
        addToast({ title: "Orders refreshed", type: "success" });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      addToast({ title: "Failed to load order history", type: "error" });
    } finally {
      setLoadingOrders(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchOrders(true);
  };

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      // Add haptic feedback for mobile devices
      if ("vibrate" in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  const formatPrice = (price: string, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(parseFloat(price));
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen bg-muted">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your orders...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <Header />

      <div
        className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8"
        ref={containerRef}
      >
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Order History
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                View and track all your past orders
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh orders"
            >
              <svg
                className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full mb-4">
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
              No orders yet
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              You haven't placed any orders yet. Start shopping to see your
              orders here.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary transition-colors text-sm sm:text-base font-medium"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-card rounded-lg shadow-sm border p-4 sm:p-6 active:scale-[0.98] transition-transform"
                onClick={() => handleViewOrder(order)}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {/* Order Header */}
                <div className="flex flex-col space-y-3 mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                        {order.orderNumber}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Placed on{" "}
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <StatusIndicator
                        status={order.status}
                        type="order"
                        className="text-xs px-2 py-1"
                      />
                      <svg
                        className="w-4 h-4 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Order Items Summary */}
                <div className="space-y-2 mb-4">
                  {order.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {item.product_image ? (
                          <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded overflow-hidden">
                            <Image
                              src={item.product_image}
                              alt={item.product_title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 40px, 48px"
                              loading="lazy"
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded flex items-center justify-center">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground"
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
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                          {item.descriptive_title || item.product_title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-xs text-muted-foreground pl-[52px] sm:pl-[60px]">
                      +{order.items.length - 2} more item(s)
                    </p>
                  )}
                </div>

                {/* Order Total */}
                <div className="border-t pt-3 sm:pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base sm:text-lg font-semibold text-foreground">
                      Total: {formatPrice(order.total, order.currency)}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {order.items.length} item(s)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        order={selectedOrder}
        showCustomer={false}
      />
    </div>
  );
}
