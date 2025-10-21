import { BulkOperationsModal } from "@/components/admin/bulk-operations-modal";
import { ProductEditModal } from "@/components/admin/product-edit-modal";
import { ProductFilters } from "@/components/admin/product-filters";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { TagCombobox } from "@/components/ui/tag-combobox";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

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
  tags?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  media?: Array<{
    id: string;
    url: string;
    alt: string;
    sort: number;
  }>;
  options?: Array<{
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
  }>;
  inventory?: {
    quantity_available: number;
    quantity_reserved: number;
  };
  analytics?: {
    total_sales: number;
    total_orders: number;
    total_revenue: number;
    views_count: number;
    last_sale_at: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminProducts() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    image: "",
    status: "draft" as "active" | "inactive" | "draft",
    tags: [] as string[],
  });
  const [availableTags, setAvailableTags] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [availableCategories, setAvailableCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    stockStatus: "all",
    tags: [] as string[],
    categories: [] as string[],
  });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (
      !loading &&
      (!currentUser ||
        (currentUser.role !== "admin" && currentUser.role !== "root"))
    ) {
      router.push("/");
      return;
    }

    if (currentUser) {
      fetchTags();
      fetchCategories();
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (currentUser) {
      fetchProducts();
    }
  }, [
    currentUser,
    filters,
    pagination.page,
    pagination.limit,
    sortBy,
    sortOrder,
  ]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);

      // Build query params
      const params = new URLSearchParams();
      if (filters.search.trim()) params.append("search", filters.search.trim());
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.stockStatus !== "all")
        params.append("stockStatus", filters.stockStatus);
      filters.tags.forEach((tag) => params.append("tags", tag));
      filters.categories.forEach((cat) => params.append("categories", cat));
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());

      const response = await fetch(`/api/admin/products?${params.toString()}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setPagination(data.pagination);
      } else {
        console.error(
          "Failed to fetch products:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
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

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableCategories(data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 });
    setSelectedProducts(new Set());
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      stockStatus: "all",
      tags: [],
      categories: [],
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

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleBulkOperationComplete = async () => {
    setSelectedProducts(new Set());
    await fetchProducts();
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    });
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchProducts();
        setShowCreateModal(false);
        setFormData({
          title: "",
          slug: "",
          description: "",
          image: "",
          status: "draft",
          tags: [],
        });
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Failed to create product");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        await fetchProducts();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product");
    }
  };

  const openEditModal = async (product: Product) => {
    try {
      // Fetch full product data with media
      const response = await fetch(`/api/admin/products/${product.id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setEditingProduct(data.product);
        setShowEditModal(true);
      } else {
        console.error("Failed to fetch product details");
        // Fallback to basic product data
        setEditingProduct(product);
        setShowEditModal(true);
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      // Fallback to basic product data
      setEditingProduct(product);
      setShowEditModal(true);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingProduct(null);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingProduct(null);
    setFormData({
      title: "",
      slug: "",
      description: "",
      image: "",
      status: "draft",
      tags: [],
    });
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
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
        className={`px-6 py-3 ${alignClass} text-xs font-medium text-gray-500 uppercase tracking-wider`}
      >
        <button
          onClick={() => handleSort(column)}
          className={`flex items-center space-x-1 hover:text-gray-700 transition-colors ${
            align === "right" ? "ml-auto" : ""
          }`}
        >
          <span>{children}</span>
          {isSorted && (
            <span className="text-blue-600">
              {sortOrder === "asc" ? "↑" : "↓"}
            </span>
          )}
        </button>
      </th>
    );
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

  if (
    !currentUser ||
    (currentUser.role !== "admin" && currentUser.role !== "root")
  ) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <button
                  onClick={() => router.push("/admin")}
                  className="hover:text-gray-700"
                >
                  Admin
                </button>
              </li>
              <li className="flex items-center">
                <svg
                  className="w-4 h-4 mx-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-900 font-medium">Products</span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Product Management
                </h1>
                <p className="text-gray-600 mt-2">
                  Manage products, variants, and inventory
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Add Product
              </button>
            </div>
          </div>

          {/* Filters */}
          <ProductFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            availableTags={availableTags}
            availableCategories={availableCategories}
            onReset={handleResetFilters}
          />

          {/* Bulk Operations Bar */}
          {selectedProducts.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-blue-900 font-medium">
                  {selectedProducts.size} product(s) selected
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedProducts(new Set())}
                  className="text-blue-700 hover:text-blue-900 font-medium"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Bulk Operations
                </button>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                All Products
              </h2>
            </div>
            <div className="overflow-x-auto">
              {loadingProducts ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-600">No products found</p>
                  <button
                    onClick={handleResetFilters}
                    className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={
                              selectedProducts.size === products.length &&
                              products.length > 0
                            }
                            onChange={handleSelectAll}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <SortableHeader column="title">Product</SortableHeader>
                        <SortableHeader column="status">Status</SortableHeader>
                        <SortableHeader column="price">Price</SortableHeader>
                        <SortableHeader column="stock">Stock</SortableHeader>
                        <SortableHeader column="sales">Sales</SortableHeader>
                        <SortableHeader column="created_at" align="right">
                          Created
                        </SortableHeader>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(product.id)}
                              onChange={() => handleSelectProduct(product.id)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {product.image && (
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                  <img
                                    src={product.image}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className={`${product.image ? "ml-4" : ""}`}>
                                <div className="text-sm font-medium text-gray-900">
                                  {product.title}
                                </div>
                                {product.tags && product.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {product.tags.slice(0, 2).map((tag) => (
                                      <span
                                        key={tag.id}
                                        className="inline-flex px-2 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-800"
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                    {product.tags.length > 2 && (
                                      <span className="text-xs text-gray-500">
                                        +{product.tags.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusIndicator
                              status={product.status}
                              type="product"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.base_price
                              ? `$${parseFloat(product.base_price).toFixed(2)}`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                (product.inventory?.quantity_available || 0) >
                                10
                                  ? "bg-green-100 text-green-800"
                                  : (product.inventory?.quantity_available ||
                                      0) > 0
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {product.inventory?.quantity_available || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {product.analytics?.total_sales || 0} units
                              </div>
                              <div className="text-xs text-gray-500">
                                {product.analytics?.total_orders || 0} orders
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                            {new Date(product.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() =>
                                  router.push(`/products/${product.slug}`)
                                }
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </button>
                              <button
                                onClick={() => openEditModal(product)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">
                        Showing {(pagination.page - 1) * pagination.limit + 1}{" "}
                        to{" "}
                        {Math.min(
                          pagination.page * pagination.limit,
                          pagination.total
                        )}{" "}
                        of {pagination.total} products
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">
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
                          className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "border-gray-300 hover:bg-gray-50"
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
                          className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Product
            </h3>
            <form onSubmit={handleCreateProduct}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as
                          | "active"
                          | "inactive"
                          | "draft",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <TagCombobox
                    availableTags={availableTags}
                    selectedTags={formData.tags}
                    onTagsChange={(tags) => setFormData({ ...formData, tags })}
                    placeholder="Select tags..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      <ProductEditModal
        isOpen={showEditModal}
        onClose={closeEditModal}
        product={editingProduct}
        onProductUpdated={fetchProducts}
        availableTags={availableTags}
      />

      {/* Bulk Operations Modal */}
      <BulkOperationsModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        selectedCount={selectedProducts.size}
        selectedProductIds={Array.from(selectedProducts)}
        availableTags={availableTags}
        onOperationComplete={handleBulkOperationComplete}
      />
    </div>
  );
}
