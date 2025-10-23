import { AnalyticsChart } from "@/components/admin/analytics-chart";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

// Tab transition component with staggered animation
function TabTransition({
  children,
  isActive,
}: {
  children: React.ReactNode;
  isActive: boolean;
}) {
  return (
    <div
      className={`${
        isActive
          ? "opacity-100 translate-y-0 transition-all duration-300 ease-out"
          : "opacity-0 translate-y-4 pointer-events-none absolute w-full"
      }`}
      style={
        isActive
          ? {
              transitionProperty: "opacity, transform",
            }
          : {}
      }
    >
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    recentUsers: [],
    recentOrders: [],
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">(
    "overview"
  );
  const [analyticsPeriod, setAnalyticsPeriod] = useState<
    "7d" | "30d" | "6m" | "1y" | "all"
  >("30d");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsAnimateKey, setAnalyticsAnimateKey] = useState(0);
  const [isPeriodChange, setIsPeriodChange] = useState(false);
  const [analyticsCache, setAnalyticsCache] = useState<Record<string, any>>({});

  useEffect(() => {
    if (
      !loading &&
      (!user || (user.role !== "admin" && user.role !== "root"))
    ) {
      router.push("/");
      return;
    }

    if (user) {
      fetchStats();
      // Prefetch analytics data in the background
      fetchAnalytics(false);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && activeTab === "analytics") {
      // When switching to analytics tab, always animate
      setIsPeriodChange(false);
      setAnalyticsAnimateKey((k) => k + 1);
      // Check if we have cached data for the current period
      if (analyticsCache[analyticsPeriod]) {
        setAnalyticsData(analyticsCache[analyticsPeriod]);
        setAnalyticsLoading(false);
      } else {
        fetchAnalytics(true);
      }
    } else {
      // Reset when switching away from analytics
      setIsPeriodChange(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user && activeTab === "analytics") {
      // When changing period while on analytics tab, don't animate
      setIsPeriodChange(true);
      // Check cache first
      if (analyticsCache[analyticsPeriod]) {
        setAnalyticsData(analyticsCache[analyticsPeriod]);
      } else {
        fetchAnalytics(false);
      }
    }
  }, [analyticsPeriod]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      // Fetch users
      const usersResponse = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setStats((prev) => ({
          ...prev,
          totalUsers: usersData.users.length,
          recentUsers: usersData.users.slice(0, 5),
        }));
      }

      // Fetch products
      const productsResponse = await fetch("/api/admin/products", {
        credentials: "include",
      });
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setStats((prev) => ({
          ...prev,
          totalProducts: productsData.products.length,
        }));
      }

      // Fetch orders
      const ordersResponse = await fetch("/api/admin/orders?limit=100", {
        credentials: "include",
      });
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const orders = ordersData.data.orders;

        // Calculate total revenue from completed orders
        const totalRevenue = orders
          .filter((order: any) => order.status === "completed")
          .reduce((sum: number, order: any) => sum + order.totals.total, 0);

        // Count pending orders (received, paid, shipped)
        const pendingOrders = orders.filter((order: any) =>
          ["received", "paid", "shipped"].includes(order.status)
        ).length;

        setStats((prev) => ({
          ...prev,
          totalOrders: orders.length,
          totalRevenue,
          pendingOrders,
          recentOrders: orders.slice(0, 5),
        }));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchAnalytics = async (animate: boolean = true) => {
    if (animate) {
      setAnalyticsLoading(true);
    }
    try {
      const response = await fetch(
        `/api/admin/analytics?period=${analyticsPeriod}`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = await response.json();
        console.log("Analytics data:", data);
        setAnalyticsData(data);
        // Cache the data
        setAnalyticsCache((prev) => ({
          ...prev,
          [analyticsPeriod]: data,
        }));
      } else {
        const error = await response.json();
        console.error("Failed to fetch analytics:", error);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      if (animate) {
        setAnalyticsLoading(false);
      }
    }
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
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          {/* Header */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Welcome back, {user.name || user.email}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-4 sm:mb-6 md:mb-8 border-b border-border">
            <nav className="-mb-px flex space-x-4 sm:space-x-6 md:space-x-8">
              <button
                onClick={() => setActiveTab("overview")}
                className={`relative whitespace-nowrap py-3 sm:py-4 px-1 font-medium text-xs sm:text-sm transition-all duration-200 ${
                  activeTab === "overview"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative z-10 flex items-center gap-1 sm:gap-2">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 100 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Overview
                </span>
                {activeTab === "overview" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t transition-all duration-200" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`relative whitespace-nowrap py-3 sm:py-4 px-1 font-medium text-xs sm:text-sm transition-all duration-200 ${
                  activeTab === "analytics"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative z-10 flex items-center gap-1 sm:gap-2">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Analytics
                </span>
                {activeTab === "analytics" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t transition-all duration-200" />
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content Container */}
          <div className="relative">
            {/* Overview Tab */}
            <TabTransition isActive={activeTab === "overview"}>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                {statsLoading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 md:p-6"
                      >
                        <div className="animate-pulse">
                          <div className="flex items-center">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-muted rounded-lg"></div>
                            <div className="ml-2 sm:ml-3 md:ml-4 flex-1">
                              <div className="h-3 sm:h-4 bg-muted rounded w-16 sm:w-20 mb-1 sm:mb-2"></div>
                              <div className="h-5 sm:h-6 bg-muted rounded w-10 sm:w-12"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 md:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-accent rounded-lg flex items-center justify-center">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-2 sm:ml-3 md:ml-4">
                          <p className="text-xs sm:text-sm font-medium text-foreground">
                            Total Users
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-foreground">
                            {stats.totalUsers}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 md:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-accent rounded-lg flex items-center justify-center">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-2 sm:ml-3 md:ml-4">
                          <p className="text-xs sm:text-sm font-medium text-foreground">
                            Total Products
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-foreground">
                            {stats.totalProducts}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 md:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-accent rounded-lg flex items-center justify-center">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-2 sm:ml-3 md:ml-4">
                          <p className="text-xs sm:text-sm font-medium text-foreground">
                            Total Orders
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-foreground">
                            {stats.totalOrders}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 md:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-accent rounded-lg flex items-center justify-center">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-2 sm:ml-3 md:ml-4">
                          <p className="text-xs sm:text-sm font-medium text-foreground">
                            Revenue
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-foreground">
                            ${stats.totalRevenue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 md:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-accent rounded-lg flex items-center justify-center">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-2 sm:ml-3 md:ml-4">
                          <p className="text-xs sm:text-sm font-medium text-foreground">
                            Pending Orders
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-foreground">
                            {stats.pendingOrders}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabTransition>

            {/* Analytics Tab */}
            <TabTransition isActive={activeTab === "analytics"}>
              <div className="mb-4 sm:mb-6 md:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    Analytics
                  </h2>
                  <div className="flex gap-1 sm:gap-2 flex-wrap">
                    {(["7d", "30d", "6m", "1y", "all"] as const).map(
                      (period) => (
                        <button
                          key={period}
                          onClick={() => setAnalyticsPeriod(period)}
                          className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            analyticsPeriod === period
                              ? "bg-primary text-primary-foreground"
                              : "bg-card text-foreground hover:bg-muted border border-border"
                          }`}
                        >
                          {period === "7d"
                            ? "7 Days"
                            : period === "30d"
                            ? "30 Days"
                            : period === "6m"
                            ? "6 Months"
                            : period === "1y"
                            ? "1 Year"
                            : "All Time"}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {analyticsLoading ? (
                  <div
                    className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6"
                    style={{
                      animation: "fadeIn 0.2s ease-out",
                    }}
                  >
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 md:p-6"
                      >
                        <div className="animate-pulse">
                          <div className="h-6 bg-muted rounded w-32 mb-4"></div>
                          <div className="h-8 bg-muted rounded w-24 mb-2"></div>
                          <div className="h-64 bg-muted rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : analyticsData?.data ? (
                  <div
                    key={analyticsAnimateKey}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6"
                  >
                    <div
                      style={{
                        animation: !isPeriodChange
                          ? "fadeInUp 0.4s ease-out 0.1s both"
                          : "none",
                      }}
                    >
                      <AnalyticsChart
                        title="Revenue"
                        data={(analyticsData.data.data?.revenue || []).map(
                          (d: any) => ({
                            date: d.date,
                            value: Number(d.revenue),
                          })
                        )}
                        color="#10b981"
                        currentTotal={Number(
                          analyticsData.data.totals?.revenue || 0
                        )}
                        previousTotal={Number(
                          analyticsData.data.previousTotals?.revenue || 0
                        )}
                        formatValue={(val) => `$${val.toFixed(2)}`}
                      />
                    </div>
                    <div
                      style={{
                        animation: !isPeriodChange
                          ? "fadeInUp 0.4s ease-out 0.2s both"
                          : "none",
                      }}
                    >
                      <AnalyticsChart
                        title="Sales (Items)"
                        data={(analyticsData.data.data?.sales || []).map(
                          (d: any) => ({
                            date: d.date,
                            value: Number(d.sales),
                          })
                        )}
                        color="#3b82f6"
                        currentTotal={Number(
                          analyticsData.data.totals?.sales || 0
                        )}
                        previousTotal={Number(
                          analyticsData.data.previousTotals?.sales || 0
                        )}
                      />
                    </div>
                    <div
                      style={{
                        animation: !isPeriodChange
                          ? "fadeInUp 0.4s ease-out 0.3s both"
                          : "none",
                      }}
                    >
                      <AnalyticsChart
                        title="Orders"
                        data={(analyticsData.data.data?.orders || []).map(
                          (d: any) => ({
                            date: d.date,
                            value: Number(d.count),
                          })
                        )}
                        color="#8b5cf6"
                        currentTotal={Number(
                          analyticsData.data.totals?.orders || 0
                        )}
                        previousTotal={Number(
                          analyticsData.data.previousTotals?.orders || 0
                        )}
                      />
                    </div>
                    <div
                      style={{
                        animation: !isPeriodChange
                          ? "fadeInUp 0.4s ease-out 0.4s both"
                          : "none",
                      }}
                    >
                      <AnalyticsChart
                        title="New Users"
                        data={(analyticsData.data.data?.users || []).map(
                          (d: any) => ({
                            date: d.date,
                            value: Number(d.count),
                          })
                        )}
                        color="#f59e0b"
                        currentTotal={Number(
                          analyticsData.data.totals?.users || 0
                        )}
                        previousTotal={Number(
                          analyticsData.data.previousTotals?.users || 0
                        )}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </TabTransition>
          </div>

          {/* Content Grid (only show on overview) */}
          {activeTab === "overview" && (
            <div
              className="mt-4 sm:mt-6 md:mt-8"
              style={{
                animation: "fadeInUp 0.3s ease-out 0.1s both",
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                {/* Recent Users */}
                <div className="bg-card rounded-lg shadow-sm border border-border">
                  <div className="px-3 py-3 sm:px-4 sm:py-3 md:px-6 md:py-4 border-b border-border">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground">
                      Recent Users
                    </h2>
                  </div>
                  <div className="p-3 sm:p-4 md:p-6">
                    {statsLoading ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
                              <div className="ml-3">
                                <div className="h-4 bg-muted rounded w-24 mb-1 animate-pulse"></div>
                                <div className="h-3 bg-muted rounded w-32 animate-pulse"></div>
                              </div>
                            </div>
                            <div className="h-6 bg-muted rounded w-16 animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    ) : stats.recentUsers.length > 0 ? (
                      <div className="space-y-4">
                        {stats.recentUsers.map((user: any) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-muted-foreground">
                                  {user.name
                                    ? user.name.charAt(0).toUpperCase()
                                    : user.email.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-foreground">
                                  {user.name || user.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <StatusIndicator status={user.role} type="user" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No users found
                      </p>
                    )}
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-card rounded-lg shadow-sm border border-border">
                  <div className="px-3 py-3 sm:px-4 sm:py-3 md:px-6 md:py-4 border-b border-border">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground">
                      Recent Orders
                    </h2>
                  </div>
                  <div className="p-3 sm:p-4 md:p-6">
                    {statsLoading ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
                              <div className="ml-3">
                                <div className="h-4 bg-muted rounded w-20 mb-1 animate-pulse"></div>
                                <div className="h-3 bg-muted rounded w-28 animate-pulse"></div>
                              </div>
                            </div>
                            <div className="h-6 bg-muted rounded w-20 animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    ) : stats.recentOrders.length > 0 ? (
                      <div className="space-y-4">
                        {stats.recentOrders.map((order: any) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-muted-foreground">
                                  #
                                </span>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-foreground">
                                  {order.orderNumber}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {order.customer.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <StatusIndicator
                                status={order.status}
                                type="order"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No orders found
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-card rounded-lg shadow-sm border border-border">
                  <div className="px-3 py-3 sm:px-4 sm:py-3 md:px-6 md:py-4 border-b border-border">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground">
                      Actions
                    </h2>
                  </div>
                  <div className="p-3 sm:p-4 md:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      <button
                        onClick={() => router.push("/admin/users")}
                        className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3 bg-secondary hover:bg-secondary/70 rounded-lg transition-colors duration-200"
                      >
                        <div className="flex items-center">
                          <svg
                            className="w-5 h-5 text-accent-foreground mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                            />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-accent-foreground">
                              Manage Users
                            </p>
                            <p className="text-xs text-accent-foreground">
                              View and manage user accounts
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => router.push("/admin/products")}
                        className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3 bg-secondary hover:bg-secondary/70 rounded-lg transition-colors duration-200"
                      >
                        <div className="flex items-center">
                          <svg
                            className="w-5 h-5 text-accent-foreground mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-accent-foreground">
                              Manage Products
                            </p>
                            <p className="text-xs text-accent-foreground">
                              Add or edit products
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => router.push("/admin/orders")}
                        className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3 bg-secondary hover:bg-secondary/70 rounded-lg transition-colors duration-200"
                      >
                        <div className="flex items-center">
                          <svg
                            className="w-5 h-5 text-accent-foreground mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-accent-foreground">
                              Manage Orders
                            </p>
                            <p className="text-xs text-accent-foreground">
                              View and update order status
                            </p>
                          </div>
                        </div>
                      </button>

                      <button className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3 bg-secondary hover:bg-secondary/70 rounded-lg transition-colors duration-200">
                        <div className="flex items-center">
                          <svg
                            className="w-5 h-5 text-accent-foreground mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-accent-foreground">
                              System Settings
                            </p>
                            <p className="text-xs text-foreground">
                              Configure system preferences
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
