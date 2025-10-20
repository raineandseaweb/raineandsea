import { useState } from "react";

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedProductIds: string[];
  availableTags: Array<{ id: string; name: string }>;
  onOperationComplete: () => void;
}

export function BulkOperationsModal({
  isOpen,
  onClose,
  selectedCount,
  selectedProductIds,
  availableTags,
  onOperationComplete,
}: BulkOperationsModalProps) {
  const [operation, setOperation] = useState<string>("");
  const [status, setStatus] = useState<string>("active");
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [priceAdjustment, setPriceAdjustment] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!operation) {
      alert("Please select an operation");
      return;
    }

    setProcessing(true);

    try {
      let data: any = {};

      switch (operation) {
        case "update_status":
          data = { status };
          break;
        case "update_stock":
          data = { quantity: stockQuantity };
          break;
        case "adjust_stock":
          data = { adjustment: stockAdjustment };
          break;
        case "update_price":
          data = { basePrice };
          break;
        case "adjust_price":
          data = { adjustment: priceAdjustment };
          break;
        case "add_tags":
        case "remove_tags":
          if (selectedTags.length === 0) {
            alert("Please select at least one tag");
            setProcessing(false);
            return;
          }
          data = { tagIds: selectedTags };
          break;
        case "delete":
          if (
            !confirm(
              `Are you sure you want to delete ${selectedCount} product(s)? This action cannot be undone.`
            )
          ) {
            setProcessing(false);
            return;
          }
          break;
      }

      const response = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          operation,
          productIds: selectedProductIds,
          data,
        }),
      });

      if (response.ok) {
        alert(`Successfully updated ${selectedCount} product(s)`);
        onOperationComplete();
        onClose();
        resetForm();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Bulk operation error:", error);
      alert("Failed to perform bulk operation");
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setOperation("");
    setStatus("active");
    setStockQuantity(0);
    setStockAdjustment(0);
    setBasePrice(0);
    setPriceAdjustment(0);
    setSelectedTags([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Bulk Operations
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
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

        <p className="text-sm text-gray-600 mb-4">
          {selectedCount} product(s) selected
        </p>

        <div className="space-y-4">
          {/* Operation Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Operation
            </label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an operation...</option>
              <optgroup label="Status">
                <option value="update_status">Update Status</option>
              </optgroup>
              <optgroup label="Inventory">
                <option value="update_stock">Set Stock Quantity</option>
                <option value="adjust_stock">Adjust Stock (+/-)</option>
              </optgroup>
              <optgroup label="Pricing">
                <option value="update_price">Set Base Price</option>
                <option value="adjust_price">Adjust Price (+/-)</option>
              </optgroup>
              <optgroup label="Tags">
                <option value="add_tags">Add Tags</option>
                <option value="remove_tags">Remove Tags</option>
              </optgroup>
              <optgroup label="Dangerous">
                <option value="delete">Delete Products</option>
              </optgroup>
            </select>
          </div>

          {/* Operation-specific inputs */}
          {operation === "update_status" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          )}

          {operation === "update_stock" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Quantity
              </label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {operation === "adjust_stock" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Adjustment (use negative numbers to decrease)
              </label>
              <input
                type="number"
                value={stockAdjustment}
                onChange={(e) => setStockAdjustment(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., +10 or -5"
              />
            </div>
          )}

          {operation === "update_price" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Price ($)
              </label>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(parseFloat(e.target.value))}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {operation === "adjust_price" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Adjustment ($ - use negative numbers to decrease)
              </label>
              <input
                type="number"
                value={priceAdjustment}
                onChange={(e) => setPriceAdjustment(parseFloat(e.target.value))}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., +5.00 or -2.50"
              />
            </div>
          )}

          {(operation === "add_tags" || operation === "remove_tags") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tags
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {availableTags.map((tag) => (
                  <label key={tag.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag.id]);
                        } else {
                          setSelectedTags(
                            selectedTags.filter((id) => id !== tag.id)
                          );
                        }
                      }}
                      className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {operation === "delete" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will permanently delete{" "}
                {selectedCount} product(s) and all associated data. This action
                cannot be undone.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleClose}
            disabled={processing}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing || !operation}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              operation === "delete"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {processing ? "Processing..." : "Apply Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
