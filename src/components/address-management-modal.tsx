"use client";

import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/auth-context";
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
import { useEffect, useState } from "react";

interface Address {
  id: string;
  type: "shipping" | "billing";
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
  onAddressSelect?: (addressId: string) => void;
  mode?: "checkout" | "account";
  onAddressesUpdated?: (addresses: Address[]) => void;
  autoOpenAddForm?: boolean;
}

export function AddressManagementModal({
  isOpen,
  onClose,
  onAddressSelect,
  mode = "account",
  onAddressesUpdated,
  autoOpenAddForm = false,
}: AddressManagementModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [originalAddresses, setOriginalAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  // dnd-kit sensors (same pattern as admin tools)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Stage changes locally and commit on Save
  const [pendingCreated, setPendingCreated] = useState<
    Record<string, AddressFormData & { type: "shipping" | "billing" }>
  >({});
  const [pendingUpdated, setPendingUpdated] = useState<
    Record<string, AddressFormData & { type: "shipping" | "billing" }>
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && user) {
      fetchAddresses();
      // Reset form state when modal opens
      resetForm();
      // Auto-open add form if requested
      if (autoOpenAddForm) {
        setIsAdding(true);
      }
    }
  }, [isOpen, user, autoOpenAddForm]);

  useEffect(() => {
    if (editingAddress) {
      setFormData({
        name: editingAddress.name || "",
        line1: editingAddress.line1,
        line2: editingAddress.line2 || "",
        city: editingAddress.city,
        region: editingAddress.region,
        postal_code: editingAddress.postal_code,
        country: editingAddress.country,
        is_default: editingAddress.is_default,
      });
    } else if (isAdding) {
      setFormData({
        name: user?.name || "",
        line1: "",
        line2: "",
        city: "",
        region: "",
        postal_code: "",
        country: "US",
        is_default: addresses.length === 0,
      });
    }
  }, [editingAddress, isAdding, user, addresses.length]);

  const fetchAddresses = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/addresses", {
        headers: {
          Cookie: `auth-token=${localStorage.getItem("auth-token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const uniqueAddresses = (data.data.all || []).filter(
          (address: Address, index: number, self: Address[]) =>
            index ===
            self.findIndex(
              (a) =>
                a.id === address.id ||
                (a.line1 === address.line1 &&
                  a.city === address.city &&
                  a.region === address.region &&
                  a.postal_code === address.postal_code)
            )
        );
        setOriginalAddresses(uniqueAddresses);
        setAddresses(uniqueAddresses);
        setPendingCreated({});
        setPendingUpdated({});
        setPendingDeleted([]);
        setPendingDefaultId(
          uniqueAddresses.find((a: Address) => a.is_default)?.id || null
        );
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
      addToast({
        title: "Failed to load addresses",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.line1.trim()) {
      newErrors.line1 = "Address line 1 is required";
    }
    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }
    if (!formData.region.trim()) {
      newErrors.region = "State/Region is required";
    }
    if (!formData.postal_code.trim()) {
      newErrors.postal = "Postal code is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user) return;

    // Stage locally; commit on Save
    if (editingAddress) {
      const updated: Address = {
        ...(editingAddress as Address),
        name: formData.name || undefined,
        line1: formData.line1,
        line2: formData.line2 || undefined,
        city: formData.city,
        region: formData.region,
        postal_code: formData.postal_code,
        country: formData.country,
        is_default: formData.is_default,
        updated_at: new Date().toISOString(),
      };
      setAddresses((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      if (String(updated.id).startsWith("temp-")) {
        setPendingCreated((prev) => ({
          ...prev,
          [updated.id]: { ...formData, type: "shipping" },
        }));
      } else {
        setPendingUpdated((prev) => ({
          ...prev,
          [updated.id]: { ...formData, type: "shipping" },
        }));
      }
      if (updated.is_default) {
        setAddresses((prev) =>
          prev.map((a) => ({ ...a, is_default: a.id === updated.id }))
        );
        setPendingDefaultId(updated.id);
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const newAddress: Address = {
        id: tempId,
        type: "shipping",
        name: formData.name || undefined,
        line1: formData.line1,
        line2: formData.line2 || undefined,
        city: formData.city,
        region: formData.region,
        postal_code: formData.postal_code,
        country: formData.country,
        is_default: formData.is_default,
        sort_order: addresses.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAddresses((prev) => [...prev, newAddress]);
      setPendingCreated((prev) => ({
        ...prev,
        [tempId]: { ...formData, type: "shipping" },
      }));
      if (newAddress.is_default) {
        setAddresses((prev) =>
          prev.map((a) => ({ ...a, is_default: a.id === newAddress.id }))
        );
        setPendingDefaultId(newAddress.id);
      }
    }
    resetForm();
  };

  const handleDelete = (addressId: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== addressId));
    if (String(addressId).startsWith("temp-")) {
      setPendingCreated((prev) => {
        const next = { ...prev } as any;
        delete next[addressId];
        return next;
      });
    } else {
      setPendingDeleted((prev) => Array.from(new Set([...prev, addressId])));
      setPendingUpdated((prev) => {
        if (!prev[addressId]) return prev;
        const next = { ...prev } as any;
        delete next[addressId];
        return next;
      });
    }
    if (pendingDefaultId === addressId) {
      const nextTop = addresses.find((a) => a.id !== addressId)?.id || null;
      setPendingDefaultId(nextTop);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === nextTop }))
      );
    }
  };

  const handleSetDefault = (addressId: string) => {
    setPendingDefaultId(addressId);
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, is_default: a.id === addressId }))
    );
  };

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

  const handleAddressSelect = (addressId: string) => {
    if (onAddressSelect) {
      onAddressSelect(addressId);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-2xl font-bold text-gray-900">
              Manage Addresses
            </h2>
            <button
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

          <div className="flex flex-1 min-h-0">
            {/* Address List */}
            <div className="flex-1 p-6 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No addresses saved
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Add your first address to get started
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      setIsAdding(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Saved Addresses
                    </h3>
                    <button
                      onClick={() => {
                        resetForm();
                        setIsAdding(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
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
                      items={addresses.map((a) => a.id)}
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

            {/* Address Form */}
            {(isAdding || editingAddress) && (
              <div className="w-96 border-l border-gray-200 p-6 overflow-y-auto bg-gray-50">
                <div className="flex items-center mb-4">
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600 mr-3"
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
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingAddress ? "Edit Address" : "Add New Address"}
                  </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? "border-red-300" : "border-gray-300"
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.line1 ? "border-red-300" : "border-gray-300"
                      }`}
                      placeholder="Street address"
                    />
                    {errors.line1 && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.line1}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Apartment, suite, etc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.city ? "border-red-300" : "border-gray-300"
                        }`}
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State/Region *
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
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.region ? "border-red-300" : "border-gray-300"
                        }`}
                      />
                      {errors.region && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.region}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Postal Code *
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
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.postal ? "border-red-300" : "border-gray-300"
                        }`}
                      />
                      {errors.postal && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.postal}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                      </select>
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
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="is_default"
                      className="ml-2 text-sm text-gray-700"
                    >
                      Set as default address
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      {editingAddress ? "Update Address" : "Add Address"}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Footer actions - commit staged changes */}
          <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 flex-shrink-0">
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                setIsSaving(true);
                try {
                  const tempIdMap = new Map<string, string>();
                  // Create
                  for (const [tempId, data] of Object.entries(pendingCreated)) {
                    const address = addresses.find((a) => a.id === tempId);
                    const resp = await fetch("/api/addresses", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Cookie: `auth-token=${localStorage.getItem(
                          "auth-token"
                        )}`,
                      },
                      body: JSON.stringify({
                        ...data,
                        sort_order: address?.sort_order || 0,
                      }),
                    });
                    if (!resp.ok) throw new Error("Failed to create address");
                    const created = await resp.json();
                    const newId = created.data?.id || created.id;
                    if (newId) tempIdMap.set(tempId, newId);
                  }

                  // Update
                  for (const [idRaw] of Object.entries(pendingUpdated)) {
                    const id = String(idRaw).startsWith("temp-")
                      ? tempIdMap.get(idRaw) || ""
                      : idRaw;
                    if (!id) continue;
                    const addr = addresses.find(
                      (a) => a.id === (idRaw.startsWith("temp-") ? id : idRaw)
                    );
                    if (!addr) continue;
                    const resp = await fetch(`/api/addresses/${id}`, {
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
                        is_default: false,
                        sort_order: addr.sort_order,
                      }),
                    });
                    if (!resp.ok) throw new Error("Failed to update address");
                  }

                  // Delete
                  for (const id of pendingDeleted) {
                    const realId = String(id).startsWith("temp-")
                      ? tempIdMap.get(id) || ""
                      : id;
                    if (!realId) continue;
                    const resp = await fetch(`/api/addresses/${realId}`, {
                      method: "DELETE",
                      headers: {
                        Cookie: `auth-token=${localStorage.getItem(
                          "auth-token"
                        )}`,
                      },
                    });
                    if (!resp.ok) throw new Error("Failed to delete address");
                  }

                  // Default
                  if (pendingDefaultId) {
                    const realDefaultId = String(pendingDefaultId).startsWith(
                      "temp-"
                    )
                      ? tempIdMap.get(pendingDefaultId) || ""
                      : pendingDefaultId;
                    const addr =
                      addresses.find((a) => a.id === pendingDefaultId) ||
                      addresses.find((a) => a.id === realDefaultId);
                    if (realDefaultId && addr) {
                      const resp = await fetch(
                        `/api/addresses/${realDefaultId}`,
                        {
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
                        }
                      );
                      if (!resp.ok) throw new Error("Failed to set default");
                    }
                  }

                  // Update sort order for all addresses
                  const addressOrders = addresses.map((addr, index) => ({
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
    zIndex: isDragging ? 1000 : 1,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg bg-white shadow-sm ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-stretch min-h-[80px]">
        {/* Drag Handle - Full Vertical Height */}
        <div
          {...attributes}
          {...listeners}
          className="w-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
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
              <h4 className="text-sm font-semibold text-gray-900 truncate">
                {address.name || "Address"}
              </h4>
              {address.is_default && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  Default
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              {address.line1}
              {address.line2 && `, ${address.line2}`}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {address.city}, {address.region} {address.postal_code}
            </p>
            <p className="text-xs text-gray-500 truncate">{address.country}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0 pr-4">
          <button
            onClick={onEdit}
            className="text-gray-500 hover:text-gray-700 p-1 rounded transition-colors"
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
              className="text-blue-500 hover:text-blue-700 p-1 rounded transition-colors"
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
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
            title="Remove address"
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
