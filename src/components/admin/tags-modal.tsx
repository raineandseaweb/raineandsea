"use client";

import { TagCombobox } from "@/components/ui/tag-combobox";
import { useEffect, useState } from "react";

interface Tag {
  id: string;
  name: string;
}

interface TagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  initialTags: string[];
  availableTags: Tag[];
  onSave: (tags: string[]) => Promise<void>;
}

export default function TagsModal({
  isOpen,
  onClose,
  productTitle,
  initialTags,
  availableTags,
  onSave,
}: TagsModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedTags(initialTags);
    }
  }, [isOpen, initialTags]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(selectedTags);
      onClose();
    } catch (error) {
      console.error("Error saving tags:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Product Tags
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage tags for:{" "}
              <span className="font-medium">{productTitle}</span>
            </p>
          </div>
          <button
            type="button"
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

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tags
            </label>
            <TagCombobox
              availableTags={availableTags}
              selectedTags={selectedTags}
              onTagsChange={(tags: string[]) => setSelectedTags(tags)}
              placeholder="Select tags..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Tags help customers find your products through search and
              filtering
            </p>
          </div>

          {selectedTags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Selected Tags:
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tagId) => {
                  const tag = availableTags.find((t) => t.id === tagId);
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag?.name || tagId}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTags(
                            selectedTags.filter((id) => id !== tagId)
                          )
                        }
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <svg
                          className="w-3 h-3"
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
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Tags"}
          </button>
        </div>
      </div>
    </div>
  );
}
