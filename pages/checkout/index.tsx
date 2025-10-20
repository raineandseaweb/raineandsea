import { AddressManagementModal } from "@/components/address-management-modal";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface Address {
  id: string;
  type: "shipping" | "billing";
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  sort_order: number;
}

interface CheckoutFormData {
  selectedShippingAddress: string; // ID of selected address or "new" for new address
  selectedBillingAddress: string; // ID of selected address or "new" for new address
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
  billingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
  useSameAddress: boolean;
  orderNotes: string;
  guestEmail: string;
  isGuestCheckout: boolean;
  saveShippingAddress: boolean;
  saveBillingAddress: boolean;
}

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { cart, getTotalPrice, clearCart, fetchCartProductData } = useCart();
  const { addToast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState<CheckoutFormData>({
    selectedShippingAddress: "new",
    selectedBillingAddress: "new",
    shippingAddress: {
      name: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postal_code: "",
      country: "US",
    },
    billingAddress: {
      name: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postal_code: "",
      country: "US",
    },
    useSameAddress: true,
    orderNotes: "",
    guestEmail: "",
    isGuestCheckout: false,
    saveShippingAddress: false,
    saveBillingAddress: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [defaultShippingAddress, setDefaultShippingAddress] =
    useState<Address | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  useEffect(() => {
    // Allow guest checkout - no longer redirect to signin
    if (user) {
      setFormData((prev) => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          name: user.name || "",
        },
        billingAddress: {
          ...prev.billingAddress,
          name: user.name || "",
        },
        isGuestCheckout: false,
      }));
      fetchSavedAddresses();
    } else {
      // Set up for guest checkout
      setFormData((prev) => ({
        ...prev,
        isGuestCheckout: true,
      }));
    }
  }, [user, loading]);

  // Set default address when addresses are loaded
  useEffect(() => {
    if (savedAddresses.length > 0 && user) {
      const defaultAddress = savedAddresses.find((addr) => addr.is_default);
      if (defaultAddress) {
        setDefaultShippingAddress(defaultAddress);
        setFormData((prev) => ({
          ...prev,
          selectedShippingAddress: defaultAddress.id,
          shippingAddress: {
            ...prev.shippingAddress,
            name: user.name || "",
            line1: defaultAddress.line1,
            line2: defaultAddress.line2 || "",
            city: defaultAddress.city,
            region: defaultAddress.region,
            postal_code: defaultAddress.postal_code,
            country: defaultAddress.country,
          },
        }));
      }
    }
  }, [savedAddresses, user]);

  const fetchSavedAddresses = async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/addresses", {
        headers: {
          Cookie: `auth-token=${localStorage.getItem("auth-token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Use shipping addresses only for checkout
        const uniqueAddresses = (data.data.shipping || []).filter(
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
        setSavedAddresses(uniqueAddresses);
      }
    } catch (error) {
      console.error("Error fetching saved addresses:", error);
    }
  };

  useEffect(() => {
    if (cart && cart.items.length === 0) {
      router.push("/cart");
    }
  }, [cart, router]);

  // Fetch product data for cart items on checkout page load
  useEffect(() => {
    if (cart && cart.items.length > 0) {
      // Only fetch if we don't have product data for any items
      const needsProductData = cart.items.some((item) => !item.product);
      if (needsProductData) {
        fetchCartProductData();
      }
    }
  }, [cart?.items.length]); // Only run when cart items change

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate guest email for guest checkout
    if (formData.isGuestCheckout) {
      if (!formData.guestEmail.trim()) {
        newErrors.guestEmail = "Email is required for guest checkout";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guestEmail)) {
        newErrors.guestEmail = "Invalid email format";
      }
    }

    // For logged-in users, require saved addresses
    if (user && savedAddresses.length === 0) {
      newErrors.noAddresses = "Please add at least one address to continue";
    }

    // Validate shipping address (only if using new address for guests)
    if (
      formData.isGuestCheckout &&
      formData.selectedShippingAddress === "new"
    ) {
      if (!formData.shippingAddress.name.trim()) {
        newErrors.shippingName = "Name is required";
      }
      if (!formData.shippingAddress.line1.trim()) {
        newErrors.shippingLine1 = "Address line 1 is required";
      }
      if (!formData.shippingAddress.city.trim()) {
        newErrors.shippingCity = "City is required";
      }
      if (!formData.shippingAddress.region.trim()) {
        newErrors.shippingRegion = "State/Region is required";
      }
      if (!formData.shippingAddress.postal_code.trim()) {
        newErrors.shippingPostal = "Postal code is required";
      }
    }

    // Validate billing address if different and using new address for guests
    if (
      formData.isGuestCheckout &&
      !formData.useSameAddress &&
      formData.selectedBillingAddress === "new"
    ) {
      if (!formData.billingAddress.name.trim()) {
        newErrors.billingName = "Name is required";
      }
      if (!formData.billingAddress.line1.trim()) {
        newErrors.billingLine1 = "Address line 1 is required";
      }
      if (!formData.billingAddress.city.trim()) {
        newErrors.billingCity = "City is required";
      }
      if (!formData.billingAddress.region.trim()) {
        newErrors.billingRegion = "State/Region is required";
      }
      if (!formData.billingAddress.postal_code.trim()) {
        newErrors.billingPostal = "Postal code is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === "guestEmail") {
      setFormData((prev) => ({
        ...prev,
        guestEmail: value,
      }));
    } else {
      const [section, key] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...(prev[section as keyof CheckoutFormData] as any),
          [key]: value,
        },
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleSameAddressChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      useSameAddress: checked,
      billingAddress: checked
        ? prev.shippingAddress
        : {
            name: "",
            phone: "",
            line1: "",
            line2: "",
            city: "",
            region: "",
            postal_code: "",
            country: "US",
          },
    }));
  };

  const handleAddressSelection = (
    type: "shipping" | "billing",
    addressId: string
  ) => {
    if (addressId === "new") {
      setFormData((prev) => ({
        ...prev,
        [`selected${type.charAt(0).toUpperCase() + type.slice(1)}Address`]:
          "new",
        [`${type}Address`]: {
          ...prev[`${type}Address`],
          name: "",
          line1: "",
          line2: "",
          city: "",
          region: "",
          postal_code: "",
          country: "US",
        },
      }));
    } else {
      const address = savedAddresses.find((addr) => addr.id === addressId);
      if (address) {
        setFormData((prev) => ({
          ...prev,
          [`selected${type.charAt(0).toUpperCase() + type.slice(1)}Address`]:
            addressId,
          [`${type}Address`]: {
            ...prev[`${type}Address`],
            name: user?.name || "",
            line1: address.line1,
            line2: address.line2 || "",
            city: address.city,
            region: address.region,
            postal_code: address.postal_code,
            country: address.country,
          },
        }));
      }
    }
  };

  const saveAddress = async (
    type: "shipping" | "billing",
    addressData: any
  ) => {
    if (!user) return;

    try {
      // Save as both shipping and billing since dropdowns are unified
      const response = await fetch("/api/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `auth-token=${localStorage.getItem("auth-token")}`,
        },
        body: JSON.stringify({
          type: "shipping", // Always save as shipping first
          name: addressData.name,
          line1: addressData.line1,
          line2: addressData.line2,
          city: addressData.city,
          region: addressData.region,
          postal_code: addressData.postal_code,
          country: addressData.country,
          is_default: savedAddresses.length === 0, // Set as default if it's the first address
        }),
      });

      if (response.ok) {
        // Also save as billing if it's a billing address
        if (type === "billing") {
          await fetch("/api/addresses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `auth-token=${localStorage.getItem("auth-token")}`,
            },
            body: JSON.stringify({
              type: "billing",
              name: addressData.name,
              line1: addressData.line1,
              line2: addressData.line2,
              city: addressData.city,
              region: addressData.region,
              postal_code: addressData.postal_code,
              country: addressData.country,
              is_default: false, // Don't set billing as default
            }),
          });
        }

        addToast({
          title: `Address saved successfully!`,
          type: "success",
        });
        fetchSavedAddresses();
      }
    } catch (error) {
      console.error(`Error saving ${type} address:`, error);
      addToast({
        title: `Failed to save address`,
        type: "error",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      addToast({
        title: "Validation Error",
        description: "Please fix the errors below",
        type: "error",
      });
      return;
    }

    if (!cart || cart.items.length === 0) {
      addToast({
        title: "Empty Cart",
        description: "Your cart is empty",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const checkoutData = {
        cartItems: cart.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          selected_options: item.selected_options,
        })),
        shippingAddress: formData.shippingAddress,
        billingAddress: formData.useSameAddress
          ? undefined
          : formData.billingAddress,
        useSameAddress: formData.useSameAddress,
        orderNotes: formData.orderNotes,
        guestEmail: formData.isGuestCheckout ? formData.guestEmail : undefined,
      };

      console.log(
        "Submitting checkout data:",
        JSON.stringify(checkoutData, null, 2)
      );

      const response = await fetch("/api/checkout/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(checkoutData),
      });

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Checkout error response:", error);

        // Handle out of stock items specifically
        if (error.outOfStockItems && error.outOfStockItems.length > 0) {
          addToast({
            title: "Items No Longer Available",
            description: `${error.outOfStockItems.length} item(s) are no longer in stock`,
            type: "error",
            duration: 5000,
          });

          // Redirect to cart with out of stock items highlighted
          await router.push(
            `/cart?outOfStock=${encodeURIComponent(
              JSON.stringify(error.outOfStockItems)
            )}`
          );
          return;
        }

        throw new Error(error.error || "Order submission failed");
      }

      const result = await response.json();
      console.log("Checkout success response:", result);

      // Save addresses after successful order submission
      if (
        user &&
        formData.saveShippingAddress &&
        formData.selectedShippingAddress === "new"
      ) {
        await saveAddress("shipping", formData.shippingAddress);
      }
      if (
        user &&
        formData.saveBillingAddress &&
        !formData.useSameAddress &&
        formData.selectedBillingAddress === "new"
      ) {
        await saveAddress("billing", formData.billingAddress);
      }

      // Redirect to confirmation page with order number and email (for guest orders)
      // The confirmation page will fetch all details from the API
      const confirmUrl = result.data.isGuestOrder
        ? `/order-confirmation?orderNumber=${
            result.data.orderNumber
          }&email=${encodeURIComponent(formData.guestEmail)}`
        : `/order-confirmation?orderNumber=${result.data.orderNumber}`;

      await router.push(confirmUrl);

      // Clear cart after navigation starts
      clearCart();
    } catch (error) {
      console.error("Checkout error:", error);
      addToast({
        title: "Order Failed",
        description:
          error instanceof Error ? error.message : "Order submission failed",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Calculate individual item price
  const getItemPrice = (item: any) => {
    if (!item.product) return 0;

    const basePrice = parseFloat(item.product.base_price || "0");
    let finalPrice = basePrice;

    // Add option price adjustments
    if (item.selected_options && item.product.options) {
      item.product.options.forEach((option: any) => {
        const selectedValueName = item.selected_options[option.name];
        if (selectedValueName) {
          const selectedValue = option.values?.find(
            (v: any) => v.name === selectedValueName
          );
          if (selectedValue) {
            finalPrice += parseFloat(selectedValue.price_adjustment || "0");
          }
        }
      });
    }

    return finalPrice;
  };

  const calculateTotals = () => {
    if (!cart) return { subtotal: 0, tax: 0, shipping: 0, total: 0 };

    const subtotal = getTotalPrice();
    const shipping = subtotal > 100 ? 0 : 9.99;
    const tax = subtotal * 0.08;
    const total = subtotal + tax + shipping;

    return { subtotal, tax, shipping, total };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return null; // Will redirect
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

            <form onSubmit={handleSubmit}>
              {/* Guest Checkout Section */}
              {formData.isGuestCheckout && (
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
                  <h2 className="text-xl font-semibold text-blue-900 mb-4">
                    Guest Checkout
                  </h2>
                  <p className="text-blue-700 mb-4">
                    You're checking out as a guest. We'll send your order
                    confirmation to the email below.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.guestEmail}
                      onChange={(e) =>
                        handleInputChange("guestEmail", e.target.value)
                      }
                      placeholder="your@email.com"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.guestEmail ? "border-red-300" : "border-blue-300"
                      }`}
                    />
                    {errors.guestEmail && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.guestEmail}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 text-sm text-blue-600">
                    <p>
                      Already have an account?{" "}
                      <a
                        href="/auth/signin?returnUrl=/checkout"
                        className="font-medium hover:underline"
                      >
                        Sign in here
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {/* Shipping Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Shipping Address
                  </h2>
                  {user && (
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Manage Addresses
                    </button>
                  )}
                </div>

                {/* Address Selection for Logged-in Users */}
                {user && savedAddresses.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Choose Shipping Address
                    </label>
                    <select
                      value={formData.selectedShippingAddress}
                      onChange={(e) =>
                        handleAddressSelection("shipping", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {savedAddresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {`${address.line1}, ${address.city}`}
                          {address.is_default ? " (Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* No addresses message for logged-in users */}
                {user && savedAddresses.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-gray-400 mb-4">
                      <svg
                        className="w-12 h-12 mx-auto"
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
                      Add your first address to continue with checkout
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Add Address
                    </button>
                  </div>
                )}

                {/* Address Form - Only show for guest checkout */}
                {formData.isGuestCheckout && (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={formData.shippingAddress.name}
                          onChange={(e) =>
                            handleInputChange(
                              "shippingAddress.name",
                              e.target.value
                            )
                          }
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.shippingName
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                          placeholder="Enter your full name"
                        />
                        {errors.shippingName && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.shippingName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.shippingAddress.phone}
                          onChange={(e) =>
                            handleInputChange(
                              "shippingAddress.phone",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address Line 1 *
                        </label>
                        <input
                          type="text"
                          value={formData.shippingAddress.line1}
                          onChange={(e) =>
                            handleInputChange(
                              "shippingAddress.line1",
                              e.target.value
                            )
                          }
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.shippingLine1
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                        />
                        {errors.shippingLine1 && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.shippingLine1}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          value={formData.shippingAddress.line2}
                          onChange={(e) =>
                            handleInputChange(
                              "shippingAddress.line2",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City *
                          </label>
                          <input
                            type="text"
                            value={formData.shippingAddress.city}
                            onChange={(e) =>
                              handleInputChange(
                                "shippingAddress.city",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.shippingCity
                                ? "border-red-300"
                                : "border-gray-300"
                            }`}
                          />
                          {errors.shippingCity && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.shippingCity}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State/Region *
                          </label>
                          <input
                            type="text"
                            value={formData.shippingAddress.region}
                            onChange={(e) =>
                              handleInputChange(
                                "shippingAddress.region",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.shippingRegion
                                ? "border-red-300"
                                : "border-gray-300"
                            }`}
                          />
                          {errors.shippingRegion && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.shippingRegion}
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
                            value={formData.shippingAddress.postal_code}
                            onChange={(e) =>
                              handleInputChange(
                                "shippingAddress.postal_code",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.shippingPostal
                                ? "border-red-300"
                                : "border-gray-300"
                            }`}
                          />
                          {errors.shippingPostal && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.shippingPostal}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country *
                          </label>
                          <select
                            value={formData.shippingAddress.country}
                            onChange={(e) =>
                              handleInputChange(
                                "shippingAddress.country",
                                e.target.value
                              )
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
                    </div>
                  </>
                )}

                {/* Error message for logged-in users with no addresses */}
                {user && savedAddresses.length === 0 && errors.noAddresses && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{errors.noAddresses}</p>
                  </div>
                )}
              </div>

              {/* Billing Information - Compact and Conditional */}
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="flex items-center mb-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.useSameAddress}
                      onChange={(e) =>
                        handleSameAddressChange(e.target.checked)
                      }
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-lg font-semibold text-gray-900">
                      Billing Address
                    </span>
                  </label>
                </div>

                {formData.useSameAddress ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-green-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-800">
                          Billing address will be the same as shipping address
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Address Selection for Logged-in Users */}
                    {user && savedAddresses.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Choose Billing Address
                        </label>
                        <select
                          value={formData.selectedBillingAddress}
                          onChange={(e) =>
                            handleAddressSelection("billing", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {savedAddresses.map((address) => (
                            <option key={address.id} value={address.id}>
                              {`${address.line1}, ${address.city}`}
                              {address.is_default ? " (Default)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Address Form - Only show for guest checkout */}
                    {formData.isGuestCheckout && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              value={formData.billingAddress.name}
                              onChange={(e) =>
                                handleInputChange(
                                  "billingAddress.name",
                                  e.target.value
                                )
                              }
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.billingName
                                  ? "border-red-300"
                                  : "border-gray-300"
                              }`}
                              placeholder="Enter your full name"
                            />
                            {errors.billingName && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.billingName}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone
                            </label>
                            <input
                              type="tel"
                              value={formData.billingAddress.phone}
                              onChange={(e) =>
                                handleInputChange(
                                  "billingAddress.phone",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 1 *
                          </label>
                          <input
                            type="text"
                            value={formData.billingAddress.line1}
                            onChange={(e) =>
                              handleInputChange(
                                "billingAddress.line1",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.billingLine1
                                ? "border-red-300"
                                : "border-gray-300"
                            }`}
                          />
                          {errors.billingLine1 && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.billingLine1}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 2
                          </label>
                          <input
                            type="text"
                            value={formData.billingAddress.line2}
                            onChange={(e) =>
                              handleInputChange(
                                "billingAddress.line2",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              City *
                            </label>
                            <input
                              type="text"
                              value={formData.billingAddress.city}
                              onChange={(e) =>
                                handleInputChange(
                                  "billingAddress.city",
                                  e.target.value
                                )
                              }
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.billingCity
                                  ? "border-red-300"
                                  : "border-gray-300"
                              }`}
                            />
                            {errors.billingCity && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.billingCity}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              State/Region *
                            </label>
                            <input
                              type="text"
                              value={formData.billingAddress.region}
                              onChange={(e) =>
                                handleInputChange(
                                  "billingAddress.region",
                                  e.target.value
                                )
                              }
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.billingRegion
                                  ? "border-red-300"
                                  : "border-gray-300"
                              }`}
                            />
                            {errors.billingRegion && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.billingRegion}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Postal Code *
                            </label>
                            <input
                              type="text"
                              value={formData.billingAddress.postal_code}
                              onChange={(e) =>
                                handleInputChange(
                                  "billingAddress.postal_code",
                                  e.target.value
                                )
                              }
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.billingPostal
                                  ? "border-red-300"
                                  : "border-gray-300"
                              }`}
                            />
                            {errors.billingPostal && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.billingPostal}
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country *
                          </label>
                          <select
                            value={formData.billingAddress.country}
                            onChange={(e) =>
                              handleInputChange(
                                "billingAddress.country",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Order Summary */}
              <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Order Summary
                </h2>

                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.product?.title || `Product ${item.product_id}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium text-gray-900">
                        {formatPrice(getItemPrice(item) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <hr className="my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">
                      {formatPrice(totals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">
                      {formatPrice(totals.tax)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-gray-900">
                      {totals.shipping === 0
                        ? "Free"
                        : formatPrice(totals.shipping)}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-semibold text-lg">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">
                      {formatPrice(totals.total)}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    value={formData.orderNotes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        orderNotes: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any special instructions for your order..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Processing..." : "Complete Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />

      {/* Address Management Modal */}
      <AddressManagementModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onAddressSelect={(addressId) => {
          setFormData((prev) => ({
            ...prev,
            selectedShippingAddress: addressId,
            selectedBillingAddress: addressId,
          }));
          fetchSavedAddresses();
        }}
        onAddressesUpdated={(updatedAddresses) => {
          setSavedAddresses(updatedAddresses);
        }}
        autoOpenAddForm={savedAddresses.length === 0}
        mode="checkout"
      />
    </div>
  );
}
