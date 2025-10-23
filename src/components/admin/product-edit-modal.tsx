"use client";

import { useToast } from "@/components/ui/toast";
import { useEffect, useState } from "react";
import MediaModal from "./media-modal";
import ProductOptionsModal, { ProductOption } from "./product-options-modal";
import TagsModal from "./tags-modal";

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
}

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onProductUpdated: () => void;
  availableTags: Array<{ id: string; name: string }>;
}

export function ProductEditModal({
  isOpen,
  onClose,
  product,
  onProductUpdated,
  availableTags,
}: ProductEditModalProps) {
  const { addToast } = useToast();

  // ✅ Added missing loading state
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    image: "",
    base_price: "",
    status: "draft" as "active" | "inactive" | "draft",
    tags: [] as string[],
  });

  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  const [localProduct, setLocalProduct] = useState<Product | null>(null);
  const [pendingMediaChanges, setPendingMediaChanges] = useState({
    reordered: [] as Array<{ id: string; sort: number }>,
    deleted: [] as string[],
    added: [] as Array<{ url: string; alt: string }>,
  });
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [originalStock, setOriginalStock] = useState<number>(0);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setLocalProduct(product);
      setFormData({
        title: product.title,
        slug: product.slug,
        description: product.description,
        image: product.image || "",
        base_price: product.base_price || "",
        status: product.status,
        tags: product.tags?.map((tag) => tag.id) || [],
      });
      setProductOptions(
        product.options?.map((option) => ({
          id: option.id,
          name: option.name,
          display_name: option.display_name,
          values: option.values.map((value) => ({
            id: value.id,
            name: value.name,
            price_adjustment: value.price_adjustment,
            is_default: value.is_default,
            is_sold_out: value.is_sold_out,
          })),
        })) || []
      );
      setPendingMediaChanges({ reordered: [], deleted: [], added: [] });
    }
  }, [product]);

  // Fetch stock when stock modal opens
  useEffect(() => {
    if (showStockModal && localProduct) {
      fetchCurrentStock(localProduct.id);
    }
  }, [showStockModal, localProduct]);

  // Fetch current stock level
  const fetchCurrentStock = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        // Assuming the product API returns inventory data
        const stock = data.data.quantity_available || 0;
        setCurrentStock(stock);
        setOriginalStock(stock);
      }
    } catch (error) {
      console.error("Error fetching stock:", error);
    }
  };

  // Update stock level
  const handleStockUpdate = async (newStock: number) => {
    if (!localProduct) return;

    setStockLoading(true);
    try {
      const response = await fetch(
        `/api/admin/products/${localProduct.id}/stock`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ quantity_available: newStock }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        addToast({ title: `Error: ${error.error}`, type: "error" });
        return;
      }

      addToast({ title: "Stock updated successfully", type: "success" });
      setCurrentStock(newStock);
      onProductUpdated(); // Refresh product data
    } catch (error) {
      console.error("Error updating stock:", error);
      addToast({ title: "Failed to update stock", type: "error" });
    } finally {
      setStockLoading(false);
    }
  };

  // ✅ handleEditProduct — now toggles loading safely
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localProduct) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/products/${localProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          options: productOptions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        addToast({ title: `Error: ${error.error}`, type: "error" });
        return;
      }

      // handle media updates
      const mediaPromises: Promise<Response>[] = [];
      for (const mediaId of pendingMediaChanges.deleted) {
        mediaPromises.push(
          fetch(`/api/admin/products/${localProduct.id}/media/${mediaId}`, {
            method: "DELETE",
            credentials: "include",
          })
        );
      }
      for (const media of pendingMediaChanges.added) {
        mediaPromises.push(
          fetch(`/api/admin/products/${localProduct.id}/media`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(media),
          })
        );
      }

      if (pendingMediaChanges.reordered.length > 0 && localProduct.media) {
        const mediaOrder = localProduct.media.map((m) => m.id);
        mediaPromises.push(
          fetch(`/api/admin/products/${localProduct.id}/media/reorder`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ mediaOrder }),
          })
        );
      }

      if (mediaPromises.length > 0) await Promise.all(mediaPromises);

      addToast({ title: "Product updated successfully", type: "success" });
      onProductUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating product:", error);
      addToast({ title: "Failed to update product", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-card rounded-lg max-w-7xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Edit Product</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
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

          <form onSubmit={handleEditProduct} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Basic Info */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Base Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData({ ...formData, base_price: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Primary Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
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
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Right Column - Quick Actions */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    Quick Actions
                  </h4>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowOptionsModal(true)}
                      className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
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
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">
                            Product Options
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Configure size, color, material, etc.
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-muted-foreground"
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
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTagsModal(true)}
                      className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
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
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                            />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">
                            Product Tags
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Manage categories and labels
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-muted-foreground"
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
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMediaModal(true)}
                      className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
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
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">
                            Product Images
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Manage photos and galleries
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-muted-foreground"
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
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowStockModal(true)}
                      className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
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
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">
                            Stock Management
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Configure inventory levels
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-muted-foreground"
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
                    </button>

                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">
                        Current Options:
                      </p>
                      {productOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No options configured
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {productOptions.map((option, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2"
                            >
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              <span className="text-xs text-foreground">
                                {option.name || `Option ${index + 1}`}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({option.values.length} values)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">
                        Current Tags:
                      </p>
                      {formData.tags.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No tags assigned
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {formData.tags.map((tagId) => {
                            const tag = availableTags.find(
                              (t) => t.id === tagId
                            );
                            return (
                              <span
                                key={tagId}
                                className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-accent text-accent-foreground"
                              >
                                {tag?.name || tagId}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">
                        Current Images:
                      </p>
                      {!localProduct?.media ||
                      localProduct.media.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No images uploaded
                        </p>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="text-xs text-foreground">
                            {localProduct.media.length} image
                            {localProduct.media.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Options Modal */}
      <ProductOptionsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        productId={localProduct?.id || ""}
        productTitle={localProduct?.title || ""}
        initialOptions={productOptions}
        onSave={async (options) => {
          setProductOptions(options);
          try {
            const response = await fetch(
              `/api/admin/products/${localProduct?.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  title: localProduct?.title || "",
                  slug: localProduct?.slug || "",
                  description: localProduct?.description || "",
                  image: localProduct?.image || "",
                  base_price: formData.base_price,
                  status: localProduct?.status || "draft",
                  tags: formData.tags,
                  options: options,
                }),
              }
            );
            if (!response.ok) throw new Error("Failed to save options");
          } catch (error) {
            console.error("Error saving options:", error);
          }
        }}
      />

      {/* Tags Modal */}
      <TagsModal
        isOpen={showTagsModal}
        onClose={() => setShowTagsModal(false)}
        productTitle={localProduct?.title || ""}
        initialTags={formData.tags}
        availableTags={availableTags}
        onSave={async (tags) => {
          setFormData({ ...formData, tags });
          try {
            const response = await fetch(
              `/api/admin/products/${localProduct?.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  title: localProduct?.title || "",
                  slug: localProduct?.slug || "",
                  description: localProduct?.description || "",
                  image: localProduct?.image || "",
                  base_price: formData.base_price,
                  status: localProduct?.status || "draft",
                  tags: tags,
                  options: productOptions,
                }),
              }
            );
            if (!response.ok) throw new Error("Failed to save tags");
          } catch (error) {
            console.error("Error saving tags:", error);
          }
        }}
      />

      {/* Media Modal */}
      <MediaModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        productId={localProduct?.id || ""}
        productTitle={localProduct?.title || ""}
        initialMedia={localProduct?.media || []}
        onSave={async (media) => {
          // Update local product state
          setLocalProduct((prev) => {
            if (!prev) return prev;
            return { ...prev, media };
          });

          try {
            const response = await fetch(
              `/api/admin/products/${localProduct?.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  title: localProduct?.title || "",
                  slug: localProduct?.slug || "",
                  description: localProduct?.description || "",
                  image: localProduct?.image || "",
                  base_price: formData.base_price,
                  status: localProduct?.status || "draft",
                  tags: formData.tags,
                  options: productOptions,
                  media: media,
                }),
              }
            );
            if (!response.ok) throw new Error("Failed to save media");
          } catch (error) {
            console.error("Error saving media:", error);
          }
        }}
      />

      {/* Stock Management Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                Stock Management
              </h3>
              <button
                onClick={() => setShowStockModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Current Stock Level: {currentStock}
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentStock}
                  onChange={(e) =>
                    setCurrentStock(parseInt(e.target.value) || 0)
                  }
                  placeholder="Enter stock quantity"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Stock Notification Warning */}
              {originalStock === 0 && currentStock > 0 && (
                <div className="bg-accent border border-border rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-primary mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm">
                      <p className="font-medium text-accent-foreground">
                        Stock Notification Alert
                      </p>
                      <p className="text-primary">
                        Customers who signed up for stock notifications will be
                        automatically notified when stock becomes available.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStockUpdate(currentStock)}
                  disabled={stockLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {stockLoading ? "Updating..." : "Update Stock"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
