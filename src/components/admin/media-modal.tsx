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
  productId: string;
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
      className={`flex flex-none w-40 h-28 rounded-lg border border-border overflow-hidden bg-card ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Left control rail */}
      <div className="flex flex-col w-8 h-full bg-muted border-r border-border">
        <div
          {...attributes}
          {...listeners}
          className="flex-1 w-full flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-muted-foreground"
          title="Drag to reorder"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>
        <button
          onClick={() => onDelete(media.id)}
          className="p-2 text-destructive hover:text-destructive/80"
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
  productId,
  productTitle,
  initialMedia,
  onSave,
}: MediaModalProps) {
  const [media, setMedia] = useState<Media[]>(initialMedia);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
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

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Upload all selected files immediately
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        await uploadFile(file);
      }
    }

    // Reset file input
    event.target.value = "";
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith("image/")) {
          await uploadFile(file);
        }
      }
    }
  };

  const uploadFile = async (file: File) => {
    const fileId = `temp-${Date.now()}-${Math.random()}`;
    setUploadingFiles((prev) => new Set(prev).add(fileId));

    try {
      const formData = new FormData();
      formData.append("image", file);
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

      // Add to media list (in memory only, not saved to DB yet)
      // Use functional update to ensure we get the latest state
      setMedia((prevMedia) => {
        const newMediaItem: Media = {
          id: fileId,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          alt: file.name.replace(/\.[^/.]+$/, ""),
          sort: prevMedia.length,
        };
        return [...prevMedia, newMediaItem];
      });
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Failed to upload ${file.name}. Please try again.`);
    } finally {
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
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
      // Save any temporary images to the database
      const tempImages = media.filter((m) => m.id.startsWith("temp-"));

      for (const tempImage of tempImages) {
        try {
          const saveResponse = await fetch(
            `/api/admin/products/${productId}/media`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                url: tempImage.url,
                alt: tempImage.alt,
              }),
            }
          );

          if (saveResponse.ok) {
            const savedMedia = await saveResponse.json();
            // Replace temp ID with real ID
            tempImage.id = savedMedia.media.id;
          }
        } catch (error) {
          console.error("Error saving temp image:", error);
        }
      }

      await onSave(media);
      onClose();
    } catch (error) {
      console.error("Error saving media:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to initial media (discards all temp uploads)
    setMedia(initialMedia);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              Product Images
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manage images for:{" "}
              <span className="font-medium">{productTitle}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground transition-colors"
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
              <h4 className="text-sm font-medium text-foreground mb-3">
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
            <h4 className="text-sm font-medium text-foreground mb-3">
              Upload New Image
            </h4>
            <div className="space-y-3">
              {/* Drag and Drop Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-accent"
                    : "border-border hover:border-border"
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
                  multiple
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2">
                  <svg
                    className="mx-auto h-12 w-12 text-muted-foreground"
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
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-primary hover:text-primary/80">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>

              {uploadingFiles.size > 0 && (
                <div className="text-sm text-muted-foreground bg-accent p-3 rounded-lg">
                  <div className="font-medium">
                    Uploading {uploadingFiles.size} file(s)...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-border">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary border border-transparent rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Images"}
          </button>
        </div>
      </div>
    </div>
  );
}
