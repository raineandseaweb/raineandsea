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

interface OrderFilters {
  status: string;
  search: string;
  limit: number;
  offset: number;
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
  const [filters, setFilters] = useState<OrderFilters>({
    status: "",
    search: "",
    limit: 20,
    offset: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    hasMore: false,
  });

  useEffect(() => {
    if (
      !loading &&
      (!user || (user.role !== "admin" && user.role !== "root"))
    ) {
      router.push("/");
      return;
    }

    if (user) {
      fetchOrders();
    }
  }, [user, loading, router, filters]);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const queryParams = new URLSearchParams();

      if (filters.status) queryParams.append("status", filters.status);
      if (filters.search) queryParams.append("search", filters.search);
      queryParams.append("limit", filters.limit.toString());
      queryParams.append("offset", filters.offset.toString());

      const response = await fetch(`/api/admin/orders?${queryParams}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.data.orders);
        setStatusCounts(data.data.filters.statusCounts);
        setPagination({
          total: data.data.pagination.total,
          hasMore: data.data.pagination.hasMore,
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

  const handleFilterChange = (
    key: keyof OrderFilters,
    value: string | number
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset offset when filters change
    }));
  };

  const handlePageChange = (newOffset: number) => {
    setFilters((prev) => ({
      ...prev,
      offset: newOffset,
    }));
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Orders Management
            </h1>
            <p className="mt-2 text-gray-600">
              Manage and track customer orders
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Filter
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {statusCounts.map((status) => (
                    <option key={status.status} value={status.status}>
                      {status.status.charAt(0).toUpperCase() +
                        status.status.slice(1)}{" "}
                      ({status.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by email, order number, or order ID..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Items Per Page
                </label>
                <select
                  value={filters.limit}
                  onChange={(e) =>
                    handleFilterChange("limit", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Orders ({pagination.total})
              </h2>
            </div>

            {loadingOrders ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600">No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tracking
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.orderNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.items.length} item
                              {order.items.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.customer.name || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customer.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusIndicator status={order.status} type="order" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPrice(order.totals.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.tracking_number ? (
                            <div className="space-y-1">
                              <div className="text-xs text-gray-600">
                                {order.shipping_provider?.toUpperCase() ||
                                  "UNKNOWN"}
                              </div>
                              <div className="font-mono text-xs">
                                {order.tracking_number.slice(0, 12)}...
                              </div>
                              {order.shipped_at && (
                                <div className="text-xs text-green-600">
                                  {new Date(
                                    order.shipped_at
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              No tracking
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            View
                          </button>
                          <select
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(order.id, e.target.value)
                            }
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {pagination.total > filters.limit && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {filters.offset + 1} to{" "}
                    {Math.min(filters.offset + filters.limit, pagination.total)}{" "}
                    of {pagination.total} orders
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        handlePageChange(
                          Math.max(0, filters.offset - filters.limit)
                        )
                      }
                      disabled={filters.offset === 0}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        handlePageChange(filters.offset + filters.limit)
                      }
                      disabled={!pagination.hasMore}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Tracking Number
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please enter the tracking number for this order:
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {trackingError && (
                <p className="text-red-600 text-sm mt-1">{trackingError}</p>
              )}

              {/* Detected Provider Display */}
              {detectedProvider && detectedProvider !== "other" && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-blue-600"
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
                      <p className="text-sm font-medium text-blue-800">
                        Detected Shipping Provider
                      </p>
                      <p className="text-sm text-blue-600">
                        {getProviderDisplayName(detectedProvider as any)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {detectedProvider === "other" &&
                trackingNumber.trim().length > 5 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-yellow-600"
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
                        <p className="text-sm font-medium text-yellow-800">
                          Unknown Shipping Provider
                        </p>
                        <p className="text-sm text-yellow-600">
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleTrackingSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
