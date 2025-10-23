import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_amount: string;
  selected_options: any;
  descriptive_title: string;
  product_title: string;
  product_slug: string;
  product_image: string;
}

interface OrderConfirmationData {
  orderId: string;
  orderNumber: string;
  total: string;
  status: string;
  isGuestOrder?: boolean;
  currency?: string;
  createdAt?: string;
  items?: OrderItem[];
  guestEmail?: string;
  shippingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
}

export default function OrderConfirmationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [orderData, setOrderData] = useState<OrderConfirmationData | null>(
    null
  );
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isAccountSetupOpen, setIsAccountSetupOpen] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountFormData, setAccountFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    // Only process order data if router is ready
    if (!router.isReady) return;

    const { orderNumber, email } = router.query;

    if (!orderNumber || typeof orderNumber !== "string") {
      router.push("/");
      return;
    }

    // Fetch order details from API
    const fetchOrderDetails = async () => {
      try {
        // Build URL with optional email parameter for guest orders
        let url = `/api/orders/confirmation?orderNumber=${encodeURIComponent(
          orderNumber
        )}`;
        if (email && typeof email === "string") {
          url += `&email=${encodeURIComponent(email)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to fetch order details");
        }

        const result = await response.json();
        setOrderData(result.data);
      } catch (error) {
        console.error("Error fetching order details:", error);
        setFetchError(
          error instanceof Error
            ? error.message
            : "Failed to load order details"
        );
        // Redirect to home after a delay
        setTimeout(() => router.push("/"), 3000);
      }
    };

    fetchOrderDetails();
  }, [router.isReady, router.query, router]);

  const validateAccountForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!accountFormData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (accountFormData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!accountFormData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (accountFormData.password !== accountFormData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setAccountErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAccountForm() || !orderData) return;

    setIsCreatingAccount(true);
    try {
      const response = await fetch(
        "/api/auth/create-account-from-guest-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderNumber: orderData.orderNumber,
            email: orderData.guestEmail,
            password: accountFormData.password,
            name: orderData.shippingAddress?.name,
            shippingAddress: orderData.shippingAddress,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        addToast({
          title: "Account created successfully!",
          description:
            "You can now sign in to manage your orders and addresses.",
          type: "success",
        });

        // Redirect to sign in page
        router.push(
          `/auth/signin?email=${encodeURIComponent(
            orderData.guestEmail || ""
          )}&message=account-created`
        );
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to create account");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      addToast({
        title: "Failed to create account",
        description:
          error instanceof Error ? error.message : "Please try again later",
        type: "error",
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  if (fetchError) {
    return (
      <div className="min-h-screen bg-muted">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-full mb-4">
              <svg
                className="w-8 h-8 text-destructive"
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
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {fetchError}
            </h1>
            <p className="text-muted-foreground">Redirecting to home page...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-muted">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading order confirmation...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-full mb-4">
            <svg
              className="w-8 h-8 text-primary"
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
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Order Confirmed!
          </h1>
          <p className="text-lg text-muted-foreground">
            Thank you for your purchase, {user?.name || "valued customer"}!
          </p>
          {orderData.isGuestOrder && (
            <div className="mt-4">
              <p className="text-sm text-primary mb-3">
                We've sent a confirmation email with your order details. Save
                your order number to track your order.
              </p>
              <div className="bg-accent border border-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-accent-foreground mb-2">
                  Create an account to save your information
                </h3>
                <p className="text-sm text-primary mb-3">
                  Set up an account with just a password to save your address
                  and track future orders easily.
                </p>
                <button
                  onClick={() => setIsAccountSetupOpen(true)}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary transition-colors text-sm font-medium"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Details Card */}
        <div className="bg-card rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Order Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="font-medium text-foreground">
                {orderData.orderNumber}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-medium text-foreground">
                {orderData.createdAt
                  ? new Date(orderData.createdAt).toLocaleDateString()
                  : new Date().toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium text-primary capitalize">
                {orderData.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-medium text-foreground">
                ${parseFloat(orderData.total).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        {orderData.items && orderData.items.length > 0 && (
          <div className="bg-card rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Order Items
            </h2>
            <div className="space-y-4">
              {orderData.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-4 pb-4 border-b last:border-b-0 last:pb-0"
                >
                  <div className="flex-shrink-0">
                    <Link href={`/products/${item.product_slug}`}>
                      {item.product_image ? (
                        <div className="relative w-20 h-20 bg-muted rounded-lg overflow-hidden">
                          <Image
                            src={item.product_image}
                            alt={item.product_title}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-muted-foreground"
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
                      )}
                    </Link>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.product_slug}`}
                      className="text-base font-medium text-foreground hover:text-primary"
                    >
                      {item.descriptive_title || item.product_title}
                    </Link>
                    {item.selected_options &&
                      Object.keys(item.selected_options).length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {Object.entries(item.selected_options)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ")}
                        </p>
                      )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Quantity: {item.quantity} × $
                      {parseFloat(item.unit_amount).toFixed(2)} = $
                      {(parseFloat(item.unit_amount) * item.quantity).toFixed(
                        2
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-accent rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-accent-foreground mb-3">
            What happens next?
          </h3>
          <div className="space-y-2 text-accent-foreground">
            <p>• You'll receive an email confirmation shortly</p>
            <p>• We'll process your order and prepare it for shipping</p>
            <p>• You'll receive tracking information once your order ships</p>
            <p>• Expected delivery: 3-5 business days</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => {
              console.log("View Order History clicked");
              router.push("/orders");
            }}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary transition-colors font-medium"
          >
            View Order History
          </button>
          <button
            onClick={() => {
              console.log("Continue Shopping clicked");
              router.push("/products");
            }}
            className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
          >
            Continue Shopping
          </button>
        </div>

        {/* Contact Info */}
        <div className="text-center mt-8 text-muted-foreground">
          <p>
            Questions about your order?{" "}
            <a
              href="mailto:support@raineandsea.com"
              className="text-primary hover:text-primary underline"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>

      <Footer />

      {/* Account Setup Modal */}
      {isAccountSetupOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setIsAccountSetupOpen(false)}
            />

            <div className="relative bg-card rounded-lg shadow-xl max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">
                  Create Your Account
                </h2>
                <button
                  onClick={() => setIsAccountSetupOpen(false)}
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

              {/* Form */}
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-foreground mb-2">
                    Account Information
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Email:</strong> {orderData?.guestEmail}
                    </p>
                    <p>
                      <strong>Name:</strong> {orderData?.shippingAddress?.name}
                    </p>
                    <p>
                      <strong>Address:</strong>{" "}
                      {orderData?.shippingAddress?.line1},{" "}
                      {orderData?.shippingAddress?.city}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={accountFormData.password}
                      onChange={(e) =>
                        setAccountFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                        accountErrors.password
                          ? "border-destructive"
                          : "border-border"
                      }`}
                      placeholder="Enter your password"
                    />
                    {accountErrors.password && (
                      <p className="mt-1 text-sm text-destructive">
                        {accountErrors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={accountFormData.confirmPassword}
                      onChange={(e) =>
                        setAccountFormData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                        accountErrors.confirmPassword
                          ? "border-destructive"
                          : "border-border"
                      }`}
                      placeholder="Confirm your password"
                    />
                    {accountErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-destructive">
                        {accountErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="bg-muted rounded-md p-3">
                    <p className="text-xs text-muted-foreground">
                      By creating an account, your shipping address will be
                      saved for future orders and you'll be able to track this
                      order in your account.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isCreatingAccount}
                      className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreatingAccount ? "Creating..." : "Create Account"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAccountSetupOpen(false)}
                      className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
