import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";

interface StockNotificationSignupProps {
  productSlug: string;
  productTitle: string;
  isOutOfStock: boolean;
}

export function StockNotificationSignup({
  productSlug,
  productTitle,
  isOutOfStock,
}: StockNotificationSignupProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isAlreadySubscribed, setIsAlreadySubscribed] = useState(false);
  const [wasAlreadyNotified, setWasAlreadyNotified] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [error, setError] = useState("");

  // Auto-populate email for logged-in users and check existing subscription
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }

    // Check if user is already subscribed
    if (user?.email && isOutOfStock) {
      checkExistingSubscription(user.email);
    } else {
      setIsCheckingSubscription(false);
    }
  }, [user?.email, email, isOutOfStock]);

  // Periodically refresh subscription status to catch notifications
  useEffect(() => {
    if (!isOutOfStock || !user?.email) return;

    const interval = setInterval(() => {
      checkExistingSubscription(user.email);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOutOfStock, user?.email]);

  const checkExistingSubscription = async (userEmail: string) => {
    try {
      // Check subscription status using GET endpoint
      const response = await fetch(
        `/api/products/${productSlug}/stock-notification?email=${encodeURIComponent(
          userEmail
        )}`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.notified) {
          // If user was already notified once, treat as not subscribed
          setWasAlreadyNotified(true);
          setIsAlreadySubscribed(false);
        } else if (data.subscribed) {
          setIsAlreadySubscribed(true);
        } else {
          setIsAlreadySubscribed(false);
        }
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/products/${productSlug}/stock-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      if (response.ok) {
        setIsSubmitted(true);
        setEmail("");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to sign up for notifications");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOutOfStock) {
    return null;
  }

  if (isCheckingSubscription) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
          <p className="text-gray-600 text-sm">
            Checking subscription status...
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted || (isAlreadySubscribed && !wasAlreadyNotified)) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
        <div className="flex items-center">
          <svg
            className="w-5 h-5 text-green-600 mr-2"
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
          <p className="text-green-800 font-medium">
            {isAlreadySubscribed
              ? "You're signed up!"
              : "You're signed up for stock notifications!"}
          </p>
        </div>
        <p className="text-green-700 text-sm mt-1">
          We'll email you when {productTitle} is back in stock.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <div className="flex items-start">
        <svg
          className="w-5 h-5 text-blue-600 mr-2 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5v-5zM4.5 19.5L19.5 4.5M20 4l-16 16"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-blue-900 font-medium text-sm">Out of Stock</h3>
          <p className="text-blue-800 text-sm mt-1">
            This item is currently out of stock. Sign up to be notified when
            it's back!
          </p>

          <form onSubmit={handleSubmit} className="mt-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Signing up..." : "Notify Me"}
              </button>
            </div>
            {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
