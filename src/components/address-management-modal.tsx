"use client";

import { useToast } from "@/components/ui/toast";
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Address {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  type: "shipping" | "billing";
  sort_order: number;
}

interface AddressFormData {
  name: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

interface AddressManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "checkout" | "account";
  onAddressSelect?: (addressId: string) => void;
  onAddressesUpdated?: (addresses: Address[]) => void;
}

export function AddressManagementModal({
  isOpen,
  onClose,
  mode,
  onAddressSelect,
  onAddressesUpdated,
}: AddressManagementModalProps) {
  const { addToast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [originalAddresses, setOriginalAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // dnd-kit sensors (desktop only)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Stage changes locally and commit on Save
  const [pendingCreated, setPendingCreated] = useState<
    Record<string, AddressFormData & { type: "shipping" | "billing" }>
  >({});
  const [pendingUpdated, setPendingUpdated] = useState<
    Record<string, AddressFormData>
  >({});
  const [pendingDeleted, setPendingDeleted] = useState<string[]>([]);
  const [pendingDefaultId, setPendingDefaultId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<AddressFormData>({
    name: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postal_code: "",
    country: "US",
    is_default: false,
  });

  const [errors, setErrors] = useState<Partial<AddressFormData>>({});

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on the body
      document.body.style.overflow = "hidden";
      // Prevent scrolling on touch devices
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      // Restore scrolling
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [isOpen]);

  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/addresses", {
        headers: {
          Cookie: `auth-token=${localStorage.getItem("auth-token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch addresses");

      const data = await response.json();
      const fetchedAddresses = data.data?.all || [];

      // Ensure fetchedAddresses is an array before sorting
      if (!Array.isArray(fetchedAddresses)) {
        console.error(
          "Expected array but got:",
          typeof fetchedAddresses,
          fetchedAddresses
        );
        setAddresses([]);
        setOriginalAddresses([]);
        return;
      }

      // Sort by sort_order, then by id for consistent ordering
      const sortedAddresses = fetchedAddresses.sort(
        (a: Address, b: Address) => {
          if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order;
          }
          return a.id.localeCompare(b.id);
        }
      );

      setAddresses(sortedAddresses);
      setOriginalAddresses(sortedAddresses);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      addToast({ title: "Failed to load addresses", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAddresses();
    }
  }, [isOpen, fetchAddresses]);

  const resetForm = () => {
    setFormData({
      name: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postal_code: "",
      country: "US",
      is_default: false,
    });
    setErrors({});
    setIsAdding(false);
    setEditingAddress(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<AddressFormData> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.line1.trim()) newErrors.line1 = "Address line 1 is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.region.trim()) newErrors.region = "State is required";
    if (!formData.postal_code.trim())
      newErrors.postal_code = "ZIP code is required";
    if (!formData.country.trim()) newErrors.country = "Country is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingAddress) {
      // Update existing address
      setPendingUpdated((prev) => ({
        ...prev,
        [editingAddress.id]: formData,
      }));

      setAddresses((prev) =>
        prev.map((addr) =>
          addr.id === editingAddress.id ? { ...addr, ...formData } : addr
        )
      );
    } else {
      // Create new address
      const tempId = `temp-${Date.now()}`;
      const newAddress: Address = {
        id: tempId,
        ...formData,
        type: "shipping",
        sort_order: addresses.length,
      };

      setPendingCreated((prev) => ({
        ...prev,
        [tempId]: { ...formData, type: "shipping" },
      }));

      setAddresses((prev) => [...prev, newAddress]);
    }

    resetForm();
  };

  const handleDelete = (addressId: string) => {
    if (window.confirm("Are you sure you want to delete this address?")) {
      setPendingDeleted((prev) => [...prev, addressId]);
      setAddresses((prev) => prev.filter((addr) => addr.id !== addressId));

      // Clear pending default if the deleted address was set as default
      if (pendingDefaultId === addressId) {
        setPendingDefaultId(null);
      }
    }
  };

  const handleSetDefault = (addressId: string) => {
    setPendingDefaultId(addressId);
    setAddresses((prev) =>
      prev.map((addr) => ({
        ...addr,
        is_default: addr.id === addressId,
      }))
    );
  };

  const handleAddressesDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setAddresses((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update sort order based on new order (don't auto-set default)
        return newItems.map((item, index) => ({
          ...item,
          sort_order: index,
        }));
      });

      // Order has changed, will be saved on commit
    }
  };

  const handleAddressSelect = useCallback(
    (addressId: string) => {
      if (onAddressSelect) {
        onAddressSelect(addressId);
        onClose();
      }
    },
    [onAddressSelect, onClose]
  );

  const addressIds = useMemo(() => addresses.map((a) => a.id), [addresses]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end sm:items-center justify-center">
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        <div className="relative bg-card w-full h-[95vh] sm:h-auto sm:max-h-[90vh] sm:rounded-lg shadow-xl sm:max-w-4xl flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border px-4 sm:px-6 py-4 flex justify-between items-center flex-shrink-0 z-10">
            <h2 className="text-lg sm:text-2xl font-bold text-foreground">
              Manage Addresses
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2"
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

          {/* Mobile: Show form overlay, Desktop: Show side-by-side */}
          {isAdding || editingAddress ? (
            /* Mobile Form Overlay */
            <div className="sm:hidden absolute inset-0 bg-card z-20 flex flex-col">
              {/* Mobile Form Header */}
              <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex justify-between items-center flex-shrink-0">
                <button
                  onClick={resetForm}
                  className="text-muted-foreground hover:text-foreground p-2"
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
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h3 className="text-lg font-medium text-foreground">
                  {editingAddress ? "Edit Address" : "Add Address"}
                </h3>
                <div className="w-10"></div>
              </div>

              {/* Mobile Form Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base"
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={formData.line1}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          line1: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base"
                      placeholder="Street address"
                    />
                    {errors.line1 && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.line1}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={formData.line2}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          line2: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base"
                      placeholder="Apartment, suite, etc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base"
                        placeholder="City"
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        value={formData.region}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            region: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base"
                        placeholder="State"
                      />
                      {errors.region && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.region}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            postal_code: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base"
                        placeholder="ZIP Code"
                      />
                      {errors.postal_code && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.postal_code}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Country *
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            country: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                      </select>
                      {errors.country && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.country}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={formData.is_default}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_default: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                    <label
                      htmlFor="is_default"
                      className="ml-2 text-sm text-foreground"
                    >
                      Set as default address
                    </label>
                  </div>
                </form>
              </div>

              {/* Mobile Form Footer */}
              <div className="sticky bottom-0 bg-card border-t border-border px-4 py-4 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 border border-border text-foreground rounded-md hover:bg-muted transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium"
                >
                  {editingAddress ? "Update Address" : "Add Address"}
                </button>
              </div>
            </div>
          ) : (
            /* Mobile Address List */
            <div className="sm:hidden flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {/* Mobile Address Skeleton */}
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-card rounded-lg border border-border p-4 animate-pulse"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <div className="h-8 w-8 bg-muted rounded"></div>
                          <div className="h-8 w-8 bg-muted rounded"></div>
                          <div className="h-8 w-8 bg-muted rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-muted-foreground mb-4">
                    <svg
                      className="w-16 h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No addresses saved
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Add your first address to get started
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      setIsAdding(true);
                    }}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-foreground">
                      Saved Addresses
                    </h3>
                    <button
                      onClick={() => {
                        resetForm();
                        setIsAdding(true);
                      }}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      Add New
                    </button>
                  </div>

                  <div className="space-y-3">
                    {addresses.map((address, index) => (
                      <div
                        key={address.id}
                        className="bg-card border border-border rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-foreground">
                                {address.name || "Address"}
                              </h4>
                              {address.is_default && (
                                <span className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {address.line1}
                            </p>
                            {address.line2 && (
                              <p className="text-sm text-muted-foreground">
                                {address.line2}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {address.city}, {address.region}{" "}
                              {address.postal_code}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {address.country}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingAddress(address)}
                            className="flex-1 px-3 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted transition-colors touch-manipulation active:bg-muted/60"
                          >
                            Edit
                          </button>
                          {!address.is_default && (
                            <button
                              onClick={() => handleSetDefault(address.id)}
                              className="flex-1 px-3 py-2 text-sm font-medium text-primary bg-accent rounded-lg hover:bg-accent transition-colors touch-manipulation active:bg-accent/60"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(address.id)}
                            className="flex-1 px-3 py-2 text-sm font-medium text-destructive bg-accent rounded-lg hover:bg-destructive/10 transition-colors touch-manipulation active:bg-destructive/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop Layout */}
          <div className="hidden sm:flex flex-1 min-h-0">
            {/* Desktop Address List */}
            <div className="flex-1 p-6 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-4">
                  {/* Desktop Address Skeleton */}
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-card rounded-lg border border-border p-4 animate-pulse"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-6 w-6 bg-muted rounded"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                            <div className="h-3 bg-muted rounded w-2/3"></div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <div className="h-8 w-8 bg-muted rounded"></div>
                          <div className="h-8 w-8 bg-muted rounded"></div>
                          <div className="h-8 w-8 bg-muted rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-muted-foreground mb-4">
                    <svg
                      className="w-16 h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No addresses saved
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first address to get started
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      setIsAdding(true);
                    }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium"
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-foreground">
                      Saved Addresses
                    </h3>
                    <button
                      onClick={() => {
                        resetForm();
                        setIsAdding(true);
                      }}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      Add New Address
                    </button>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleAddressesDragEnd}
                  >
                    <SortableContext
                      items={addressIds}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {addresses.map((address) => (
                          <SortableAddressItem
                            key={address.id}
                            address={address}
                            mode={mode}
                            onSelect={handleAddressSelect}
                            onEdit={() => setEditingAddress(address)}
                            onDelete={() => handleDelete(address.id)}
                            onSetDefault={() => handleSetDefault(address.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>

            {/* Desktop Address Form */}
            {(isAdding || editingAddress) && (
              <div className="w-96 border-l border-border p-6 overflow-y-auto bg-muted">
                <div className="flex items-center mb-4">
                  <button
                    onClick={resetForm}
                    className="text-muted-foreground hover:text-foreground mr-3 p-1"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <h3 className="text-lg font-medium text-foreground">
                    {editingAddress ? "Edit Address" : "Add New Address"}
                  </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base ${
                        errors.name ? "border-destructive" : "border-border"
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={formData.line1}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          line1: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base ${
                        errors.line1 ? "border-destructive" : "border-border"
                      }`}
                      placeholder="Street address"
                    />
                    {errors.line1 && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.line1}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={formData.line2}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          line2: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Apartment, suite, etc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                          errors.city ? "border-destructive" : "border-border"
                        }`}
                        placeholder="City"
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        value={formData.region}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            region: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                          errors.region ? "border-destructive" : "border-border"
                        }`}
                        placeholder="State"
                      />
                      {errors.region && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.region}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            postal_code: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                          errors.postal_code
                            ? "border-destructive"
                            : "border-border"
                        }`}
                        placeholder="ZIP Code"
                      />
                      {errors.postal_code && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.postal_code}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Country *
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            country: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                          errors.country
                            ? "border-destructive"
                            : "border-border"
                        }`}
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                      </select>
                      {errors.country && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.country}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={formData.is_default}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_default: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                    <label
                      htmlFor="is_default"
                      className="ml-2 text-sm text-foreground"
                    >
                      Set as default address
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                    >
                      {editingAddress ? "Update Address" : "Add Address"}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Footer actions - commit staged changes */}
          <div
            className={`sticky bottom-0 bg-card border-t border-border px-4 py-4 flex justify-end space-x-3 flex-shrink-0 z-10 ${
              isAdding || editingAddress ? "sm:hidden" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setAddresses(originalAddresses);
                setPendingCreated({});
                setPendingUpdated({});
                setPendingDeleted([]);
                setPendingDefaultId(
                  originalAddresses.find((a) => a.is_default)?.id || null
                );
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                setIsSaving(true);
                try {
                  const tempIdMap = new Map();

                  // Create new addresses
                  for (const [tempId, addressData] of Object.entries(
                    pendingCreated
                  )) {
                    const resp = await fetch("/api/addresses", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Cookie: `auth-token=${localStorage.getItem(
                          "auth-token"
                        )}`,
                      },
                      body: JSON.stringify(addressData),
                    });

                    if (!resp.ok) throw new Error("Failed to create address");

                    const data = await resp.json();
                    tempIdMap.set(tempId, data.data.id);
                  }

                  // Update existing addresses
                  for (const [addressId, addressData] of Object.entries(
                    pendingUpdated
                  )) {
                    const resp = await fetch(`/api/addresses/${addressId}`, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        Cookie: `auth-token=${localStorage.getItem(
                          "auth-token"
                        )}`,
                      },
                      body: JSON.stringify(addressData),
                    });

                    if (!resp.ok) throw new Error("Failed to update address");
                  }

                  // Delete addresses
                  for (const addressId of pendingDeleted) {
                    const resp = await fetch(`/api/addresses/${addressId}`, {
                      method: "DELETE",
                      headers: {
                        Cookie: `auth-token=${localStorage.getItem(
                          "auth-token"
                        )}`,
                      },
                    });

                    if (!resp.ok) throw new Error("Failed to delete address");
                  }

                  // Set default address
                  if (pendingDefaultId) {
                    // Skip if the address is being deleted
                    if (pendingDeleted.includes(pendingDefaultId)) {
                      console.log(
                        "Skipping default setting for deleted address:",
                        pendingDefaultId
                      );
                    } else {
                      // Check if this is a temp ID that was just created
                      const realId =
                        tempIdMap.get(pendingDefaultId) || pendingDefaultId;
                      const addr = addresses.find(
                        (a) => a.id === pendingDefaultId
                      );
                      if (addr) {
                        const resp = await fetch(`/api/addresses/${realId}`, {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            Cookie: `auth-token=${localStorage.getItem(
                              "auth-token"
                            )}`,
                          },
                          body: JSON.stringify({
                            type: addr.type,
                            name: addr.name,
                            line1: addr.line1,
                            line2: addr.line2 || "",
                            city: addr.city,
                            region: addr.region,
                            postal_code: addr.postal_code,
                            country: addr.country,
                            is_default: true,
                            sort_order: addr.sort_order,
                          }),
                        });
                        if (!resp.ok) throw new Error("Failed to set default");
                      }
                    }
                  }

                  // Update sort order for all addresses (excluding deleted ones)
                  const addressOrders = addresses
                    .filter((addr) => !pendingDeleted.includes(addr.id))
                    .map((addr, index) => ({
                      id: String(addr.id).startsWith("temp-")
                        ? tempIdMap.get(addr.id) || addr.id
                        : addr.id,
                      sort_order: index,
                      is_default: addr.is_default,
                    }));

                  const reorderResp = await fetch("/api/addresses/reorder", {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Cookie: `auth-token=${localStorage.getItem(
                        "auth-token"
                      )}`,
                    },
                    body: JSON.stringify({ addressOrders }),
                  });

                  if (!reorderResp.ok)
                    throw new Error("Failed to update address order");

                  const reorderData = await reorderResp.json();
                  const updatedAddresses = reorderData.data.addresses || [];

                  // Update local state with the returned addresses
                  setAddresses(updatedAddresses);
                  setOriginalAddresses(updatedAddresses);

                  // Clear all pending changes
                  setPendingCreated({});
                  setPendingUpdated({});
                  setPendingDeleted([]);
                  setPendingDefaultId(null);

                  addToast({ title: "Addresses saved", type: "success" });
                  onAddressesUpdated?.(updatedAddresses);
                  onClose();
                } catch (err) {
                  console.error(err);
                  addToast({ title: "Failed to save changes", type: "error" });
                } finally {
                  setIsSaving(false);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary border border-transparent rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableAddressItem({
  address,
  mode,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  mode: "checkout" | "account";
  onSelect: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: address.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-border rounded-lg bg-card shadow-sm ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-stretch min-h-[80px]">
        {/* Drag Handle - Full Vertical Height */}
        <div
          {...attributes}
          {...listeners}
          className="w-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>

        {/* Content Area */}
        <div className="flex items-center space-x-3 flex-1 p-4 min-w-0">
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-foreground truncate">
                {address.name || "Address"}
              </h4>
              {address.is_default && (
                <span className="bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full">
                  Default
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {address.line1}
            </p>
            {address.line2 && (
              <p className="text-sm text-muted-foreground truncate">
                {address.line2}
              </p>
            )}
            <p className="text-sm text-muted-foreground truncate">
              {address.city}, {address.region} {address.postal_code}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {address.country}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 p-2">
          <button
            onClick={onEdit}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Edit address"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          {!address.is_default && (
            <button
              onClick={onSetDefault}
              className="p-1 text-muted-foreground hover:text-primary transition-colors"
              title="Set as default"
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete address"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
