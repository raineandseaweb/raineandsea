import { OrderFilters } from "@/components/admin/order-filters";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { OrderDetailsModal } from "@/components/order-details-modal";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/auth-context";
import {
  detectShippingProvider,
  getProviderDisplayName,
  validateTrackingNumber,
} from "@/lib/shipping-utils";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  created_at: string;
  updated_at: string;
  tracking_number?: string;
  shipping_provider?: string;
  shipped_at?: string;
  subtotal: string | number;
  tax: string | number;
  shipping: string | number;
  total: string | number;
  customer: {
    id: string;
    email: string;
    name?: string;
  };
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
  };
  items: Array<{
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
  }>;
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

interface OrderFiltersState {
  status: string;
  search: string;
  orderType: string;
}

interface StatusCount {
  status: string;
  count: number;
}

export default function AdminOrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    orderId: string;
    newStatus: string;
  } | null>(null);
  const [filters, setFilters] = useState<OrderFiltersState>({
    status: "",
    search: "",
    orderType: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (
      !loading &&
      (!user || (user.role !== "admin" && user.role !== "root"))
    ) {
      router.push("/");
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, filters, pagination.page, pagination.limit, sortBy, sortOrder]);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const queryParams = new URLSearchParams();

      if (filters.status) queryParams.append("status", filters.status);
      if (filters.search) queryParams.append("search", filters.search);
      if (filters.orderType) queryParams.append("orderType", filters.orderType);
      queryParams.append("limit", pagination.limit.toString());
      queryParams.append(
        "offset",
        ((pagination.page - 1) * pagination.limit).toString()
      );
      queryParams.append("sortBy", sortBy);
      queryParams.append("sortOrder", sortOrder);

      const response = await fetch(`/api/admin/orders?${queryParams}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.data.orders);
        setStatusCounts(data.data.filters.statusCounts);
        setPagination({
          page: pagination.page,
          limit: pagination.limit,
          total: data.data.pagination.total,
          totalPages: Math.ceil(data.data.pagination.total / pagination.limit),
        });
      } else {
        addToast({ title: "Failed to fetch orders", type: "error" });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      addToast({ title: "Failed to fetch orders", type: "error" });
    } finally {
      setLoadingOrders(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // If updating to shipped, prompt for tracking number
    if (newStatus === "shipped") {
      setPendingStatusUpdate({ orderId, newStatus });
      setTrackingNumber("");
      setTrackingError("");
      setDetectedProvider(null);
      setShowTrackingModal(true);
      return;
    }

    // For other statuses, update directly
    await performStatusUpdate(orderId, newStatus);
  };

  const performStatusUpdate = async (
    orderId: string,
    newStatus: string,
    trackingNumber?: string
  ) => {
    try {
      const body: any = { status: newStatus };
      if (trackingNumber) {
        body.trackingNumber = trackingNumber;
      }

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (response.ok) {
        addToast({
          title: "Order status updated successfully",
          type: "success",
        });
        fetchOrders(); // Refresh orders
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      } else {
        const errorData = await response.json();
        addToast({
          title: errorData.error || "Failed to update order status",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      addToast({ title: "Failed to update order status", type: "error" });
    }
  };

  const handleTrackingSubmit = async () => {
    if (!pendingStatusUpdate) return;

    // Validate tracking number
    const validation = validateTrackingNumber(trackingNumber);
    if (!validation.isValid) {
      setTrackingError(validation.error || "Invalid tracking number");
      return;
    }

    setTrackingError("");

    // Perform the status update with tracking number
    await performStatusUpdate(
      pendingStatusUpdate.orderId,
      pendingStatusUpdate.newStatus,
      trackingNumber
    );

    // Close modal and reset state
    setShowTrackingModal(false);
    setTrackingNumber("");
    setPendingStatusUpdate(null);
  };

  const handleTrackingCancel = () => {
    setShowTrackingModal(false);
    setTrackingNumber("");
    setTrackingError("");
    setDetectedProvider(null);
    setPendingStatusUpdate(null);
  };

  const handleFilterChange = (newFilters: OrderFiltersState) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 });
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      status: "",
      orderType: "",
    });
    setSortBy("created_at");
    setSortOrder("desc");
    setPagination({ ...pagination, page: 1 });
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to descending
      setSortBy(column);
      setSortOrder("desc");
    }
    setPagination({ ...pagination, page: 1 });
  };

  const SortableHeader = ({
    column,
    children,
    align = "left",
  }: {
    column: string;
    children: React.ReactNode;
    align?: "left" | "right";
  }) => {
    const isSorted = sortBy === column;
    const alignClass =
      align === "right" ? "text-right justify-end" : "text-left";

    return (
      <th
        className={`px-6 py-3 ${alignClass} text-xs font-medium text-muted-foreground uppercase tracking-wider`}
      >
        <button
          onClick={() => handleSort(column)}
          className={`flex items-center space-x-1 hover:text-foreground transition-colors ${
            align === "right" ? "ml-auto" : ""
          }`}
        >
          <span>{children}</span>
          {isSorted && (
            <span className="text-primary">
              {sortOrder === "asc" ? "↑" : "↓"}
            </span>
          )}
        </button>
      </th>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted">
        <Header />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "root")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Orders Management
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage and track customer orders
            </p>
          </div>

          {/* Filters */}
          <OrderFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          {/* Orders Table */}
          <div className="bg-card rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Orders ({pagination.total})
              </h2>
            </div>

            {loadingOrders ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No orders found</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-2 text-primary hover:text-primary/80 font-medium"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <SortableHeader column="order_number">
                        Order
                      </SortableHeader>
                      <SortableHeader column="customer_name">
                        Customer
                      </SortableHeader>
                      <SortableHeader column="status">Status</SortableHeader>
                      <SortableHeader column="total" align="right">
                        Total
                      </SortableHeader>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tracking
                      </th>
                      <SortableHeader column="created_at" align="right">
                        Date
                      </SortableHeader>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-muted">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {order.orderNumber}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.items.length} item
                              {order.items.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {order.customer.name || "N/A"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.customer.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusIndicator status={order.status} type="order" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-foreground">
                          {formatPrice(order.totals.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {order.tracking_number ? (
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">
                                {order.shipping_provider?.toUpperCase() ||
                                  "UNKNOWN"}
                              </div>
                              <div className="font-mono text-xs">
                                {order.tracking_number.slice(0, 12)}...
                              </div>
                              {order.shipped_at && (
                                <div className="text-xs text-primary">
                                  {new Date(
                                    order.shipped_at
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              No tracking
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-muted-foreground">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderModal(true);
                            }}
                            className="text-primary hover:text-primary/80 mr-4"
                          >
                            View
                          </button>
                          <select
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(order.id, e.target.value)
                            }
                            className="text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="received">Received</option>
                            <option value="paid">Paid</option>
                            <option value="shipped">Shipped</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} orders
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-muted-foreground">
                    Per page:
                  </label>
                  <select
                    value={pagination.limit}
                    onChange={(e) =>
                      setPagination({
                        ...pagination,
                        limit: parseInt(e.target.value),
                        page: 1,
                      })
                    }
                    className="px-2 py-1 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
              {pagination.totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setPagination({
                        ...pagination,
                        page: pagination.page - 1,
                      })
                    }
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from(
                      { length: Math.min(pagination.totalPages, 5) },
                      (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (
                          pagination.page >=
                          pagination.totalPages - 2
                        ) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() =>
                              setPagination({
                                ...pagination,
                                page: pageNum,
                              })
                            }
                            className={`px-3 py-1 border rounded-lg ${
                              pagination.page === pageNum
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setPagination({
                        ...pagination,
                        page: pagination.page + 1,
                      })
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        order={selectedOrder}
        showCustomer={true}
      />

      {/* Tracking Number Modal */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Add Tracking Number
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please enter the tracking number for this order:
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Tracking Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  setTrackingNumber(value);
                  setTrackingError("");

                  // Detect provider as user types
                  if (value.trim().length > 5) {
                    const provider = detectShippingProvider(value);
                    setDetectedProvider(provider);
                  } else {
                    setDetectedProvider(null);
                  }
                }}
                placeholder="Enter tracking number..."
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {trackingError && (
                <p className="text-destructive text-sm mt-1">{trackingError}</p>
              )}

              {/* Detected Provider Display */}
              {detectedProvider && detectedProvider !== "other" && (
                <div className="mt-3 p-3 bg-accent border border-border rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-accent-foreground">
                        Detected Shipping Provider
                      </p>
                      <p className="text-sm text-primary">
                        {getProviderDisplayName(detectedProvider as any)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {detectedProvider === "other" &&
                trackingNumber.trim().length > 5 && (
                  <div className="mt-3 p-3 bg-accent border border-border rounded-md">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-accent-foreground">
                          Unknown Shipping Provider
                        </p>
                        <p className="text-sm text-primary">
                          Could not identify carrier from tracking number format
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleTrackingCancel}
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleTrackingSubmit}
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
