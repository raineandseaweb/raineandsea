"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";

interface Media {
  id: string;
  url: string;
  thumbnailUrl?: string;
  alt: string;
  sort: number;
}

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  initialMedia: Media[];
  onSave: (media: Media[]) => Promise<void>;
}

// Sortable Image Item Component
function SortableImageItem({
  media,
  index,
  onDelete,
}: {
  media: Media;
  index: number;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: media.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-none w-40 h-28 rounded-lg border border-gray-200 overflow-hidden bg-white ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Left control rail */}
      <div className="flex flex-col w-8 h-full bg-gray-50 border-r border-gray-200">
        <div
          {...attributes}
          {...listeners}
          className="flex-1 w-full flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          title="Drag to reorder"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>
        <button
          onClick={() => onDelete(media.id)}
          className="p-2 text-red-500 hover:text-red-700"
          title="Delete image"
        >
          <svg
            className="w-4 h-4"
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

      {/* Image area */}
      <div className="flex-1 h-full">
        <img
          src={media.thumbnailUrl || media.url}
          alt={media.alt}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

export default function MediaModal({
  isOpen,
  onClose,
  productTitle,
  initialMedia,
  onSave,
}: MediaModalProps) {
  const [media, setMedia] = useState<Media[]>(initialMedia);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newImageAlt, setNewImageAlt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      setMedia(initialMedia);
    }
  }, [isOpen, initialMedia]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setNewImageAlt(file.name.replace(/\.[^/.]+$/, "")); // Use filename without extension as alt text
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setSelectedFile(file);
        setNewImageAlt(file.name.replace(/\.[^/.]+$/, ""));
      } else {
        alert("Please drop an image file.");
      }
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append(
        "productSlug",
        productTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")
      );

      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      const newMediaItem: Media = {
        id: `temp-${Date.now()}`,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        alt: newImageAlt.trim() || "Product image",
        sort: media.length,
      };

      setMedia([...media, newMediaItem]);
      setSelectedFile(null);
      setNewImageAlt("");

      // Reset file input
      const fileInput = document.getElementById(
        "image-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (mediaId: string) => {
    const mediaItem = media.find((m) => m.id === mediaId);
    if (!mediaItem) return;

    // If it's a real image (not a temp one), delete from R2
    if (!mediaItem.id.startsWith("temp-")) {
      try {
        await fetch("/api/admin/delete-image", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: mediaItem.url }),
        });
      } catch (error) {
        console.error("Failed to delete image from R2:", error);
        // Continue with local deletion even if R2 deletion fails
      }
    }

    setMedia(media.filter((m) => m.id !== mediaId));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setMedia((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, sort: index }));
      });
    }
  };

  const handleReorderImage = (mediaId: string, direction: "up" | "down") => {
    const currentIndex = media.findIndex((m) => m.id === mediaId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= media.length) return;

    // Create new media array with swapped items
    const newMedia = [...media];
    [newMedia[currentIndex], newMedia[newIndex]] = [
      newMedia[newIndex],
      newMedia[currentIndex],
    ];

    // Update sort order
    const updatedMedia = newMedia.map((m, index) => ({ ...m, sort: index }));
    setMedia(updatedMedia);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(media);
      onClose();
    } catch (error) {
      console.error("Error saving media:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Product Images
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage images for:{" "}
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
          {/* Existing Images */}
          {media.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Current Images
              </h4>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={media.map((item) => item.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex gap-3 overflow-x-auto py-1">
                    {media.map((mediaItem, index) => (
                      <SortableImageItem
                        key={mediaItem.id}
                        media={mediaItem}
                        index={index}
                        onDelete={handleDeleteImage}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Add New Image */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Upload New Image
            </h4>
            <div className="space-y-3">
              {/* Drag and Drop Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>

              {selectedFile && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium">Selected file:</div>
                  <div>
                    {selectedFile.name} (
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                </div>
              )}

              <input
                type="text"
                value={newImageAlt}
                onChange={(e) => setNewImageAlt(e.target.value)}
                placeholder="Alt text (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleUploadImage}
                disabled={!selectedFile || uploading}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? "Uploading..." : "Upload Image"}
              </button>
            </div>
          </div>
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
            {loading ? "Saving..." : "Save Images"}
          </button>
        </div>
      </div>
    </div>
  );
}
